import { useEffect, useRef, useState, type RefObject } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./kinesis-sims.css";

// Ten seconds of a Kinesis data stream under three ShopViet problems. Each shard takes
// 1,000 records or 1 MB per second in and gives 2 MB per second out.
// 1. The mobile app sends every small event as its own record: too many records per
//    shard, ProvisionedThroughputExceededException. Aggregating events fixes it for free.
// 2. A product launch makes traffic jump: a provisioned stream throttles, on-demand
//    capacity mode follows the traffic.
// 3. Four apps share the 2 MB/s read pipe of each shard and fall behind; enhanced
//    fan-out gives each app its own 2 MB/s.

type View = "write" | "chart" | "read";

interface Scenario {
  name: Bi;
  request: Bi;
  view: View;
  toggle: Bi;
}

const SCENARIOS: Scenario[] = [
  { name: { vi: "Ứng dụng gửi từng sự kiện riêng lẻ", en: "App sends each event on its own" }, view: "write",
    request: { vi: "2.400 sự kiện/s · mỗi sự kiện 0,2 KB · 2 shard", en: "2,400 events/s · 0.2 KB per event · 2 shards" },
    toggle: { vi: "Gộp sự kiện trước khi gửi (KPL aggregation + PutRecords)", en: "Aggregate events before sending (KPL aggregation + PutRecords)" } },
  { name: { vi: "Lượt xem tăng đột biến khi ra mắt sản phẩm", en: "Views spike at a product launch" }, view: "chart",
    request: { vi: "Lưu lượng ghi theo từng giây · trước thời điểm ra mắt: 2 shard", en: "Write traffic per second · before the launch: 2 shards" },
    toggle: { vi: "On-demand capacity mode", en: "On-demand capacity mode" } },
  { name: { vi: "Bốn ứng dụng cùng đọc một stream", en: "Four apps read one stream" }, view: "read",
    request: { vi: "2 shard · mỗi shard ghi 0,8 MB/s · 4 ứng dụng đọc", en: "2 shards · 0.8 MB/s written per shard · 4 reading apps" },
    toggle: { vi: "Enhanced fan-out cho cả 4 ứng dụng", en: "Enhanced fan-out for all 4 apps" } },
];

const TICKS = 10;
const EVENTS = 2400;
const AGG = 10;
const TRAFFIC = [0.8, 0.9, 1.1, 3.2, 4, 4.2, 3.6, 2.4, 1.4, 1];
const WRITE_MB = 0.8;
const APPS: Bi[] = [
  { vi: "Bảng xếp hạng", en: "Leaderboard" },
  { vi: "Gợi ý sản phẩm", en: "Recommendations" },
  { vi: "Phát hiện gian lận", en: "Fraud detection" },
  { vi: "Báo cáo", en: "Reporting" },
];

/** Number formatter for the page language (vi-VN: 1.000,5; en-US: 1,000.5). */
const nfFor = (loc: string) => (v: number, d = 0) => v.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: d });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Per-shard records/s when 2 shards share EVENTS. */
function writeShard(agg: boolean) {
  const rec = (EVENTS / 2) / (agg ? AGG : 1);
  const mb = (EVENTS / 2) * 0.2 / 1000;
  const use = Math.max(rec / 1000, mb / 1);
  const rejected = Math.max(0, rec - 1000) * (agg ? AGG : 1);
  return { rec, mb, use, rejected };
}

/** Write capacity in MB/s: 2 shards, or on-demand (new stream 4 MB/s by default, up to double the previous peak; AWS counts the peak over the previous 30 days). */
function capacityAt(onDemand: boolean, t: number) {
  if (!onDemand) return 2;
  const peak = Math.max(0, ...TRAFFIC.slice(0, t));
  return Math.max(4, Math.round(peak * 2 * 10) / 10);
}

function readApp(efo: boolean) {
  const got = efo ? WRITE_MB : Math.min(WRITE_MB, 2 / APPS.length);
  const behindPerSec = 1 - got / WRITE_MB;
  return { got, behindPerSec };
}

