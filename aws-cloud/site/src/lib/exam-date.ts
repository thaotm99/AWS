// The learner's exam date, kept in this browser. The exam guide counts down to it and marks the study phase
// that applies with that many days left.
import { today } from "./flashcards";

export const EXAM_DATE_EVENT = "exam-date-change";
const KEY = "exam-date";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Study phases of the guide, in order; "exam" and "past" have no card of their own. */
export type Phase = "baseline" | "gaps" | "mocks" | "eve" | "exam" | "past";

export function readExamDate(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && ISO_DATE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeExamDate(date: string | null) {
  try {
    if (date && ISO_DATE.test(date)) localStorage.setItem(KEY, date);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EXAM_DATE_EVENT));
}

/** Whole local days from `now` to the exam date (0 on the day itself, negative once it has passed). */
export function daysUntil(date: string, now = new Date()): number {
  const [y, m, d] = date.split("-").map(Number);
  return today(new Date(y, m - 1, d)) - today(now);
}

/** More than 5 days: fill the gaps; 5 to 2 days: frequent full mock exams; 1 day: the eve of the exam. */
export function phaseFor(days: number): Phase {
  if (days < 0) return "past";
  if (days === 0) return "exam";
  if (days === 1) return "eve";
  if (days <= 5) return "mocks";
  return "gaps";
}
