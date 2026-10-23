import type { Attempt, CertificationDetail, ContentLocale, Exam, OptionKey, Question } from "../../domain/types";
import type { PracticeError } from "../errors";
import { Store, type LoadStatus } from "../../../../core/state/Store";

export type ExamView = "question" | "result";

export interface ExamState {
  status: LoadStatus;
  /** Load failure (blocks the page) or a failed save (shown next to the question). */
  error: PracticeError | null;
  cert: CertificationDetail | null;
  exam: Exam | null;
  /** English original, loaded alongside a translation so a question can be compared with it. */
  original: Exam | null;
  locale: ContentLocale;
  attempt: Attempt | null;
  view: ExamView;
  /** Index of the question on screen. */
  index: number;
  /** Options picked for the current, not yet submitted question. */
  selection: OptionKey[];
  saving: boolean;
  /** The review set was opened with nothing to review. */
  empty: boolean;
}

export class ExamStore extends Store<ExamState> {
  constructor() {
    super({ status: "idle", error: null, cert: null, exam: null, original: null, locale: "vi", attempt: null, view: "question", index: 0, selection: [], saving: false, empty: false });
  }

  get question(): Question | null {
    const { exam, index } = this.getState();
    return exam?.questions[index] ?? null;
  }

  /** First question without an answer; equals questionCount when the attempt is finished. */
  get frontier(): number {
    const { exam, attempt } = this.getState();
    if (!exam || !attempt) return 0;
    const i = exam.questions.findIndex((q) => !attempt.answers[q.id]);
    return i === -1 ? exam.questions.length : i;
  }

  loading(): void {
    this.setState({ status: "loading", error: null });
  }

  /** The same exam's text in another language; attempt, position and selection are unchanged. */
  content(exam: Exam, original: Exam | null): void {
    this.setState({ exam, original, locale: exam.locale });
  }

  loaded(cert: CertificationDetail, exam: Exam, attempt: Attempt, view: ExamView): void {
    this.setState({ status: "ready", error: null, cert, exam, attempt, view, selection: [], saving: false, empty: false });
    this.setState({ index: Math.min(this.frontier, exam.questions.length - 1) });
  }

  /** Nothing to review: the page says so instead of showing questions. */
  nothingToReview(cert: CertificationDetail): void {
    this.setState({ status: "ready", error: null, cert, exam: null, original: null, attempt: null, empty: true, saving: false });
  }

  failed(error: PracticeError): void {
    this.setState({ status: "error", error });
  }

  select(selection: OptionKey[]): void {
    this.setState({ selection });
  }

  saving(): void {
    this.setState({ saving: true, error: null });
  }

  saved(attempt: Attempt): void {
    this.setState({ attempt, saving: false, selection: [] });
  }

  saveFailed(error: PracticeError): void {
    this.setState({ saving: false, error });
  }

  show(index: number): void {
    this.setState({ view: "question", index, selection: [], error: null });
  }

  showResult(): void {
    this.setState({ view: "result", selection: [] });
  }
}
