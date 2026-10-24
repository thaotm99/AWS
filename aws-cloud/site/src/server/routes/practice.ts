// /api/certifications/*: certifications, practice tests, lesson question sets, the review set's single
// questions and the skill map, all from Postgres and only for signed-in learners. Reading a question
// set is rate-limited and written to the audit log.
import { one, query } from "../db";
import { HttpError, json } from "../http";
import type { Route } from "../router";
import { requireSession } from "../auth/session";
import { answeredIds, audit, lang, questionById, rateLimit, setQuestions, toQuestion, topicQuestions, type Lang, type QuestionRow } from "../practice/content";

/** Question sets (65 questions each at most) and single questions a learner may load per hour. */
const SETS_PER_HOUR = 150;
const QUESTIONS_PER_HOUR = 1200;

interface CertRow {
  id: string;
  code: string;
  name: string;
  level: string;
  minutes: number;
  question_count: number;
  passing_score: number;
  exam_count: number;
}

const CERT_SELECT = `select c.id, c.code, c.name, c.level, c.minutes, c.question_count, c.passing_score,
  (select count(*)::int from practice_sets s where s.cert_id = c.id) as exam_count from certifications c`;

function certification(r: CertRow) {
  return { id: r.id, code: r.code, name: r.name, level: r.level, minutes: r.minutes, questionCount: r.question_count, passingScore: r.passing_score, examCount: r.exam_count };
}

async function certOrThrow(certId: string): Promise<CertRow> {
  const row = await one<CertRow>(`${CERT_SELECT} where c.id = $1 and c.status <> 'retired'`, [certId]);
  if (!row) throw new HttpError(404, "unknown_cert", "Unknown certification");
  return row;
}

function questionSet(certId: string, head: { id: string; number: number; title: string }, rows: QuestionRow[], locale: Lang, answered: Set<string>, renumber: boolean) {
  const questions = rows.map((r, i) => toQuestion(r, locale, answered.has(r.id), renumber ? i + 1 : r.position));
  return {
    ...head,
    certId,
    questionCount: questions.length,
    multiSelectCount: questions.filter((q) => q.selectCount > 1).length,
    locale,
    translatedCount: questions.filter((q) => q.translated).length,
    questions,
  };
}

export const practiceRoutes: Route[] = [
  {
    method: "GET",
    pattern: "/api/certifications",
    handler: async ({ request }) => {
      await requireSession(request);
      return json((await query<CertRow>(`${CERT_SELECT} where c.status <> 'retired' order by c.id`)).map(certification));
    },
  },
  {
    method: "GET",
    pattern: "/api/certifications/:cert",
    handler: async ({ request, params }) => {
      await requireSession(request);
      const cert = await certOrThrow(params.cert);
      const exams = await query<{ id: string; number: number; title: string; question_count: number; multi_select_count: number }>(
        `select id, number, title, question_count, multi_select_count from practice_sets where cert_id = $1 order by number`,
        [cert.id],
      );
      return json({
        ...certification(cert),
        exams: exams.map((e) => ({ id: e.id, certId: cert.id, number: e.number, title: e.title, questionCount: e.question_count, multiSelectCount: e.multi_select_count })),
      });
    },
  },
  {
    method: "GET",
    pattern: "/api/certifications/:cert/exams/:exam/:lang",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const locale = lang(params.lang);
      const set = await one<{ id: string; number: number; title: string }>(`select id, number, title from practice_sets where cert_id = $1 and id = $2`, [params.cert, params.exam]);
      if (!set) throw new HttpError(404, "unknown_set", "Unknown practice test");
      await rateLimit(user.id, "practice.set", SETS_PER_HOUR);
      const [rows, answered] = await Promise.all([setQuestions(params.cert, set.id), answeredIds(user.id, params.cert)]);
      await audit(user.id, "practice.read", `${params.cert}/exam/${set.id}/${locale}`);
      return json(questionSet(params.cert, set, rows, locale, answered, false));
    },
  },
  {
    method: "GET",
    pattern: "/api/certifications/:cert/topics/:topic/:lang",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const locale = lang(params.lang);
      const topic = await one<{ title_vi: string }>(`select title_vi from cert_topics where cert_id = $1 and id = $2`, [params.cert, params.topic]);
      if (!topic) throw new HttpError(404, "unknown_set", "Unknown lesson set");
      await rateLimit(user.id, "practice.set", SETS_PER_HOUR);
      const [rows, answered] = await Promise.all([topicQuestions(params.cert, params.topic), answeredIds(user.id, params.cert)]);
      await audit(user.id, "practice.read", `${params.cert}/topic/${params.topic}/${locale}`);
      return json(questionSet(params.cert, { id: `topic-${params.topic}`, number: 0, title: topic.title_vi }, rows, locale, answered, true));
    },
  },
  {
    // One question, for the review set; only questions the learner has already answered.
    method: "GET",
    pattern: "/api/certifications/:cert/questions/:question/:lang",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const locale = lang(params.lang);
      await rateLimit(user.id, "practice.question", QUESTIONS_PER_HOUR);
      const [row, answered] = await Promise.all([questionById(params.cert, params.question), answeredIds(user.id, params.cert)]);
      if (!row || !answered.has(row.id)) throw new HttpError(404, "unknown_question", "Unknown question");
      return json(toQuestion(row, locale, true));
    },
  },
  {
    // The exam domain and lesson of every question (no question text), for the skill map.
    method: "GET",
    pattern: "/api/certifications/:cert/skills",
    handler: async ({ request, params }) => {
      await requireSession(request);
      await certOrThrow(params.cert);
      const [domains, topics, questions] = await Promise.all([
        query<{ name: string; weight: string }>(`select name, weight from cert_domains where cert_id = $1 order by position`, [params.cert]),
        query<{ id: string; title_vi: string; title_en: string }>(`select id, title_vi, title_en from cert_topics where cert_id = $1 order by position`, [params.cert]),
        // A question in several lessons belongs to the first in study-path order.
        query<{ id: string; domain: number; topic: string | null }>(
          `select q.id, d.position as domain,
             (select t.topic_id from question_topics t join cert_topics ct on ct.cert_id = t.cert_id and ct.id = t.topic_id
               where t.question_id = q.id order by ct.position limit 1) as topic
             from questions q join cert_domains d on d.cert_id = q.cert_id and d.id = q.domain_id where q.cert_id = $1`,
          [params.cert],
        ),
      ]);
      return json({
        domains: domains.map((d) => ({ name: d.name, weight: Number(d.weight) })),
        questions: Object.fromEntries(questions.map((q) => [q.id, [q.domain, q.topic]])),
        topics: topics.map((t) => ({ id: t.id, title: { vi: t.title_vi, en: t.title_en } })),
      });
    },
  },
];
