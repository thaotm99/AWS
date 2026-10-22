// Build-time only (uses fs): reads the SAA study folder so lessons stay tied to the
// practice-test questions. Never import this from a client component.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EXTRA_TITLES, importanceOf, LAYERS, TITLES_EN, type Layer } from "./curriculum";
import { SAA_PRACTICE_TEST_FILE } from "../modules/practice/content/QuizHtmlSource";

const STUDY_DIR = resolve(process.cwd(), "../../solution-architect-aws");
/** A whole list_qa.md line naming one question: "exam3_q41". */
const QUESTION_ID = /^exam(\d+)_q(\d{1,2})$/;
/** Anything that looks like a question reference, to catch typos ("exam3-q41", "exam3_q41 ✓"). */
const LOOKS_LIKE_REF = /exam\s*\d+\s*[_-]?\s*q\s*\d+/i;

let examNumbers: Set<number> | undefined;

/** Exam numbers that have a practice-test file in the study folder. */
function knownExams(): Set<number> {
  examNumbers ??= new Set(
    readdirSync(STUDY_DIR).flatMap((f) => {
      const m = SAA_PRACTICE_TEST_FILE.exec(f);
      return m ? [Number(m[1])] : [];
    }),
  );
  return examNumbers;
}

/**
 * The question references in {service}/list_qa.md, in file order. A line that looks like a reference
 * but is not exactly "examN_qM" for an existing test N, or a reference listed twice, fails the build.
 */
export function readListQa(id: string): string[] | undefined {
  const file = join(STUDY_DIR, id, "list_qa.md");
  if (!existsSync(file)) return undefined;
  const refs: string[] = [];
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((raw, i) => {
      const line = raw.trim();
      const where = `${file}:${i + 1}`;
      const m = QUESTION_ID.exec(line);
      if (!m) {
        if (LOOKS_LIKE_REF.test(line)) throw new Error(`${where}: "${line}" is not a question reference; write exactly examN_qM on its own line`);
        return;
      }
      if (!knownExams().has(Number(m[1])) || Number(m[2]) < 1) {
        throw new Error(`${where}: ${line} names a practice test or question that does not exist`);
      }
      if (refs.includes(line)) throw new Error(`${where}: ${line} is listed twice; remove the duplicate line`);
      refs.push(line);
    });
  return refs;
}

const OVERVIEW_COLUMNS = { title: "Service", folder: "Folder", estimate: "Số câu đề thi" };

/**
 * Rows of the service table in overview.md, keyed by folder id. Columns are found by header name,
 * so reordering or adding columns is safe. A row without a numeric count still gives its title.
 */
function readOverview(): Map<string, { title: string; estimate?: number }> {
  const rows = new Map<string, { title: string; estimate?: number }>();
  const file = join(STUDY_DIR, "overview.md");
  let col: Record<keyof typeof OVERVIEW_COLUMNS, number> | undefined;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim().startsWith("|")) {
      if (col) break; // end of the service table
      continue;
    }
    const cells = line.split("|").map((c) => c.trim());
    if (!col) {
      const at = (name: string) => cells.indexOf(name);
      if (at(OVERVIEW_COLUMNS.folder) < 0) continue;
      col = { title: at(OVERVIEW_COLUMNS.title), folder: at(OVERVIEW_COLUMNS.folder), estimate: at(OVERVIEW_COLUMNS.estimate) };
      if (col.title < 0) throw new Error(`${file}: service table has no "${OVERVIEW_COLUMNS.title}" column`);
      continue;
    }
    const folder = cells[col.folder]?.match(/^([a-z0-9-]+)\/$/);
    if (!folder) continue; // the |---| separator
    const count = col.estimate < 0 ? "" : (cells[col.estimate] ?? "");
    rows.set(folder[1], { title: cells[col.title], estimate: /^\d+$/.test(count) ? Number(count) : undefined });
  }
  if (!col) throw new Error(`${file}: no table with a "${OVERVIEW_COLUMNS.folder}" column`);
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
