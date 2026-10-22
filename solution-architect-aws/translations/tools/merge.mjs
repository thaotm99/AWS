// node tools/merge.mjs <N> <chunk.json>  → adds/replaces translated questions in vi/practice-test-N.json.
// chunk.json: { "<question id>": { "prompt": "...", "answers": ["..."], "explanation": "..." }, ... }
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { viPath } from "./source.mjs";
const [n, chunk] = process.argv.slice(2);
const path = viPath(Number(n));
const current = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const add = JSON.parse(readFileSync(chunk, "utf8"));
Object.assign(current, add);
writeFileSync(path, JSON.stringify(current, null, 1) + "\n");
console.log(`${Object.keys(add).length} câu gộp vào, file có ${Object.keys(current).length} câu.`);
