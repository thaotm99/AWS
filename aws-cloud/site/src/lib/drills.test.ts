// npx tsx src/lib/drills.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it.
import assert from "node:assert/strict";
import { DRILLS, score } from "./drills";

assert.equal(new Set(DRILLS.map((d) => d.id)).size, DRILLS.length);
for (const d of DRILLS) {
  const metrics = new Set(d.metrics.map((m) => m.id));
  const items = new Set(d.panels.flatMap((p) => p.items.map((i) => i.id)));
  for (const s of d.steps) {
    // Exactly one sound choice per step, so the drill always moves on and the score means something.
    assert.equal(s.options.filter((o) => o.verdict === "good").length, 1, `${d.id} ${s.at.vi}`);
    for (const o of s.options) {
      for (const k of Object.keys(o.metrics ?? {})) assert.ok(metrics.has(k), `${d.id}: metric ${k}`);
      for (const k of [...Object.keys(o.items ?? {}), ...Object.keys(o.itemText ?? {})]) assert.ok(items.has(k), `${d.id}: item ${k}`);
      assert.ok(o.text.vi && o.text.en && o.feedback.vi && o.feedback.en, `${d.id}: text in both languages`);
    }
  }
  // By the end, every metric is back below its alert line.
  const end = Object.fromEntries(d.metrics.map((m) => [m.id, m.value]));
  for (const s of d.steps) Object.assign(end, s.options.find((o) => o.verdict === "good")!.metrics);
  for (const m of d.metrics) assert.ok(m.worse === "up" ? end[m.id] < m.alert : end[m.id] > m.alert, `${d.id}: ${m.id} recovers`);
}
assert.equal(score(["good", "bad", "good"]), 2);
assert.equal(score([undefined, "partial"]), 0);
console.log("drills: ok");
