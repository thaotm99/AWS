// Learner documents (/api/data) against a real Postgres.
// Needs DATABASE_URL (a disposable database with db/migrations applied); skipped without it.
// Run: DATABASE_URL=postgres://… npx tsx src/server/data.test.ts
import assert from "node:assert/strict";

if (!process.env.DATABASE_URL) {
  console.log("data.test: skipped (no DATABASE_URL)");
  process.exit(0);
}

Object.assign(process.env, { SESSION_SECRET: "test-secret-test-secret-test-secret!", AUTH_DEV_LOGIN: "1" });
delete process.env.VERCEL_ENV;
const { handle } = await import("./routes/index");
const { closeDb, query } = await import("./db");

const SITE = "http://site.test";
const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

async function signIn(email: string): Promise<string> {
  const res = await handle(new Request(`${SITE}/auth/dev-login`, { method: "POST", headers: { origin: SITE }, body: JSON.stringify({ email }) }));
  assert.equal(res.status, 200);
  return cookiesOf(res);
}

const call = (cookie: string, method: string, path: string, body?: unknown, origin = SITE) =>
  handle(new Request(`${SITE}${path}`, { method, headers: { cookie, origin }, body: body === undefined ? undefined : JSON.stringify(body) }));

type Docs = { docs: Record<string, { value: unknown; version: number; updatedAt: string }> };

try {
  await query(`delete from users where email like '%@data.test'`);
  const ada = await signIn("ada@data.test");
  const bob = await signIn("bob@data.test");

  // Signed out: 401. A fresh account has no documents.
  assert.equal((await call("", "GET", "/api/data")).status, 401);
  const empty = await call(ada, "GET", "/api/data");
  assert.equal(empty.status, 200);
  assert.equal(empty.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await empty.json(), { docs: {} });

  // First write creates version 1; a write based on it gets version 2.
  const w1 = await call(ada, "PUT", "/api/data/done", { value: ["vpc"], version: 0 });
  assert.equal(w1.status, 200);
  assert.equal(((await w1.json()) as { version: number }).version, 1);
  const w2 = await call(ada, "PUT", "/api/data/done", { value: ["vpc", "s3"], version: 1 });
  assert.equal(((await w2.json()) as { version: number }).version, 2);

  // A write based on an old version is refused with the stored document.
  const stale = await call(ada, "PUT", "/api/data/done", { value: ["ec2"], version: 1 });
  assert.equal(stale.status, 409);
  const conflict = (await stale.json()) as { error: { code: string }; current: { value: unknown; version: number } };
  assert.equal(conflict.error.code, "version_conflict");
  assert.deepEqual(conflict.current.value, ["vpc", "s3"]);
  assert.equal(conflict.current.version, 2);
  // "version 0" means "did not exist": refused once it does.
  assert.equal((await call(ada, "PUT", "/api/data/done", { value: [], version: 0 })).status, 409);
  // Without a version the write replaces what is stored.
  assert.equal(((await (await call(ada, "PUT", "/api/data/done", { value: ["ec2"] })).json()) as { version: number }).version, 3);

  // Any JSON value, including null and objects, round-trips.
  await call(ada, "PUT", "/api/data/last-part", { value: null });
  await call(ada, "PUT", "/api/data/flashcards", { value: { "nat-gateway": { box: 2, due: 20400 } } });
  const all = (await (await call(ada, "GET", "/api/data")).json()) as Docs;
  assert.deepEqual(Object.keys(all.docs).sort(), ["done", "flashcards", "last-part"]);
  assert.deepEqual(all.docs.done.value, ["ec2"]);
  assert.equal(all.docs.done.version, 3);
  assert.equal(all.docs["last-part"].value, null);
  assert.ok(all.docs.flashcards.updatedAt);

  // Each account sees only its own documents.
  assert.deepEqual(await (await call(bob, "GET", "/api/data")).json(), { docs: {} });

  // Names outside the allowlist, bad bodies, oversized documents and cross-site writes are refused.
  assert.equal((await call(ada, "PUT", "/api/data/attempts", { value: 1 })).status, 404);
  assert.equal((await call(ada, "PUT", "/api/data/done", {})).status, 400);
  assert.equal((await call(ada, "PUT", "/api/data/done", { value: [], version: "2" })).status, 400);
  assert.equal((await call(ada, "PUT", "/api/data/notes", { value: "x".repeat(300 * 1024) })).status, 413);
  assert.equal((await call(ada, "PUT", "/api/data/done", { value: [] }, "http://evil.test")).status, 403);

  // Delete removes the document; deleting the account removes the rest.
  assert.equal((await call(ada, "DELETE", "/api/data/flashcards")).status, 204);
  assert.deepEqual(Object.keys(((await (await call(ada, "GET", "/api/data")).json()) as Docs).docs).sort(), ["done", "last-part"]);
  assert.equal((await call(ada, "DELETE", "/api/me", { email: "ada@data.test" })).status, 204);
  assert.equal((await query(`select 1 from user_docs where user_id = 'dev:ada@data.test'`)).length, 0);

  // The exam date lives on the certification, not in a document.
  const exam = await call(bob, "PUT", "/api/me/certs/saa-c03", { examDate: "2026-12-01" });
  assert.equal(exam.status, 200);
  const me = (await (await call(bob, "GET", "/api/me")).json()) as { certs: { certId: string; examDate: string }[] };
  assert.equal(me.certs.find((c) => c.certId === "saa-c03")?.examDate, "2026-12-01");

  // With accounts off (no session secret), the routes answer 404 so the browser keeps its own storage.
  const secret = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  assert.equal((await call(bob, "GET", "/api/data")).status, 404);
  assert.equal((await call(bob, "GET", "/api/me")).status, 404);
  process.env.SESSION_SECRET = secret;

  console.log("data.test: ok");
} finally {
  await query(`delete from users where email like '%@data.test'`);
  await closeDb();
}
