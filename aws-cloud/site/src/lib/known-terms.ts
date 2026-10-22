// Glossary terms the reader has marked as understood, per browser (same storage rules as progress.ts).
// Shared by every key-terms strip, so a term marked in one lesson is known in all of them.
const KNOWN_KEY = "known-terms";
const KNOWN_EVENT = "known-terms-change";

export function getKnown(): Set<string> {
  try {
    return new Set((localStorage.getItem(KNOWN_KEY) ?? "").split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

export function setKnown(id: string, on: boolean) {
  const known = getKnown();
  if (on) known.add(id);
  else known.delete(id);
  try {
    localStorage.setItem(KNOWN_KEY, [...known].join(","));
  } catch {
    /* storage blocked: the mark lasts for this page only */
  }
  window.dispatchEvent(new Event(KNOWN_EVENT));
}

/** Calls `sync` when the saved terms may have changed (this page, another tab, back/forward cache). */
export function onKnownChange(sync: () => void): () => void {
  const onStorage = (e: StorageEvent) => (e.key === KNOWN_KEY || e.key === null) && sync();
  window.addEventListener(KNOWN_EVENT, sync);
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", sync);
  return () => {
    window.removeEventListener(KNOWN_EVENT, sync);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", sync);
  };
}
