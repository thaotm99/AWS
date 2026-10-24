import { userData } from "../app/userData";

// Highlights and notes on lesson parts, kept per account (app/userData). A highlight is anchored by the text it
// covers plus a little context before and after, so it finds its place again after the page is
// rebuilt, as long as the sentence itself has not changed.

export type HighlightColor = "yellow" | "blue" | "violet";
export const COLORS: HighlightColor[] = ["yellow", "blue", "violet"];

export interface Highlight {
  id: string;
  /** Lesson and part slug: /concepts/<lesson>/<part>/. */
  lesson: string;
  part: string;
  /** The part's title when the highlight was made, for the notes page. */
  title: { vi: string; en: string };
  /** Language of the text highlighted (each language is its own text). */
  lang: string;
  quote: string;
  prefix: string;
  suffix: string;
  color: HighlightColor;
  note: string;
  at: number;
}

export const CONTEXT = 32;
const KEY = "notes";
export const NOTES_EVENT = "notes-change";

if (typeof window !== "undefined") userData.subscribe(KEY, () => window.dispatchEvent(new Event(NOTES_EVENT)));

export function readNotes(): Highlight[] {
  const v = userData.get(KEY);
  return Array.isArray(v) ? v.filter((h) => h && typeof h.quote === "string" && typeof h.id === "string") : [];
}

export function writeNotes(list: Highlight[]) {
  userData.set(KEY, list);
}

export const addNote = (h: Highlight) => writeNotes([...readNotes(), h]);
export const updateNote = (id: string, patch: Partial<Highlight>) => writeNotes(readNotes().map((h) => (h.id === id ? { ...h, ...patch } : h)));
export const removeNote = (id: string) => writeNotes(readNotes().filter((h) => h.id !== id));

/**
 * Where `quote` sits in `text`: the occurrence whose surrounding text matches the saved context best,
 * or -1 when the quote is gone.
 */
export function findQuote(text: string, quote: string, prefix: string, suffix: string): number {
  if (!quote) return -1;
  let best = -1;
  let bestScore = -1;
  for (let i = text.indexOf(quote); i >= 0; i = text.indexOf(quote, i + 1)) {
    const before = text.slice(Math.max(0, i - prefix.length), i);
    const after = text.slice(i + quote.length, i + quote.length + suffix.length);
    const score = common(before, prefix, true) + common(after, suffix, false);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

/** Characters two strings share at their end (fromEnd) or start. */
function common(a: string, b: string, fromEnd: boolean): number {
  let n = 0;
  while (n < a.length && n < b.length && (fromEnd ? a[a.length - 1 - n] === b[b.length - 1 - n] : a[n] === b[n])) n++;
  return n;
}

/** Markdown of the notes, grouped by lesson part, for export. */
export function toMarkdown(list: Highlight[], lang: "vi" | "en", heading: string): string {
  const groups = new Map<string, Highlight[]>();
  for (const h of [...list].sort((a, b) => a.at - b.at)) {
    const k = `${h.lesson}/${h.part}`;
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }
  let md = `# ${heading}\n`;
  for (const [, hs] of groups) {
    const h = hs[0];
    md += `\n## ${h.title[lang] || h.title.vi}\n\n`;
    for (const x of hs) {
      md += `> ${x.quote.replace(/\s+/g, " ").trim()}\n`;
      if (x.note.trim()) md += `\n${x.note.trim()}\n`;
      md += "\n";
    }
  }
  return md;
}