export default function ShardThroughputSim() {
  const L = useLang();
  const nf = nfFor(L({ vi: "vi-VN", en: "en-US" }));
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(false);
  const [t, setT] = useState(-1);
  const [busy, setBusy] = useState(false);

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(false);
    setT(-1);
  }

  // Totals up to the shown second.
  const seconds = t + 1;
  let ok = 0;
  let rejected = 0;
  if (sc.view === "write") {
    const w = writeShard(on);
    rejected = w.rejected * 2 * seconds;
    ok = EVENTS * seconds - rejected;
  } else if (sc.view === "chart") {
    for (let i = 0; i < seconds; i++) {
      const cap = capacityAt(on, i);
      ok += Math.min(TRAFFIC[i], cap) * 1000;
      rejected += Math.max(0, TRAFFIC[i] - cap) * 1000;
    }
  }
  const r = readApp(on);
  const lag = on ? 0.07 : r.behindPerSec * seconds;
  const done = t === TICKS - 1;

  async function run() {
    if (busy) return;
    setBusy(true);
    setT(-1);
    const fast = prefersReducedMotion();
    for (let i = 0; i < TICKS; i++) {
      if (!alive.current) return;
      const layer = fx.current;
      const moves: Promise<void>[] = [];
      if (layer && !fast) {
        if (sc.view === "write") {
          const w = writeShard(on);
          for (const s of [0, 1]) {
            const y = 92 + s * 92;
            for (let k = 0; k < 3; k++) {
              const bad = !on && k === 2;
              const path: Pt[] = [[130, 138], [170, 138], [170, y], [bad ? 250 : 300, y]];
              moves.push(sleep(k * 90 + s * 40).then(() => travel(layer, bad ? [...path, ...[...path].reverse()] : path, bad ? 620 : 360, bad ? "pkt-bad" : "pkt", 5)));
            }
            if (w.rejected && i % 2 === 0) flashText(layer, 430, y + 21, "ProvisionedThroughputExceeded", "kts-flash bad", 520);
          }
        } else if (sc.view === "chart") {
          const cap = capacityAt(on, i);
          if (TRAFFIC[i] > cap) flashText(layer, 70 + i * 70 + 35, 40, "throttle", "kts-flash bad", 520);
        } else {
          for (let a = 0; a < APPS.length; a++) {
            const y = 62 + a * 52;
            const path: Pt[] = on ? [[205, 138], [480, 138], [480, y], [540, y]] : [[205, 138], [300, 138], [430, 138], [480, 138], [480, y], [540, y]];
            moves.push(sleep(a * (on ? 30 : 170)).then(() => travel(layer, path, on ? 380 : 480, a % 2 ? "pkt-edge" : "pkt", 5)));
          }
        }
      }
      setT(i);
      await Promise.all(moves);
      await sleep(fast ? 60 : sc.view === "chart" ? 380 : 140);
    }
    setBusy(false);
  }

  const result = (() => {
    if (sc.view === "write") return on
      ? { ok: true, text: L({ vi: `Gộp ${AGG} sự kiện vào một record: mỗi shard chỉ còn ${nf(writeShard(true).rec)} records/s. Không cần bổ sung shard, do đó **không phát sinh thêm chi phí**.`,
        en: `Aggregating ${AGG} events into one record: each shard now gets only ${nf(writeShard(true).rec)} records/s. No extra shards are needed, so there is **no additional cost**.` }) }
      : { ok: false, text: L({ vi: `Mỗi shard nhận ${nf(writeShard(false).rec)} records/s, vượt giới hạn **1.000 records/s**, phát sinh lỗi **ProvisionedThroughput\u200BExceededException**. Bổ sung shard khắc phục được lỗi nhưng tăng chi phí; retry với backoff chỉ trì hoãn lỗi. Gộp sự kiện trước khi gửi là phương án có chi phí thấp nhất.`,
        en: `Each shard receives ${nf(writeShard(false).rec)} records/s, exceeding the **1,000 records/s** limit and causing **ProvisionedThroughput\u200BExceededException** errors. Adding shards fixes the errors but increases cost; retrying with backoff only delays the errors. Aggregating events before sending is the lowest-cost option.` }) };
    if (sc.view === "chart") return on
      ? { ok: rejected === 0, text: L({ vi: "**On-demand capacity mode**: stream mới có capacity ghi mặc định 4 MB/s và đáp ứng tới **gấp đôi đỉnh ghi trong 30 ngày trước**; khi lưu lượng đạt đỉnh mới, Kinesis tự động tăng capacity. Nếu lưu lượng tăng quá gấp đôi đỉnh trước đó trong vòng 15 phút, request ghi có thể bị throttle và cần retry. Phù hợp với tải biến động mạnh, khó dự đoán; chi phí tính theo GB dữ liệu ghi và đọc.",
        en: "**On-demand capacity mode**: a new stream has a default write capacity of 4 MB/s and accommodates up to **double the peak write throughput of the previous 30 days**; when traffic reaches a new peak, Kinesis increases capacity automatically. If traffic grows to more than double the previous peak within 15 minutes, write requests can be throttled and must be retried. Suited to highly variable, unpredictable load; cost is per GB of data written and read." }) }
      : { ok: false, text: L({ vi: `Chế độ provisioned với 2 shard chỉ ghi được 2 MB/s. Tại thời điểm cao điểm, ${nf(rejected / 1000, 1)} MB bị từ chối. Việc tự chia shard đòi hỏi dự đoán trước và giám sát liên tục.`,
        en: `Provisioned mode with 2 shards can write only 2 MB/s. At the peak, ${nf(rejected / 1000, 1)} MB is rejected. Splitting shards yourself requires forecasting and constant monitoring.` }) };
    return on
      ? { ok: true, text: L({ vi: "**Enhanced fan-out**: mỗi ứng dụng đăng ký làm consumer riêng, có thông lượng **2 MB/s trên mỗi shard dành riêng**, dữ liệu được đẩy tới consumer (độ trễ khoảng 70 ms). Bổ sung ứng dụng không làm giảm thông lượng của ứng dụng khác.",
        en: "**Enhanced fan-out**: each app registers as its own consumer with **a dedicated 2 MB/s per shard**, and data is pushed to the consumer (latency about 70 ms). Adding apps does not reduce the throughput of other apps." }) }
      : { ok: false, text: L({ vi: `Mỗi shard chỉ cung cấp thông lượng đọc **2 MB/s, chia sẻ chung** cho mọi ứng dụng. Với 4 ứng dụng, mỗi ứng dụng chỉ đọc được ${nf(r.got, 1)} MB/s trong khi dữ liệu ghi vào là ${nf(WRITE_MB, 1)} MB/s: độ trễ tăng dần theo thời gian, sau một giờ độ trễ khoảng ${nf(r.behindPerSec * 60)} phút.`,
        en: `Each shard provides only **2 MB/s of read throughput, shared** by all apps. With 4 apps, each app reads only ${nf(r.got, 1)} MB/s while ${nf(WRITE_MB, 1)} MB/s is written: the lag keeps growing, and after one hour it is about ${nf(r.behindPerSec * 60)} minutes.` }) };
  })();

  return (
    <div className="stage kts">
      <div className="kts-row" role="group" aria-label={L({ vi: "Tình huống", en: "Scenarios" })}>
        {SCENARIOS.map((s, i) => (
          <button key={i} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>{L(s.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="kts-req">{L(sc.request)}</code>
        <label className="kts-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); setT(-1); }} />
          {L(sc.toggle)}
        </label>
        <button className="btn primary" onClick={run} disabled={busy}>{L({ vi: "Chạy mô phỏng 10 giây", en: "Run 10-second simulation" })}</button>
      </div>
      <div className="svg-wrap">
        {sc.view === "write" && <WriteView fx={fx} agg={on} live={t >= 0} />}
        {sc.view === "chart" && <ChartView fx={fx} onDemand={on} shown={t} />}
        {sc.view === "read" && <ReadView fx={fx} efo={on} live={t >= 0} lag={lag} />}
      </div>
      <div className="readout" aria-live="polite">
        {t < 0 ? (
          <p className="kts-hint">{L({ vi: <>Chọn <b>Chạy mô phỏng 10 giây</b>, sau đó thay đổi cấu hình và chạy lại để so sánh.</>, en: <>Choose <b>Run 10-second simulation</b>, then change the setting and run again to compare.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{L({ vi: "giây", en: "second" })} {t + 1}/{TICKS}</span>
              {sc.view === "write" && <>
                <span className="pill ok"><i />{nf(ok)} {L({ vi: "sự kiện được ghi", en: "events written" })}</span>
                <span className={"pill " + (rejected ? "bad" : "ok")}><i />{nf(rejected)} {L({ vi: "bị từ chối", en: "rejected" })}</span>
              </>}
              {sc.view === "chart" && <>
                <span className="pill ok"><i />{nf(ok / 1000, 1)} {L({ vi: "MB được ghi", en: "MB written" })}</span>
                <span className={"pill " + (rejected ? "bad" : "ok")}><i />{nf(rejected / 1000, 1)} {L({ vi: "MB bị từ chối", en: "MB rejected" })}</span>
                <span className="count">{L({ vi: "capacity giây này", en: "capacity this second" })}: {nf(capacityAt(on, t), 1)} MB/s</span>
              </>}
              {sc.view === "read" && (
                <span className={"pill " + (on ? "ok" : "bad")}><i />{L({ vi: "độ trễ mỗi ứng dụng", en: "lag per app" })} {on ? "~70 ms" : L({ vi: `${nf(lag, 1)} s và đang tăng`, en: `${nf(lag, 1)} s and growing` })}</span>
              )}
            </div>
            {done && <p className={`kts-result ${result.ok ? "ok" : "bad"}`}>{rich(result.text)}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Bar({ x, y, w, use }: { x: number; y: number; w: number; use: number }) {
  const max = 1.5;
  const fill = Math.min(use, max) / max;
  return (
    <g className="kts-bar">
      <rect className="kts-track" x={x} y={y} width={w} height={14} rx={7} />
      <rect className={"kts-fill" + (use > 1 ? " over" : "")} x={x} y={y} width={Math.max(4, w * fill)} height={14} rx={7} />
      <line className="kts-limit" x1={x + w / max} x2={x + w / max} y1={y - 5} y2={y + 19} />
    </g>
  );
}

function WriteView({ fx, agg, live }: { fx: RefObject<SVGGElement>; agg: boolean; live: boolean }) {
  const L = useLang();
  const nf = nfFor(L({ vi: "vi-VN", en: "en-US" }));
  const w = writeShard(agg);
  return (
    <svg viewBox="0 20 820 230" role="img" aria-label={L({ vi: "Ứng dụng gửi sự kiện vào hai shard; thanh thể hiện mức sử dụng giới hạn ghi của mỗi shard", en: "The app sends events to two shards; the bars show how much of each shard's write limit is used" })}>
      <path className="kss-link" d="M130 138 H170 V92 H300 M170 138 V184 H300" />
      <g className="kss-src">
        <rect x={20} y={110} width={110} height={56} rx={8} />
        <text className="kss-l1" x={75} y={134} textAnchor="middle">{L({ vi: "Ứng dụng di động", en: "Mobile app" })}</text>
        <text className="kss-l2" x={75} y={151} textAnchor="middle">{agg ? L({ vi: "gộp 10 sự kiện/record", en: "10 events/record" }) : L({ vi: "1 sự kiện = 1 record", en: "1 event = 1 record" })}</text>
      </g>
      {[0, 1].map((s) => {
        const y = 92 + s * 92;
        return (
          <g key={s}>
            <g className="kss-shard">
              <rect x={300} y={y - 26} width={500} height={52} rx={8} />
              <text x={306} y={y - 32}>Shard {s + 1} · {L({ vi: "giới hạn ghi 1.000 records/s hoặc 1 MB/s", en: "write limit 1,000 records/s or 1 MB/s" })}</text>
            </g>
            <text className="kss-l1" x={316} y={y + 4}>{live ? `${nf(w.rec)} records/s · ${nf(w.mb, 2)} MB/s` : "—"}</text>
            <Bar x={560} y={y - 7} w={220} use={live ? w.use : 0} />
          </g>
        );
      })}
      <text className="ts" x={560 + 220 / 1.5} y={232} textAnchor="middle">{L({ vi: "giới hạn", en: "limit" })}</text>
      <g ref={fx} />
    </svg>
  );
}

function ChartView({ fx, onDemand, shown }: { fx: RefObject<SVGGElement>; onDemand: boolean; shown: number }) {
  const X0 = 70;
  const BW = 70;
  const Y0 = 50;
  const H = 160;
  const MAXV = 7;
  const y = (v: number) => Y0 + H - (v / MAXV) * H;
  const cap = TRAFFIC.map((_, i) => capacityAt(onDemand, i));
  const L = useLang();
  const line = cap.slice(0, shown + 1).map((c, i) => `${i ? "L" : "M"}${X0 + i * BW} ${y(Math.min(c, MAXV))} H${X0 + (i + 1) * BW}`).join(" ");
  return (
    <svg viewBox="0 20 820 230" role="img" aria-label={L({ vi: "Biểu đồ 10 giây: cột là lưu lượng ghi, đường là capacity của stream", en: "10-second chart: bars are write traffic, the line is the stream's capacity" })}>
      {[0, 2, 4, 6].map((v) => (
        <g key={v}>
          <line className="kts-grid" x1={X0} x2={X0 + BW * TICKS} y1={y(v)} y2={y(v)} />
          <text className="ts" x={X0 - 8} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      <text className="ts" x={X0 - 8} y={Y0 - 14} textAnchor="end">MB/s</text>
      {TRAFFIC.map((v, i) => {
        const ghost = i > shown;
        const okV = Math.min(v, cap[i]);
        return (
          <g key={i} className={ghost ? "kts-ghost" : ""}>
            <rect className="kts-col" x={X0 + i * BW + 8} y={y(okV)} width={BW - 16} height={y(0) - y(okV)} rx={3} />
            {v > cap[i] && <rect className="kts-col over" x={X0 + i * BW + 8} y={y(v)} width={BW - 16} height={y(okV) - y(v)} rx={3} />}
            <text className="ts" x={X0 + i * BW + BW / 2} y={y(0) + 16} textAnchor="middle">{i + 1}s</text>
          </g>
        );
      })}
      {shown >= 0 && <path className="kts-cap" d={line} />}
      <g transform={`translate(${X0} 246)`}>
        <rect className="kts-col" x={0} y={-9} width={12} height={10} rx={2} />
        <text className="ts" x={18} y={0}>{L({ vi: "được ghi", en: "written" })}</text>
        <rect className="kts-col over" x={110} y={-9} width={12} height={10} rx={2} />
        <text className="ts" x={128} y={0}>{L({ vi: "bị throttle", en: "throttled" })}</text>
        <line className="kts-cap" x1={240} x2={262} y1={-4} y2={-4} />
        <text className="ts" x={268} y={0}>{L({ vi: "capacity ghi của stream", en: "stream write capacity" })}</text>
      </g>
      <g ref={fx} />
    </svg>
  );
}

function ReadView({ fx, efo, live, lag }: { fx: RefObject<SVGGElement>; efo: boolean; live: boolean; lag: number }) {
  const L = useLang();
  const nf = nfFor(L({ vi: "vi-VN", en: "en-US" }));
  const r = readApp(efo);
  return (
    <svg viewBox="0 20 820 230" role="img" aria-label={L({ vi: "Hai shard và bốn ứng dụng đọc; thanh thể hiện thông lượng đọc của mỗi ứng dụng so với lượng dữ liệu ghi vào", en: "Two shards and four reading apps; the bars show each app's read throughput against the data written" })}>
      <g className="kss-shard">
        <rect x={20} y={92} width={185} height={92} rx={8} />
        <text x={26} y={86}>{L({ vi: "Stream · 2 shard", en: "Stream · 2 shards" })}</text>
      </g>
      <text className="kss-l1" x={112} y={132} textAnchor="middle">{L({ vi: "ghi 0,8 MB/s", en: "writes 0.8 MB/s" })}</text>
      <text className="kss-l2" x={112} y={149} textAnchor="middle">{L({ vi: "mỗi shard", en: "per shard" })}</text>
      {efo ? (
        <path className="kss-link" d="M205 138 H480" />
      ) : (
        <>
          <path className="kss-link" d="M205 138 H300 M430 138 H480" />
          <g className="kts-pipe">
            <rect x={300} y={116} width={130} height={44} rx={8} />
            <text className="kss-l1" x={365} y={134} textAnchor="middle">GetRecords</text>
            <text className="kss-l2" x={365} y={150} textAnchor="middle">{L({ vi: "2 MB/s chia chung", en: "2 MB/s shared" })}</text>
          </g>
        </>
      )}
      {efo && <text className="kss-l2" x={340} y={128} textAnchor="middle">{L({ vi: "SubscribeToShard · 2 MB/s mỗi consumer", en: "SubscribeToShard · 2 MB/s per consumer" })}</text>}
      {APPS.map((name, a) => {
        const y = 62 + a * 52;
        return (
          <g key={a}>
            <path className="kss-link" d={`M480 138 V${y} H540`} />
            <g className="kss-app">
              <rect x={540} y={y - 22} width={270} height={44} rx={8} />
              <text className="kss-l1" x={552} y={y - 3}>{L(name)}</text>
              <text className="kss-l2" x={552} y={y + 13}>{live ? L({ vi: `đọc ${nf(r.got, 1)} / cần ${nf(WRITE_MB, 1)} MB/s`, en: `reads ${nf(r.got, 1)} / needs ${nf(WRITE_MB, 1)} MB/s` }) : L({ vi: "chưa chạy mô phỏng", en: "not run yet" })}</text>
            </g>
            <g className="kts-bar">
              <rect className="kts-track" x={700} y={y - 7} width={96} height={14} rx={7} />
              <rect className={"kts-fill" + (r.got < WRITE_MB ? " over" : "")} x={700} y={y - 7} width={live ? 96 * (r.got / WRITE_MB) : 4} height={14} rx={7} />
            </g>
          </g>
        );
      })}
      {live && <text className={"kts-lag" + (efo ? "" : " bad")} x={20} y={218}>{efo ? L({ vi: "độ trễ ~70 ms", en: "lag ~70 ms" }) : L({ vi: `độ trễ ${nf(lag, 1)} s`, en: `lag ${nf(lag, 1)} s` })}</text>}
      <g ref={fx} />
    </svg>
  );
}
