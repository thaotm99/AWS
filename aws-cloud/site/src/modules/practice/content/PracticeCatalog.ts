// Build-time only (uses fs). Never import from a client component.
// Serves the content behind the static /api/certifications… endpoints.
import { resolve } from "node:path";
import type { Certification, CertificationDetail, ContentLocale, Exam } from "../domain/types";
import type { ExamSource } from "./ExamSource";
import { QuizHtmlSource } from "./QuizHtmlSource";

export interface CertificationConfig extends Omit<Certification, "examCount"> {
  source: ExamSource;
}

const REPO = resolve(process.cwd(), "../..");

/** Add a certification here, with a folder of practice tests, to list it on /on-tap/. */
export const CERTIFICATIONS: CertificationConfig[] = [
  {
    id: "saa-c03",
    code: "SAA-C03",
    name: "Solutions Architect – Associate",
    level: "Associate",
    minutes: 130,
    questionCount: 65,
    passingScore: 720,
    source: new QuizHtmlSource(resolve(REPO, "solution-architect-aws")),
  },
];

export class PracticeCatalog {
  private readonly exams = new Map<string, Exam[]>();

  constructor(private readonly configs: CertificationConfig[]) {}

  /** Content languages every exam is published in; "en" is the original. */
  static readonly LOCALES: ContentLocale[] = ["vi", "en"];

  private examsOf(config: CertificationConfig, locale: ContentLocale = "en"): Exam[] {
    const key = `${config.id}/${locale}`;
    let exams = this.exams.get(key);
    if (!exams) this.exams.set(key, (exams = config.source.readExams(config.id, locale)));
    return exams;
  }

  private config(certId: string): CertificationConfig {
    const config = this.configs.find((c) => c.id === certId);
    if (!config) throw new Error(`Không có chứng chỉ ${certId}`);
    return config;
  }

  listCertifications(): Certification[] {
    return this.configs.map(({ source, ...c }) => ({ ...c, examCount: this.examsOf({ source, ...c }).length }));
  }

  getCertification(certId: string): CertificationDetail {
    const config = this.config(certId);
    const { source, ...cert } = config;
    const exams = this.examsOf(config);
    return {
      ...cert,
      examCount: exams.length,
      exams: exams.map(({ questions, locale, translatedCount, ...summary }) => summary),
    };
  }

  getExam(certId: string, examId: string, locale: ContentLocale = "en"): Exam {
    const exam = this.examsOf(this.config(certId), locale).find((e) => e.id === examId);
    if (!exam) throw new Error(`Không có đề ${certId}/${examId}`);
    return exam;
  }

  /** Every (certId, examId) pair, for getStaticPaths. */
  examPaths(): Array<{ cert: string; exam: string }> {
    return this.configs.flatMap((c) => this.examsOf(c).map((e) => ({ cert: c.id, exam: e.id })));
  }

  /** Every (certId, examId, lang) triple, for the exam content endpoint. */
  examContentPaths(): Array<{ cert: string; exam: string; lang: ContentLocale }> {
    return this.examPaths().flatMap((p) => PracticeCatalog.LOCALES.map((lang) => ({ ...p, lang })));
  }
}

export const practiceCatalog = new PracticeCatalog(CERTIFICATIONS);
