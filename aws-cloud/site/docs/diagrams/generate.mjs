// Generates the animated architecture diagrams used in site/README.md.
// Run: node docs/diagrams/generate.mjs   (from aws-cloud/site)
// SVG + SMIL so they animate inside a GitHub README (<img>), with no scripts.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const DUR = 12; // seconds per loop, all diagrams
const E = 0.012; // fade length as a share of the loop

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => +n.toFixed(4);
const anim = (attr, values, keyTimes) =>
  `<animate attributeName="${attr}" dur="${DUR}s" repeatCount="indefinite" calcMode="linear" values="${values.join(";")}" keyTimes="${keyTimes.map(f).join(";")}"/>`;

/** Opacity 0 → 1 during [a, b] of the loop. */
function windowAnim(a, b, lo = 0, hi = 1) {
  a = Math.max(a, 2 * E);
  b = Math.min(b, 1 - 2 * E);
  return anim("opacity", [lo, lo, hi, hi, lo, lo], [0, a - E, a, b, b + E, 1]);
}

const CSS = `
.bg{fill:#f6f8f9}
.band{fill:#ebf1f3}
.panel{fill:#ffffff;stroke:#d8e1e5}
.box{fill:#ffffff;stroke:#c3d0d6;stroke-width:1.2}
.box.core{fill:#eef4f6}
.chip{fill:#eef4f6;stroke:#d0dce2}
.t{font:600 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#14212b}
.tc{font:500 11.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#14212b}
.s{font:12px -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:#586973}
.h{font:600 14px -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:#14212b}
.lbl{font:700 10.5px -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;letter-spacing:.08em;fill:#586973}
.n{font:700 11px -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:#ffffff}
.wire{fill:none;stroke:#9fb2bc;stroke-width:1.5}
.wire.back{stroke:#2b7a4b;stroke-dasharray:5 4;opacity:.7}
.flow{fill:none;stroke:#0a6a85;stroke-width:1.6;stroke-dasharray:6 5;animation:dash 1.2s linear infinite}
@keyframes dash{to{stroke-dashoffset:-11}}
.arrow{fill:#9fb2bc}
.arrow.a{fill:#0a6a85}
.tok{fill:#0a6a85;stroke:#ffffff;stroke-width:2}
.tok.ok{fill:#2b7a4b}
.tok.edge{fill:#b46c0c}
.hl{fill:none;stroke:#0a6a85;stroke-width:2.5}
.hl.ok{stroke:#2b7a4b}
.stepbg{fill:#dfeff3}
.stepbg.ok{fill:#e1f2e7}
.num{fill:#0a6a85}
.num.ok{fill:#2b7a4b}
.pill{fill:#e1f2e7;stroke:#2b7a4b}
.pilltext{font:700 12px -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:#2b7a4b}
.db{fill:#f7ead6;stroke:#b46c0c}
@media (prefers-color-scheme: dark){
.bg{fill:#0e161b}.band{fill:#131e25}.panel{fill:#152129;stroke:#26353e}
.box{fill:#152129;stroke:#33454f}.box.core{fill:#14252e}.chip{fill:#1a2a33;stroke:#2c3d47}
.t,.tc,.h{fill:#e2eaee}.s,.lbl{fill:#91a3ad}
.wire{stroke:#4b5f69}.arrow{fill:#4b5f69}.flow{stroke:#52b6d1}.arrow.a{fill:#52b6d1}
.tok{fill:#52b6d1;stroke:#0e161b}.tok.ok{fill:#63c48f}.tok.edge{fill:#e3a14c}
.hl{stroke:#52b6d1}.hl.ok{stroke:#63c48f}.stepbg{fill:#143140}.stepbg.ok{fill:#173426}
.num{fill:#52b6d1}.num.ok{fill:#63c48f}.n{fill:#0e161b}
.pill{fill:#173426;stroke:#63c48f}.pilltext{fill:#63c48f}.db{fill:#3a2a14;stroke:#e3a14c}
.wire.back{stroke:#63c48f}
}
@media (prefers-reduced-motion: reduce){.flow{animation:none}}
`;

