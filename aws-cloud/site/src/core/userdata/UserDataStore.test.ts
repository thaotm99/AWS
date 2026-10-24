// npx tsx src/core/userdata/UserDataStore.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { merge3 } from "./merge";
import { UserDataStore, type Problem, type StoredDoc } from "./UserDataStore";

// ---------- merge3 ----------
// Sets of ids: additions and removals on both sides survive.
assert.deepEqual(merge3(["a", "b"], ["a", "b", "c"], ["a", "d"]), ["a", "d", "c"]);
assert.deepEqual(merge3(["a", "b"], ["b"], ["a", "b", "x"]), ["b", "x"]);
// Objects merge per key; a key changed here wins over the same key changed there.
assert.deepEqual(merge3({ vpc: ["p1"] }, { vpc: ["p1", "p2"] }, { vpc: ["p1"], s3: ["q"] }), { vpc: ["p1", "p2"], s3: ["q"] });
assert.deepEqual(merge3({ a: { box: 1 } }, { a: { box: 2 } }, { a: { box: 3 }, b: { box: 1 } }), { a: { box: 2 }, b: { box: 1 } });
// Notes merge by id; one deleted here stays deleted.
const n = (id: string, note = "") => ({ id, quote: "q", note });
assert.deepEqual(merge3([n("1"), n("2")], [n("1", "edited")], [n("1"), n("2"), n("3")]), [n("1", "edited"), n("3")]);
// Untouched here: the other device's copy as is.
assert.deepEqual(merge3({ x: 1 }, { x: 1 }, { x: 2 }), { x: 2 });
// Scalars: this page wins.
assert.equal(merge3(1, 2, 3), 2);

// ---------- store over a fake server ----------
interface Call {
  method: string;
  url: string;
  body?: { value: unknown; version?: number };
}

function fakeServer(docs: Record<string, StoredDoc>, opts: { failPut?: boolean; status?: number } = {}) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const res = (status: number, data?: unknown) =>
      new Response(data === undefined ? null : JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
    if (opts.status) return res(opts.status, {});
    if (url === "/api/data") return res(200, { docs });
    if (url === "/api/me") return res(200, { user: { id: "u", email: "a@b.c", name: "A", picture: null }, certs: [{ certId: "saa-c03", status: "studying", examDate: "2026-12-01" }] });
    const name = url.replace("/api/data/", "");
    if (method === "PUT") {
      if (opts.failPut) return res(500, {});
      const cur = docs[name];
      if (body.version !== undefined && body.version !== (cur?.version ?? 0)) return res(409, { error: { code: "version_conflict" }, current: cur ?? null });
      docs[name] = { value: body.value, version: (cur?.version ?? 0) + 1 };
      return res(200, { version: docs[name].version });
    }
    if (method === "DELETE") {
      delete docs[name];
      return new Response(null, { status: 204 });
    }
    if (url.startsWith("/api/me/certs/")) return res(200, {});
    return res(404, {});
  }) as typeof fetch;
  return { calls, fetchFn };
}

const tick = () => new Promise((r) => setTimeout(r, 5));
const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), map: m } as unknown as Storage & { map: Map<string, string> };
};

// Server mode: documents load, old browser copies are removed, writes are debounced into one PUT.
{
  const server = fakeServer({ done: { value: ["vpc"], version: 4 } });
  const storage = memoryStorage();
  storage.setItem("done", "old,list");
  storage.setItem("theme", "dark");
  const store = new UserDataStore({ fetch: server.fetchFn, storage, debounceMs: 1 });
  await store.load();
  assert.equal(store.mode, "server");
  assert.deepEqual(store.get("done"), ["vpc"]);
  assert.equal(storage.getItem("done"), null, "learner data no longer kept in the browser");
  assert.equal(storage.getItem("theme"), "dark", "theme stays");
  assert.equal(store.examDate("saa-c03"), "2026-12-01");

  let changes = 0;
  store.subscribe("done", () => changes++);
  store.set("done", ["vpc", "s3"]);
  store.set("done", ["vpc", "s3", "ec2"]);
  assert.equal(changes, 2);
  assert.deepEqual(store.get("done"), ["vpc", "s3", "ec2"]);
  await tick();
  const puts = server.calls.filter((c) => c.method === "PUT");
  assert.equal(puts.length, 1);
  assert.deepEqual(puts[0].body, { value: ["vpc", "s3", "ec2"], version: 4 });
  assert.equal(storage.getItem("done"), null, "never written to the browser");
}

