import { userData } from "../app/userData";

// Pomodoro timer for study sessions, kept per account (app/userData). The timer runs on the wall clock (an end
// time, not a counter), so it carries on across pages, tabs and a sleeping laptop. Every change is a
// pure function of the state and the time, so it can be tested without a browser.

export type Mode = "focus" | "short" | "long";

export interface Settings {
  /** Lengths in minutes. */
  focus: number;
  short: number;
  long: number;
  /** A long break after this many focus sessions. */
  every: number;
  sound: boolean;
  notify: boolean;
  /** Show the countdown in the tab title. */
  title: boolean;
}

export const DEFAULTS: Settings = { focus: 25, short: 5, long: 15, every: 4, sound: true, notify: false, title: true };
export const LIMITS = { focus: [5, 90], short: [1, 30], long: [5, 60], every: [2, 8] } as const;
/** "Study 5 more minutes" and "Rest 2 more minutes" in the end-of-session dialog. */
export const MORE_FOCUS = 5;
export const MORE_BREAK = 2;

/** A lesson part, as the last-part record keeps it. */
export interface PartRef {
  key: string;
  href: string;
  title: { vi: string; en: string };
}

/** A session that ended and waits for the learner in the end-of-session dialog. */
export interface Ended {
  kind: "focus" | "break";
  /** When it ended (ms). */
  at: number;
  /** Focus sessions done in this cycle, after this one. */
  round: number;
  /** Lesson parts finished during the focus session. */
  read: number;
  /** The part being read when it ended. */
  part?: PartRef;
  partDone?: boolean;
  /** The break that follows (focus) or that ended (break). */
  breakMode: Mode;
  /** Flashcards reviewed during the break. */
  cards?: { good: number; again: number };
}

export interface Timer {
  mode: Mode;
  /** Running: the end time. Paused: the time left. Neither: not started. */
  endsAt?: number;
  left?: number;
  /** Length of the current session (ms), for the ring. */
  total: number;
  /** Focus sessions finished in this cycle (resets after a long break). */
  round: number;
  /** Focus session: when it started, and the parts already read then. */
  startedAt?: number;
  readAtStart?: string[];
  /** A "5 more minutes" focus: adds time, not a session. */
  extra?: boolean;
  cards?: { good: number; again: number };
  ended?: Ended;
}

/** One focus session in the log. */
export interface Session {
  start: number;
  end: number;
  minutes: number;
  /** Parts finished during it ("lesson/slug"). */
  read: string[];
  part?: PartRef;
  extra?: boolean;
}

const MINUTE = 60_000;
/** The log keeps this many days. */
export const LOG_DAYS = 60;

export const isBreak = (mode: Mode) => mode !== "focus";
export const length = (mode: Mode, s: Settings) => s[mode] * MINUTE;
export const idle = (mode: Mode, s: Settings, round = 0): Timer => ({ mode, total: length(mode, s), round });

export function status(t: Timer): "idle" | "running" | "paused" {
  return t.endsAt !== undefined ? "running" : t.left !== undefined ? "paused" : "idle";
}

export function remaining(t: Timer, now: number): number {
  if (t.endsAt !== undefined) return Math.max(0, t.endsAt - now);
  return t.left ?? t.total;
}

/** Start, or resume after a pause. A focus session remembers the parts already read. */
export function start(t: Timer, now: number, readNow: string[]): Timer {
  if (t.endsAt !== undefined) return t;
  const next: Timer = { ...t, endsAt: now + (t.left ?? t.total), left: undefined, ended: undefined };
  if (t.mode === "focus" && t.startedAt === undefined) {
    next.startedAt = now;
    next.readAtStart = readNow;
  }
  return next;
}

export function pause(t: Timer, now: number): Timer {
  return t.endsAt === undefined ? t : { ...t, endsAt: undefined, left: Math.max(0, t.endsAt - now) };
}

