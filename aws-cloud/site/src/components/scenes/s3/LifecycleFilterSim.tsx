import { useEffect, useRef, useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./s3-sims.css";

// Lifecycle rule filters (prefix, object tags, empty filter = whole bucket).
// ShopViet's product bucket: originals under images/ go cold after 45 days, thumbnails/
// stay hot; everything is archived after 180 days; the data must survive the loss of an AZ.
// Facts: intro-lifecycle-filters.html, storage-class-intro.html. Source question: exam4_q43.

type Filter = "all" | "images" | "thumbs" | "tag";
type Ia = "ia" | "oz";
type Arch = "all" | "images";
type Cls = "std" | "ia" | "oz" | "gfr";

interface Obj { key: string; tag: string | null; thumb: boolean }
const OBJECTS: Obj[] = [
  { key: "images/sp-0815.jpg", tag: "type=original", thumb: false },
  { key: "images/sp-0816.jpg", tag: "type=original", thumb: false },
  { key: "images/sp-0817.jpg", tag: "type=original", thumb: false },
  { key: "thumbnails/sp-0815.jpg", tag: null, thumb: true },
  { key: "thumbnails/sp-0816.jpg", tag: null, thumb: true },
  { key: "thumbnails/sp-0817.jpg", tag: null, thumb: true },
];

const FILTERS: { id: Filter; xml: string; name: Bi }[] = [
  { id: "all", xml: "<Filter></Filter>", name: { vi: "Filter rỗng (toàn bucket)", en: "Empty filter (whole bucket)" } },
  { id: "images", xml: "<Prefix>images/</Prefix>", name: { vi: "Prefix images/", en: "Prefix images/" } },
  { id: "thumbs", xml: "<Prefix>thumbnails/</Prefix>", name: { vi: "Prefix thumbnails/", en: "Prefix thumbnails/" } },
  { id: "tag", xml: "<Tag>type=original</Tag>", name: { vi: "Tag type=original", en: "Tag type=original" } },
];

const CLS_NAME: Record<Cls, string> = { std: "S3 Standard", ia: "Standard-IA", oz: "One Zone-IA", gfr: "Glacier Flexible Retrieval" };

function matches(f: Filter | Arch, o: Obj) {
  if (f === "all") return true;
  if (f === "images") return o.key.startsWith("images/");
  if (f === "thumbs") return o.key.startsWith("thumbnails/");
  return o.tag === "type=original";
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function LifecycleFilterSim() {
  const L = useLang();
  const [f1, setF1] = useState<Filter>("all");
  const [ia, setIa] = useState<Ia>("ia");
  const [f2, setF2] = useState<Arch>("images");
  const [day, setDay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; lines: Bi[] } | null>(null);
  // A run in progress stops when the rule changes or the component unmounts.
  const gen = useRef(0);
  useEffect(() => () => { gen.current++; }, []);

  function change(fn: () => void) {
    gen.current++;
    fn();
    setDay(0);
    setVerdict(null);
    setBusy(false);
  }

  function classAt(o: Obj, d: number): Cls {
    if (d >= 180 && matches(f2, o)) return "gfr";
    if (d >= 45 && matches(f1, o)) return ia;
    return "std";
  }

  function evaluate(): { ok: boolean; lines: Bi[] } {
    const lines: Bi[] = [];
    let ok = true;
    if (f1 === "all" || f1 === "thumbs") {
      ok = false;
      lines.push({ vi: "Thumbnail vẫn được truy cập thường xuyên nhưng đã bị chuyển sang lớp IA: mỗi lần đọc phát sinh **phí truy xuất theo GB**. Rule ngày 45 cần filter chỉ khớp ảnh gốc.", en: "Thumbnails are still accessed frequently but were moved to an IA class: every read incurs a **per-GB retrieval fee**. The day-45 rule needs a filter that matches only the originals." });
    }
    if (f1 === "thumbs") lines.push({ vi: "Ảnh gốc trong images/ vẫn ở S3 Standard dù hầu như không được truy cập.", en: "The originals under images/ stay in S3 Standard even though they are hardly ever accessed." });
    if (ia === "oz") {
      ok = false;
      lines.push({ vi: "One Zone-IA lưu dữ liệu tại **một AZ** và không chịu được sự cố mất AZ; yêu cầu sẵn sàng khi một AZ gặp thảm hoạ bị vi phạm.", en: "One Zone-IA stores data in **a single AZ** and is not resilient to the loss of that AZ; the requirement to survive an AZ disaster is not met." });
    }
    if (f2 === "images") {
      ok = false;
      lines.push({ vi: "Rule ngày 180 chỉ khớp images/, nên thumbnail **không bao giờ** được lưu trữ sang Glacier. Yêu cầu là lưu trữ cả hai loại: dùng filter rỗng.", en: "The day-180 rule matches only images/, so thumbnails are **never** archived to Glacier. The requirement is to archive both: use an empty filter." });
    }
    if (ok) {
      lines.push(f1 === "tag"
        ? { vi: "Đạt yêu cầu. Filter theo **tag** cũng chọn đúng ảnh gốc, với điều kiện mọi ảnh gốc đều được gắn tag `type=original` khi tải lên.", en: "Requirements met. A **tag** filter also selects exactly the originals, provided every original is tagged `type=original` when uploaded." }
        : { vi: "Đạt yêu cầu. Rule 1 dùng **prefix images/** nên chỉ ảnh gốc chuyển sang Standard-IA (vẫn lưu trên nhiều AZ); rule 2 dùng filter rỗng nên mọi object được lưu trữ sau 180 ngày.", en: "Requirements met. Rule 1 uses the **images/ prefix**, so only originals move to Standard-IA (still stored across multiple AZs); rule 2 uses an empty filter, so every object is archived after 180 days." });
    }
    return { ok, lines };
  }

  async function run() {
    if (busy) return;
    const my = ++gen.current;
    setBusy(true);
    setVerdict(null);
    try {
      for (const d of [0, 45, 180]) {
        if (gen.current !== my) return;
        setDay(d);
        await wait(d === 0 ? 300 : 900);
      }
      if (gen.current === my) setVerdict(evaluate());
    } finally {
      if (gen.current === my) setBusy(false);
    }
  }

  const xml1 = FILTERS.find((x) => x.id === f1)!.xml;
  const xml2 = f2 === "all" ? "<Filter></Filter>" : "<Prefix>images/</Prefix>";

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label={L({ vi: "Filter của rule ngày 45", en: "Filter of the day-45 rule" })}>
        <span className="s3x-lbl">{L({ vi: "Rule 1 · ngày 45", en: "Rule 1 · day 45" })}</span>
        {FILTERS.map((x) => (
          <button key={x.id} className="chip" aria-pressed={x.id === f1} onClick={() => change(() => setF1(x.id))}>{L(x.name)}</button>
        ))}
      </div>
      <div className="s3x-row" role="group" aria-label={L({ vi: "Storage class đích của rule 1", en: "Target storage class of rule 1" })}>
        <span className="s3x-lbl">{L({ vi: "Chuyển sang", en: "Transition to" })}</span>
        <button className="chip" aria-pressed={ia === "ia"} onClick={() => change(() => setIa("ia"))}>Standard-IA</button>
        <button className="chip" aria-pressed={ia === "oz"} onClick={() => change(() => setIa("oz"))}>One Zone-IA</button>
      </div>
      <div className="s3x-row" role="group" aria-label={L({ vi: "Filter của rule ngày 180", en: "Filter of the day-180 rule" })}>
        <span className="s3x-lbl">{L({ vi: "Rule 2 · ngày 180 → Glacier", en: "Rule 2 · day 180 → Glacier" })}</span>
        <button className="chip" aria-pressed={f2 === "all"} onClick={() => change(() => setF2("all"))}>{L({ vi: "Filter rỗng (toàn bucket)", en: "Empty filter (whole bucket)" })}</button>
        <button className="chip" aria-pressed={f2 === "images"} onClick={() => change(() => setF2("images"))}>{L({ vi: "Prefix images/", en: "Prefix images/" })}</button>
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{`Rule 1: ${xml1} → ${CLS_NAME[ia]} · Rule 2: ${xml2} → Glacier`}</code>
        <button className="btn primary" onClick={run} disabled={busy}>{L({ vi: "Chạy 180 ngày", en: "Run 180 days" })}</button>
      </div>
      <div className="s3x-lc" aria-live="polite">
        <div className="s3x-lc-day">
          {[0, 45, 180].map((d) => (
            <span key={d} className={d <= day ? "on" : ""}>{L({ vi: `Ngày ${d}`, en: `Day ${d}` })}</span>
          ))}
        </div>
        <ul className="s3x-lc-list">
          {OBJECTS.map((o) => {
            const c = classAt(o, day);
            const hot = o.thumb && (c === "ia" || c === "oz");
            return (
              <li key={o.key}>
                <span className="s3x-lc-key"><code>{o.key}</code>{o.tag && <span className="s3x-lc-tag">{o.tag}</span>}</span>
                <span className="s3x-lc-use">{o.thumb ? L({ vi: "đọc thường xuyên", en: "read often" }) : day >= 45 ? L({ vi: "hầu như không đọc", en: "rarely read" }) : L({ vi: "đọc nhiều", en: "read often" })}</span>
                <span className={`s3x-lc-cls ${c}${hot ? " warn" : ""}`}>{CLS_NAME[c]}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="readout">
        {verdict ? (
          <ul className="log" aria-live="polite">
            {verdict.lines.map((m, i) => (
              i === verdict.lines.length - 1
                ? <li key={i} className={`s3x-result ${verdict.ok ? "ok" : "bad"}`}>{rich(L(m))}</li>
                : <li key={i}><span className="tag bad">{L({ vi: "LỖI", en: "ISSUE" })}</span><span>{rich(L(m))}</span></li>
            ))}
          </ul>
        ) : (
          <p className="s3x-hint">{L({
            vi: <>Yêu cầu: sau 45 ngày ảnh gốc hầu như không được đọc nhưng thumbnail vẫn được đọc thường xuyên; sau 180 ngày lưu trữ cả hai; dữ liệu phải chịu được sự cố mất một AZ. Chọn filter cho từng rule rồi nhấn <b>Chạy 180 ngày</b>.</>,
            en: <>Requirements: after 45 days the originals are hardly read but thumbnails are still read often; after 180 days both are archived; the data must survive the loss of an AZ. Choose a filter for each rule, then press <b>Run 180 days</b>.</>,
          })}</p>
        )}
      </div>
    </div>
  );
}
