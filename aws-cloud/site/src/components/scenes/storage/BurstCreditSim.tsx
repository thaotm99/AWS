import { useEffect, useId, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./storage-sims.css";

// Burst credit bucket over a 6-hour window with one load spike.
// kind="ebs": gp2 (baseline 3 IOPS/GiB, min 100, burst to 3,000 IOPS, 5.4 million credits) vs gp3 (3,000 IOPS baseline, no credits).
// kind="efs": Bursting (50 KiBps/GiB of Standard storage, burst to max(100 MiBps, 100 KiBps/GiB), max 2.1 TiB credits per TiB, min 1 MiBps)
// vs Elastic vs Provisioned. Sources: ebs/latest/userguide/general-purpose.html, efs/latest/ug/performance.html.
// Credits follow the documented rule: earned below the baseline, spent above it (spend = delivered - baseline).
// Source questions: exam4_q15 (gp2), exam4_q55 (EFS Bursting), exam3_q11.

type EbsMode = "gp2" | "gp3";
type EfsMode = "bursting" | "elastic" | "provisioned";
type Mode = EbsMode | EfsMode;

const WINDOW = 360; // minutes shown
const START = 30; // spike starts at minute 30
const PX0 = 56, PX1 = 800, PY0 = 26, PY1 = 176;

interface Run {
  demand: number[];
  delivered: number[];
  credit: number[]; // 0..1 of the cap
  baseline: number;
  burst: number;
  /** Minutes the spike was served at full demand. */
  fullMin: number;
  /** Minutes of the spike served below demand. */
  shortMin: number;
  capLabel: Bi;
}

function simulate(kind: "ebs" | "efs", mode: Mode, size: number, spike: number, iaShare: boolean): Run {
  const demand: number[] = [], delivered: number[] = [], credit: number[] = [];
  let baseline: number, burst: number, cap: number, bal: number, peak: number, capLabel: Bi;
  if (kind === "ebs") {
    peak = 3000;
    if (mode === "gp3") { baseline = 3000; burst = 3000; cap = 0; }
    else { baseline = Math.min(16000, Math.max(100, 3 * size)); burst = Math.max(3000, baseline); cap = 5.4e6; }
    bal = cap; // every new volume starts with 5.4 million I/O credits
    capLabel = { vi: "5,4 triệu I/O credit", en: "5.4 million I/O credits" };
  } else {
    peak = 100;
    const std = iaShare ? size * 0.2 : size; // only Standard storage counts toward the baseline
    if (mode === "bursting") {
      baseline = Math.max(1, (std * 50) / 1024); // 50 KiBps per GiB, metered minimum 1 MiBps
      burst = Math.max(100, (std * 100) / 1024);
      cap = std < 1024 ? 2.1 * 1024 * 1024 : 2.1 * 1024 * 1024 * (std / 1024); // MiB
      bal = Math.min(cap, baseline * 86400); // after a day without activity
    } else { baseline = peak; burst = peak; cap = 0; bal = 0; }
    capLabel = { vi: "2,1 TiB mỗi TiB, tối thiểu 2,1 TiB", en: "2.1 TiB per TiB, at least 2.1 TiB" };
  }
  let fullMin = 0, shortMin = 0;
  for (let m = 0; m < WINDOW; m++) {
    const d = m >= START && m < START + spike ? peak : 0;
    let out: number;
    if (cap === 0) out = Math.min(d, Math.max(baseline, burst));
    else if (d <= baseline) out = d;
    else out = bal > 0 ? Math.min(d, burst) : baseline;
    // Earn (baseline - load) below the baseline, spend (load - baseline) above it; 60 s per step.
    if (cap) bal = Math.min(cap, Math.max(0, bal + (baseline - out) * 60));
    if (d > 0) { if (out >= d) fullMin++; else shortMin++; }
    demand.push(d); delivered.push(out); credit.push(cap ? bal / cap : 0);
  }
  return { demand, delivered, credit, baseline, burst, fullMin, shortMin, capLabel };
}

const MODES: Record<"ebs" | "efs", { id: Mode; label: Bi }[]> = {
  ebs: [
    { id: "gp2", label: { vi: "gp2 (burst credit)", en: "gp2 (burst credits)" } },
    { id: "gp3", label: { vi: "gp3 (baseline 3.000 IOPS)", en: "gp3 (3,000 IOPS baseline)" } },
  ],
  efs: [
    { id: "bursting", label: { vi: "Bursting", en: "Bursting" } },
    { id: "elastic", label: { vi: "Elastic (khuyến nghị)", en: "Elastic (recommended)" } },
    { id: "provisioned", label: { vi: "Provisioned 100 MiBps", en: "Provisioned 100 MiBps" } },
  ],
};

export default function BurstCreditSim({ kind }: { kind: "ebs" | "efs" }) {
  const tr = useLang();
  const uid = useId().replace(/:/g, "");
  const num = (n: number, d = 0) => n.toLocaleString(tr({ vi: "vi-VN", en: "en-US" }), { maximumFractionDigits: d });
  const [mode, setMode] = useState<Mode>(kind === "ebs" ? "gp2" : "bursting");
  const [size, setSize] = useState(kind === "ebs" ? 100 : 100);
  const [spike, setSpike] = useState(kind === "ebs" ? 60 : 120);
  const [ia, setIa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(0); // minutes drawn
  const gen = useRef(0);

  useEffect(() => () => { gen.current++; }, []);

  const run = simulate(kind, mode, size, spike, ia);
  const unit = kind === "ebs" ? "IOPS" : "MiBps";
  const yMax = kind === "ebs" ? 3600 : 120;
  const x = (m: number) => PX0 + (m / WINDOW) * (PX1 - PX0);
  const y = (v: number) => PY1 - (Math.min(v, yMax) / yMax) * (PY1 - PY0);
  const yc = (f: number) => PY1 - f * (PY1 - PY0);
  const upto = Math.max(1, shown);
  const line = (arr: number[], f: (v: number) => number) => arr.slice(0, upto).map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)} ${f(v).toFixed(1)}`).join(" ");
  const area = run.credit.some((c) => c > 0)
    ? `${line(run.credit, yc)} L${x(upto - 1).toFixed(1)} ${PY1} L${PX0} ${PY1} Z`
    : "";

  function change(fn: () => void) {
    gen.current++;
    setBusy(false);
    setShown(0);
    fn();
  }

  async function play() {
    if (busy) return;
    const g = ++gen.current;
    setBusy(true);
    try {
      const dur = prefersReducedMotion() ? 1 : 2400;
      const t0 = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (g !== gen.current) return resolve();
          const p = Math.min(1, (now - t0) / dur);
          setShown(Math.round(p * WINDOW));
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    } finally {
      if (g === gen.current) setBusy(false);
    }
  }

  const done = shown >= WINDOW;
  let verdict: { tone: "ok" | "warn" | "bad"; msg: Bi } | null = null;
  if (done) {
    if (kind === "ebs" && mode === "gp2") {
      const below = run.baseline >= 3000;
      const burstSec = below ? 0 : 5.4e6 / (3000 - run.baseline);
      verdict = below
        ? { tone: "ok", msg: { vi: `Volume ${num(size)} GiB có baseline ${num(run.baseline)} IOPS (3 IOPS/GiB), không thấp hơn 3.000 IOPS nên không cần burst credit. Volume gp2 từ 1 TiB trở lên không burst.`, en: `A ${num(size)} GiB volume has a ${num(run.baseline)} IOPS baseline (3 IOPS/GiB), not below 3,000 IOPS, so it needs no burst credits. gp2 volumes of 1 TiB or more do not burst.` } }
        : run.shortMin === 0
          ? { tone: "ok", msg: { vi: `Baseline ${num(run.baseline)} IOPS. 5,4 triệu credit đủ để burst lên 3.000 IOPS trong khoảng **${num(burstSec / 60)} phút** (credit ÷ (3.000 − baseline)), dài hơn đợt cao điểm ${spike} phút. Khi tải về dưới baseline, volume nạp lại ${num(run.baseline)} credit mỗi giây.`, en: `Baseline ${num(run.baseline)} IOPS. 5.4 million credits let the volume burst to 3,000 IOPS for about **${num(burstSec / 60)} minutes** (credits ÷ (3,000 − baseline)), longer than the ${spike}-minute peak. When load drops below the baseline, the volume earns back ${num(run.baseline)} credits per second.` } }
          : { tone: "bad", msg: { vi: `Credit cạn sau khoảng **${num(burstSec / 60)} phút**; ${run.shortMin} phút còn lại của đợt cao điểm chỉ đạt baseline **${num(run.baseline)} IOPS**. Theo dõi metric \`BurstBalance\` trong CloudWatch. Tăng dung lượng gp2 để tăng baseline, hoặc chuyển sang **gp3**: 3.000 IOPS liên tục, không phụ thuộc credit.`, en: `Credits run out after about **${num(burstSec / 60)} minutes**; for the remaining ${run.shortMin} minutes of the peak the volume delivers only its **${num(run.baseline)} IOPS** baseline. Watch the \`BurstBalance\` CloudWatch metric. Grow the gp2 volume to raise the baseline, or move to **gp3**: a sustained 3,000 IOPS with no credits.` } };
    } else if (kind === "ebs") {
      verdict = { tone: "ok", msg: { vi: `gp3 không dùng burst credit: 3.000 IOPS và 125 MiB/s là baseline có sẵn trong giá lưu trữ, duy trì liên tục; cần thêm thì cấp phát tới 80.000 IOPS, độc lập với dung lượng. Giá theo GB của gp3 thấp hơn gp2 khoảng 20% (us-east-1, 10/2026: gp3 $0,08, gp2 $0,10 mỗi GB-tháng).`, en: `gp3 uses no burst credits: 3,000 IOPS and 125 MiB/s are a baseline included in the storage price and sustained indefinitely; provision up to 80,000 IOPS independently of size when you need more. gp3 costs about 20% less per GB than gp2 (us-east-1, 10/2026: gp3 $0.08, gp2 $0.10 per GB-month).` } };
    } else if (mode === "bursting") {
      const std = ia ? size * 0.2 : size;
      verdict = run.shortMin === 0
        ? { tone: "ok", msg: { vi: `${num(std)} GiB ở lớp Standard cho baseline **${num(run.baseline, 1)} MiBps** và burst tới **${num(run.burst)} MiBps**. Credit tích luỹ trong 24 giờ trước đủ phục vụ đợt cao điểm ${spike} phút.`, en: `${num(std)} GiB in the Standard class gives a **${num(run.baseline, 1)} MiBps** baseline and bursts to **${num(run.burst)} MiBps**. The credits earned over the previous 24 hours cover the ${spike}-minute peak.` } }
        : { tone: "bad", msg: { vi: `${num(std)} GiB ở lớp Standard: baseline **${num(run.baseline, 1)} MiBps**. Credit cạn và ${run.shortMin} phút của đợt cao điểm chỉ đạt baseline.${ia ? " Lifecycle sang IA làm giảm dung lượng Standard, nên baseline và tốc độ tích luỹ credit cũng giảm." : ""} Khi đã dùng hết credit, AWS khuyến nghị chuyển sang Elastic hoặc Provisioned throughput.`, en: `${num(std)} GiB in the Standard class: a **${num(run.baseline, 1)} MiBps** baseline. Credits run out and ${run.shortMin} minutes of the peak get only the baseline.${ia ? " Lifecycle to IA shrinks Standard storage, so the baseline and the credit earning rate shrink too." : ""} Once you exhaust burst credits, AWS recommends switching to Elastic or Provisioned throughput.` } };
    } else if (mode === "elastic") {
      verdict = { tone: "ok", msg: { vi: "Elastic throughput tự tăng giảm theo tải, không tích luỹ hay tiêu burst credit; chỉ trả phí theo lượng dữ liệu và metadata đọc ghi. Đây là chế độ mặc định và được khuyến nghị cho tải biến động, khó dự đoán.", en: "Elastic throughput scales up and down with the load and neither earns nor spends burst credits; you pay only for the data and metadata read and written. It is the default and the recommended mode for spiky, unpredictable workloads." } };
    } else {
      verdict = { tone: "warn", msg: { vi: "Provisioned throughput phục vụ đủ 100 MiBps, nhưng mức throughput này được tính phí cả tháng (phần vượt baseline có sẵn từ lớp Standard), kể cả trong giờ không có tải. Phù hợp khi đã biết trước yêu cầu throughput.", en: "Provisioned throughput serves the full 100 MiBps, but that throughput is billed for the whole month (the part above the baseline included with Standard storage), even in idle hours. It suits workloads whose throughput needs are known in advance." } };
    }
  }

  const sizeMax = kind === "ebs" ? 1200 : 2000;
  const sizeLabel = kind === "ebs"
    ? tr({ vi: "Dung lượng volume: ", en: "Volume size: " })
    : tr({ vi: "Dung lượng file system: ", en: "File system size: " });

  return (
    <div className="stage stx">
      <div className="stx-row" role="group" aria-label={kind === "ebs" ? tr({ vi: "Loại volume", en: "Volume type" }) : "Throughput mode"}>
        <span className="stx-lbl">{kind === "ebs" ? tr({ vi: "Volume", en: "Volume" }) : "Throughput"}</span>
        {MODES[kind].map((m) => (
          <button key={m.id} className="chip" aria-pressed={m.id === mode} disabled={busy} onClick={() => change(() => setMode(m.id))}>{tr(m.label)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-size`}>{sizeLabel}{num(size)} GiB</label>
        <input id={`${uid}-size`} type="range" min={kind === "ebs" ? 20 : 50} max={sizeMax} step={10} value={size} disabled={busy || mode === "gp3"} onChange={(e) => change(() => setSize(Number(e.target.value)))} />
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-spike`}>{tr({ vi: "Đợt cao điểm kéo dài: ", en: "Peak lasts: " })}{spike} {tr({ vi: "phút", en: "min" })} · {kind === "ebs" ? `${num(3000)} IOPS` : tr({ vi: "ghi 100 MiBps", en: "100 MiBps writes" })}</label>
        <input id={`${uid}-spike`} type="range" min={15} max={240} step={15} value={spike} disabled={busy} onChange={(e) => change(() => setSpike(Number(e.target.value)))} />
      </div>
      <div className="stage-bar">
        {kind === "efs" && (
          <label className="stx-toggle">
            <input type="checkbox" checked={ia} disabled={busy || mode !== "bursting"} onChange={(e) => change(() => setIa(e.target.checked))} />
            {tr({ vi: "Lifecycle: 80% dữ liệu đã chuyển sang IA", en: "Lifecycle: 80% of the data moved to IA" })}
          </label>
        )}
        <button className="btn primary" onClick={play} disabled={busy}>{tr({ vi: "Chạy 6 giờ", en: "Run 6 hours" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 214" role="img" aria-label={tr({ vi: `Biểu đồ 6 giờ: nhu cầu, hiệu năng thực tế (${unit}) và số dư burst credit`, en: `Six-hour chart: demand, delivered performance (${unit}) and burst credit balance` })}>
          <rect className="stx-plot" x={PX0} y={PY0} width={PX1 - PX0} height={PY1 - PY0} />
          {[0, 0.5, 1].map((f) => (
            <text key={f} className="stx-m" x={PX0 - 6} y={y(f * (kind === "ebs" ? 3000 : 100)) + 4} textAnchor="end">{num(f * (kind === "ebs" ? 3000 : 100))}</text>
          ))}
          {[0, 60, 120, 180, 240, 300, 360].map((m) => (
            <text key={m} className="stx-m" x={x(m)} y={PY1 + 16} textAnchor="middle">{m / 60}h</text>
          ))}
          {(kind === "ebs" || mode === "bursting") && run.baseline < yMax && <><path className="stx-base" d={`M${PX0} ${y(run.baseline)} H${PX1}`} /><text className="stx-m" x={PX1 - 4} y={y(run.baseline) - 5} textAnchor="end">baseline {num(run.baseline, 1)} {unit}</text></>}
          {area && <path className="stx-credit" d={area} />}
          {shown > 0 && <path className="stx-demand" d={line(run.demand, y)} />}
          {shown > 0 && <path className="stx-deliver" d={line(run.delivered, y)} />}
          {shown > 0 && shown < WINDOW && <path className="stx-cursor" d={`M${x(shown)} ${PY0} V${PY1}`} />}
          <g className="stx-legend">
            <path className="stx-demand" d="M60 200 h22" /><text className="stx-s" x={88} y={204}>{tr({ vi: "nhu cầu", en: "demand" })}</text>
            <path className="stx-deliver" d="M170 200 h22" /><text className="stx-s" x={198} y={204}>{tr({ vi: "thực tế", en: "delivered" })}</text>
            <rect className="stx-credit" x={280} y={194} width={22} height={12} /><text className="stx-s" x={308} y={204}>{kind === "ebs" && mode === "gp3" || kind === "efs" && mode !== "bursting" ? tr({ vi: "không dùng burst credit", en: "no burst credits" }) : tr({ vi: `số dư credit (trần ${tr(run.capLabel)})`, en: `credit balance (cap ${tr(run.capLabel)})` })}</text>
          </g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {verdict ? (
          <p className={`stx-result ${verdict.tone}`}>{rich(tr(verdict.msg))}</p>
        ) : (
          <p className="stx-hint">{tr({ vi: <>Chọn cấu hình, kéo thanh trượt, sau đó nhấn <b>Chạy 6 giờ</b>. Đợt cao điểm bắt đầu ở phút thứ 30; ngoài đợt cao điểm hệ thống gần như không có tải.</>, en: <>Pick a configuration, move the sliders, then press <b>Run 6 hours</b>. The peak starts at minute 30; outside the peak the system is almost idle.</> })}</p>
        )}
      </div>
    </div>
  );
}