function svg(w, h, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<style>${CSS}</style>
<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0,0 L10,5 L0,10 z"/></marker>
  <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow a" d="M0,0 L10,5 L0,10 z"/></marker>
</defs>
<rect class="bg" width="${w}" height="${h}" rx="12"/>
${body}
</svg>
`;
}

/** Box centred on (cx, cy). */
function box({ cx, cy, w = 150, h = 48, title, sub, cls = "box" }) {
  const x = cx - w / 2, y = cy - h / 2;
  const t = sub
    ? `<text class="t" x="${cx}" y="${cy - 4}" text-anchor="middle">${esc(title)}</text><text class="s" x="${cx}" y="${cy + 13}" text-anchor="middle">${esc(sub)}</text>`
    : `<text class="t" x="${cx}" y="${cy + 4}" text-anchor="middle">${esc(title)}</text>`;
  return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>${t}`;
}

function cylinder({ cx, cy, w = 130, h = 56, title, sub }) {
  const x = cx - w / 2, y = cy - h / 2, ry = 8;
  return `<path class="db" d="M${x},${y + ry} a${w / 2},${ry} 0 0,1 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0,1 ${-w},0 z"/>
<path class="db" fill="none" d="M${x},${y + ry} a${w / 2},${ry} 0 0,0 ${w},0"/>
<text class="t" x="${cx}" y="${cy + 4}" text-anchor="middle">${esc(title)}</text>${sub ? `<text class="s" x="${cx}" y="${cy + 20}" text-anchor="middle">${esc(sub)}</text>` : ""}`;
}

/** Highlight ring around a box during [a, b]. */
function ring({ cx, cy, w = 150, h = 48 }, a, b, cls = "hl") {
  return `<rect class="${cls}" x="${cx - w / 2 - 3}" y="${cy - h / 2 - 3}" width="${w + 6}" height="${h + 6}" rx="10" opacity="0">${windowAnim(a, b)}</rect>`;
}

const d = (pts) => "M" + pts.map(([x, y]) => `${x},${y}`).join(" L");
const wire = (pts, cls = "wire", marker = "arr") => `<path class="${cls}" d="${d(pts)}" marker-end="url(#${marker})"/>`;

