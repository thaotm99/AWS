// The learner-data documents the server keeps per account (table user_docs), one per former
// browser-storage key. Shared by the API (allowlist) and the browser (store, account page).

export const DOC_NAMES = [
  "done",
  "parts-read",
  "last-part",
  "flashcards",
  "known-terms",
  "notes",
  "goals",
  "activity",
  "pomodoro",
  "pomodoro-settings",
  "pomodoro-log",
  "labs",
  "drills",
  "city",
] as const;

export type DocName = (typeof DOC_NAMES)[number];

/** Largest JSON text one document may hold, in bytes. */
export const MAX_DOC_BYTES = 256 * 1024;

export function isDocName(name: string): name is DocName {
  return (DOC_NAMES as readonly string[]).includes(name);
}

/** The certification whose exam date the guide counts down to (kept in user_certs, not in a document). */
export const CURRENT_CERT = "saa-c03";
