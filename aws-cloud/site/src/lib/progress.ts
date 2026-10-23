// Per-browser learning progress. Phase 2 moves this to Cognito + DynamoDB and
// keeps localStorage as the guest fallback.
const DONE_KEY = "done";
/** Parts read per lesson: {"vpc": ["nat-gateway", …]}. */
const PARTS_KEY = "parts-read";
export const PROGRESS_EVENT = "progress-change";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: progress just isn't remembered */
  }
}

export function getDone(): Set<string> {
  return new Set((read(DONE_KEY) ?? "").split(",").filter(Boolean));
}

/**
 * Call `sync` whenever the saved progress may differ from what is on screen: a change on this page,
 * a change in another tab (storage event), or a page restored from the back/forward cache (pageshow).
 * Returns the unsubscribe function.
 */
export function onProgressChange(sync: () => void): () => void {
  const onStorage = (e: StorageEvent) => (e.key === DONE_KEY || e.key === PARTS_KEY || e.key === null) && sync();
  window.addEventListener(PROGRESS_EVENT, sync);
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", sync);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, sync);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", sync);
  };
}

export function setDone(id: string, on: boolean) {
  const done = getDone();
  if (on) done.add(id);
  else done.delete(id);
  write(DONE_KEY, [...done].join(","));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

function readParts(): Record<string, string[]> {
  try {
    const v = JSON.parse(read(PARTS_KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
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
  write(PARTS_KEY, JSON.stringify(parts));
  if (all.every((p) => finished.has(p)) && !getDone().has(lesson)) setDone(lesson, true);
  else window.dispatchEvent(new Event(PROGRESS_EVENT));
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
  try {
    const v = JSON.parse(read(LAST_KEY) ?? "null");
    return v && typeof v.lesson === "string" && typeof v.slug === "string" && v.title ? v : null;
  } catch {
    return null;
  }
}

export function setLastPart(part: LastPart) {
  write(LAST_KEY, JSON.stringify(part));
}
