// Daily study goals and the study streak, kept per account (app/userData). Parts read and flashcards
// answered are counted per day as they happen; Pomodoro sessions come from the Pomodoro log.

import { userData } from "../app/userData";
import { today } from "./flashcards";
import { dayOf, readLog } from "./pomodoro";

export interface Goals {
  parts: number;
  cards: number;
  pomodoros: number;
}

export interface DayCount {
  parts: number;
  cards: number;
  pomodoros: number;
}

export const DEFAULT_GOALS: Goals = { parts: 2, cards: 10, pomodoros: 2 };
export const GOAL_LIMITS = { parts: 10, cards: 100, pomodoros: 12 } as const;
/** Days the activity log keeps. */
const KEEP_DAYS = 400;
export const GOALS_EVENT = "goals-change";

const ACTIVITY = "activity";
const GOALS = "goals";

if (typeof window !== "undefined") userData.subscribe([GOALS, ACTIVITY], () => window.dispatchEvent(new Event(GOALS_EVENT)));

function read<T>(key: string, fallback: T): T {
  const v = userData.get(key);
  return v && typeof v === "object" ? (structuredClone(v) as T) : fallback;
}

function write(key: string, value: unknown) {
  userData.set(key, value);
}

export function readGoals(): Goals {
  const v = read<Partial<Goals>>(GOALS, {});
  const n = (k: keyof Goals) => {
    const x = Number(v[k]);
    return Number.isInteger(x) && x >= 0 && x <= GOAL_LIMITS[k] ? x : DEFAULT_GOALS[k];
  };
  return { parts: n("parts"), cards: n("cards"), pomodoros: n("pomodoros") };
}

export const writeGoals = (g: Goals) => write(GOALS, g);

/** Parts and cards per local day: {"20384": {parts: 1, cards: 12}}. */
export function readActivity(): Record<string, Partial<DayCount>> {
  return read(ACTIVITY, {});
}

/** Count one part read or card answered today. */
export function recordActivity(kind: "parts" | "cards", n = 1) {
  const day = today();
  const all = readActivity();
  const entry = all[day] ?? {};
  entry[kind] = (entry[kind] ?? 0) + n;
  all[day] = entry;
  for (const k of Object.keys(all)) if (Number(k) < day - KEEP_DAYS) delete all[k];
  write(ACTIVITY, all);
}

/** What was done each day: activity plus finished Pomodoro focus sessions ("5 more minutes" excluded). */
export function dayCounts(): Map<number, DayCount> {
  const days = new Map<number, DayCount>();
  const get = (d: number) => days.get(d) ?? (days.set(d, { parts: 0, cards: 0, pomodoros: 0 }), days.get(d)!);
  for (const [k, v] of Object.entries(readActivity())) {
    const c = get(Number(k));
    c.parts += v.parts ?? 0;
    c.cards += v.cards ?? 0;
  }
  for (const s of readLog()) if (!s.extra) get(dayOf(s.end)).pomodoros++;
  return days;
}

/** How many of the goals set (above 0) a day met, out of how many. */
export function metGoals(c: DayCount | undefined, g: Goals): { met: number; of: number } {
  const keys = (Object.keys(g) as (keyof Goals)[]).filter((k) => g[k] > 0);
  return { met: c ? keys.filter((k) => c[k] >= g[k]).length : 0, of: keys.length };
}

/** Monday-based week number of a local day (day 0, 1970-01-01, was a Thursday). */
export const weekOf = (day: number) => Math.floor((day + 3) / 7);

/**
 * Study streaks. A day counts when it met at least one goal. One missed day per Monday–Sunday week is
 * forgiven without breaking the streak; today does not break it until it is over.
 */
export function streaks(counted: Set<number>, now: number): { current: number; longest: number; restLeft: number } {
  const days = [...counted].filter((d) => d <= now).sort((a, b) => a - b);
  if (!days.length) return { current: 0, longest: 0, restLeft: 1 };
  let longest = 0;
  let run = 0;
  let forgiven = new Map<number, number>();
  for (let d = days[0]; d <= now; d++) {
    if (counted.has(d)) {
      run++;
    } else if (d === now || run === 0) {
      // Today is not over yet; outside a streak, a missed day changes nothing.
    } else if (!forgiven.has(weekOf(d))) {
      forgiven.set(weekOf(d), d);
    } else {
      run = 0;
      forgiven = new Map();
    }
    longest = Math.max(longest, run);
  }
  return { current: run, longest, restLeft: forgiven.has(weekOf(now)) ? 0 : 1 };
}
