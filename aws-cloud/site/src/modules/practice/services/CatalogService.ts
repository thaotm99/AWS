import type { Certification, CertificationDetail, CertificationId, Exam, ExamId } from "../domain/types";
import { ApiService } from "../../../core/api/ApiService";

/** Certifications and their practice exams (read-only content). */
export class CatalogService extends ApiService {
  private readonly exams = new Map<string, Promise<Exam>>();

  listCertifications(): Promise<Certification[]> {
    return this.api.get<Certification[]>("/certifications");
  }

  getCertification(certId: CertificationId): Promise<CertificationDetail> {
    return this.api.get<CertificationDetail>(ApiService.path("certifications", certId));
  }

  /** Exams are large and never change during a session, so each is fetched once. */
  getExam(certId: CertificationId, examId: ExamId): Promise<Exam> {
    const key = `${certId}/${examId}`;
    let exam = this.exams.get(key);
    if (!exam) {
      exam = this.api.get<Exam>(ApiService.path("certifications", certId, "exams", examId));
      exam.catch(() => this.exams.delete(key));
      this.exams.set(key, exam);
    }
    return exam;
  }
}
