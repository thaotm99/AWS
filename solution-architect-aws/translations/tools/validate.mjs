// node tools/validate.mjs <N> [<N>...]  → checks vi/practice-test-N.json against the source test.
// Every question present, same number of answers, same HTML tag sequence, same links and images,
// and no field that still looks untranslated (see check.mjs). Exits 1 if any test has a problem.
import { existsSync, readFileSync } from "node:fs";
import { checkTranslations } from "./check.mjs";
import { readSource, viPath } from "./source.mjs";

const tests = process.argv.slice(2).map(Number);
if (!tests.length || tests.some((n) => !Number.isInteger(n) || n < 1)) {
  console.error("Cách dùng: node tools/validate.mjs <N> [<N>...]");
  process.exit(2);
}

let failed = 0;
for (const n of tests) {
  const src = readSource(n);
  const path = viPath(n);
  if (!existsSync(path)) { console.error(`Chưa có ${path}`); failed++; continue; }
  const problems = checkTranslations(src, JSON.parse(readFileSync(path, "utf8")), { complete: true });
  if (problems.length) { console.error(`Đề ${n}:\n` + problems.join("\n")); failed++; }
  else console.log(`Đề ${n}: đủ ${src.length} câu, không có lỗi.`);
}
process.exit(failed ? 1 : 0);
