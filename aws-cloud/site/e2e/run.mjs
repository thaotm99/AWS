// npm run test:e2e  (after npm run build; from aws-cloud/site)
//
// Checks the built site the way a reader uses it, so a change that breaks pages fails CI:
//  - static: every internal link resolves; no practice-test question id (examN_qM) is served
//  - in a browser, every page at 1280px and 390px: no JavaScript error; every island of the visible
//    language hydrates; every enabled button in an island or the study path can be pressed (not
//    covered by another element)
//  - axe-core (WCAG 2.1 A/AA and best practice) at 1280px: any violation fails, except colour
//    contrast, which is reported only (some states are dimmed on purpose)
//
// Env: E2E_PAGES=/,/glossary/ limits the browser checks to some pages; E2E_WORKERS (default 4).
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const DIST = "dist";
const PORT = 4399;
const ORIGIN = `http://localhost:${PORT}`;
const WIDTHS = [1280, 390];
const WORKERS = Number(process.env.E2E_WORKERS ?? 4);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const failures = [];
const warnings = [];
const fail = (page, what, detail = "") => failures.push(`${page}  ${what}  ${detail}`.trim());

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

// ---------- static checks ----------
const all = files(DIST);
const html = all.filter((f) => f.endsWith(".html"));
const pages = html
  .filter((f) => f.endsWith("index.html"))
  .map((f) => "/" + relative(DIST, f).replace(/index\.html$/, ""))
  .sort();

for (const file of html) {
  const text = readFileSync(file, "utf8");
  for (const [, href] of text.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
    if (href.startsWith("//")) continue;
    const p = join(DIST, href);
    if (!existsSync(p) && !existsSync(join(p, "index.html"))) fail("/" + relative(DIST, file), "broken link", href);
  }
}
// Question ids may appear only where the practice pages need them: nowhere in what is served.
for (const file of all.filter((f) => /\.(html|json|js)$/.test(f))) {
  if (/exam\d+_q\d+/.test(readFileSync(file, "utf8"))) fail("/" + relative(DIST, file), "practice-test question id served");
}
console.log(`static: ${html.length} HTML files, ${all.length} files checked`);

// ---------- browser checks ----------
const server = spawn("npx", ["astro", "preview", "--port", String(PORT)], { stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);
for (let i = 0; ; i++) {
  try {
    if ((await fetch(ORIGIN)).ok) break;
  } catch {}
  if (i > 60) throw new Error("preview server did not start");
  await new Promise((r) => setTimeout(r, 500));
}

const only = process.env.E2E_PAGES?.split(",").filter(Boolean);
const targets = only?.length ? only : pages;
const browser = await chromium.launch(existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});

async function checkPage(context, path, width) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.dismiss());
  try {
    await page.goto(ORIGIN + path, { waitUntil: "networkidle" });
    // Scroll through so client:visible islands hydrate.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const dead = await page.evaluate(() =>
      [...document.querySelectorAll("astro-island[ssr]")]
        .filter((i) => {
          const l = i.closest("[data-lang]");
          return !l || getComputedStyle(l).display !== "none";
        })
        .map((i) => (i.getAttribute("component-url") || "").split("/").pop()),
    );
    if (dead.length) fail(`${path} @${width}`, "island not hydrated", dead.join(" "));

    const n = await page.evaluate(() => {
      const list = [...document.querySelectorAll("astro-island button, .sidebar button")].filter((el) => {
        const l = el.closest("[data-lang]");
        return (!l || getComputedStyle(l).display !== "none") && el.offsetParent !== null && !el.disabled;
      });
      list.forEach((el, i) => el.setAttribute("data-e2e", String(i)));
      return list.length;
    });
    for (let i = 0; i < n; i++) {
      const button = page.locator(`[data-e2e="${i}"]`);
      if (!(await button.count()) || !(await button.isVisible()) || (await button.isDisabled().catch(() => true))) continue;
      await button.scrollIntoViewIfNeeded().catch(() => {});
      const where = () => button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
          covered: top && !el.contains(top) && !top.contains(el) ? `${top.tagName.toLowerCase()}.${[...top.classList].join(".")}` : null,
        };
      });
      let info = await where();
      // A popover an earlier button opened (the Pomodoro panel) closes on Esc, as a reader would close it.
      if (info.covered) {
        await page.keyboard.press("Escape");
        info = await where();
      }
      if (info.covered) {
        fail(`${path} @${width}`, "button covered", `"${info.label}" by ${info.covered}`);
        continue;
      }
      try {
        await button.click({ timeout: 2000 });
        await page.waitForTimeout(50);
      } catch (e) {
        fail(`${path} @${width}`, "button not clickable", `"${info.label}": ${e.message.split("\n")[0]}`);
      }
    }

    if (width === WIDTHS[0]) {
      await page.goto(ORIGIN + path, { waitUntil: "networkidle" });
      await page.addScriptTag({ content: AXE });
      const violations = await page.evaluate(async () =>
        (
          await window.axe.run(document, {
            resultTypes: ["violations"],
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
          })
        ).violations.map((v) => ({ id: v.id, nodes: v.nodes.length, target: v.nodes[0]?.target.join(" ") })),
      );
      for (const v of violations) {
        const line = `${path}  axe ${v.id} (${v.nodes})  ${v.target}`;
        if (v.id === "color-contrast") warnings.push(line);
        else failures.push(line);
      }
    }
    for (const e of errors) fail(`${path} @${width}`, "JavaScript error", e.split("\n")[0]);
  } catch (e) {
    fail(`${path} @${width}`, "page check crashed", e.message.split("\n")[0]);
  } finally {
    await page.close();
  }
}

const jobs = WIDTHS.flatMap((w) => targets.map((p) => [p, w]));
let next = 0;
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    const contexts = {};
    for (const w of WIDTHS) contexts[w] = await browser.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 500 });
    while (next < jobs.length) {
      const [path, width] = jobs[next++];
      await checkPage(contexts[width], path, width);
    }
    for (const c of Object.values(contexts)) await c.close();
  }),
);
await browser.close();
stop();

console.log(`browser: ${targets.length} pages × ${WIDTHS.length} widths`);
if (warnings.length) console.log(`\nwarnings (${warnings.length}):\n  ${warnings.join("\n  ")}`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("\ne2e: ok");
