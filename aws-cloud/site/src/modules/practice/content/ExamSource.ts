// Build-time only (uses fs). Never import from a client component.
import type { CertificationId, ContentLocale, Exam } from "../domain/types";

/** Where a certification's practice exams come from. One subclass per file format. */
export abstract class ExamSource {
  /** Exams ordered by number, each with its questions in `locale` where a translation exists. */
  abstract readExams(certId: CertificationId, locale: ContentLocale): Exam[];
}
