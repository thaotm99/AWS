// npx tsx src/modules/practice/domain/Review.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it.
import assert from "node:assert/strict";
import { Review } from "./Review";
import type { Attempt } from "./types";

const attempt = (examId: string, answers: Array<[string, boolean, string]>): Attempt => ({
  id: examId,
  certId: "saa-c03",
  examId,
  questionCount: answers.length,
  answers: Object.fromEntries(answers.map(([q, correct, at]) => [q, { questionId: q, chosen: ["a"], correct, answeredAt: at }])),
  startedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  finishedAt: null,
});

// Wrong in a practice test, then right in a lesson quiz: off the list. Wrong twice: the newest counts.
const attempts = [
  attempt("1", [["q1", false, "2026-01-01T10:00:00Z"], ["q2", false, "2026-01-01T10:01:00Z"], ["q3", true, "2026-01-01T10:02:00Z"]]),
  attempt("topic-vpc", [["q1", true, "2026-01-02T10:00:00Z"], ["q3", false, "2026-01-02T10:05:00Z"]]),
];
assert.deepEqual(Review.wrongIds(attempts), ["q3", "q2"]);

// Right, then wrong again later: back on the list.
attempts.push(attempt("review", [["q1", false, "2026-01-03T09:00:00Z"]]));
assert.deepEqual(Review.wrongIds(attempts), ["q1", "q3", "q2"]);

// Nothing answered yet: nothing to review.
assert.deepEqual(Review.wrongIds([]), []);

console.log("Review: ok");
