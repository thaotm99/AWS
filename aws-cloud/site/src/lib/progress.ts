import { userData } from "../app/userData";
import { recordActivity } from "./goals";

// Learning progress, kept per account (app/userData).
const DONE_KEY = "done";
/** Parts read per lesson: {"vpc": ["nat-gateway", …]}. */
const PARTS_KEY = "parts-read";
export const PROGRESS_EVENT = "progress-change";

if (typeof window !== "undefined") userData.subscribe([DONE_KEY, PARTS_KEY], () => window.dispatchEvent(new Event(PROGRESS_EVENT)));

/** A list of ids; older browser copies stored it as "a,b,c". */
export function idList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x !== "");
  return typeof v === "string" ? v.split(",").filter(Boolean) : [];
}

export function getDone(): Set<string> {
  return new Set(idList(userData.get(DONE_KEY)));
}

/**
 * Call `sync` whenever the saved progress may differ from what is on screen: a change on this page or
 * in another tab, or a page restored from the back/forward cache (pageshow).
 * Returns the unsubscribe function.
 */
export function onProgressChange(sync: () => void): () => void {
  window.addEventListener(PROGRESS_EVENT, sync);
  window.addEventListener("pageshow", sync);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, sync);
    window.removeEventListener("pageshow", sync);
  };
}

export function setDone(id: string, on: boolean) {
  const done = getDone();
  if (on) done.add(id);
  else done.delete(id);
  userData.set(DONE_KEY, [...done]);
}

function readParts(): Record<string, string[]> {
  const v = userData.get(PARTS_KEY);
  return v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, string[]>) } : {};
}

/** Slugs of the parts of a lesson the reader has finished. */
export function getPartsRead(lesson: string): Set<string> {
  const v = readParts()[lesson];
  return new Set(Array.isArray(v) ? v : []);
}

/**
 * Mark one part of a lesson as read. When every part (`all`) is read, the lesson itself is
 * marked done, which is what the study path counts.
 */
export function setPartRead(lesson: string, slug: string, all: string[]) {
  const parts = readParts();
  const finished = new Set(Array.isArray(parts[lesson]) ? parts[lesson] : []);
  if (finished.has(slug)) return;
  finished.add(slug);
  parts[lesson] = [...finished];
  userData.set(PARTS_KEY, parts);
  recordActivity("parts");
  if (all.every((p) => finished.has(p)) && !getDone().has(lesson)) setDone(lesson, true);
}

/** Every part read, as "lesson/slug". */
export function getAllPartsRead(): string[] {
  return Object.entries(readParts()).flatMap(([lesson, slugs]) => (Array.isArray(slugs) ? slugs.map((s) => `${lesson}/${s}`) : []));
}

/** The part the reader opened last, for the "Continue" link on the home page. */
const LAST_KEY = "last-part";

export interface LastPart {
  lesson: string;
  slug: string;
  title: { vi: string; en: string };
  /** Where "Next" leads from it: the next part, the quiz or the overview. */
  next?: { href: string; title: { vi: string; en: string } };
}

export function getLastPart(): LastPart | null {
  const v = userData.get<LastPart>(LAST_KEY);
  return v && typeof v === "object" && typeof v.lesson === "string" && typeof v.slug === "string" && v.title ? v : null;
}

export function setLastPart(part: LastPart) {
  // Opening the same part again is not a change worth a request.
  if (JSON.stringify(getLastPart()) === JSON.stringify(part)) return;
  userData.set(LAST_KEY, part);
}
