// Build-time only (uses fs). Never import from a client component.
import type { CertificationId, Exam } from "../domain/types";

/** Where a certification's practice exams come from. One subclass per file format. */
export abstract class ExamSource {
  /** Exams ordered by number, each with its questions. */
  abstract readExams(certId: CertificationId): Exam[];
}
