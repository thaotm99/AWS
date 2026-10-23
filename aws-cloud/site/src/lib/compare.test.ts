// npx tsx src/lib/compare.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { COMPARE, compareById, recommend } from "./compare";

for (const set of COMPARE) {
  const ids = set.services.map((s) => s.id);
  for (const n of set.needs) assert.deepEqual(Object.keys(n.fit).sort(), [...ids].sort(), `${set.id}/${n.id}`);
  for (const r of set.rows) assert.deepEqual(Object.keys(r.cells).sort(), [...ids].sort(), `${set.id}: row`);
  // Every service is the full answer to at least one requirement on its own.
  for (const s of ids) assert.ok(set.needs.some((n) => recommend(set, [n.id])?.id === s), `${set.id}: ${s} never recommended`);
}
const m = compareById("messaging")!;
assert.deepEqual(recommend(m, ["keep", "once"]), { id: "sqs", full: true });
assert.deepEqual(recommend(m, ["fanout", "filter"]), { id: "eb", full: true });
assert.deepEqual(recommend(m, ["keep", "fanout"]), { id: "eb", full: false });
assert.equal(recommend(m, ["once", "fanout"]), null);
assert.equal(recommend(m, []), null);
assert.deepEqual(recommend(compareById("entry")!, ["staticip", "udp"]), { id: "nlb", full: true });
assert.equal(recommend(compareById("entry")!, ["staticip", "path"]), null);
console.log("compare: ok");
