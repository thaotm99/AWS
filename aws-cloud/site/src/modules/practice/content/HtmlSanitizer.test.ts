// npx tsx src/modules/practice/content/HtmlSanitizer.test.ts  (from aws-cloud/site)
// Not part of the build: nothing imports it. Checks known bypasses, then every real question field.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HtmlSanitizer } from "./HtmlSanitizer";

const s = new HtmlSanitizer();
/** A live dangerous tag, event handler or script URL. Escaped text ("&lt;img onerror=…") is fine. */
const DANGER = /<(script|style|iframe|object)\b|<[a-z][^>]*(\son\w+\s*=|javascript:)/i;

const cases: Array<[string, string]> = [
  ["<<span>img src=x onerror=alert(1)>", '<img loading="lazy">'],
  ["<<x>script>alert(1)<</x>/script>", ""],
  ["<scr<script>ipt>alert(1)</script>", "&lt;scr"],
  ['<p onclick="x">hi</p><script>bad()</script>', "<p>hi</p>"],
  ['<img src="x" onerror="alert(1)"', '&lt;img src="x" onerror="alert(1)"'],
  ['<a href="javascript:alert(1)">x</a>', '<a target="_blank" rel="noopener noreferrer">x</a>'],
  ['<a href="https://aws.amazon.com/">x</a>', '<a href="https://aws.amazon.com/" target="_blank" rel="noopener noreferrer">x</a>'],
  ["<style>p{}</style><iframe src=x></iframe><object></object>ok", "ok"],
  ["<!-- c --><!--<script>x</script>-->ok", "ok"],
  ["a < b and c <d", "a &lt; b and c &lt;d"],
  ["<<<p>>>", "&lt;&lt;<p>>>"],
];

let failed = 0;
for (const [input, expected] of cases) {
  const out = s.sanitize(input);
  try {
    assert.equal(out, expected, input);
    assert.equal(s.sanitize(out), out, `not idempotent: ${input}`);
    assert.doesNotMatch(out, DANGER, input);
  } catch (e) {
    failed++;
    console.error(String(e));
  }
}

// Every field of the real practice tests and translations: safe and stable under a second pass.
const dir = resolve(process.cwd(), "../../solution-architect-aws");
const fields: string[] = [];
for (const f of readdirSync(dir).filter((f) => /Practice Test #\d+/.test(f) && f.endsWith(".html"))) {
  const data = JSON.parse(readFileSync(join(dir, f), "utf8").match(/const quizData = (\{[\s\S]*?\});\s*\n/)![1]);
  for (const q of data.questions) fields.push(q.prompt.question, q.prompt.explanation, ...q.prompt.answers);
}
const trDir = join(dir, "translations", "vi");
for (const f of readdirSync(trDir).filter((f) => f.endsWith(".json"))) {
  for (const t of Object.values(JSON.parse(readFileSync(join(trDir, f), "utf8"))) as Array<{ prompt: string; answers: string[]; explanation: string }>) {
    fields.push(t.prompt, t.explanation, ...t.answers);
  }
}
for (const html of fields) {
  const out = s.sanitize(html);
  if (s.sanitize(out) !== out || DANGER.test(out)) {
    failed++;
    console.error(`real content not stable/safe: ${html.slice(0, 80)}`);
  }
}

console.log(`${cases.length} payloads, ${fields.length} real fields, ${failed} failures`);
process.exit(failed ? 1 : 0);
