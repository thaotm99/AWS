// npx tsx src/lib/labs.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it.
import assert from "node:assert/strict";
import { LABS, SERVICES, evaluate, labById, type Placement } from "./labs";

// Every lab: ids unique, services known, an empty design fails, and a known good design passes.
const good: Record<string, Placement> = {
  "public-private": { pubA: "alb", pubB: "alb", appA: "ec2", appB: "ec2", dataA: "rds", },
  "multi-az": { appA: "ec2", appB: "ec2", dataB: "rdsStandby" },
  "static-content": { edge: "cloudfront", origin: "s3" },
  "s3-endpoint": { path: "s3Gateway" },
  "decouple-orders": { between: "sqs", worker: "lambda" },
  "read-cache": { cache: "elasticache" },
};
assert.equal(new Set(LABS.map((l) => l.id)).size, LABS.length);
for (const lab of LABS) {
  for (const s of lab.services) assert.ok(SERVICES[s], `${lab.id}: ${s}`);
  for (const s of lab.slots) if (s.fixed) assert.ok(SERVICES[s.fixed]);
  assert.ok(evaluate(lab, {}).some((r) => !r), `${lab.id}: an empty design must fail`);
  assert.ok(good[lab.id], `${lab.id}: no good design in the test`);
}
// public-private needs the NAT gateway too.
assert.deepEqual(evaluate(labById("public-private")!, good["public-private"]), [true, true, true, false]);
assert.ok(evaluate(labById("public-private")!, { ...good["public-private"], pubB: "nat" }).includes(false), "ALB needs both AZs");
assert.ok(evaluate(labById("public-private")!, { pubA: "alb", pubB: "alb", appA: "ec2", dataA: "rds", appB: "nat" }).includes(false), "NAT in a private subnet fails");
// With the NAT gateway beside the ALB, every lab's good design passes.
good["public-private"].pubA2 = "nat";
for (const lab of LABS) assert.ok(evaluate(lab, good[lab.id]).every(Boolean), lab.id);
// multi-az: a read replica is not the answer, and extra parts fail the last rule.
assert.deepEqual(evaluate(labById("multi-az")!, { appA: "ec2", appB: "ec2", dataB: "readReplica" }), [true, false, false]);
// s3-endpoint: an interface endpoint keeps traffic private but costs.
assert.deepEqual(evaluate(labById("s3-endpoint")!, { path: "s3Interface" }), [true, false]);
console.log("labs: ok");
