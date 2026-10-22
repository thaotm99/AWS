import { Scoring } from "../../domain/Scoring";
import type { CertificationId, ContentLocale, Exam, ExamId, OptionKey } from "../../domain/types";
import type { AttemptService } from "../../services/AttemptService";
import type { CatalogService } from "../../services/CatalogService";
import { Controller } from "../../../../core/state/Controller";
import type { EventBus } from "../../../../core/state/EventBus";
import type { PracticeEvent } from "../events";
import { ExamStore, type ExamState } from "../stores/ExamStore";

/** One question at a time: pick, submit, see the verdict, move on. */
export class ExamController extends Controller<PracticeEvent, ExamState, ExamStore> {
  constructor(
    bus: EventBus<PracticeEvent>,
    private readonly catalog: CatalogService,
    private readonly attempts: AttemptService,
  ) {
    super(bus, new ExamStore());
  }

  protected bind(): void {
    this.on("exam/open", (e) => this.open(e.certId, e.examId, e.locale));
    this.on("exam/language", (e) => this.language(e.locale));
    this.on("exam/toggleOption", (e) => this.toggle(e.key));
    this.on("exam/submit", () => this.submit());
    this.on("exam/next", () => this.next());
    this.on("exam/goTo", (e) => this.goTo(e.index));
    this.on("exam/showResult", () => this.showResult());
    this.on("exam/restart", () => this.restart());
  }

  /** Question text in `locale`, plus the English original when that is a translation. */
  private content(certId: CertificationId, examId: ExamId, locale: ContentLocale): Promise<[Exam, Exam | null]> {
    return Promise.all([
      this.catalog.getExam(certId, examId, locale),
      locale === "en" ? Promise.resolve(null) : this.catalog.getExam(certId, examId, "en"),
    ]);
  }

  /** Resumes the newest attempt; a finished one opens on its result. */
  private async open(certId: CertificationId, examId: ExamId, locale: ContentLocale): Promise<void> {
    this.store.loading();
    try {
      const [cert, [exam, original], latest] = await Promise.all([
        this.catalog.getCertification(certId),
        this.content(certId, examId, locale),
        this.attempts.latest(certId, examId),
      ]);
      const attempt = latest ?? (await this.attempts.start({ certId, examId, questionCount: exam.questions.length }));
      this.store.loaded(cert, exam, attempt, Scoring.isFinished(attempt) ? "result" : "question");
      this.store.content(exam, original);
    } catch (e) {
      this.store.failed({ code: "loadExam", detail: Controller.message(e) });
    }
  }

  /** Answers are stored by question id and option key, so switching language never touches the attempt. */
  private async language(locale: ContentLocale): Promise<void> {
    const { exam, cert, locale: current } = this.store.getState();
    if (!exam || !cert || locale === current) return;
    try {
      const [next, original] = await this.content(cert.id, exam.id, locale);
      this.store.content(next, original);
    } catch (e) {
      this.store.saveFailed({ code: "loadExam", detail: Controller.message(e) });
    }
  }

  private isAnswered(index: number): boolean {
    const { exam, attempt } = this.store.getState();
    const q = exam?.questions[index];
    return Boolean(q && attempt?.answers[q.id]);
  }

  private toggle(key: OptionKey): void {
    const { selection, index, saving } = this.store.getState();
    const q = this.store.question;
    if (!q || saving || this.isAnswered(index)) return;
    if (q.selectCount === 1) return this.store.select([key]);
    if (selection.includes(key)) return this.store.select(selection.filter((k) => k !== key));
    if (selection.length < q.selectCount) this.store.select([...selection, key]);
  }

  private async submit(): Promise<void> {
    const { attempt, selection, index, saving } = this.store.getState();
    const q = this.store.question;
    if (!q || !attempt || saving || this.isAnswered(index) || selection.length !== q.selectCount) return;
    this.store.saving();
    try {
      const chosen = [...selection].sort();
      this.store.saved(await this.attempts.answer(attempt.id, q.id, { chosen, correct: Scoring.isCorrect(q, chosen) }));
    } catch (e) {
      this.store.saveFailed({ code: "saveAnswer", detail: Controller.message(e) });
    }
  }

  private next(): void {
    const { exam, index } = this.store.getState();
    if (!exam || !this.isAnswered(index)) return;
    if (index + 1 < exam.questions.length) this.store.show(index + 1);
    else this.showResult();
  }

  /** Only answered questions (to review) and the next unanswered one can be opened. */
  private goTo(index: number): void {
    const { exam } = this.store.getState();
    if (!exam || index < 0 || index >= exam.questions.length) return;
    if (index <= this.store.frontier) this.store.show(index);
  }

  private showResult(): void {
    const { attempt } = this.store.getState();
    if (attempt && Scoring.isFinished(attempt)) this.store.showResult();
  }

  private async restart(): Promise<void> {
    const { cert, exam, saving } = this.store.getState();
    if (!cert || !exam || saving) return;
    this.store.saving();
    try {
      const attempt = await this.attempts.start({ certId: cert.id, examId: exam.id, questionCount: exam.questions.length });
      this.store.loaded(cert, exam, attempt, "question");
    } catch (e) {
      this.store.saveFailed({ code: "restart", detail: Controller.message(e) });
    }
  }
}
