import { Review, dayOf } from "../../domain/Review";
import { Scoring } from "../../domain/Scoring";
import type { CertificationId, ContentLocale, Exam, OptionKey, QuestionId, QuestionSetRef } from "../../domain/types";
import type { AttemptService } from "../../services/AttemptService";
import type { CatalogService } from "../../services/CatalogService";
import { Controller } from "../../../../core/state/Controller";
import type { EventBus } from "../../../../core/state/EventBus";
import type { PracticeEvent } from "../events";
import { ExamStore, type ExamState } from "../stores/ExamStore";

/** One question at a time: pick, submit, see the verdict, move on. Works for practice tests and per-service sets. */
export class ExamController extends Controller<PracticeEvent, ExamState, ExamStore> {
  private set: QuestionSetRef | null = null;
  /** Language the viewer asked for last; the store's locale only changes once its text has loaded. */
  private requestedLocale: ContentLocale = "vi";
  /** Request counters: a response is applied only if no newer request of its kind was made since. */
  private openRequest = 0;
  private contentRequest = 0;
  /** Questions of the review set, fixed when it opens so a language switch reloads the same ones. */
  private reviewIds: QuestionId[] = [];

  constructor(
    bus: EventBus<PracticeEvent>,
    private readonly catalog: CatalogService,
    private readonly attempts: AttemptService,
  ) {
    super(bus, new ExamStore());
  }

  protected bind(): void {
    this.on("exam/open", (e) => this.open(e.certId, e.set, e.locale));
    this.on("exam/language", (e) => this.language(e.locale));
    this.on("exam/toggleOption", (e) => this.toggle(e.key));
    this.on("exam/submit", () => this.submit());
    this.on("exam/next", () => this.next());
    this.on("exam/goTo", (e) => this.goTo(e.index));
    this.on("exam/showResult", () => this.showResult());
    this.on("exam/restart", () => this.restart());
  }

  /** Question text in `locale`, plus the English original when that is a translation. */
  private content(certId: CertificationId, set: QuestionSetRef, locale: ContentLocale): Promise<[Exam, Exam | null]> {
    if (set.kind === "review") {
      return Promise.all([
        this.catalog.getReviewSet(certId, this.reviewIds, locale),
        locale === "en" ? Promise.resolve(null) : this.catalog.getReviewSet(certId, this.reviewIds, "en"),
      ]);
    }
    return Promise.all([
      this.catalog.getQuestionSet(certId, set, locale),
      locale === "en" ? Promise.resolve(null) : this.catalog.getQuestionSet(certId, set, "en"),
    ]);
  }

  private static questionIds(exam: Exam): QuestionId[] {
    return exam.questions.map((q) => q.id);
  }

  /**
   * Resumes the newest attempt; a finished one opens on its result. An attempt saved for a
   * different version of the question set (questions added, removed or replaced) is not resumed:
   * a new one starts instead.
   */
  private async open(certId: CertificationId, set: QuestionSetRef, locale: ContentLocale): Promise<void> {
    const request = ++this.openRequest;
    this.contentRequest++; // a language load still in flight belongs to the previous page state
    this.set = set;
    this.requestedLocale = locale;
    this.store.loading();
    try {
      if (set.kind === "review") {
        const attempts = await this.attempts.list(certId);
        this.reviewIds = (set.all ? Review.bookIds(attempts) : Review.dueIds(attempts, dayOf(new Date().toISOString()))).slice(0, Review.ROUND);
        if (!this.reviewIds.length) {
          const cert = await this.catalog.getCertification(certId);
          if (request === this.openRequest) this.store.nothingToReview(cert);
          return;
        }
      }
      const [cert, [exam, original]] = await Promise.all([this.catalog.getCertification(certId), this.content(certId, set, locale)]);
      // Attempts are keyed by the set's id ("3", "topic-s3"), so the two kinds never collide.
      const examId = exam.id;
      const ids = ExamController.questionIds(exam);
      const latest = await this.attempts.latest(certId, examId);
      const attempt = latest && Scoring.fits(latest, ids) ? latest : await this.attempts.start({ certId, examId, questionCount: ids.length });
      if (request !== this.openRequest) return;
      this.store.loaded(cert, exam, attempt, Scoring.isFinished(attempt, ids) ? "result" : "question");
      this.store.content(exam, original);
    } catch (e) {
      if (request === this.openRequest) this.store.failed({ code: "loadExam", detail: Controller.message(e) });
      return;
    }
    // The viewer may have switched language while the exam was loading.
    if (this.requestedLocale !== locale) await this.language(this.requestedLocale);
  }

  /**
   * Answers are stored by question id and option key, so switching language never touches the attempt.
   * Only the newest request may write: VI → EN → VI ends in VI whatever order the files arrive in.
   */
  private async language(locale: ContentLocale): Promise<void> {
    this.requestedLocale = locale;
    const { exam, cert, status } = this.store.getState();
    // Still opening: open() applies the requested language when it finishes.
    if (status !== "ready" || !exam || !cert || !this.set) return;
    const request = ++this.contentRequest;
    if (exam.locale === locale) return; // already shown; the bump above discards older loads
    const openRequest = this.openRequest;
    try {
      const [next, original] = await this.content(cert.id, this.set, locale);
      if (request === this.contentRequest && openRequest === this.openRequest) this.store.content(next, original);
    } catch (e) {
      if (request === this.contentRequest && openRequest === this.openRequest) this.store.saveFailed({ code: "loadExam", detail: Controller.message(e) });
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
      const { attempt: saved, reveal } = await this.attempts.answer(attempt.id, q.id, { chosen });
      this.catalog.remember([reveal]);
      const { exam, original } = this.store.getState();
      if (exam) this.store.content(this.catalog.withReveals(exam), this.catalog.withReveals(original));
      this.store.saved(saved);
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

  /** The result needs every current question answered; otherwise go to the first open one. */
  private showResult(): void {
    const { attempt, exam } = this.store.getState();
    if (!attempt || !exam) return;
    if (Scoring.isFinished(attempt, ExamController.questionIds(exam))) this.store.showResult();
    else this.store.show(Math.min(this.store.frontier, exam.questions.length - 1));
  }

  private async restart(): Promise<void> {
    const { cert, exam, saving } = this.store.getState();
    if (!cert || !exam || saving) return;
    // A new review round takes the questions still wrong now, not the ones of the round just finished.
    if (this.set?.kind === "review") return this.open(cert.id, this.set, this.requestedLocale);
    this.store.saving();
    try {
      const attempt = await this.attempts.start({ certId: cert.id, examId: exam.id, questionCount: exam.questions.length });
      this.store.loaded(cert, exam, attempt, "question");
    } catch (e) {
      this.store.saveFailed({ code: "restart", detail: Controller.message(e) });
    }
  }
}
