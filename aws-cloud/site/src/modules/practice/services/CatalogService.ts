import type { Certification, CertificationDetail, CertificationId, ContentLocale, Exam, Question, QuestionId, QuestionSetRef } from "../domain/types";
import { Review } from "../domain/Review";
import { ApiService } from "../../../core/api/ApiService";

/** Certifications and their practice exams (read-only content). */
export class CatalogService extends ApiService {
  private readonly exams = new Map<string, Promise<Exam>>();
  private readonly questions = new Map<string, Promise<Question>>();

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
    return exam;
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
