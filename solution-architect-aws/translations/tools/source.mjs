// Reads one practice test's questions from the exported quiz HTML.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMS = resolve(ROOT, "..");

export function readSource(n) {
  const file = readdirSync(EXAMS).find((f) => f.endsWith(".html") && new RegExp(`Practice Test #${n}\\b`).test(f));
  if (!file) throw new Error(`Không tìm thấy file đề ${n}`);
  const html = readFileSync(join(EXAMS, file), "utf8");
  const data = JSON.parse(html.match(/const quizData = (\{[\s\S]*?\});\s*\n/)[1]);
  return data.questions.map((q, i) => ({
    id: String(q.id),
    number: i + 1,
    prompt: q.prompt.question,
    answers: q.prompt.answers,
    explanation: q.prompt.explanation,
  }));
}

export const viPath = (n) => join(ROOT, "vi", `practice-test-${n}.json`);
