// Practice-test content read from Postgres. A question's correct options, explanation and lesson links
// are only included once the learner has answered it (in any attempt); before that the client gets the
// prompt and options only, and the server grades the answer.
import { one, query } from "../db";
import { HttpError } from "../http";

export type Lang = "vi" | "en";
export const LANGS: Lang[] = ["vi", "en"];

export interface QuestionRow {
  id: string;
  cert_id: string;
  set_id: string;
  position: number;
  domain: string | null;
  select_count: number;
  content_en: { promptHtml: string; options: { key: string; html: string }[] };
  content_vi: { promptHtml: string; options: { key: string; html: string }[] } | null;
  correct: string[];
  explanation_en: string;
  explanation_vi: string | null;
  learn: unknown[];
}

const QUESTION_COLUMNS = `q.id, q.cert_id, q.set_id, q.position, d.name as domain, q.select_count, q.content_en, q.content_vi,
  q.correct, q.explanation_en, q.explanation_vi, q.learn`;
const FROM_QUESTIONS = `from questions q left join cert_domains d on d.cert_id = q.cert_id and d.id = q.domain_id`;

export function lang(value: string): Lang {
  if (!LANGS.includes(value as Lang)) throw new HttpError(404, "unsupported_language", "Unsupported language");
  return value as Lang;
}

/** The answer side of a question, sent once the learner has answered it. */
export function reveal(r: QuestionRow) {
  return { questionId: r.id, correct: r.correct, explanationHtml: { en: r.explanation_en, vi: r.explanation_vi }, learn: r.learn };
}

/** A question in the client's shape; the answer side only when `revealed`. */
export function toQuestion(r: QuestionRow, locale: Lang, revealed: boolean, number = r.position) {
  const vi = locale === "vi" ? r.content_vi : null;
  const content = vi ?? r.content_en;
  const base = {
    id: r.id,
    translated: locale === "en" || vi !== null,
    number,
    domain: r.domain ?? "",
    selectCount: r.select_count,
    promptHtml: content.promptHtml,
    options: content.options,
  };
  if (!revealed) return base;
  return { ...base, correct: r.correct, explanationHtml: (vi && r.explanation_vi) || r.explanation_en, learn: r.learn };
}

/** Ids of the questions this learner has answered at least once in this certification. */
export async function answeredIds(userId: string, certId: string): Promise<Set<string>> {
  const rows = await query<{ question_id: string }>(
    `select distinct aa.question_id from attempt_answers aa join attempts a on a.id = aa.attempt_id where a.user_id = $1 and a.cert_id = $2`,
    [userId, certId],
  );
  return new Set(rows.map((r) => r.question_id));
}

export async function setQuestions(certId: string, setId: string): Promise<QuestionRow[]> {
  return query<QuestionRow>(`select ${QUESTION_COLUMNS} ${FROM_QUESTIONS} where q.cert_id = $1 and q.set_id = $2 order by q.position`, [certId, setId]);
}

export async function topicQuestions(certId: string, topicId: string): Promise<QuestionRow[]> {
  return query<QuestionRow>(
    `select ${QUESTION_COLUMNS} ${FROM_QUESTIONS} join question_topics t on t.question_id = q.id
      where t.cert_id = $1 and t.topic_id = $2 order by t.position`,
    [certId, topicId],
  );
}

export async function questionById(certId: string, id: string): Promise<QuestionRow | undefined> {
  return one<QuestionRow>(`select ${QUESTION_COLUMNS} ${FROM_QUESTIONS} where q.cert_id = $1 and q.id = $2`, [certId, id]);
}

/**
 * The questions an attempt may answer: the practice test ("1"…), a mock exam of it ("mock-1"), a lesson's
 * set ("topic-s3"), or for the review set ("review") any question of the certification.
 */
export async function attemptQuestionIds(certId: string, examId: string): Promise<string[] | "any"> {
  if (examId === "review") return "any";
  const rows = examId.startsWith("topic-")
    ? await query<{ id: string }>(`select question_id as id from question_topics where cert_id = $1 and topic_id = $2 order by position`, [certId, examId.slice(6)])
    : await query<{ id: string }>(`select id from questions where cert_id = $1 and set_id = $2 order by position`, [certId, examId.replace(/^mock-/, "")]);
  if (!rows.length) throw new HttpError(404, "unknown_set", "Unknown question set");
  return rows.map((r) => r.id);
}

/** Counts a request against the learner's hourly budget for `bucket`; 429 once it is spent. */
export async function rateLimit(userId: string, bucket: string, perHour: number): Promise<void> {
  const row = await one<{ count: number }>(
    `insert into rate_limits (user_id, bucket, window_start, count) values ($1, $2, date_trunc('hour', now()), 1)
     on conflict (user_id, bucket, window_start) do update set count = rate_limits.count + 1 returning count`,
    [userId, bucket],
  );
  if ((row?.count ?? 0) > perHour) throw new HttpError(429, "rate_limited", "Too many requests, try again later", { "Retry-After": "600" });
}

export async function audit(userId: string, action: string, target: string): Promise<void> {
  await query(`insert into audit_log (user_id, action, target) values ($1, $2, $3)`, [userId, action, target]);
}
