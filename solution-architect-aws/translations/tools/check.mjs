// Checks shared by validate.mjs (a whole file) and merge.mjs (one chunk before it is written).
// Same number of answers, same HTML tag sequence, same links and images, and no field that
// still looks untranslated.

const tags = (h) => [...h.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map((m) => m[0].toLowerCase()).join(" ");
const urls = (h) => [...h.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)].map((m) => m[1]).sort().join(" ");
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
// Prose only: code blocks are kept verbatim and never translated.
const prose = (h) => text(h.replace(/<(pre|code)\b[\s\S]*?<\/\1>/gi, " "));
const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

/** Problems with translation `t` of source question `q` (from readSource); empty when it is fine. */
export function checkQuestion(q, t) {
  const where = `câu ${q.number} (id ${q.id})`;
  if (!t || typeof t !== "object") return [`${where}: chưa dịch`];
  const problems = [];
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
    const words = prose(b).split(" ").filter(Boolean).length;
    // Short answers can be pure AWS names ("Amazon S3"); longer text must contain Vietnamese.
    if (words > 12 && !VI.test(prose(b))) problems.push(`${where} ${name}: có vẻ chưa dịch`);
  }
  return problems;
}

/**
 * Problems with `translations` ({ id: entry }) against source questions `src`.
 * `complete`: every source question must be translated (a whole file); otherwise only the ids present are checked (a chunk).
 */
export function checkTranslations(src, translations, { complete }) {
  const problems = [];
  for (const q of src) {
    if (!complete && !(q.id in translations)) continue;
    problems.push(...checkQuestion(q, translations[q.id]));
  }
  const extra = Object.keys(translations).filter((id) => !src.some((q) => q.id === id));
  if (extra.length) problems.push(`id không có trong đề: ${extra.join(", ")}`);
  return problems;
}
