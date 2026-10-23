import type { Attempt, Certification, CertificationDetail, ExamId } from "../../domain/types";
import type { PracticeError } from "../errors";
import { Store, type LoadStatus } from "../../../../core/state/Store";

export interface CatalogState {
  status: LoadStatus;
  error: PracticeError | null;
  certifications: Certification[];
  selected: CertificationDetail | null;
  latestAttempts: Record<ExamId, Attempt>;
  /** Questions whose latest answer is wrong (the review set). */
  reviewCount: number;
}

export class CatalogStore extends Store<CatalogState> {
  constructor() {
    super({ status: "idle", error: null, certifications: [], selected: null, latestAttempts: {}, reviewCount: 0 });
  }

  loading(): void {
    this.setState({ status: "loading", error: null });
  }

  loaded(certifications: Certification[], selected: CertificationDetail | null, latest: Map<ExamId, Attempt>, reviewCount: number): void {
    this.setState({ status: "ready", certifications, selected, latestAttempts: Object.fromEntries(latest), reviewCount });
  }

  failed(error: PracticeError): void {
    this.setState({ status: "error", error });
  }
}
