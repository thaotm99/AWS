// Build-time only (uses fs): the parts of each lesson, one per <Scene> in the lesson MDX, each served
// as its own page at /concepts/<lesson>/<slug>/. Never import this from a client component.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PART_SLUGS } from "./part-slugs";

/** learn: a numbered part; review: common mistakes or going further; exercise: the closing exercise. */
export type PartKind = "learn" | "review" | "exercise";

export interface LessonPart {
  /** Vietnamese scene id; the English scene is "en-<id>". */
  id: string;
  slug: string;
  kind: PartKind;
  label: { vi: string; en: string };
  title: { vi: string; en: string };
  /** Estimated reading time: the lesson's minutes shared out by the length of each part. */
  minutes: number;
}

const CONTENT_DIR = resolve(process.cwd(), "src/content");
const SCENE = /<Scene\s+id="([^"]+)"\s+label="([^"]+)"\s+title="([^"]+)"/g;

function source(dir: string, lesson: string): string | null {
  const file = resolve(CONTENT_DIR, dir, `${lesson}.mdx`);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function kindOf(label: string): PartKind {
  if (/^(Phần|Part)\s/.test(label)) return "learn";
  if (/^(Bài tập|Exercise)$/.test(label)) return "exercise";
  return "review";
}

const cache = new Map<string, LessonPart[]>();

export function lessonParts(lesson: string): LessonPart[] {
  if (cache.has(lesson)) return cache.get(lesson)!;
  const vi = source("concepts", lesson);
  const en = source("concepts-en", lesson);
  if (!vi) return [];
  const minutes = Number(/^minutes:\s*(\d+)/m.exec(vi)?.[1] ?? 0);
  const viScenes = [...vi.matchAll(SCENE)];
  const enScenes = en ? [...en.matchAll(SCENE)] : [];
  // Text length of each scene, to share the lesson's minutes out.
  const chunks = vi.split(/(?=<Scene\s)/).slice(1);
  const lengths = chunks.map((c) => c.split("</Scene>")[0].replace(/<[^>]+>/g, " ").split(/\s+/).length);
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const slugs = PART_SLUGS[lesson] ?? {};
  const parts = viScenes.map((m, i) => {
    const [, id, label, title] = m;
    const twin = enScenes.find((e) => e[1] === `en-${id}`);
    if (en && !twin) throw new Error(`lesson-parts: ${lesson} has no English scene "en-${id}"`);
    const slug = slugs[id];
    if (!slug) throw new Error(`lesson-parts: add a slug for ${lesson} scene "${id}" in data/part-slugs.ts`);
    return {
      id,
      slug,
      kind: kindOf(label),
      label: { vi: label, en: twin?.[2] ?? label },
      title: { vi: title, en: twin?.[3] ?? title },
      minutes: Math.max(2, Math.round((minutes * lengths[i]) / total)),
    };
  });
  const seen = new Set<string>();
  for (const p of parts) {
    if (seen.has(p.slug) || p.slug === "quiz") throw new Error(`lesson-parts: slug "${p.slug}" is not unique in ${lesson}`);
    seen.add(p.slug);
  }
  cache.set(lesson, parts);
  return parts;
}

/** The part a scene belongs to, from its Vietnamese or English ("en-") id. */
export function partOfScene(lesson: string, sceneId: string): LessonPart | undefined {
  const id = sceneId.replace(/^en-/, "");
  return lessonParts(lesson).find((p) => p.id === id);
}

/** Lesson and part slug of a lesson URL: /concepts/<lesson>/ (overview) or /concepts/<lesson>/<part>/. */
export function lessonRoute(pathname: string): { lesson: string; part?: string } | undefined {
  const m = /^\/concepts\/([^/]+)\/(?:([^/]+)\/?)?$/.exec(pathname);
  if (!m || m[2] === "quiz") return undefined;
  return { lesson: m[1], part: m[2] };
}
