// node tools/validate.mjs <N>  → checks vi/practice-test-N.json against the source test.
// Every question present, same number of answers, same HTML tag sequence, same links and images,
// and no field that still looks untranslated.
import { existsSync, readFileSync } from "node:fs";
import { readSource, viPath } from "./source.mjs";

const n = Number(process.argv[2]);
const src = readSource(n);
const path = viPath(n);
if (!existsSync(path)) { console.error(`Chưa có ${path}`); process.exit(1); }
const vi = JSON.parse(readFileSync(path, "utf8"));

const tags = (h) => [...h.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map((m) => m[0].toLowerCase()).join(" ");
const urls = (h) => [...h.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)].map((m) => m[1]).sort().join(" ");
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

const problems = [];
for (const q of src) {
  const t = vi[q.id];
  const where = `câu ${q.number} (id ${q.id})`;
  if (!t) { problems.push(`${where}: chưa dịch`); continue; }
  const fields = [["prompt", q.prompt, t.prompt], ["explanation", q.explanation, t.explanation]];
  if (!Array.isArray(t.answers) || t.answers.length !== q.answers.length) {
    problems.push(`${where}: cần ${q.answers.length} phương án, có ${t.answers?.length ?? 0}`);
  } else {
    q.answers.forEach((a, i) => fields.push([`answers[${i}]`, a, t.answers[i]]));
  }
  for (const [name, a, b] of fields) {
    if (typeof b !== "string" || !b.trim()) { problems.push(`${where} ${name}: trống`); continue; }
    if (tags(a) !== tags(b)) problems.push(`${where} ${name}: cấu trúc thẻ HTML khác bản gốc`);
    if (urls(a) !== urls(b)) problems.push(`${where} ${name}: link/ảnh khác bản gốc`);
    const words = text(b).split(" ").length;
    // Short answers can be pure AWS names ("Amazon S3"); longer text must contain Vietnamese.
    if (words > 12 && !VI.test(text(b))) problems.push(`${where} ${name}: có vẻ chưa dịch`);
  }
}
const extra = Object.keys(vi).filter((id) => !src.some((q) => q.id === id));
if (extra.length) problems.push(`id không có trong đề: ${extra.join(", ")}`);
console.log(problems.length ? problems.join("\n") : `Đề ${n}: đủ ${src.length} câu, không có lỗi.`);
process.exit(problems.length ? 1 : 0);
