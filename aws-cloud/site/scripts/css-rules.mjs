// Lists every legacy CSS rule whose selector matches a pattern, with its file, line and media context.
// Used while migrating an area to Tailwind: collect all rules that style it, port them, then delete them.
//   node scripts/css-rules.mjs '\.topnav|\.brand'            list matching rules
//   node scripts/css-rules.mjs '\.topnav|\.brand' --delete   remove them (whole rule, or the matching selectors)
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import postcss from "postcss";

const [pattern, flag] = process.argv.slice(2);
if (!pattern) {
  console.error("usage: node scripts/css-rules.mjs <selector-regex> [--delete]");
  process.exit(1);
}
const re = new RegExp(pattern);
// Only legacy files: anything already ported to Tailwind (no "@layer legacy") is left alone.
const files = globSync("src/**/*.css").filter((f) => readFileSync(f, "utf8").includes("@layer legacy"));

let total = 0;
for (const file of files) {
  const root = postcss.parse(readFileSync(file, "utf8"), { from: file });
  let changed = false;
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const hits = rule.selectors.filter((s) => re.test(s));
    if (!hits.length) return;
    total++;
    const media = [];
    for (let p = rule.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && p.name !== "layer") media.unshift(`@${p.name} ${p.params}`);
    if (flag === "--delete") {
      if (hits.length === rule.selectors.length) rule.remove();
      else rule.selectors = rule.selectors.filter((s) => !re.test(s));
      changed = true;
    } else {
      console.log(`${file}:${rule.source.start.line}${media.length ? "  " + media.join(" ") : ""}\n  ${rule.toString().replace(/\s+/g, " ")}`);
    }
  });
  if (changed) {
    // Drop at-rules left empty by the deletion (media queries, the legacy layer itself stays).
    root.walkAtRules((at) => { if (at.name !== "layer" && at.nodes && at.nodes.length === 0) at.remove(); });
    writeFileSync(file, root.toString());
  }
}
console.error(`${total} rule(s) ${flag === "--delete" ? "deleted" : "matched"}`);
