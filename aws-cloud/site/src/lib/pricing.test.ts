// npx tsx src/lib/pricing.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { S3_CLASSES, natMonthly, s3Monthly } from "./pricing";

// 2 TB through one NAT gateway in Singapore: 730 h × $0.059 + 2048 GB × $0.059.
const n = natMonthly("ap-southeast-1", 1, 2048);
assert.equal(n.hours.toFixed(2), "43.07");
assert.equal(n.data.toFixed(2), "120.83");
assert.equal(n.total.toFixed(2), "163.90");
// Cheaper storage always means a higher retrieval charge or a restore.
const byStorage = [...S3_CLASSES].sort((a, b) => b.gbMonth - a.gbMonth);
for (let i = 1; i < byStorage.length; i++) assert.ok(byStorage[i].retrieval > 0 || byStorage[i].restore);
// With nothing read back, the cheapest instant class is Glacier Instant Retrieval; with everything read back
// once a month, One Zone-IA (storage plus retrieval, request charges left out).
const cheapest = (read: number) => S3_CLASSES.filter((c) => !c.restore).map((c) => ({ c, t: s3Monthly(c, 1024, read).total })).sort((a, b) => a.t - b.t)[0].c.id;
assert.equal(cheapest(0), "glacier-ir");
assert.equal(cheapest(1), "onezone-ia");
assert.equal(cheapest(0.05), "glacier-ir");
console.log("pricing: ok");
