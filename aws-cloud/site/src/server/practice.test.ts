// Practice tests from Postgres: answers stay on the server until the learner answers, the server
// grades, attempts belong to their owner, mock exams are handed in at once.
// Needs DATABASE_URL with db/migrations applied and the questions imported (npm run db:import).
// Run: DATABASE_URL=postgres://… npx tsx src/server/practice.test.ts
import assert from "node:assert/strict";

if (!process.env.DATABASE_URL) {
  console.log("practice.test: skipped (no DATABASE_URL)");
  process.exit(0);
}
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret!";
process.env.AUTH_DEV_LOGIN = "1"; // accounts on: practice routes answer 404 while they are off

const { handle } = await import("./routes/index");
const { closeDb, query } = await import("./db");
const { startSession } = await import("./auth/session");

const SITE = "http://site.test";
const CERT = "saa-c03";

if (!(await query(`select 1 from questions where cert_id = $1 limit 1`, [CERT])).length) {
  console.log("practice.test: skipped (no questions imported)");
  await closeDb();
  process.exit(0);
}

async function learner(id: string): Promise<string> {
  await query(`insert into users (id, email) values ($1, $2) on conflict do nothing`, [id, `${id}@example.com`]);
  return (await startSession(new Request(SITE), id)).map((c) => c.split(";")[0]).join("; ");
}

function call(cookie: string, method: string, path: string, body?: unknown): Promise<Response> {
  return handle(new Request(`${SITE}${path}`, { method, headers: { cookie, origin: SITE }, body: body === undefined ? undefined : JSON.stringify(body) }));
}

