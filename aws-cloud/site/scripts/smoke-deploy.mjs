// Checks a deployment end to end over HTTP: sign-in gate, Google redirect, no public practice data,
// and (on a preview with AUTH_DEV_LOGIN=1) a test learner who answers a question, saves data and
// deletes the account again.
// Usage: node scripts/smoke-deploy.mjs https://<deployment> [--expect-google] [--dev]
// A deployment behind Vercel Deployment Protection needs VERCEL_AUTOMATION_BYPASS_SECRET set.
import assert from "node:assert/strict";

const base = process.argv[2]?.replace(/\/$/, "");
if (!base) throw new Error("usage: node scripts/smoke-deploy.mjs https://<deployment> [--expect-google] [--dev]");
const expectGoogle = process.argv.includes("--expect-google");
const dev = process.argv.includes("--dev");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
let cookie = "";
let passed = 0;

async function req(path, { method = "GET", body, follow = false } = {}) {
  const headers = { Origin: base, ...(cookie ? { cookie } : {}), ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: follow ? "follow" : "manual" });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const name = pair.split("=")[0];
    cookie = [...cookie.split("; ").filter((p) => p && !p.startsWith(`${name}=`)), ...(c.includes("Max-Age=0") ? [] : [pair])].join("; ");
  }
  return res;
}

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok    ${name}`);
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${e.message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}

await check("signed out: a page redirects to /login/", async () => {
  const r = await req("/practice/");
  assert.equal(r.status, 302, `status ${r.status} (401 means Deployment Protection or Basic auth is still in front)`);
  assert.match(r.headers.get("location") ?? "", /\/login\/\?return=/);
});
await check("signed out: /login/ is reachable", async () => assert.equal((await req("/login/")).status, 200));
await check("signed out: /api/me answers 401", async () => assert.equal((await req("/api/me/")).status, 401));
await check("no static practice JSON is published", async () => {
  const r = await req("/api/certifications/saa-c03/exams/1/en.json");
  assert.notEqual(r.status, 200);
});
await check("sign-in methods", async () => {
  const m = await (await req("/auth/methods/")).json();
  if (expectGoogle) assert.equal(m.google, true, "Google sign-in is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  if (dev) assert.equal(m.dev, true, "AUTH_DEV_LOGIN=1 is not set on this deployment");
  else assert.equal(m.dev, false, "test sign-in must be off here");
});
if (expectGoogle) {
  await check("/auth/login redirects to Google with this site's callback", async () => {
    const r = await req("/auth/login/?return=/practice/");
    assert.equal(r.status, 302);
    const to = new URL(r.headers.get("location"));
    assert.equal(to.hostname, "accounts.google.com");
    assert.equal(to.searchParams.get("redirect_uri"), `${base}/auth/callback`);
    assert.equal(to.searchParams.get("code_challenge_method"), "S256");
  });
}

if (dev) {
  const email = `smoke-${Date.now()}@example.com`;
  await check("test sign-in", async () => assert.equal((await req("/auth/dev-login/", { method: "POST", body: { email } })).status, 200));
  await check("/api/me knows the learner", async () => assert.equal((await (await req("/api/me/")).json()).user.email, email));
  await check("a signed-in page loads", async () => assert.equal((await req("/practice/saa-c03/", { follow: true })).status, 200));
  let exam;
  await check("practice test 1 has 65 questions and no answers", async () => {
    const r = await req("/api/certifications/saa-c03/exams/1/vi/");
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    exam = await r.json();
    assert.equal(exam.questions.length, 65);
    assert.ok(exam.questions.every((q) => q.correct === undefined));
  });
  await check("the server grades an answer and reveals it", async () => {
    const attempt = await (await req("/api/attempts/", { method: "POST", body: { certId: "saa-c03", examId: "1", questionCount: 65 } })).json();
    const q = exam.questions.find((x) => x.selectCount === 1);
    const res = await (await req(`/api/attempts/${attempt.id}/answers/${q.id}/`, { method: "PUT", body: { chosen: [q.options[0].key] } })).json();
    assert.ok(Array.isArray(res.reveal.correct) && res.reveal.correct.length === 1);
    assert.equal(Object.keys(res.attempt.answers).length, 1);
  });
  await check("learner data round-trips", async () => {
    const r = await req("/api/data/goals/", { method: "PUT", body: { value: { smoke: true } } });
    if (r.status === 404) throw new Error("/api/data is not deployed");
    assert.ok(r.ok, `status ${r.status}`);
    const all = await (await req("/api/data/")).json();
    assert.deepEqual(all.docs.goals.value, { smoke: true });
  });
  await check("signing out ends the session", async () => {
    const saved = cookie;
    assert.equal((await req("/auth/logout/", { method: "POST" })).status, 204);
    cookie = saved;
    assert.equal((await req("/api/me/")).status, 401);
  });
  await check("the test account is deleted", async () => {
    cookie = "";
    await req("/auth/dev-login/", { method: "POST", body: { email } });
    assert.equal((await req("/api/me/", { method: "DELETE", body: { email } })).status, 204);
  });
}

console.log(`\n${passed} checks passed${process.exitCode ? ", some FAILED" : ""}`);
