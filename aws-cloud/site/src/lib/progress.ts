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

export function setDone(id: string, on: boolean) {
  const done = getDone();
  if (on) done.add(id);
  else done.delete(id);
  write(DONE_KEY, [...done].join(","));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}
