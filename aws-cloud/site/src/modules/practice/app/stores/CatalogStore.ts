import type { Attempt, Certification, CertificationDetail, ExamId } from "../../domain/types";
import type { PracticeError } from "../errors";
import { Store, type LoadStatus } from "../../../../core/state/Store";

export interface CatalogState {
  status: LoadStatus;
  error: PracticeError | null;
  certifications: Certification[];
  selected: CertificationDetail | null;
  latestAttempts: Record<ExamId, Attempt>;
}

export class CatalogStore extends Store<CatalogState> {
  constructor() {
    super({ status: "idle", error: null, certifications: [], selected: null, latestAttempts: {} });
  }

  loading(): void {
    this.setState({ status: "loading", error: null });
  }

  loaded(certifications: Certification[], selected: CertificationDetail | null, latest: Map<ExamId, Attempt>): void {
    this.setState({ status: "ready", certifications, selected, latestAttempts: Object.fromEntries(latest) });
  }

  failed(error: PracticeError): void {
    this.setState({ status: "error", error });
  }
}