/** Back to the start of the current session, stopped. */
export function reset(t: Timer, s: Settings): Timer {
  return idle(t.mode, s, t.round);
}

/** Another session type from the tabs: stopped, from its full length. */
export function select(t: Timer, s: Settings, mode: Mode): Timer {
  return idle(mode, s, t.round);
}

const nextBreak = (round: number, s: Settings): Mode => (round > 0 && round % s.every === 0 ? "long" : "short");

/** Skip the current session: the next one is ready, not started, and nothing is recorded. */
export function skip(t: Timer, s: Settings): Timer {
  if (t.mode === "focus") return idle(nextBreak(t.round + 1, s), s, t.round);
  return idle("focus", s, t.mode === "long" ? 0 : t.round);
}

/**
 * The session that ran out at `t.endsAt`. A focus session is logged and its break starts at once,
 * from that moment; an ended break leaves the next focus session ready for the learner to start.
 */
export function finish(t: Timer, s: Settings, readNow: string[], part?: PartRef): { timer: Timer; session?: Session } {
  const at = t.endsAt ?? Date.now();
  if (t.mode === "focus") {
    const before = new Set(t.readAtStart ?? []);
    const read = readNow.filter((k) => !before.has(k));
    const round = t.extra ? t.round : t.round + 1;
    const breakMode = nextBreak(round, s);
    const session: Session = { start: t.startedAt ?? at - t.total, end: at, minutes: Math.round(t.total / MINUTE), read, part, extra: t.extra || undefined };
    const timer: Timer = {
      mode: breakMode,
      total: length(breakMode, s),
      endsAt: at + length(breakMode, s),
      round,
      ended: { kind: "focus", at, round, read: read.length, part, partDone: part ? read.includes(part.key) || readNow.includes(part.key) : undefined, breakMode },
    };
    return { timer, session };
  }
  const round = t.mode === "long" ? 0 : t.round;
  return {
    timer: { ...idle("focus", s, round), ended: { kind: "break", at, round: t.round, read: 0, part, breakMode: t.mode, cards: t.cards } },
  };
}

/** Settle every session that has run out by `now` (the learner may have been away for hours). */
export function settle(t: Timer, s: Settings, now: number, readNow: string[], part?: PartRef): { timer: Timer; sessions: Session[] } {
  const sessions: Session[] = [];
  let timer = t;
  for (let i = 0; i < 4 && timer.endsAt !== undefined && timer.endsAt <= now; i++) {
    const r = finish(timer, s, readNow, part);
    // A dialog that is still open for an earlier session gives way to the newer one.
    timer = r.timer;
    if (r.session) sessions.push(r.session);
  }
  return { timer, sessions };
}

/** End-of-focus choices. */
export function studyMore(t: Timer, now: number): Timer {
  return { mode: "focus", total: MORE_FOCUS * MINUTE, endsAt: now + MORE_FOCUS * MINUTE, round: t.round, startedAt: now, readAtStart: t.readAtStart, extra: true };
}

export function skipBreak(t: Timer, s: Settings, now: number, readNow: string[]): Timer {
  return start(idle("focus", s, t.mode === "long" ? 0 : t.round), now, readNow);
}

/** End-of-break choice: a little more rest. */
export function restMore(t: Timer, now: number): Timer {
  const mode = t.ended?.breakMode ?? "short";
  return { mode, total: MORE_BREAK * MINUTE, endsAt: now + MORE_BREAK * MINUTE, round: t.ended?.round ?? t.round, cards: t.ended?.cards };
}

export const dismiss = (t: Timer): Timer => ({ ...t, ended: undefined });

/** A flashcard answered during a break counts towards the end-of-break summary. */
export function noteCard(t: Timer, remembered: boolean): Timer {
  if (!isBreak(t.mode) || t.endsAt === undefined) return t;
  const c = t.cards ?? { good: 0, again: 0 };
  return { ...t, cards: remembered ? { ...c, good: c.good + 1 } : { ...c, again: c.again + 1 } };
}

