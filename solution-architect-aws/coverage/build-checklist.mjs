// Gộp coverage/test-1..6.json thành CHECKLIST.md: bảng đối chiếu keyword đề thi với nội dung bài học.
// Chạy: node solution-architect-aws/coverage/build-checklist.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const LESSONS = [
  "global-infra", "vpc", "route53", "cloudfront", "iam", "kms", "security", "cognito", "ec2", "elb", "asg",
  "containers", "lambda", "s3", "storage", "storage-migration", "rds", "dynamodb", "analytics", "messaging",
  "kinesis", "monitoring", "iac", "backup-dr", "others",
];
const RANK = { missing: 0, partial: 1, covered: 2 };
const ICON = { covered: "✅ Đã có", partial: "🟡 Một phần", missing: "❌ Thiếu" };

// Keyword names from six reviewers: merge on a normalised form, keep the most frequent spelling.
const norm = (k) => k.toLowerCase().replace(/^amazon |^aws /, "").replace(/[()]/g, "").replace(/\s+/g, " ").trim();

const rows = new Map(); // lesson|norm -> row
const perTest = [];
for (let n = 1; n <= 6; n++) {
  const file = join(here, `test-${n}.json`);
  if (!existsSync(file)) throw new Error(`Thiếu ${file}`);
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (data.questions.length !== 65) throw new Error(`test-${n}.json có ${data.questions.length} câu, cần 65`);
  const count = { covered: 0, partial: 0, missing: 0 };
  for (const q of data.questions) {
    for (const k of q.keywords) {
      if (!(k.status in RANK)) throw new Error(`test-${n} câu ${q.number}: trạng thái lạ "${k.status}"`);
      const lesson = LESSONS.includes(k.lesson) ? k.lesson : "others";
      count[k.status]++;
      const key = `${lesson}|${norm(k.keyword)}`;
      const row = rows.get(key) ?? { lesson, names: new Map(), refs: new Set(), statuses: [], where: new Set() };
      row.names.set(k.keyword, (row.names.get(k.keyword) ?? 0) + 1);
      row.refs.add(`exam${n}_q${q.number}`);
      row.statuses.push(k.status);
      if (k.where) row.where.add(k.where);
      rows.set(key, row);
    }
  }
  perTest.push({ n, ...count });
}

// One status per keyword: the worst one any reviewer gave, so a gap is never hidden.
const keywords = [...rows.values()].map((r) => {
  const status = r.statuses.reduce((a, b) => (RANK[b] < RANK[a] ? b : a));
  const name = [...r.names].sort((a, b) => b[1] - a[1])[0][0];
  const disagree = new Set(r.statuses).size > 1;
  const refs = [...r.refs].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  return { ...r, status, name, disagree, refs };
});

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + "%";
const lines = [];
lines.push("# Đối chiếu keyword đề thi với nội dung bài học");
lines.push("");
lines.push("Rà toàn bộ 390 câu của 6 đề luyện SAA-C03: mỗi câu được tách thành các keyword (dịch vụ, tính năng,");
lines.push("giới hạn, khái niệm) mà câu hỏi, đáp án đúng và lời giải cho các phương án sai dựa vào; mỗi keyword được");
lines.push("đối chiếu với bài học tương ứng (file MDX và các mô phỏng của bài).");
lines.push("");
lines.push("- ✅ **Đã có**: bài học giải thích đủ để trả lời câu hỏi.");
lines.push("- 🟡 **Một phần**: có nhắc tới nhưng chưa đủ để trả lời.");
lines.push("- ❌ **Thiếu**: bài học chưa có.");
lines.push("- Một keyword xuất hiện ở nhiều câu được gộp thành một dòng; trạng thái lấy mức **thấp nhất** mà các câu ghi nhận");
lines.push("  (đánh dấu ⚠ khi các câu đánh giá khác nhau).");
lines.push("");
lines.push("Dữ liệu gốc: `coverage/test-1.json` … `test-6.json`. Tạo lại file này: `node solution-architect-aws/coverage/build-checklist.mjs`.");
lines.push("");

const all = { covered: 0, partial: 0, missing: 0 };
for (const k of keywords) all[k.status]++;
lines.push("## Tổng quan");
lines.push("");
lines.push(`Có **${keywords.length} keyword** khác nhau: ✅ ${all.covered} (${pct(all.covered, keywords.length)}) · 🟡 ${all.partial} (${pct(all.partial, keywords.length)}) · ❌ ${all.missing} (${pct(all.missing, keywords.length)}).`);
lines.push("");
lines.push("### Theo bài học");
lines.push("");
lines.push("| Bài học | Keyword | ✅ Đã có | 🟡 Một phần | ❌ Thiếu | Tỷ lệ đã có |");
lines.push("|---|---:|---:|---:|---:|---:|");
for (const lesson of LESSONS) {
  const ks = keywords.filter((k) => k.lesson === lesson);
  const c = { covered: 0, partial: 0, missing: 0 };
  for (const k of ks) c[k.status]++;
  lines.push(`| [${lesson}](#${lesson}) | ${ks.length} | ${c.covered} | ${c.partial} | ${c.missing} | ${pct(c.covered, ks.length)} |`);
}
lines.push("");
lines.push("### Theo đề (số lượt keyword, chưa gộp)");
lines.push("");
lines.push("| Đề | ✅ Đã có | 🟡 Một phần | ❌ Thiếu |");
lines.push("|---|---:|---:|---:|");
for (const t of perTest) lines.push(`| Đề ${t.n} | ${t.covered} | ${t.partial} | ${t.missing} |`);
lines.push("");

for (const lesson of LESSONS) {
  const ks = keywords
    .filter((k) => k.lesson === lesson)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.refs.length - a.refs.length || a.name.localeCompare(b.name));
  if (!ks.length) continue;
  lines.push(`## ${lesson}`);
  lines.push("");
  lines.push("| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |");
  lines.push("|---|---|---|---:|---|---|");
  for (const k of ks) {
    const where = [...k.where].slice(0, 2).join("<br>").replace(/\|/g, "\\|");
    lines.push(`| [ ] | ${k.name.replace(/\|/g, "\\|")} | ${ICON[k.status]}${k.disagree ? " ⚠" : ""} | ${k.refs.length} | ${k.refs.join(", ")} | ${where} |`);
  }
  lines.push("");
}

writeFileSync(join(here, "CHECKLIST.md"), lines.join("\n"));
console.log(`CHECKLIST.md: ${keywords.length} keyword, ✅ ${all.covered} · 🟡 ${all.partial} · ❌ ${all.missing}`);
