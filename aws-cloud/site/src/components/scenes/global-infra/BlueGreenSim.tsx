import { useEffect, useId, useRef, useState } from "react";
import { rich } from "../diagram";
import { useLang } from "../../../lib/lang";

// Blue/green release of the MFTech app two days before a sale, most users on
// phones. Route 53 weighted records only reach a device after its cached DNS
// answer expires, and some devices and resolvers cache for long periods; Global
// Accelerator endpoint weights change behind two fixed anycast IPs, so the shift
// does not wait for DNS caches. Device cache times below are an illustration.

type Mode = "dns" | "ga";
const N = 40;
const TIMES = ["0 s", "10 s", "5 min", "1 h", "12 h", "48 h"];
const NEVER = 99;
// Step at which each phone picks up a DNS change (illustrative mix: many honour
// the 60 s TTL, some caches hold longer, some beyond the 48 h window).
const DNS_PICKUP = Array.from({ length: N }, (_, i) => {
  const k = (i * 17) % 20;
  return k < 9 ? 2 : k < 12 ? 3 : k < 14 ? 4 : NEVER;
});
// Fixed position of each phone in the traffic split, so the same phones move to green as the share grows.
const RANK = Array.from({ length: N }, (_, i) => (((i * 23) % N) + 0.5) / N);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BlueGreenSim() {
  const L = useLang();
  const uid = useId().replace(/:/g, "");
  const [mode, setMode] = useState<Mode>("dns");
  const [pct, setPct] = useState(50);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);
  useEffect(() => () => { gen.current++; }, []);

  const pickup = (i: number) => (mode === "ga" ? 1 : DNS_PICKUP[i]);
  const share = (i: number) => (step >= pickup(i) ? to : from);
  const green = (i: number) => RANK[i] < share(i) / 100;
  const stale = (i: number) => to !== from && step < pickup(i);
  const onGreen = Array.from({ length: N }, (_, i) => green(i)).filter(Boolean).length;
  const staleCount = Array.from({ length: N }, (_, i) => stale(i)).filter(Boolean).length;
  const wGreen = Math.round((255 * pct) / 100);

  function pickMode(m: Mode) {
    gen.current++;
    setBusy(false);
    setMode(m);
    setFrom(0); setTo(0); setStep(0);
  }

  async function apply() {
    const g = ++gen.current;
    // Start from the previous target (devices that never picked it up are simplified away).
    setFrom(to);
    setTo(pct);
    setStep(0);
    setBusy(true);
    try {
      for (let k = 1; k < TIMES.length; k++) {
        await sleep(650);
        if (gen.current !== g) return;
        setStep(k);
      }
    } finally {
      if (gen.current === g) setBusy(false);
    }
  }

  function reset() {
    gen.current++;
    setBusy(false);
    setFrom(0); setTo(0); setStep(0);
  }

  const done = !busy && to !== from && step === TIMES.length - 1;
  const text = mode === "dns"
    ? L({ vi: `Route 53 trả lời theo trọng số mới ngay sau khi record được cập nhật, nhưng mỗi điện thoại chỉ truy vấn lại khi câu trả lời trong cache hết hạn. Một số thiết bị và resolver giữ cache lâu, nên không xác định được thời điểm mọi người dùng nhận địa chỉ mới.`, en: `Route 53 answers with the new weights as soon as the records are updated, but each phone queries again only when its cached answer expires. Some devices and resolvers cache answers for long periods, so there is no way to know when every user gets the new address.` })
    : L({ vi: `Người dùng luôn kết nối tới **2 địa chỉ IP anycast tĩnh**; tỷ lệ blue/green nằm trong **endpoint weight** (0–255, mặc định 128) của endpoint group. Thay đổi weight hoặc traffic dial có hiệu lực trong vài giây, không phụ thuộc DNS cache.`, en: `Users always connect to **2 static anycast IP addresses**; the blue/green split lives in the endpoint group's **endpoint weights** (0–255, default 128). Weight and traffic dial changes take effect within seconds, independent of DNS caching.` });

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Cơ chế chuyển traffic", en: "Traffic shifting" })}</span>
        <button className="btn" aria-pressed={mode === "dns"} onClick={() => pickMode("dns")}>Route 53 weighted</button>
        <button className="btn" aria-pressed={mode === "ga"} onClick={() => pickMode("ga")}>Global Accelerator endpoint weights</button>
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-pct`}>{L({ vi: "Tỷ lệ chuyển sang green: ", en: "Share sent to green: " })}{pct}%</label>
        <input id={`${uid}-pct`} type="range" min={0} max={100} step={10} value={pct} onChange={(e) => setPct(Number(e.target.value))} disabled={busy} />
        <span className="bg-w">{mode === "ga" ? `blue ${255 - wGreen} · green ${wGreen}` : `weight blue ${100 - pct} · green ${pct}`}</span>
      </div>
      <div className="stage-bar">
        <button className="btn primary" onClick={apply} disabled={busy}>{L({ vi: "Áp dụng thay đổi", en: "Apply the change" })}</button>
        <button className="btn" onClick={reset}>{L({ vi: "Đặt lại", en: "Reset" })}</button>
        <span className="bg-clock" aria-live="polite">{L({ vi: "Thời gian sau thay đổi: ", en: "Time since change: " })}<b>{to === from ? "—" : TIMES[step]}</b></span>
      </div>
      <div className="bg-grid" role="img" aria-label={L({ vi: `${onGreen} trên ${N} điện thoại đang dùng bản green`, en: `${onGreen} of ${N} phones are on green` })}>
        {Array.from({ length: N }, (_, i) => (
          <span key={i} className={`bg-ph${green(i) ? " g" : ""}${stale(i) ? " stale" : ""}`} />
        ))}
      </div>
      <div className="bg-legend">
        <span><i className="bg-ph" /> blue</span>
        <span><i className="bg-ph g" /> green</span>
        <span><i className="bg-ph stale" /> {L({ vi: "còn dùng câu trả lời DNS cũ trong cache", en: "still using a cached DNS answer" })}</span>
      </div>
      <div className="readout" aria-live="polite">
        <strong>
          {L({ vi: `Trên green: ${onGreen}/${N} điện thoại (mục tiêu ${to}%)`, en: `On green: ${onGreen}/${N} phones (target ${to}%)` })}
          {staleCount > 0 ? L({ vi: ` · ${staleCount} còn dùng cache cũ`, en: ` · ${staleCount} on a stale cache` }) : ""}
        </strong>
        {rich(text)}
        {done && mode === "dns" && staleCount > 0 && (
          <p className="verdict bad">{L({ vi: "Sau 48 giờ vẫn còn thiết bị chưa nhận thay đổi: không thể thử bản green trên nhiều người dùng nhất trong thời gian còn lại.", en: "After 48 hours some devices still have not picked up the change: green cannot be tested on as many users as possible in the time left." })}</p>
        )}
        {done && mode === "ga" && (
          <p className="verdict ok">{L({ vi: "Tỷ lệ mục tiêu đạt được sau vài giây và có thể đảo ngược ngay nếu bản green lỗi.", en: "The target split is reached within seconds and can be reversed at once if green misbehaves." })}</p>
        )}
      </div>
      <style>{`
.bg-grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px;padding:14px 16px;max-width:520px}
.bg-ph{display:inline-block;width:100%;max-width:30px;aspect-ratio:3/5;border-radius:5px;background:var(--accent);border:2px solid transparent;box-sizing:border-box;transition:background .3s}
.bg-ph.g{background:var(--ok)}
.bg-ph.stale{border:2px dashed var(--edge)}
.bg-legend{display:flex;flex-wrap:wrap;gap:6px 16px;padding:0 16px 10px;font-size:var(--step--1);color:var(--muted)}
.bg-legend span{display:inline-flex;align-items:center;gap:6px}
.bg-legend .bg-ph{width:12px;max-width:12px}
.bg-legend .bg-ph.stale{background:transparent}
.bg-w,.bg-clock{font-family:var(--font-mono);font-size:var(--step--1);color:var(--muted)}
`}</style>
    </div>
  );
}
