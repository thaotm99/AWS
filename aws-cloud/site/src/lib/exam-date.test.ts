// npx tsx src/lib/exam-date.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { daysUntil, phaseFor } from "./exam-date";

const now = new Date(2026, 9, 24, 21, 30);
assert.equal(daysUntil("2026-10-24", now), 0);
assert.equal(daysUntil("2026-10-25", now), 1);
assert.equal(daysUntil("2026-11-04", now), 11);
assert.equal(daysUntil("2026-10-20", now), -4);
// Late at night still counts the calendar day, not 24-hour blocks.
assert.equal(daysUntil("2026-10-25", new Date(2026, 9, 24, 23, 59)), 1);

assert.equal(phaseFor(11), "gaps");
assert.equal(phaseFor(6), "gaps");
assert.equal(phaseFor(5), "mocks");
assert.equal(phaseFor(2), "mocks");
assert.equal(phaseFor(1), "eve");
assert.equal(phaseFor(0), "exam");
assert.equal(phaseFor(-1), "past");
console.log("exam-date: ok");