try {
  await query(`delete from users where id like 'ptest-%'`);
  const ada = await learner("ptest-ada");
  const bob = await learner("ptest-bob");

  // Signed out: nothing.
  assert.equal((await handle(new Request(`${SITE}/api/certifications/${CERT}/exams/1/en`))).status, 401);

  // The certification and its practice tests.
  const cert = (await (await call(ada, "GET", `/api/certifications/${CERT}`)).json()) as { exams: { id: string; questionCount: number }[] };
  assert.equal(cert.exams.length, 6);

  // A practice test without answers, in both languages.
  const res = await call(ada, "GET", `/api/certifications/${CERT}/exams/1/vi/`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  const exam = (await res.json()) as { questions: { id: string; selectCount: number; correct?: string[]; explanationHtml?: string; options: { key: string }[] }[] };
  assert.equal(exam.questions.length, 65);
  assert.ok(exam.questions.every((q) => q.correct === undefined && q.explanationHtml === undefined), "no answers before answering");
  const q = exam.questions.find((x) => x.selectCount === 1)!;

  // The review set's single-question endpoint refuses questions not answered yet.
  assert.equal((await call(ada, "GET", `/api/certifications/${CERT}/questions/${q.id}/en`)).status, 404);

  // Answering: the server grades and reveals.
  const attempt = (await (await call(ada, "POST", "/api/attempts", { certId: CERT, examId: "1", questionCount: 999 })).json()) as { id: string; questionCount: number };
  assert.equal(attempt.questionCount, 65, "the server counts the set, not the client");
  const right = (await query<{ correct: string[] }>(`select correct from questions where id = $1`, [q.id]))[0].correct;
  const wrongKey = q.options.find((o) => !right.includes(o.key))!.key;
  assert.equal((await call(ada, "PUT", `/api/attempts/${attempt.id}/answers/${q.id}`, { chosen: ["A", "B"] })).status, 400, "select count is checked");
  const answered = (await (await call(ada, "PUT", `/api/attempts/${attempt.id}/answers/${q.id}`, { chosen: [wrongKey], correct: true })).json()) as {
    attempt: { answers: Record<string, { correct: boolean }> };
    reveal: { correct: string[]; explanationHtml: { en: string } };
  };
  assert.equal(answered.attempt.answers[q.id].correct, false, "a client claim of correct is ignored");
  assert.deepEqual(answered.reveal.correct, right);
  assert.ok(answered.reveal.explanationHtml.en.length > 0);
  assert.equal((await call(ada, "PUT", `/api/attempts/${attempt.id}/answers/${q.id}`, { chosen: right })).status, 409);

  // A question from another set does not belong to the attempt.
  const other = (await query<{ id: string }>(`select id from questions where cert_id = $1 and set_id = '2' limit 1`, [CERT]))[0].id;
  assert.equal((await call(ada, "PUT", `/api/attempts/${attempt.id}/answers/${other}`, { chosen: ["A"] })).status, 404);

  // Once answered, the question comes with its answer side.
  const again = (await (await call(ada, "GET", `/api/certifications/${CERT}/exams/1/en`)).json()) as typeof exam;
  assert.deepEqual(again.questions.find((x) => x.id === q.id)!.correct, right);
  assert.equal((await call(ada, "GET", `/api/certifications/${CERT}/questions/${q.id}/vi`)).status, 200);

  // Another learner cannot see or answer Ada's attempt, and still gets no answers.
  assert.equal((await call(bob, "PUT", `/api/attempts/${attempt.id}/answers/${exam.questions[1].id}`, { chosen: ["A"] })).status, 404);
  assert.equal(((await (await call(bob, "GET", `/api/attempts?certId=${CERT}`)).json()) as unknown[]).length, 0);
  const bobs = (await (await call(bob, "GET", `/api/certifications/${CERT}/exams/1/en`)).json()) as typeof exam;
  assert.equal(bobs.questions.find((x) => x.id === q.id)!.correct, undefined);

  // Lesson sets are renumbered 1..N; their attempts accept only their own questions.
  const topic = (await query<{ topic_id: string }>(`select topic_id from question_topics where cert_id = $1 limit 1`, [CERT]))[0].topic_id;
  const set = (await (await call(ada, "GET", `/api/certifications/${CERT}/topics/${topic}/en`)).json()) as { id: string; questions: { number: number }[] };
  assert.equal(set.id, `topic-${topic}`);
  assert.deepEqual(set.questions.map((x) => x.number), set.questions.map((_, i) => i + 1));

  // Mock exam: the draft lives on the server; handing in grades every question and drops the draft.
  const draft = { startedAt: Date.now(), answers: { [q.id]: right }, flags: [q.id], index: 3 };
  assert.equal((await call(bob, "PUT", `/api/mock-drafts/${CERT}/1`, draft)).status, 204);
  assert.deepEqual(await (await call(bob, "GET", `/api/mock-drafts/${CERT}/1`)).json(), draft);
  const mock = (await (await call(bob, "POST", "/api/attempts", { certId: CERT, examId: "mock-1", questionCount: 65 })).json()) as { id: string };
  const handedIn = (await (await call(bob, "POST", `/api/attempts/${mock.id}/submit`, { answers: draft.answers })).json()) as {
    attempt: { finishedAt: string | null; answers: Record<string, { correct: boolean }> };
    reveals: unknown[];
  };
  assert.ok(handedIn.attempt.finishedAt);
  assert.equal(Object.keys(handedIn.attempt.answers).length, 65);
  assert.equal(Object.values(handedIn.attempt.answers).filter((a) => a.correct).length, 1);
  assert.equal(handedIn.reveals.length, 65);
  assert.equal(await (await call(bob, "GET", `/api/mock-drafts/${CERT}/1`)).json(), null);

  // Skill map: domains and lessons, no question text.
  const skills = (await (await call(ada, "GET", `/api/certifications/${CERT}/skills`)).json()) as { domains: unknown[]; questions: Record<string, unknown> };
  assert.equal(skills.domains.length, 4);
  assert.equal(Object.keys(skills.questions).length, 390);

  // Reading sets is logged.
  assert.ok((await query(`select 1 from audit_log where user_id = 'ptest-ada' and action = 'practice.read'`)).length >= 2);

  // Reset progress.
  assert.equal((await call(ada, "DELETE", `/api/attempts?certId=${CERT}`)).status, 204);
  assert.equal(((await (await call(ada, "GET", "/api/attempts")).json()) as unknown[]).length, 0);

  console.log("practice.test: ok");
} finally {
  await query(`delete from users where id like 'ptest-%'`);
  await query(`delete from audit_log where user_id like 'ptest-%'`);
  await closeDb();
}
