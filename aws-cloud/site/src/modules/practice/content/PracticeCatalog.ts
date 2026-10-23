// Build-time only (uses fs). Never import from a client component.
// Serves the content behind the static /api/certifications… endpoints.
import { resolve } from "node:path";
import type { Certification, CertificationDetail, ContentLocale, Exam, Question } from "../domain/types";
import type { ExamSource } from "./ExamSource";
import { QuizHtmlSource } from "./QuizHtmlSource";
import { getCurriculum, readListQa } from "../../../data/exam";
import type { SkillMapData } from "../domain/Skills";

/** Every question about one service, as "examN_qM" references into the practice tests. */
export interface TopicConfig {
  id: string;
  title: string;
  titleEn?: string;
  refs: string[];
}

export interface CertificationConfig extends Omit<Certification, "examCount"> {
  source: ExamSource;
  /** Per-service question sets, built from the study folder's list_qa.md files. */
  topics?: () => TopicConfig[];
  /** Exam domains (English names, as in the practice tests) and their share of the exam, from the exam guide. */
  domains?: { name: string; weight: number }[];
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
    // SAA-C03 exam guide, content domains and weighting.
    domains: [
      { name: "Design Secure Architectures", weight: 0.3 },
      { name: "Design Resilient Architectures", weight: 0.26 },
      { name: "Design High-Performing Architectures", weight: 0.24 },
      { name: "Design Cost-Optimized Architectures", weight: 0.2 },
    ],
    topics: () =>
      getCurriculum()
        .flatMap((l) => l.concepts)
        .map((c) => ({ id: c.id, title: c.title, titleEn: c.titleEn, refs: readListQa(c.id) ?? [] }))
        .filter((t) => t.refs.length > 0),
  },
];

export class PracticeCatalog {
  private readonly exams = new Map<string, Exam[]>();
  /** Topic lists by certification id: building one reads every list_qa.md, so it happens once per build. */
  private readonly topics = new Map<string, TopicConfig[]>();

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
      const { source, topics, domains, ...c } = config;
      return { ...c, examCount: this.examsOf(config).length };
    });
  }

  getCertification(certId: string): CertificationDetail {
    const config = this.config(certId);
    const { source, topics, domains, ...cert } = config;
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
    let topics = this.topics.get(config.id);
    if (!topics) this.topics.set(config.id, (topics = config.topics?.() ?? []));
    return topics;
  }

  /**
   * Every question about one service, numbered 1..N in study-path order. The practice-test references
   * (examN_qM) stay on the server. Questions keep their original id, so answers and illustrations are
   * looked up the same way as on the practice tests (the question text is the same in both anyway).
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
      return { ...q, number: i + 1 };
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

  /**
   * The exam domain and the lesson topic of every question, for the skill map. A question listed under
   * several topics belongs to the first in study-path order.
   */
  skillMap(certId: string): SkillMapData {
    const config = this.config(certId);
    const domains = config.domains ?? [];
    const topicOf = new Map<string, string>();
    for (const t of this.topicsOf(config)) for (const ref of t.refs) if (!topicOf.has(ref)) topicOf.set(ref, t.id);
    const questions: SkillMapData["questions"] = {};
    for (const exam of this.examsOf(config)) {
      for (const q of exam.questions) {
        const d = domains.findIndex((x) => x.name === q.domain);
        if (d >= 0) questions[q.id] = [d, topicOf.get(`exam${exam.number}_q${q.number}`) ?? null];
      }
    }
    const topics = this.topicsOf(config).map((t) => ({ id: t.id, title: { vi: t.title, en: t.titleEn ?? t.title } }));
    return { domains, questions, topics };
  }

  /** Question count of each service's set, keyed by service id. */
  topicSizes(certId: string): Record<string, number> {
    return Object.fromEntries(this.topicsOf(this.config(certId)).map((t) => [t.id, t.refs.length]));
  }

  /** One question in `locale`, for the review set (it loads only the questions the learner got wrong). */
  getQuestion(certId: string, questionId: string, locale: ContentLocale = "en"): Question {
    for (const exam of this.examsOf(this.config(certId), locale)) {
      const q = exam.questions.find((x) => x.id === questionId);
      if (q) return q;
    }
    throw new Error(`Không có câu hỏi ${certId}/${questionId}`);
  }

  /** Every (certId, questionId, lang) triple, for the single-question endpoint. */
  questionContentPaths(): Array<{ cert: string; question: string; lang: ContentLocale }> {
    return this.configs.flatMap((c) =>
      this.examsOf(c).flatMap((e) => e.questions.flatMap((q) => PracticeCatalog.LOCALES.map((lang) => ({ cert: c.id, question: q.id, lang })))),
    );
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