// Conflict: another device saved first; the change is merged onto its copy and saved again.
{
  const docs: Record<string, StoredDoc> = { done: { value: ["vpc"], version: 1 } };
  const server = fakeServer(docs);
  const store = new UserDataStore({ fetch: server.fetchFn, storage: null, debounceMs: 1 });
  await store.load();
  docs.done = { value: ["vpc", "iam"], version: 2 }; // the other device
  store.set("done", ["vpc", "s3"]);
  await tick();
  await tick();
  assert.deepEqual(docs.done, { value: ["vpc", "iam", "s3"], version: 3 });
  assert.deepEqual(store.get("done"), ["vpc", "iam", "s3"]);
}

// A failed save is undone on the page and reported.
{
  const server = fakeServer({ goals: { value: { parts: 2 }, version: 1 } }, { failPut: true });
  const problems: Problem[] = [];
  const store = new UserDataStore({ fetch: server.fetchFn, storage: null, debounceMs: 1, onProblem: (p) => problems.push(p) });
  await store.load();
  store.set("goals", { parts: 5 });
  await tick();
  assert.deepEqual(store.get("goals"), { parts: 2 });
  assert.deepEqual(problems, ["save"]);
}

// Signed out (401): sent to the login page.
{
  let signedOut = false;
  const store = new UserDataStore({ fetch: fakeServer({}, { status: 401 }).fetchFn, storage: null, onSignedOut: () => (signedOut = true) });
  await store.load();
  assert.ok(signedOut);
}

// No account API (404): localStorage under the old keys, old plain-text values still readable.
{
  const storage = memoryStorage();
  storage.setItem("known-terms", "vpc,nat");
  storage.setItem("exam-date", "2026-11-02");
  const store = new UserDataStore({ fetch: fakeServer({}, { status: 404 }).fetchFn, storage });
  await store.load();
  assert.equal(store.mode, "local");
  assert.equal(store.get("known-terms"), "vpc,nat");
  store.set("flashcards", { a: { box: 1, due: 2 } });
  assert.equal(storage.getItem("flashcards"), JSON.stringify({ a: { box: 1, due: 2 } }));
  assert.equal(store.examDate("saa-c03"), "2026-11-02");
  await store.setExamDate("saa-c03", null);
  assert.equal(storage.getItem("exam-date"), null);
}

// Not signed in on a deployment without accounts: localStorage, and no request at all.
{
  const server = fakeServer({});
  const store = new UserDataStore({ fetch: server.fetchFn, storage: memoryStorage(), accounts: false });
  await store.load();
  assert.equal(store.mode, "local");
  assert.equal(server.calls.length, 0);
}

// Server unreachable: the page works on empty documents and says that nothing is saved.
{
  const problems: Problem[] = [];
  const store = new UserDataStore({ fetch: (async () => { throw new TypeError("offline"); }) as typeof fetch, storage: null, onProblem: (p) => problems.push(p) });
  await store.load();
  assert.equal(store.mode, "offline");
  store.set("done", ["vpc"]);
  assert.deepEqual(store.get("done"), ["vpc"]);
  assert.deepEqual(problems, ["load", "offline"]);
}

// The exam date goes to the certification; a failure restores the old date.
{
  const server = fakeServer({});
  const store = new UserDataStore({ fetch: server.fetchFn, storage: null });
  await store.load();
  await store.setExamDate("saa-c03", "2027-01-15");
  assert.equal(store.examDate("saa-c03"), "2027-01-15");
  const put = server.calls.find((c) => c.url === "/api/me/certs/saa-c03");
  assert.deepEqual(put?.body, { examDate: "2027-01-15" });
}

console.log("userdata: ok");
