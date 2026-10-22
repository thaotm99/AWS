// Build-time only (uses fs). Never import from a client component.
// Serves the content behind the static /api/certifications… endpoints.
import { resolve } from "node:path";
import type { Certification, CertificationDetail, Exam } from "../domain/types";
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

  private examsOf(config: CertificationConfig): Exam[] {
    let exams = this.exams.get(config.id);
    if (!exams) this.exams.set(config.id, (exams = config.source.readExams(config.id)));
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
    return { ...cert, examCount: exams.length, exams: exams.map(({ questions, ...summary }) => summary) };
  }

  getExam(certId: string, examId: string): Exam {
    const exam = this.examsOf(this.config(certId)).find((e) => e.id === examId);
    if (!exam) throw new Error(`Không có đề ${certId}/${examId}`);
    return exam;
  }

  /** Every (certId, examId) pair, for getStaticPaths. */
  examPaths(): Array<{ cert: string; exam: string }> {
    return this.configs.flatMap((c) => this.examsOf(c).map((e) => ({ cert: c.id, exam: e.id })));
  }
}

export const practiceCatalog = new PracticeCatalog(CERTIFICATIONS);
