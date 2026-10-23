// npx tsx src/lib/goals.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { metGoals, streaks, weekOf } from "./goals";

// Day 20388 is a Monday (day 0, 1970-01-01, was a Thursday; Mondays are 4 mod 7).
const mon = 20388;
assert.equal(weekOf(mon), weekOf(mon + 6));
assert.notEqual(weekOf(mon), weekOf(mon + 7));
const set = (...d: number[]) => new Set(d);

// Six days in a row up to today.
assert.deepEqual(streaks(set(mon, mon + 1, mon + 2, mon + 3, mon + 4, mon + 5), mon + 5), { current: 6, longest: 6, restLeft: 1 });
// Today not done yet: the streak is still alive.
assert.equal(streaks(set(mon, mon + 1, mon + 2), mon + 3).current, 3);
// One missed day in a week is forgiven (and used up); a second one breaks the streak.
assert.deepEqual(streaks(set(mon, mon + 2, mon + 3), mon + 3), { current: 3, longest: 3, restLeft: 0 });
assert.equal(streaks(set(mon, mon + 2, mon + 4), mon + 4).current, 1);
// A miss in the next week is forgiven again.
assert.equal(streaks(set(mon + 5, mon + 7, mon + 8), mon + 8).current, 3);
// Long gone: no current streak, the longest is kept.
assert.deepEqual(streaks(set(mon, mon + 1, mon + 2, mon + 3), mon + 20), { current: 0, longest: 4, restLeft: 1 });
assert.deepEqual(streaks(set(), mon), { current: 0, longest: 0, restLeft: 1 });

// Goals set to 0 are off.
assert.deepEqual(metGoals({ parts: 2, cards: 3, pomodoros: 0 }, { parts: 2, cards: 10, pomodoros: 0 }), { met: 1, of: 2 });
assert.deepEqual(metGoals(undefined, { parts: 2, cards: 10, pomodoros: 2 }), { met: 0, of: 3 });
console.log("goals: ok");
