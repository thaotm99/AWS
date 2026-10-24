import type { Certification, CertificationDetail, CertificationId, ContentLocale, Exam, Question, QuestionId, QuestionSetRef, Reveal } from "../domain/types";
import { Review } from "../domain/Review";
import { ApiService } from "../../../core/api/ApiService";

/** Certifications and their practice exams (read-only content). */
export class CatalogService extends ApiService {
  private readonly exams = new Map<string, Promise<Exam>>();
  private readonly questions = new Map<string, Promise<Question>>();
  /** Answer sides received this session; merged into question sets loaded before the answer was given. */
  private readonly reveals = new Map<QuestionId, Reveal>();

  remember(reveals: readonly Reveal[]): void {
    for (const r of reveals) this.reveals.set(r.questionId, r);
  }

  /** The set with every answer side known so far filled in (explanation in the set's language). */
  withReveals(exam: Exam): Exam;
  withReveals(exam: Exam | null): Exam | null;
  withReveals(exam: Exam | null): Exam | null {
    if (!exam || !exam.questions.some((q) => this.reveals.has(q.id) && !q.correct)) return exam;
    return {
      ...exam,
      questions: exam.questions.map((q) => {
        const r = this.reveals.get(q.id);
        if (!r || q.correct) return q;
        const explanationHtml = (exam.locale === "vi" && q.translated && r.explanationHtml.vi) || r.explanationHtml.en;
        return { ...q, correct: r.correct, explanationHtml, learn: r.learn };
      }),
    };
  }

  listCertifications(): Promise<Certification[]> {
    return this.api.get<Certification[]>("/certifications");
  }

  getCertification(certId: CertificationId): Promise<CertificationDetail> {
    return this.api.get<CertificationDetail>(ApiService.path("certifications", certId));
  }

  /**
   * A practice test or a service's question set. They are large and never change during a
   * session, so each is fetched once.
   */
  getQuestionSet(certId: CertificationId, set: QuestionSetRef, locale: ContentLocale): Promise<Exam> {
    const collection = set.kind === "topic" ? "topics" : "exams";
    const key = `${certId}/${collection}/${set.id}/${locale}`;
    let exam = this.exams.get(key);
    if (!exam) {
      exam = this.api.get<Exam>(ApiService.path("certifications", certId, collection, set.id, locale));
      exam.catch(() => this.exams.delete(key));
      this.exams.set(key, exam);
    }
    return exam.then((e) => this.withReveals(e));
  }

  /** One question (about 5 kB), fetched once per session. */
  private getQuestion(certId: CertificationId, id: QuestionId, locale: ContentLocale): Promise<Question> {
    const key = `${certId}/${id}/${locale}`;
    let q = this.questions.get(key);
    if (!q) {
      q = this.api.get<Question>(ApiService.path("certifications", certId, "questions", id, locale));
      q.catch(() => this.questions.delete(key));
      this.questions.set(key, q);
    }
    return q;
  }

  /** The review set: the given questions in that order, loaded one by one rather than as whole tests. */
  async getReviewSet(certId: CertificationId, ids: readonly QuestionId[], locale: ContentLocale): Promise<Exam> {
    const loaded = await Promise.all(ids.map((id) => this.getQuestion(certId, id, locale)));
    const questions = loaded.map((q, i) => ({ ...q, number: i + 1 }));
    return {
      id: Review.SET_ID,
      certId,
      number: 0,
      title: "",
      questionCount: questions.length,
      multiSelectCount: questions.filter((q) => q.selectCount > 1).length,
      locale,
      translatedCount: questions.filter((q) => q.translated).length,
      questions,
    };
  }
}
