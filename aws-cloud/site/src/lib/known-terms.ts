// Glossary terms the reader has marked as understood, kept per account (app/userData).
// Shared by every key-terms strip, so a term marked in one lesson is known in all of them.
import { userData } from "../app/userData";
import { idList } from "./progress";

const KNOWN_KEY = "known-terms";
const KNOWN_EVENT = "known-terms-change";

if (typeof window !== "undefined") userData.subscribe(KNOWN_KEY, () => window.dispatchEvent(new Event(KNOWN_EVENT)));

export function getKnown(): Set<string> {
  return new Set(idList(userData.get(KNOWN_KEY)));
}

export function setKnown(id: string, on: boolean) {
  const known = getKnown();
  if (on) known.add(id);
  else known.delete(id);
  userData.set(KNOWN_KEY, [...known]);
}

/** Calls `sync` when the saved terms may have changed (this page, another tab, back/forward cache). */
export function onKnownChange(sync: () => void): () => void {
  window.addEventListener(KNOWN_EVENT, sync);
  window.addEventListener("pageshow", sync);
  return () => {
    window.removeEventListener(KNOWN_EVENT, sync);
    window.removeEventListener("pageshow", sync);
  };
}
