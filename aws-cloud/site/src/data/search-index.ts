// Build-time only (uses fs): the site search index, served as /search-index.json and loaded by the
// search dialog the first time it opens. One entry per lesson overview, lesson part and glossary term,
// in both languages. Practice-test question ids never enter the index.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LAYERS } from "./curriculum";
import { getCurriculum } from "./exam";
import { GLOSSARY } from "./glossary";
import { lessonParts } from "./lesson-parts";

export interface SearchEntry {
  /** "lesson" overview, "part" of a lesson, or glossary "term". */
  kind: "lesson" | "part" | "term";
  url: string;
  title: { vi: string; en: string };
  /** Where the entry belongs: the lesson title for a part, the lesson that teaches a term. */
  context: { vi: string; en: string };
  /** Plain text searched and quoted in results. */
  text: { vi: string; en: string };
}

const CONTENT_DIR = resolve(process.cwd(), "src/content");

function source(dir: string, lesson: string): string {
  const file = resolve(CONTENT_DIR, dir, `${lesson}.mdx`);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

/** The prose of one scene: markdown and HTML reduced to text, components and their props dropped. */
function prose(mdx: string, sceneId: string): string {
  const chunk = mdx.split(/(?=<Scene\s)/).find((c) => new RegExp(`^<Scene\\s[^>]*\\bid="${sceneId}"`).test(c));
  if (!chunk) return "";
  return chunk
    .split("</Scene>")[0]
    .replace(/^<Scene[^>]*>/, "")
    .replace(/<Takeaway>([\s\S]*?)<\/Takeaway>/g, " $1 ")
    .replace(/<[A-Z][A-Za-z]*\b[\s\S]*?\/>/g, " ") // self-closing components with their props
    .replace(/<([A-Z][A-Za-z]*)\b[\s\S]*?<\/\1>/g, " ") // components with children
    .replace(/<[^>]+>/g, " ") // remaining HTML tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links and images
    .replace(/[*_`#>|]/g, " ")
    .replace(/^\s*-{3,}\s*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchIndex(): SearchEntry[] {
  const concepts = getCurriculum().flatMap((l) => l.concepts);
  const ready = new Set(LAYERS.flatMap((l) => l.ids).filter((id) => existsSync(resolve(CONTENT_DIR, "concepts", `${id}.mdx`))));
  const entries: SearchEntry[] = [];
  for (const c of concepts.filter((x) => ready.has(x.id))) {
    const vi = source("concepts", c.id);
    const en = source("concepts-en", c.id) || vi;
    const lede = (s: string) => /^lede:\s*"([^"]*)"/m.exec(s)?.[1] ?? "";
    const lesson = { vi: c.title, en: c.titleEn };
    entries.push({ kind: "lesson", url: `/concepts/${c.id}/`, title: lesson, context: { vi: "Tổng quan bài", en: "Lesson overview" }, text: { vi: lede(vi), en: lede(en) } });
    for (const p of lessonParts(c.id)) {
      entries.push({
        kind: "part",
        url: `/concepts/${c.id}/${p.slug}/`,
        title: p.title,
        context: lesson,
        text: { vi: prose(vi, p.id), en: prose(en, `en-${p.id}`) || prose(vi, p.id) },
      });
    }
  }
  for (const t of GLOSSARY) {
    const home = concepts.find((c) => c.id === t.lesson);
    entries.push({
      kind: "term",
      url: `/glossary/#${t.id}`,
      title: { vi: t.name, en: t.name },
      context: { vi: home?.title ?? "", en: home?.titleEn ?? "" },
      text: { vi: [t.vi.def, ...t.aliases].join(" "), en: [t.en.def, ...t.aliases].join(" ") },
    });
  }
  const leak = entries.find((e) => /exam\d+_q\d+/.test(JSON.stringify(e)));
  if (leak) throw new Error(`search-index: a practice-test question id reached the index (${leak.url})`);
  return entries;
}
