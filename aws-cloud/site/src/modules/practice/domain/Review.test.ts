// npx tsx src/modules/practice/domain/Review.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it.
import assert from "node:assert/strict";
import { Review, dayOf } from "./Review";
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

// Left blank in a mock exam: neither listed nor overriding an earlier wrong answer.
const blank: Attempt = attempt("mock-1", [["q2", false, "2026-01-04T09:00:00Z"], ["q9", false, "2026-01-04T09:00:00Z"]]);
for (const a of Object.values(blank.answers)) a.chosen = [];
attempts.push(blank);
assert.deepEqual(Review.wrongIds(attempts), ["q1", "q3", "q2"]);

// Nothing answered yet: nothing to review.
assert.deepEqual(Review.wrongIds([]), []);

// The book: a miss is due the next day; right answers move it up (3, then 7 days); right in box 3 leaves.
const d = (day: number, h = 10) => new Date(2026, 0, day, h).toISOString();
const book = [attempt("1", [["a", false, d(1)], ["b", true, d(1)]])];
let e = Review.book(book).entries;
assert.equal(e.get("a")!.box, 1);
assert.equal(e.get("a")!.due, dayOf(d(2)));
assert.ok(!e.has("b"), "never missed, never in the book");
book.push(attempt("2", [["a", true, d(2)]]));
assert.equal(Review.book(book).entries.get("a")!.due, dayOf(d(5)));
book.push(attempt("3", [["a", true, d(5)]]));
assert.deepEqual([Review.book(book).entries.get("a")!.box, Review.book(book).entries.get("a")!.due], [3, dayOf(d(12))]);
assert.deepEqual(Review.dueIds(book, dayOf(d(11))), []);
assert.deepEqual(Review.dueIds(book, dayOf(d(12))), ["a"]);
book.push(attempt("4", [["a", true, d(12)]]));
assert.ok(!Review.book(book).entries.has("a"));
assert.deepEqual(Review.book(book).graduated.map((g) => g.id), ["a"]);
// Missed again later: back to box 1.
book.push(attempt("5", [["a", false, d(20)]]));
assert.equal(Review.book(book).entries.get("a")!.box, 1);
// Due order: the most overdue first.
const order = [attempt("x", [["p", false, d(1)], ["q", false, d(3)]])];
assert.deepEqual(Review.dueIds(order, dayOf(d(9))), ["p", "q"]);
assert.deepEqual(Review.bookIds(order), ["q", "p"]);

console.log("Review: ok");
