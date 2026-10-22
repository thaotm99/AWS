// node tools/merge.mjs <N> <chunk.json>  → adds/replaces translated questions in vi/practice-test-N.json.
// chunk.json: { "<question id>": { "prompt": "...", "answers": ["..."], "explanation": "..." }, ... }
// The chunk is checked with the same rules as validate.mjs first; nothing is written if it has a problem.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { checkTranslations } from "./check.mjs";
import { readSource, viPath } from "./source.mjs";
const [n, chunk] = process.argv.slice(2);
if (!n || !chunk) { console.error("Cách dùng: node tools/merge.mjs <N> <chunk.json>"); process.exit(2); }
const path = viPath(Number(n));
const add = JSON.parse(readFileSync(chunk, "utf8"));
const problems = checkTranslations(readSource(Number(n)), add, { complete: false });
if (problems.length) {
  console.error(`${chunk} có lỗi, chưa gộp gì:\n${problems.join("\n")}`);
  process.exit(1);
}
const current = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
Object.assign(current, add);
writeFileSync(path, JSON.stringify(current, null, 1) + "\n");
console.log(`${Object.keys(add).length} câu gộp vào, file có ${Object.keys(current).length} câu.`);
