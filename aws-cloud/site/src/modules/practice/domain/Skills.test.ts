// npx tsx src/modules/practice/domain/Skills.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { MIN_TOPIC, skills, type SkillMapData } from "./Skills";
import type { Attempt } from "./types";

const now = Date.UTC(2026, 9, 23);
const day = 86_400_000;
const map: SkillMapData = {
  domains: [{ name: "Secure", weight: 0.5 }, { name: "Resilient", weight: 0.5 }],
  questions: {},
  topics: [{ id: "vpc", title: { vi: "VPC", en: "VPC" } }, { id: "rds", title: { vi: "RDS", en: "RDS" } }],
};
for (let i = 0; i < 20; i++) map.questions[`v${i}`] = [0, "vpc"];
for (let i = 0; i < 20; i++) map.questions[`r${i}`] = [1, "rds"];

const attempt = (answers: [string, boolean, number][]): Attempt => ({
  id: Math.random().toString(), certId: "c", examId: "1", questionCount: 65, startedAt: "", updatedAt: "", finishedAt: null,
  answers: Object.fromEntries(answers.map(([id, correct, age]) => [id, { questionId: id, chosen: ["A"], correct, answeredAt: new Date(now - age * day).toISOString() }])),
});

// VPC: 18/20 right today. RDS: 8/20 right today.
const a = attempt([
  ...Array.from({ length: 20 }, (_, i) => [`v${i}`, i < 18, 0] as [string, boolean, number]),
  ...Array.from({ length: 20 }, (_, i) => [`r${i}`, i < 8, 0] as [string, boolean, number]),
]);
let r = skills([a], map, now);
assert.equal(r.domains[0].accuracy, 0.9);
assert.equal(r.domains[1].accuracy, 0.4);
assert.deepEqual(r.weakest.map((t) => t.id), ["rds", "vpc"]);
assert.equal(r.score, Math.round(100 + 900 * 0.65));

// An older wrong answer weighs less than a new right one; answers past 90 days are ignored.
r = skills([attempt([["v0", false, 30], ["v1", true, 0], ["v2", false, 200]])], map, now);
assert.ok(Math.abs(r.domains[0].accuracy! - 1 / 1.5) < 1e-9);
assert.equal(r.domains[0].answered, 2);
assert.equal(r.domains[1].accuracy, null);
assert.equal(r.score, null, "too few answers for a score");
// Topics need MIN_TOPIC questions; the latest answer of a question counts once.
assert.equal(r.weakest.length, 0);
assert.ok(MIN_TOPIC > 2);
const twice = skills([attempt([["v0", false, 5]]), attempt([["v0", true, 1]])], map, now);
assert.equal(twice.domains[0].answered, 2);
// Blank answers (a mock exam handed in early) do not count.
const blank = attempt([["v3", false, 0]]);
blank.answers.v3.chosen = [];
assert.equal(skills([blank], map, now).total, 0);
console.log("skills: ok");
