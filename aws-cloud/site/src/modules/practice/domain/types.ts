// Shapes exchanged over the practice API. The static build and a future server return the same JSON.

export type CertificationId = string;
export type ExamId = string;
export type QuestionId = string;
export type OptionKey = string;
export type AttemptId = string;
/** Language of an exam's text. "en" is the original; others are translations. */
export type ContentLocale = "vi" | "en";

export interface Certification {
  id: CertificationId;
  /** Official exam code, e.g. "SAA-C03". */
  code: string;
  name: string;
  level: "Foundational" | "Associate" | "Professional" | "Specialty";
  /** Real exam format, shown next to the practice tests. */
  minutes: number;
  questionCount: number;
  /** Scaled passing score out of 1000. */
  passingScore: number;
  examCount: number;
}

export interface ExamSummary {
  id: ExamId;
  certId: CertificationId;
  number: number;
  title: string;
  questionCount: number;
  multiSelectCount: number;
}

export interface CertificationDetail extends Certification {
  exams: ExamSummary[];
}

export interface QuestionOption {
  key: OptionKey;
  html: string;
}

/** A lesson part (or lesson overview) that teaches a question, in both site languages. */
export interface LearnLink {
  url: string;
  title: { vi: string; en: string };
  lesson: { vi: string; en: string };
}

export interface Question {
  id: QuestionId;
  /** False when this question has no translation yet and shows the English original. */
  translated: boolean;
  /** 1-based position in the exam. */
  number: number;
  domain: string;
  /** How many options must be picked; more than 1 means "select N". */
  selectCount: number;
  promptHtml: string;
  options: QuestionOption[];
  correct: OptionKey[];
  explanationHtml: string;
  /** Where the lessons teach this question; attached by the content endpoints, absent in older data. */
  learn?: LearnLink[];
}

/** A set of questions to work through: a practice test, or every question about one service ("topic"). */
export type QuestionSetKind = "exam" | "topic";
export interface QuestionSetRef {
  kind: QuestionSetKind;
  /** Exam id, or the service id of a topic (e.g. "s3"). */
  id: string;
}

export interface Exam extends ExamSummary {
  locale: ContentLocale;
  /** Questions whose text is in `locale`; the rest fall back to the English original. */
  translatedCount: number;
  questions: Question[];
}

export interface AnswerRecord {
  questionId: QuestionId;
  chosen: OptionKey[];
  correct: boolean;
  answeredAt: string;
}

/** Shape version written into new attempts; records saved without one are version 1. */
export const ATTEMPT_VERSION = 1;

export interface Attempt {
  /** Record shape version (see ATTEMPT_VERSION); missing on attempts saved before it existed. */
  version?: number;
  id: AttemptId;
  certId: CertificationId;
  examId: ExamId;
  questionCount: number;
  answers: Record<QuestionId, AnswerRecord>;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface NewAttempt {
  certId: CertificationId;
  examId: ExamId;
  questionCount: number;
}

export interface AnswerInput {
  chosen: OptionKey[];
  correct: boolean;
}
