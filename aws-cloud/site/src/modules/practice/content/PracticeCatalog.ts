// Build-time only (uses fs). Never import from a client component.
// Serves the content behind the static /api/certifications… endpoints.
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import type { Certification, CertificationDetail, ContentLocale, Exam } from "../domain/types";
import type { ExamSource } from "./ExamSource";
import { QuizHtmlSource } from "./QuizHtmlSource";
import { getCurriculum, readListQa } from "../../../data/exam";

/** Every question about one service, as "examN_qM" references into the practice tests. */
export interface TopicConfig {
  id: string;
  title: string;
  refs: string[];
}

export interface CertificationConfig extends Omit<Certification, "examCount"> {
  source: ExamSource;
  /** Per-service question sets, built from the study folder's list_qa.md files. */
  topics?: () => TopicConfig[];
}

const REPO = resolve(process.cwd(), "../..");

/** Add a certification here, with a folder of practice tests, to list it on /practice/. */
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
    topics: () =>
      getCurriculum()
        .flatMap((l) => l.concepts)
        .map((c) => ({ id: c.id, title: c.title, refs: readListQa(c.id) ?? [] }))
        .filter((t) => t.refs.length > 0),
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
    return this.configs.map((config) => {
      const { source, topics, ...c } = config;
      return { ...c, examCount: this.examsOf(config).length };
    });
  }

  getCertification(certId: string): CertificationDetail {
    const config = this.config(certId);
    const { source, topics, ...cert } = config;
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

  private topicsOf(config: CertificationConfig): TopicConfig[] {
    return config.topics?.() ?? [];
  }

  /**
   * Opaque id of a question inside one topic set: a short hash of the topic and the original id, so
   * the topic JSON cannot be joined with the exam JSON on `id`. Stable across builds, so saved answers
   * survive rebuilds; the same question gets a different id in each topic.
   */
  static topicQuestionId(topicId: string, questionId: string): string {
    return "t" + createHash("sha256").update(`${topicId}\0${questionId}`).digest("hex").slice(0, 12);
  }

  /**
   * Every question about one service, numbered 1..N in study-path order. The practice-test references
   * (examN_qM) stay on the server, and each question gets an opaque id (`topicQuestionId`) and its
   * position in the set, so neither `id` nor `number` points back to an exam question.
   */
  getTopic(certId: string, topicId: string, locale: ContentLocale = "en"): Exam {
    const config = this.config(certId);
    const topic = this.topicsOf(config).find((t) => t.id === topicId);
    if (!topic) throw new Error(`Không có chủ đề ${certId}/${topicId}`);
    const exams = this.examsOf(config, locale);
    const seen = new Set<string>();
    const questions = topic.refs.map((ref, i) => {
      if (seen.has(ref)) throw new Error(`${topicId}/list_qa.md: ${ref} xuất hiện hai lần`);
      seen.add(ref);
      const [, n, m] = ref.match(/^exam(\d+)_q(\d+)$/)!;
      const q = exams.find((e) => e.number === Number(n))?.questions[Number(m) - 1];
      if (!q || q.number !== Number(m)) throw new Error(`${topicId}/list_qa.md: không tìm thấy ${ref}`);
      return { ...q, id: PracticeCatalog.topicQuestionId(topic.id, q.id), number: i + 1 };
    });
    return {
      id: `topic-${topic.id}`,
      certId,
      number: 0,
      title: topic.title,
      questionCount: questions.length,
      multiSelectCount: questions.filter((q) => q.selectCount > 1).length,
      locale,
      translatedCount: questions.filter((q) => q.translated).length,
      questions,
    };
  }

  /** Every (certId, topicId, lang) triple, for the topic content endpoint. */
  topicContentPaths(): Array<{ cert: string; topic: string; lang: ContentLocale }> {
    return this.configs.flatMap((c) =>
      this.topicsOf(c).flatMap((t) => PracticeCatalog.LOCALES.map((lang) => ({ cert: c.id, topic: t.id, lang }))),
    );
  }

  /** Question count of each service's set, keyed by service id. */
  topicSizes(certId: string): Record<string, number> {
    return Object.fromEntries(this.topicsOf(this.config(certId)).map((t) => [t.id, t.refs.length]));
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
