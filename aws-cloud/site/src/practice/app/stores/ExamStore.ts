import type { Attempt, CertificationDetail, Exam, OptionKey, Question } from "../../domain/types";
import { Store, type LoadStatus } from "../Store";

export type ExamView = "question" | "result";

export interface ExamState {
  status: LoadStatus;
  /** Load failure (blocks the page) or a failed save (shown next to the question). */
  error: string | null;
  cert: CertificationDetail | null;
  exam: Exam | null;
  attempt: Attempt | null;
  view: ExamView;
  /** Index of the question on screen. */
  index: number;
  /** Options picked for the current, not yet submitted question. */
  selection: OptionKey[];
  saving: boolean;
}

export class ExamStore extends Store<ExamState> {
  constructor() {
    super({ status: "idle", error: null, cert: null, exam: null, attempt: null, view: "question", index: 0, selection: [], saving: false });
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

  loaded(cert: CertificationDetail, exam: Exam, attempt: Attempt, view: ExamView): void {
    this.setState({ status: "ready", error: null, cert, exam, attempt, view, selection: [], saving: false });
    this.setState({ index: Math.min(this.frontier, exam.questions.length - 1) });
  }

  failed(error: string): void {
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

  saveFailed(error: string): void {
    this.setState({ saving: false, error });
  }

  show(index: number): void {
    this.setState({ view: "question", index, selection: [], error: null });
  }

  showResult(): void {
    this.setState({ view: "result", selection: [] });
  }
}