/** Settings as saved, with anything missing or out of range replaced by the default. */
export function cleanSettings(v: unknown): Settings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const num = (k: keyof typeof LIMITS) => {
    const n = Number(o[k]);
    return Number.isInteger(n) && n >= LIMITS[k][0] && n <= LIMITS[k][1] ? n : DEFAULTS[k];
  };
  const bool = (k: "sound" | "notify" | "title") => (typeof o[k] === "boolean" ? (o[k] as boolean) : DEFAULTS[k]);
  return { focus: num("focus"), short: num("short"), long: num("long"), every: num("every"), sound: bool("sound"), notify: bool("notify"), title: bool("title") };
}

/** "18:42" */
export function clock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- the log ----------

/** Local day number, as the flashcards count days. */
export const dayOf = (ms: number) => {
  const d = new Date(ms);
  return Math.floor((ms - d.getTimezoneOffset() * MINUTE) / 86_400_000);
};

export function prune(log: Session[], now: number): Session[] {
  const from = dayOf(now) - LOG_DAYS;
  return log.filter((x) => dayOf(x.end) > from);
}

export interface Stats {
  today: { sessions: number; minutes: number };
  week: { sessions: number; minutes: number; days: number; parts: number };
  /** Sessions per day, oldest first, the last being today. */
  days: { day: number; sessions: number }[];
  todayLog: Session[];
}

export function stats(log: Session[], now: number): Stats {
  const today = dayOf(now);
  const days = Array.from({ length: 7 }, (_, i) => ({ day: today - 6 + i, sessions: 0 }));
  let tS = 0, tM = 0, wS = 0, wM = 0;
  const parts = new Set<string>();
  const todayLog: Session[] = [];
  for (const x of log) {
    const d = dayOf(x.end);
    if (d < today - 6 || d > today) continue;
    const n = x.extra ? 0 : 1;
    days[d - today + 6].sessions += n;
    wS += n;
    wM += x.minutes;
    x.read.forEach((k) => parts.add(k));
    if (d === today) {
      tS += n;
      tM += x.minutes;
      todayLog.push(x);
    }
  }
  return {
    today: { sessions: tS, minutes: tM },
    week: { sessions: wS, minutes: wM, days: days.filter((d) => d.sessions > 0).length, parts: parts.size },
    days,
    todayLog: todayLog.sort((a, b) => a.start - b.start),
  };
}

// ---------- storage ----------

const KEYS = { timer: "pomodoro", settings: "pomodoro-settings", log: "pomodoro-log" } as const;
export const POMODORO_KEYS: readonly string[] = Object.values(KEYS);
export const POMODORO_EVENT = "pomodoro-change";

if (typeof window !== "undefined") userData.subscribe(POMODORO_KEYS, () => window.dispatchEvent(new Event(POMODORO_EVENT)));

function read<T>(key: string, fallback: T): T {
  return (userData.get<T>(key) ?? fallback) as T;
}

function write(key: string, value: unknown) {
  userData.set(key, value);
}

export const readSettings = () => cleanSettings(read(KEYS.settings, {}));
export const writeSettings = (s: Settings) => write(KEYS.settings, s);

export function readTimer(s: Settings): Timer {
  const t = read<Timer | null>(KEYS.timer, null);
  return t && typeof t === "object" && ["focus", "short", "long"].includes(t.mode) && typeof t.total === "number" ? t : idle("focus", s);
}
export const writeTimer = (t: Timer) => write(KEYS.timer, t);

export function readLog(): Session[] {
  const v = read<Session[]>(KEYS.log, []);
  return Array.isArray(v) ? v.filter((x) => x && typeof x.end === "number" && Array.isArray(x.read)) : [];
}
export const writeLog = (log: Session[]) => write(KEYS.log, log);
