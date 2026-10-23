// npx tsx src/lib/pomodoro.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it.
import assert from "node:assert/strict";
import { DEFAULTS, cleanSettings, clock, finish, idle, noteCard, pause, remaining, restMore, settle, skip, start, stats, status, studyMore, type Session } from "./pomodoro";

const M = 60_000;
const s = DEFAULTS;
const t0 = Date.UTC(2026, 9, 20, 2, 0); // a weekday morning

// Start, pause, resume: the wall clock decides what is left.
let t = start(idle("focus", s), t0, ["vpc/a"]);
assert.equal(status(t), "running");
assert.equal(remaining(t, t0 + 10 * M), 15 * M);
t = pause(t, t0 + 10 * M);
assert.equal(status(t), "paused");
assert.equal(remaining(t, t0 + 99 * M), 15 * M);
t = start(t, t0 + 20 * M, []);
assert.equal(t.endsAt, t0 + 35 * M);
assert.equal(t.startedAt, t0, "a resumed session keeps its start");

// The end of a focus session: logged with the parts read in it, and the break starts from that moment.
let r = finish(t, s, ["vpc/a", "vpc/b"], { key: "vpc/b", href: "/concepts/vpc/b/", title: { vi: "B", en: "B" } });
assert.deepEqual(r.session?.read, ["vpc/b"]);
assert.equal(r.session?.minutes, 25);
assert.equal(r.timer.mode, "short");
assert.equal(r.timer.endsAt, t0 + 40 * M);
assert.equal(r.timer.round, 1);
assert.equal(r.timer.ended?.kind, "focus");
assert.equal(r.timer.ended?.read, 1);
assert.equal(r.timer.ended?.partDone, true);

// Cards answered during the break reach the end-of-break summary; the next focus waits to be started.
let b = noteCard(noteCard(r.timer, true), false);
assert.deepEqual(b.cards, { good: 1, again: 1 });
let e = finish(b, s, []);
assert.equal(e.timer.mode, "focus");
assert.equal(status(e.timer), "idle");
assert.deepEqual(e.timer.ended?.cards, { good: 1, again: 1 });
assert.equal(noteCard(e.timer, true), e.timer, "no counting outside a break");

// Two more minutes of rest go back to the same break.
const more = restMore(e.timer, t0 + 41 * M);
assert.equal(more.mode, "short");
assert.equal(more.endsAt, t0 + 43 * M);

// The fourth focus session is followed by a long break, and the cycle starts again after it.
let c = start({ ...idle("focus", s), round: 3 }, t0, []);
r = finish(c, s, []);
assert.equal(r.timer.mode, "long");
assert.equal(r.timer.round, 4);
e = finish(r.timer, s, []);
assert.equal(e.timer.round, 0);

// Five more minutes add time, not a session.
const extra = studyMore(r.timer, t0);
const x = finish(extra, s, []);
assert.equal(x.session?.extra, true);
assert.equal(x.timer.round, 4);

// Skipping records nothing and leaves the next session stopped.
assert.equal(skip(start(idle("focus", s), t0, []), s).mode, "short");
assert.equal(status(skip(start(idle("focus", s), t0, []), s)), "idle");
assert.equal(skip({ ...idle("long", s), round: 4 }, s).round, 0);

// Back after hours away: the focus session and its break both ended, at their own times.
const away = settle(start(idle("focus", s), t0, []), s, t0 + 3 * 60 * M, []);
assert.equal(away.sessions.length, 1);
assert.equal(away.sessions[0].end, t0 + 25 * M);
assert.equal(away.timer.mode, "focus");
assert.equal(away.timer.ended?.kind, "break");
assert.equal(settle(idle("focus", s), s, t0, []).sessions.length, 0);

// Settings out of range fall back to the defaults.
assert.deepEqual(cleanSettings({ focus: 50, short: 0, every: "x", sound: false }), { ...DEFAULTS, focus: 50, sound: false });
assert.equal(clock(18 * M + 41_200), "18:42");
assert.equal(clock(0), "0:00");

// Stats: today, the last 7 days, and sessions per day; "5 more minutes" counts minutes only.
const at = (dayOffset: number, h: number) => t0 + dayOffset * 1440 * M + h * 60 * M;
const log: Session[] = [
  { start: at(0, 0), end: at(0, 0.5), minutes: 25, read: ["vpc/a"] },
  { start: at(0, 1), end: at(0, 1.5), minutes: 25, read: ["vpc/b", "vpc/a"] },
  { start: at(0, 2), end: at(0, 2.1), minutes: 5, read: [], extra: true },
  { start: at(-3, 1), end: at(-3, 1.5), minutes: 25, read: ["iam/a"] },
  { start: at(-9, 1), end: at(-9, 1.5), minutes: 25, read: ["old/a"] },
];
const st = stats(log, at(0, 3));
assert.deepEqual(st.today, { sessions: 2, minutes: 55 });
assert.deepEqual(st.week, { sessions: 3, minutes: 80, days: 2, parts: 3 });
assert.deepEqual(st.days.map((d) => d.sessions), [0, 0, 0, 1, 0, 0, 2]);
assert.equal(st.todayLog.length, 3);

console.log("pomodoro: ok");
