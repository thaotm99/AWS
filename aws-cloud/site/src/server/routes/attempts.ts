// /api/attempts: the learner's attempts at practice tests, lesson sets, the review set and mock exams.
// The server grades every answer; the response carries the attempt and the answer side of the question
// (correct options, explanation, lesson links), which the client could not see before answering.
// /api/mock-drafts: a mock exam in progress (answers can change until it is handed in).
import { one, query, transaction, type Queryable } from "../db";
import { HttpError, json, noContent, readJson } from "../http";
import type { Route } from "../router";
import { requireSession } from "../auth/session";
import { attemptQuestionIds, questionById, reveal, type QuestionRow } from "../practice/content";

interface AttemptRow {
  id: string;
  cert_id: string;
  exam_id: string;
  question_count: number;
  started_at: Date;
  updated_at: Date;
  finished_at: Date | null;
}

interface AnswerRow {
  attempt_id: string;
  question_id: string;
  chosen: string[];
  correct: boolean;
  answered_at: Date;
}

const ATTEMPT_COLUMNS = `id, cert_id, exam_id, question_count, started_at, updated_at, finished_at`;
const MAX_REVIEW = 100;

function toAttempt(a: AttemptRow, answers: AnswerRow[]) {
  return {
    version: 1,
    id: a.id,
    certId: a.cert_id,
    examId: a.exam_id,
    questionCount: a.question_count,
    answers: Object.fromEntries(
      answers.map((r) => [r.question_id, { questionId: r.question_id, chosen: r.chosen, correct: r.correct, answeredAt: r.answered_at.toISOString() }]),
    ),
    startedAt: a.started_at.toISOString(),
    updatedAt: a.updated_at.toISOString(),
    finishedAt: a.finished_at?.toISOString() ?? null,
  };
}

/** The attempts with their answers; inside a transaction when `db` is given. */
async function withAnswers(attempts: AttemptRow[], db?: Queryable) {
  if (!attempts.length) return [];
  const sql = `select attempt_id, question_id, chosen, correct, answered_at from attempt_answers where attempt_id = any($1::uuid[]) order by answered_at`;
  const ids = [attempts.map((a) => a.id)];
  const rows = db ? (await db.query<AnswerRow>(sql, ids)).rows : await query<AnswerRow>(sql, ids);
  return attempts.map((a) => toAttempt(a, rows.filter((r) => r.attempt_id === a.id)));
}

async function ownAttempt(db: Queryable, userId: string, id: string, lock = false): Promise<AttemptRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "attempt_not_found", "Attempt not found");
  const { rows } = await db.query<AttemptRow>(`select ${ATTEMPT_COLUMNS} from attempts where id = $1 and user_id = $2${lock ? " for update" : ""}`, [id, userId]);
  if (!rows[0]) throw new HttpError(404, "attempt_not_found", "Attempt not found");
  return rows[0];
}

function chosenKeys(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 8 || !value.every((k) => typeof k === "string" && /^[A-Za-z0-9]{1,4}$/.test(k))) {
    throw new HttpError(400, "bad_answer", "chosen must be a list of option keys");
  }
  return [...new Set(value as string[])].sort();
}

function isCorrect(q: QuestionRow, chosen: string[]): boolean {
  return chosen.length === q.correct.length && q.correct.every((k) => chosen.includes(k));
}

/** Records one graded answer; finishes the attempt when every question has one. */
async function record(db: Queryable, attempt: AttemptRow, q: QuestionRow, chosen: string[]): Promise<boolean> {
  const { rowCount } = await db.query(
    `insert into attempt_answers (attempt_id, question_id, chosen, correct) values ($1, $2, $3, $4) on conflict do nothing`,
    [attempt.id, q.id, JSON.stringify(chosen), isCorrect(q, chosen)],
  );
  return rowCount === 1;
}

async function touch(db: Queryable, attempt: AttemptRow): Promise<void> {
  await db.query(
    `update attempts set updated_at = now(),
       finished_at = case when finished_at is null and (select count(*) from attempt_answers where attempt_id = $1) >= question_count then now() else finished_at end
     where id = $1`,
    [attempt.id],
  );
}

