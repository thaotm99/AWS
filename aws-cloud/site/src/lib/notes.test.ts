// npx tsx src/lib/notes.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { findQuote, toMarkdown, type Highlight } from "./notes";

const text = "Security Group là stateful. NACL là stateless. Security Group là stateful nên phản hồi được phép.";
// The second "Security Group là stateful" is told apart by what follows it.
assert.equal(findQuote(text, "Security Group là stateful", "NACL là stateless. ", " nên phản hồi"), text.lastIndexOf("Security Group là stateful"));
assert.equal(findQuote(text, "Security Group là stateful", "", ". NACL"), 0);
// Still found when the context around it changed; gone when the quote itself changed.
assert.equal(findQuote(text, "NACL là stateless", "xyz", "abc"), text.indexOf("NACL"));
assert.equal(findQuote(text, "NACL là stateful", "", ""), -1);
assert.equal(findQuote(text, "", "", ""), -1);

const h = (id: string, part: string, quote: string, note: string, at: number): Highlight => ({
  id, lesson: "vpc", part, title: { vi: `Phần ${part}`, en: `Part ${part}` }, lang: "vi", quote, prefix: "", suffix: "", color: "yellow", note, at,
});
const md = toMarkdown([h("2", "b", "Câu B", "", 2), h("1", "a", "Câu  A\n", "Ghi chú A", 1)], "en", "My notes");
assert.equal(md, "# My notes\n\n## Part a\n\n> Câu A\n\nGhi chú A\n\n\n## Part b\n\n> Câu B\n\n");
console.log("notes: ok");
