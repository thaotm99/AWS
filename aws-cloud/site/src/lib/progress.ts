// Per-browser learning progress. Phase 2 moves this to Cognito + DynamoDB and
// keeps localStorage as the guest fallback.
const DONE_KEY = "done";
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
  const onStorage = (e: StorageEvent) => (e.key === DONE_KEY || e.key === null) && sync();
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
