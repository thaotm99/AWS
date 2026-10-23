// npx tsx src/lib/flashcards.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it.
import assert from "node:assert/strict";
import { BOX_DAYS, NEW_PER_SESSION, boxCounts, grade, sessionCards, today, type Deck } from "./flashcards";

const day = 20_000;

// Remembered: up one box, back after that box's gap; the top box stays the top box.
assert.deepEqual(grade(undefined, true, day), { box: 1, due: day + BOX_DAYS[0] });
assert.deepEqual(grade({ box: 2, due: day }, true, day), { box: 3, due: day + BOX_DAYS[2] });
assert.deepEqual(grade({ box: 5, due: day }, true, day), { box: 5, due: day + BOX_DAYS[4] });
// A new card remembered the first time is due tomorrow, not again today.
assert.equal(grade(undefined, true, day).due, day + 1);
// Forgotten: back to box 0, due today (again in this session).
assert.deepEqual(grade({ box: 4, due: day }, false, day), { box: 0, due: day });

// Session: due cards first (most overdue first), then new cards up to the limit; future cards wait.
const ids = Array.from({ length: 30 }, (_, i) => `t${i}`);
const deck: Deck = { t3: { box: 2, due: day - 1 }, t5: { box: 1, due: day - 4 }, t7: { box: 3, due: day + 2 } };
const s = sessionCards(ids, deck, day);
assert.deepEqual(s.slice(0, 2), ["t5", "t3"]);
assert.equal(s.length, 2 + NEW_PER_SESSION);
assert.ok(!s.includes("t7"));

// Box counts: index 0 counts cards never seen.
assert.deepEqual(boxCounts(ids, deck), [27, 1, 1, 1, 0, 0]);

// Local day: the same calendar day all day long.
assert.equal(today(new Date(2026, 0, 1, 0, 5)), today(new Date(2026, 0, 1, 23, 55)));

console.log("flashcards: ok");