/** Time (share of loop) at which a token moving at constant speed reaches each point. */
function arrivals(pts, t0, t1) {
  const seg = pts.slice(1).map(([x, y], i) => Math.hypot(x - pts[i][0], y - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let acc = 0;
  return [t0, ...seg.map((s) => t0 + ((acc += s) / total) * (t1 - t0))];
}

function token(pts, t0, t1, cls = "tok", r = 7) {
  return `<circle class="${cls}" r="${r}" opacity="0">
  <animateMotion dur="${DUR}s" repeatCount="indefinite" calcMode="linear" path="${d(pts)}" keyPoints="0;0;1;1" keyTimes="0;${f(t0)};${f(t1)};1"/>
  ${windowAnim(t0, t1 + 0.01)}
</circle>`;
}

/** Text that is only visible during [a, b]. */
const timedText = (x, y, cls, text, a, b, anchor = "start") =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" opacity="0">${esc(text)}${windowAnim(a, b)}</text>`;

// ---------- 1. Module map ----------
function moduleMap() {
  const W = 960, H = 500;
  const chip = (x, y, w, label) =>
    `<rect class="chip" x="${x}" y="${y}" width="${w}" height="24" rx="6"/><text class="tc" x="${x + w / 2}" y="${y + 16}" text-anchor="middle">${esc(label)}</text>`;
  const flow = (pts) => `<path class="flow" d="${d(pts)}" marker-end="url(#arrA)"/>`;
  const shellChips = ["domain/", "api/", "services/", "i18n/", "ui/"].map((c, i) => chip(338 + (i % 2) * 104, 192 + Math.floor(i / 2) * 32, 96, c)).join("");
  const practiceChips = ["ui/", "app/", "services/", "api/", "domain/", "i18n/", "content/"]
    .map((c, i) => chip(574 + (i % 3) * 116, 192 + Math.floor(i / 3) * 32, 108, c)).join("");
  const coreBoxes = [
    ["api/", "ApiClient · LocalApiClient · StorageDriver"],
    ["state/", "EventBus · Store · Controller"],
    ["i18n/", "I18n · Translator · LocalePreference"],
  ].map(([t, s], i) => box({ cx: 180 + i * 300, cy: 408, w: 280, h: 54, title: t, sub: s, cls: "box" })).join("");

  const body = `
<rect class="panel" x="20" y="20" width="920" height="64" rx="10"/>
<text class="lbl" x="36" y="42">SRC/PAGES · SRC/LAYOUTS (ASTRO)</text>
<text class="s" x="36" y="64">Trang tĩnh: /on-tap/…, /concepts/…, /api/*.json (sinh lúc build). Gắn các component React của module.</text>

<rect class="panel" x="20" y="134" width="250" height="172" rx="10"/>
<text class="lbl" x="36" y="158">SRC/APP · GHÉP NỐI</text>
<text class="tc" x="36" y="190">api.ts</text><text class="s" x="96" y="190">một ApiClient cho cả site</text>
<text class="tc" x="36" y="222">i18n.ts</text><text class="s" x="96" y="222">gom từ điển các module</text>
<text class="tc" x="36" y="254">T.astro</text><text class="s" x="96" y="254">chữ dịch được trong Astro</text>

<rect class="panel" x="310" y="134" width="630" height="172" rx="10"/>
<text class="lbl" x="326" y="158">SRC/MODULES · MỖI TÍNH NĂNG MỘT MODULE</text>
<rect class="box" x="326" y="170" width="224" height="124" rx="8"/><text class="t" x="338" y="186">shell</text>
${shellChips}
<rect class="box" x="562" y="170" width="364" height="124" rx="8"/><text class="t" x="574" y="186">practice (Ôn tập)</text>
${practiceChips}

<rect class="panel" x="20" y="356" width="920" height="104" rx="10"/>
<text class="lbl" x="36" y="374">SRC/CORE · HẠ TẦNG DÙNG CHUNG, KHÔNG BIẾT TÍNH NĂNG NÀO</text>
${coreBoxes}

${flow([[145, 84], [145, 130]])}
${flow([[625, 84], [625, 130]])}
${flow([[270, 206], [306, 206]])}
<text class="s" x="288" y="198" text-anchor="middle">đăng ký</text>
${flow([[310, 270], [274, 270]])}
<text class="s" x="292" y="290" text-anchor="middle">dùng</text>
${flow([[145, 306], [145, 352]])}
${flow([[625, 306], [625, 352]])}
<text class="s" x="20" y="${H - 14}">Mũi tên chạy = chiều import (A → B: A phụ thuộc vào B). core không import ai; module mới chỉ cần đăng ký ở app/.</text>
`;
  return svg(W, H, "Bản đồ module", "pages dùng app và modules; app đăng ký các module; modules và app dùng core.", body);
}

// ---------- 2. Submitting an answer ----------
function submitFlow() {
  const W = 980, H = 560;
  const bands = [
    ["UI · REACT", 16],
    ["APP · EVENT", 116],
    ["SERVICES", 216],
    ["API CLIENT", 316],
    ["LƯU TRỮ", 416],
  ];
  const N = {
    QC: { cx: 225, cy: 60, title: "QuestionCard", sub: "nút Kiểm tra" },
    EB: { cx: 225, cy: 160, title: "EventBus" },
    EC: { cx: 400, cy: 160, title: "ExamController" },
    ES: { cx: 575, cy: 160, title: "ExamStore" },
    AS: { cx: 400, cy: 260, title: "AttemptService" },
    CA: { cx: 225, cy: 360, w: 160, title: "CompositeApiClient", sub: "chọn client" },
    LA: { cx: 400, cy: 360, title: "LocalApiClient" },
    AR: { cx: 575, cy: 360, title: "AttemptResource" },
    SD: { cx: 575, cy: 460, title: "StorageDriver" },
  };
  const DB = { cx: 400, cy: 460, w: 130, h: 56, title: "IndexedDB" };
  const p = (n) => [n.cx, n.cy];

  const fwd = [p(N.QC), p(N.EB), p(N.EC), p(N.AS), [400, 310], [225, 310], p(N.CA), p(N.LA), p(N.AR), p(N.SD), p(DB)];
  const back = [p(DB), p(N.SD), p(N.AR), p(N.LA), p(N.CA), [225, 310], [400, 310], p(N.AS), p(N.EC), p(N.ES), [575, 110], [225, 110], p(N.QC)];
  const F = arrivals(fwd, 0.03, 0.44);
  const B = arrivals(back, 0.5, 0.86);
  const END = 0.97;

  const rings = [
    ring(N.QC, F[0] - 0.02, F[1]),
    ring(N.EB, F[1], F[2]),
    ring(N.EC, F[2], F[3]),
    ring(N.AS, F[3], F[6]),
    ring(N.CA, F[6], F[7]),
    ring(N.LA, F[7], F[8]),
    ring(N.AR, F[8], F[9]),
    ring(N.SD, F[9], F[10]),
    ring({ ...DB, w: 130, h: 56 }, F[10], B[0] + 0.02),
    ring(N.EC, B[8], B[9], "hl ok"),
    ring(N.ES, B[9], B[10], "hl ok"),
    ring(N.QC, B[12], END, "hl ok"),
  ].join("\n");

  const steps = [
    ["dispatch({type:\"exam/submit\"})", "Bấm Kiểm tra: UI chỉ phát event", F[0] - 0.02, F[1]],
    ["ExamController.submit()", "Chấm đúng/sai bằng Scoring", F[1], F[3]],
    ["AttemptService.answer()", "Gọi api.put(...) như REST thường", F[3], F[6]],
    ["PUT /attempts/:id/answers/:q", "CompositeApiClient chọn LocalApiClient", F[6], F[7]],
    ["AttemptResource.answer()", "LocalApiClient khớp route", F[7], F[9]],
    ["StorageDriver.put()", "Ghi lượt làm bài vào IndexedDB", F[9], B[0] + 0.02],
    ["← Attempt (JSON)", "Kết quả đi ngược lên controller", B[0] + 0.02, B[8]],
    ["ExamStore.saved(attempt)", "Store báo cho nơi đang theo dõi", B[8], B[10]],
    ["useStore → vẽ lại", "QuestionCard hiện đúng/sai + giải thích", B[10], END],
  ];
  const stepEls = steps
    .map(([code, text, a, b], i) => {
      const y = 16 + i * 58, ok = i >= 6 ? " ok" : "";
      return `<rect class="stepbg${ok}" x="676" y="${y}" width="288" height="52" rx="8" opacity="0">${windowAnim(a, b)}</rect>
<circle class="num${ok}" cx="694" cy="${y + 18}" r="10"/><text class="n" x="694" y="${y + 22}" text-anchor="middle">${i + 1}</text>
<text class="tc" x="712" y="${y + 22}">${esc(code)}</text><text class="s" x="712" y="${y + 40}">${esc(text)}</text>`;
    })
    .join("\n");

  const body = `
${bands.map(([label, y]) => `<rect class="band" x="16" y="${y}" width="640" height="88" rx="10"/><text class="lbl" x="30" y="${y + 48}">${label}</text>`).join("\n")}
${wire(fwd)}
${wire([p(N.EC), p(N.ES), [575, 110], [225, 110], [225, 86]], "wire back")}
${Object.values(N).map((n) => box(n)).join("\n")}
${cylinder(DB)}
${rings}
${token(fwd, F[0], F[10])}
${token(back, B[0], B[12], "tok ok")}
<rect class="pill" x="312" y="47" width="116" height="26" rx="13" opacity="0">${windowAnim(B[12], END)}</rect>
${timedText(370, 65, "pilltext", "✓ Chính xác", B[12], END, "middle")}
${stepEls}
<text class="s" x="16" y="${H - 16}">Xanh dương: yêu cầu đi xuống · Xanh lá: kết quả đi lên. Mỗi tầng chỉ gọi tầng ngay dưới nó.</text>
`;
  return svg(W, H, "Luồng bấm Kiểm tra", "Từ nút Kiểm tra, event đi qua controller, service, API client tới IndexedDB, rồi kết quả quay về store và UI vẽ lại.", body);
}

// ---------- 3. API routing today vs with a server ----------
function apiRouting() {
  const W = 1020, H = 470;
  const S = [
    { cx: 105, cy: 120, w: 170, title: "CatalogService" },
    { cx: 105, cy: 230, w: 170, title: "AttemptService" },
    { cx: 105, cy: 340, w: 170, title: "PreferenceService" },
  ];
  const TODAY = [0, 0.62], FUTURE = [0.66, 0.98];
  const group = (content, [a, b], startVisible) =>
    `<g opacity="${startVisible ? 1 : 0}">${
      startVisible ? anim("opacity", [1, 1, 0, 0, 1], [0, b, b + E, 1 - E, 1]) : windowAnim(a, b)
    }${content}</g>`;

  // Today
  const CA = { cx: 315, cy: 230, w: 170, h: 150 };
  const ST = { cx: 525, cy: 120, w: 170, title: "StaticApiClient", sub: "chỉ GET" };
  const JS = { cx: 740, cy: 120, w: 200, title: "/api/…/exams/1.json", sub: "build từ file đề" };
  const LA = { cx: 525, cy: 285, w: 170, title: "LocalApiClient", sub: "server giả" };
  const AR = { cx: 740, cy: 250, w: 190, title: "AttemptResource" };
  const PR = { cx: 740, cy: 320, w: 190, title: "PreferenceResource" };
  const DB = { cx: 935, cy: 285, w: 120, h: 60, title: "IndexedDB" };
  const r1 = [[190, 120], [210, 120], [210, 200], [420, 200], [420, 120], [640, 120], [740, 120]];
  const r2 = [[190, 230], [315, 230], [315, 260], [420, 260], [420, 285], [630, 285], [630, 250], [850, 250], [850, 285], [935, 285]];
  const r3 = [[190, 340], [210, 340], [210, 260], [420, 260], [420, 285], [630, 285], [630, 320], [850, 320], [850, 285], [935, 285]];
  const reqs = [
    [r1, 0.03, 0.18, "GET /certifications/saa-c03/exams/1 → StaticApiClient → file JSON", S[0], [ST, JS]],
    [r2, 0.22, 0.4, "PUT /attempts/:id/answers/:q → LocalApiClient → AttemptResource → IndexedDB", S[1], [LA, AR]],
    [r3, 0.44, 0.6, "PATCH /preferences {locale} → LocalApiClient → PreferenceResource → IndexedDB", S[2], [LA, PR]],
  ];
  const today = `
<rect class="box core" x="${CA.cx - CA.w / 2}" y="${CA.cy - CA.h / 2}" width="${CA.w}" height="${CA.h}" rx="8"/>
<text class="t" x="${CA.cx}" y="${CA.cy - 46}" text-anchor="middle">CompositeApiClient</text>
<text class="s" x="${CA.cx}" y="${CA.cy - 18}" text-anchor="middle">/attempts/**, /preferences</text>
<text class="s" x="${CA.cx}" y="${CA.cy - 2}" text-anchor="middle">→ LocalApiClient</text>
<text class="s" x="${CA.cx}" y="${CA.cy + 26}" text-anchor="middle">còn lại</text>
<text class="s" x="${CA.cx}" y="${CA.cy + 42}" text-anchor="middle">→ StaticApiClient</text>
${wire([[190, 120], [210, 120], [210, 200], [228, 200]])}
${wire([[190, 230], [228, 230]])}
${wire([[190, 340], [210, 340], [210, 260], [228, 260]])}
${wire([[400, 200], [420, 200], [420, 120], [438, 120]])}
${wire([[400, 260], [420, 260], [420, 285], [438, 285]])}
${wire([[610, 120], [638, 120]])}
${wire([[610, 285], [630, 285], [630, 250], [643, 250]])}
${wire([[630, 285], [630, 320], [643, 320]])}
${wire([[835, 250], [850, 250], [850, 285], [873, 285]])}
${wire([[835, 320], [850, 320], [850, 285]])}
${[ST, JS, LA, AR, PR].map((n) => box(n)).join("\n")}
${cylinder(DB)}
${reqs.map(([pts, a, b, , , hls]) => hls.map((n) => ring(n, a, b + 0.02)).join("") + ring(CA, a, b + 0.02) + token(pts, a, b)).join("\n")}
${reqs.map(([, a, b, text]) => timedText(20, 420, "tc", text, a, b + 0.03)).join("\n")}
<text class="h" x="20" y="44">Hôm nay</text>
<text class="s" x="96" y="44">Nội dung đề đọc từ JSON tĩnh, dữ liệu người học trả lời ngay trong trình duyệt.</text>
`;

  // Future
  const HC = { cx: 420, cy: 230, w: 380, h: 150 };
  const SV = { cx: 830, cy: 230, w: 330, h: 150 };
  const fut = [
    [[190, 120], [210, 120], [210, 200], [800, 200]],
    [[190, 230], [800, 230]],
    [[190, 340], [210, 340], [210, 260], [800, 260]],
  ];
  const future = `
<rect class="box core" x="${HC.cx - HC.w / 2}" y="${HC.cy - HC.h / 2}" width="${HC.w}" height="${HC.h}" rx="8"/>
<text class="t" x="${HC.cx}" y="${HC.cy - 30}" text-anchor="middle">HttpApiClient({ baseUrl })</text>
<text class="s" x="${HC.cx}" y="${HC.cy - 6}" text-anchor="middle">gọi fetch() tới server thật</text>
<text class="s" x="${HC.cx}" y="${HC.cy + 14}" text-anchor="middle">headers(): gắn token đăng nhập</text>
<rect class="box" x="${SV.cx - SV.w / 2}" y="${SV.cy - SV.h / 2}" width="${SV.w}" height="${SV.h}" rx="8"/>
<text class="t" x="${SV.cx}" y="${SV.cy - 30}" text-anchor="middle">Server REST</text>
<text class="s" x="${SV.cx}" y="${SV.cy - 6}" text-anchor="middle">cùng đường dẫn: /certifications,</text>
<text class="s" x="${SV.cx}" y="${SV.cy + 12}" text-anchor="middle">/attempts, /preferences</text>
<text class="s" x="${SV.cx}" y="${SV.cy + 34}" text-anchor="middle">dữ liệu lưu ở database của server</text>
${wire([[190, 120], [210, 120], [210, 200], [228, 200]])}
${wire([[190, 230], [228, 230]])}
${wire([[190, 340], [210, 340], [210, 260], [228, 260]])}
${[200, 230, 260].map((y) => wire([[610, y], [663, y]])).join("")}
${ring(HC, 0.68, 0.9)}${ring(SV, 0.72, 0.92)}
${fut.map((pts, i) => token(pts, 0.68 + i * 0.04, 0.8 + i * 0.04)).join("\n")}
${timedText(20, 420, "s", "Chỉ đổi một chỗ: app/api.ts trả về HttpApiClient. Service, controller, UI giữ nguyên.", 0.68, 0.98)}
<text class="h" x="20" y="44">Khi có server</text>
<text class="s" x="128" y="44">Thay ApiClient, các tầng trên không biết gì thay đổi.</text>
`;

  const body = `
${S.map((s) => box(s)).join("\n")}
${reqs.map(([, a, b, , s]) => ring(s, a - 0.02, a + 0.04)).join("")}
${fut.map((_, i) => ring(S[i], 0.66 + i * 0.04, 0.7 + i * 0.04)).join("")}
${group(today, TODAY, true)}
${group(future, FUTURE, false)}
<text class="s" x="20" y="${H - 16}">Service luôn gọi cùng một kiểu: api.get / post / put / patch. Ai trả lời phía sau là việc của app/api.ts.</text>
`;
  return svg(W, H, "Định tuyến API", "Hôm nay CompositeApiClient chia yêu cầu cho StaticApiClient và LocalApiClient; khi có server chỉ cần thay bằng HttpApiClient.", body);
}

// ---------- 4. Switching language ----------
function languageFlow() {
  const W = 960, H = 400;
  const BT = { cx: 80, cy: 180, w: 120, title: "VI | EN", sub: "bấm EN" };
  const SL = { cx: 265, cy: 180, w: 170, title: "i18n.setLocale()" };
  const PF = { cx: 500, cy: 80, w: 200, title: "ApiLocalePreference" };
  const LS = { cx: 800, cy: 44, w: 280, title: "localStorage['locale']", sub: "đọc ngay khi mở trang" };
  const PA = { cx: 800, cy: 116, w: 280, title: "PATCH /preferences", sub: "→ IndexedDB (sau này: server)" };
  const RE = { cx: 500, cy: 230, w: 200, title: "useI18n()" };
  const RR = { cx: 800, cy: 230, w: 280, title: "React vẽ lại", sub: "QuestionCard, CatalogPage, Roadmap" };
  const SC = { cx: 500, cy: 310, w: 200, title: "ShellController" };
  const DT = { cx: 800, cy: 310, w: 280, title: "DomTranslator.apply()", sub: "[data-i18n], <title>, <html lang>" };
  const t1 = [[140, 180], [265, 180]];
  const branches = [
    [[350, 180], [375, 180], [375, 80], [600, 80], [630, 80], [630, 44], [800, 44]],
    [[350, 180], [375, 180], [375, 80], [600, 80], [630, 80], [630, 116], [800, 116]],
    [[350, 180], [375, 180], [375, 230], [800, 230]],
    [[350, 180], [375, 180], [375, 310], [800, 310]],
  ];
  const body = `
${wire([[140, 180], [178, 180]])}
${wire([[350, 180], [375, 180], [375, 80], [398, 80]])}
${wire([[375, 180], [375, 230], [398, 230]])}
${wire([[375, 230], [375, 310], [398, 310]])}
${wire([[600, 80], [630, 80], [630, 44], [658, 44]])}
${wire([[630, 80], [630, 116], [658, 116]])}
${wire([[600, 230], [658, 230]])}
${wire([[600, 310], [658, 310]])}
${[BT, SL, PF, LS, PA, RE, RR, SC, DT].map((n) => box(n)).join("\n")}
<text class="lbl" x="400" y="40">LƯU LỰA CHỌN</text>
<text class="lbl" x="400" y="196">BÁO NƠI ĐANG THEO DÕI</text>
${ring(BT, 0.02, 0.12)}${ring(SL, 0.1, 0.2)}
${[PF, LS, PA, RE, RR, SC, DT].map((n) => ring(n, 0.24, 0.6)).join("")}
${token(t1, 0.04, 0.12)}
${branches.map((pts, i) => token(pts, 0.16, 0.38 + i * 0.02, i < 2 ? "tok edge" : "tok")).join("\n")}
<rect class="panel" x="20" y="344" width="920" height="40" rx="8"/>
<text class="s" x="36" y="369">Lần mở trang sau: một script nhỏ trong &lt;head&gt; đọc localStorage trước khi vẽ, nên chữ không nháy từ VI sang EN.</text>
`;
  return svg(W, H, "Luồng đổi ngôn ngữ", "Bấm EN: setLocale lưu lựa chọn qua API và localStorage, đồng thời báo React và DomTranslator dịch lại trang.", body);
}

const files = {
  "module-map.svg": moduleMap(),
  "submit-flow.svg": submitFlow(),
  "api-routing.svg": apiRouting(),
  "language-flow.svg": languageFlow(),
};
for (const [name, content] of Object.entries(files)) writeFileSync(join(OUT, name), content);
console.log(`wrote ${Object.keys(files).join(", ")}`);
