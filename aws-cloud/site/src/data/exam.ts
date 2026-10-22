// Build-time only (uses fs): reads the SAA study folder so lessons stay tied to the
// practice-test questions. Never import this from a client component.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EXTRA_TITLES, importanceOf, LAYERS, TITLES_EN, type Layer } from "./curriculum";

const STUDY_DIR = resolve(process.cwd(), "../../solution-architect-aws");
const QUESTION_ID = /^exam[1-6]_q\d{1,2}$/;

export function readListQa(id: string): string[] | undefined {
  const file = join(STUDY_DIR, id, "list_qa.md");
  if (!existsSync(file)) return undefined;
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => QUESTION_ID.test(line));
}

/** Rows of the service table in overview.md, keyed by folder id. */
function readOverview(): Map<string, { title: string; estimate: number }> {
  const rows = new Map<string, { title: string; estimate: number }>();
  const text = readFileSync(join(STUDY_DIR, "overview.md"), "utf8");
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // | Service | Folder | Status | Ngày học | Số câu đề thi |
    const folder = cells[2]?.match(/^([a-z0-9-]+)\/$/);
    if (folder && /^\d+$/.test(cells[5] ?? "")) {
      rows.set(folder[1], { title: cells[1], estimate: Number(cells[5]) });
    }
  }
  return rows;
}

let cached: Layer[] | undefined;

export function getCurriculum(): Layer[] {
  if (cached) return cached;
  const overview = readOverview();
  const placed = new Set(LAYERS.flatMap((l) => l.ids));
  const unplaced = [...overview.keys()].filter((id) => !placed.has(id));
  if (unplaced.length) throw new Error(`curriculum: overview.md lists ${unplaced.join(", ")} but LAYERS does not`);
  cached = LAYERS.map(({ n, name, nameEn, ids }) => ({
    n,
    name,
    nameEn,
    concepts: ids.map((id) => {
      const row = overview.get(id);
      const title = EXTRA_TITLES[id] ?? row?.title;
      if (!title) throw new Error(`curriculum: "${id}" is neither in overview.md nor EXTRA_TITLES`);
      const listed = readListQa(id);
      const questions = listed ? listed.length : (row?.estimate ?? 0);
      return { id, title, titleEn: TITLES_EN[id] ?? title, importance: importanceOf(questions), questions, exact: Boolean(listed) };
    }),
  }));
  return cached;
}

let allListed: Set<string> | undefined;

/** Every question id registered in some {service}/list_qa.md. */
export function listedQuestions(): Set<string> {
  if (allListed) return allListed;
  allListed = new Set(getCurriculum().flatMap((l) => l.concepts).flatMap((c) => readListQa(c.id) ?? []));
  return allListed;
}

/** Fail the build when a lesson cites a question that no list_qa.md contains. */
export function assertListed(ids: string[], where: string) {
  const known = listedQuestions();
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length) {
    throw new Error(`${where} cites ${missing.join(", ")}, which no list_qa.md in solution-architect-aws/ contains`);
  }
}