async function questionFor(certId: string, examId: string, questionId: string): Promise<QuestionRow> {
  const allowed = await attemptQuestionIds(certId, examId);
  const q = allowed === "any" || allowed.includes(questionId) ? await questionById(certId, questionId) : undefined;
  if (!q) throw new HttpError(404, "unknown_question", "The question is not part of this attempt");
  return q;
}

async function reload(db: Queryable, id: string) {
  const { rows } = await db.query<AttemptRow>(`select ${ATTEMPT_COLUMNS} from attempts where id = $1`, [id]);
  return (await withAnswers(rows, db))[0];
}

interface Draft {
  startedAt: number;
  answers: Record<string, string[]>;
  flags: string[];
  index: number;
}

export const attemptRoutes: Route[] = [
  {
    method: "GET",
    pattern: "/api/attempts",
    handler: async ({ request, url }) => {
      const { user } = await requireSession(request);
      const certId = url.searchParams.get("certId");
      const examId = url.searchParams.get("examId");
      const rows = await query<AttemptRow>(
        `select ${ATTEMPT_COLUMNS} from attempts where user_id = $1 and ($2::text is null or cert_id = $2) and ($3::text is null or exam_id = $3)
          order by started_at desc`,
        [user.id, certId, examId],
      );
      return json(await withAnswers(rows));
    },
  },
  {
    method: "GET",
    pattern: "/api/attempts/latest",
    handler: async ({ request, url }) => {
      const { user } = await requireSession(request);
      const row = await one<AttemptRow>(
        `select ${ATTEMPT_COLUMNS} from attempts where user_id = $1 and cert_id = $2 and exam_id = $3 order by started_at desc limit 1`,
        [user.id, url.searchParams.get("certId"), url.searchParams.get("examId")],
      );
      // null rather than 404: no attempt yet is an ordinary answer, not an error in the console.
      return json(row ? (await withAnswers([row]))[0] : null);
    },
  },
  {
    method: "POST",
    pattern: "/api/attempts",
    handler: async ({ request }) => {
      const { user } = await requireSession(request);
      const body = await readJson<{ certId?: string; examId?: string; questionCount?: number }>(request);
      if (typeof body.certId !== "string" || typeof body.examId !== "string") throw new HttpError(400, "bad_attempt", "certId and examId are required");
      const allowed = await attemptQuestionIds(body.certId, body.examId);
      const count = allowed === "any" ? Number(body.questionCount) : allowed.length;
      // Fixed sets are counted by the server; only a review round takes its size from the client.
      if (!Number.isInteger(count) || count < 1 || (allowed === "any" && count > MAX_REVIEW)) throw new HttpError(400, "bad_attempt", "questionCount is out of range");
      const row = await one<AttemptRow>(
        `insert into attempts (id, user_id, cert_id, exam_id, question_count) values ($1, $2, $3, $4, $5) returning ${ATTEMPT_COLUMNS}`,
        [crypto.randomUUID(), user.id, body.certId, body.examId, count],
      );
      return json(toAttempt(row!, []), 201);
    },
  },
  {
    // "Reset progress": every attempt of the learner (or of one certification).
    method: "DELETE",
    pattern: "/api/attempts",
    handler: async ({ request, url }) => {
      const { user } = await requireSession(request);
      await query(`delete from attempts where user_id = $1 and ($2::text is null or cert_id = $2)`, [user.id, url.searchParams.get("certId")]);
      return noContent();
    },
  },
  {
    method: "PUT",
    pattern: "/api/attempts/:id/answers/:question",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const { chosen } = await readJson<{ chosen?: unknown }>(request);
      const keys = chosenKeys(chosen);
      return json(
        await transaction(async (db) => {
          const attempt = await ownAttempt(db, user.id, params.id, true);
          const q = await questionFor(attempt.cert_id, attempt.exam_id, params.question);
          if (keys.length !== q.select_count) throw new HttpError(400, "bad_answer", `Choose ${q.select_count} option(s)`);
          if (!(await record(db, attempt, q, keys))) throw new HttpError(409, "already_answered", "Question already answered");
          await touch(db, attempt);
          return { attempt: await reload(db, attempt.id), reveal: reveal(q) };
        }),
      );
    },
  },
  {
    // Hands in a mock exam: every question of the set is graded at once; unanswered ones count as wrong.
    method: "POST",
    pattern: "/api/attempts/:id/submit",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const { answers } = await readJson<{ answers?: Record<string, unknown> }>(request);
      if (!answers || typeof answers !== "object") throw new HttpError(400, "bad_answer", "answers is required");
      return json(
        await transaction(async (db) => {
          const attempt = await ownAttempt(db, user.id, params.id, true);
          const allowed = await attemptQuestionIds(attempt.cert_id, attempt.exam_id);
          if (allowed === "any") throw new HttpError(400, "bad_attempt", "Only a fixed question set can be handed in");
          const reveals = [];
          for (const id of allowed) {
            const q = (await questionById(attempt.cert_id, id))!;
            const raw = answers[id];
            const keys = raw === undefined ? [] : chosenKeys(raw);
            await record(db, attempt, q, keys.length > q.select_count ? [] : keys);
            reveals.push(reveal(q));
          }
          await touch(db, attempt);
          await db.query(`delete from mock_sessions where user_id = $1 and cert_id = $2 and set_id = $3 and submitted_at is null`, [
            user.id, attempt.cert_id, attempt.exam_id.replace(/^mock-/, ""),
          ]);
          return { attempt: await reload(db, attempt.id), reveals };
        }),
      );
    },
  },
  {
    method: "GET",
    pattern: "/api/mock-drafts/:cert/:exam",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const row = await one<{ started_at: Date; answers: Draft["answers"]; flags: string[]; position: number }>(
        `select started_at, answers, flags, position from mock_sessions where user_id = $1 and cert_id = $2 and set_id = $3 and submitted_at is null`,
        [user.id, params.cert, params.exam],
      );
      if (!row) return json(null);
      return json({ startedAt: row.started_at.getTime(), answers: row.answers, flags: row.flags, index: row.position } satisfies Draft);
    },
  },
  {
    method: "PUT",
    pattern: "/api/mock-drafts/:cert/:exam",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const d = await readJson<Partial<Draft>>(request, 64 * 1024);
      if (typeof d.startedAt !== "number" || !d.answers || typeof d.answers !== "object" || !Array.isArray(d.flags) || typeof d.index !== "number") {
        throw new HttpError(400, "bad_draft", "startedAt, answers, flags and index are required");
      }
      const answers = Object.fromEntries(Object.entries(d.answers).map(([id, keys]) => [id, chosenKeys(keys)]));
      const flags = d.flags.filter((f): f is string => typeof f === "string").slice(0, 200);
      if (!(await one(`select 1 from practice_sets where cert_id = $1 and id = $2`, [params.cert, params.exam]))) throw new HttpError(404, "unknown_set", "Unknown practice test");
      await query(
        `insert into mock_sessions (id, user_id, cert_id, set_id, started_at, answers, flags, position)
         values ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6, $7, $8)
         on conflict (user_id, cert_id, set_id) where submitted_at is null
         do update set started_at = excluded.started_at, answers = excluded.answers, flags = excluded.flags, position = excluded.position`,
        [crypto.randomUUID(), user.id, params.cert, params.exam, d.startedAt, JSON.stringify(answers), JSON.stringify(flags), Math.max(0, Math.floor(d.index))],
      );
      return noContent();
    },
  },
  {
    method: "DELETE",
    pattern: "/api/mock-drafts/:cert/:exam",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      await query(`delete from mock_sessions where user_id = $1 and cert_id = $2 and set_id = $3 and submitted_at is null`, [user.id, params.cert, params.exam]);
      return noContent();
    },
  },
];
