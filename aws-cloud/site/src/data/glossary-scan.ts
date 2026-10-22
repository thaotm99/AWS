// Build-time only (uses fs): finds which glossary terms each lesson and each lesson scene uses,
// by reading the lesson MDX sources. Never import this from a client component.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LAYERS } from "./curriculum";
import { GLOSSARY, type GlossaryTerm } from "./glossary";
import { ACRONYM, spellings } from "./glossary-rules";

export type Lang = "vi" | "en";

const CONTENT_DIR = resolve(process.cwd(), "src/content");
const LESSON_DIR: Record<Lang, string> = { vi: "concepts", en: "concepts-en" };
const LESSON_IDS = LAYERS.flatMap((l) => l.ids);

interface Alias {
  text: string;
  id: string;
  exact: boolean;
}

let matcher: { regex: RegExp; byKey: Map<string, Alias> } | undefined;

function key(s: string) {
  return s.normalize("NFC").toLowerCase();
}

function getMatcher() {
  if (matcher) return matcher;
  const ids = new Set<string>();
  const byKey = new Map<string, Alias>();
  for (const t of GLOSSARY) {
    if (!/^[a-z0-9-]+$/.test(t.id)) throw new Error(`glossary: bad id "${t.id}"`);
    if (ids.has(t.id)) throw new Error(`glossary: duplicate id "${t.id}"`);
    ids.add(t.id);
    if (!LESSON_IDS.includes(t.lesson)) throw new Error(`glossary: "${t.id}" points to unknown lesson "${t.lesson}"`);
    if (!t.docs.startsWith("https://docs.aws.amazon.com/")) throw new Error(`glossary: "${t.id}" docs link is not an AWS docs page`);
    for (const text of spellings(t)) {
      const k = key(text);
      const other = byKey.get(k);
      if (other && other.id !== t.id) throw new Error(`glossary: "${text}" is an alias of both "${other.id}" and "${t.id}"`);
      byKey.set(k, { text, id: t.id, exact: ACRONYM.test(text) });
    }
  }
  const alternatives = [...byKey.values()]
    .map((a) => a.text)
    .sort((a, b) => b.length - a.length)
    .map((s) => s.normalize("NFC").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(${alternatives.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
  matcher = { regex, byKey };
  return matcher;
}

/** Glossary ids used in a text, in order of first appearance. */
export function termIdsIn(text: string): string[] {
  const { regex, byKey } = getMatcher();
  const found: string[] = [];
  for (const m of text.normalize("NFC").matchAll(regex)) {
    const alias = byKey.get(key(m[1]));
    if (!alias || (alias.exact && m[1] !== alias.text)) continue;
    if (!found.includes(alias.id)) found.push(alias.id);
  }
  return found;
}

/** Lesson text without frontmatter, imports and the code-like props of diagrams (ids, kinds, paths…). */
function readable(src: string): string {
  return src
    .replace(/^---[\s\S]*?\n---\n/, "")
    .replace(/^import .*$/gm, "")
    .replace(/\bquestions=\{\[[^\]]*\]\}/g, "")
    .replace(/\b(id|kind|tone|verdict|href|url|path|hide|from|to|icon|x|y|w|h|height|width)\s*:\s*("[^"]*"|\[[^\]]*\]|-?\d+(\.\d+)?)/g, "")
    .replace(/\b(id|client:[a-z]+)(="[^"]*")?/g, "");
}

const sources = new Map<string, string | null>();

function lessonSource(lang: Lang, lesson: string): string | null {
  const k = `${lang}/${lesson}`;
  if (!sources.has(k)) {
    const file = resolve(CONTENT_DIR, LESSON_DIR[lang], `${lesson}.mdx`);
    sources.set(k, existsSync(file) ? readFileSync(file, "utf8") : null);
  }
  return sources.get(k)!;
}

/** Glossary terms used in one scene of a lesson, in order of first appearance. */
export function sceneTerms(lang: Lang, lesson: string, sceneId: string): GlossaryTerm[] {
  const src = lessonSource(lang, lesson);
  if (!src) return [];
  const parts = src.split(/(?=<Scene\s)/);
  const part = parts.find((p) => new RegExp(`^<Scene\\s[^>]*\\bid="${sceneId}"`).test(p));
  if (!part) return [];
  return termIdsIn(readable(part)).map((id) => GLOSSARY.find((t) => t.id === id)!);
}

/**
 * Terms for a scene's key-terms strip: the terms it uses that no earlier scene of the same lesson
 * already listed, so each term is introduced once per lesson.
 */
export function stripTerms(lang: Lang, lesson: string, sceneId: string): GlossaryTerm[] {
  const src = lessonSource(lang, lesson);
  if (!src) return [];
  const earlier = new Set<string>();
  for (const m of src.matchAll(/<Scene\s[^>]*\bid="([^"]+)"/g)) {
    if (m[1] === sceneId) return sceneTerms(lang, lesson, sceneId).filter((t) => !earlier.has(t.id));
    for (const t of sceneTerms(lang, lesson, m[1])) earlier.add(t.id);
  }
  return [];
}
