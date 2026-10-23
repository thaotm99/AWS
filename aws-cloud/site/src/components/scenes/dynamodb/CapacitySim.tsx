import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./capacity-sim.css";

// One day of reads on a MFTech DynamoDB table, hour by hour. Bars are the reads the
// app sends (RCU); the line is the capacity the table has under the chosen mode. The
// right panel shows how those reads land on four partitions, each capped at 3,000 RCU.
// Simplified model: Auto Scaling sets capacity from the previous hour at 70% target
// utilisation, so a sudden jump is throttled; On-Demand follows the load; DAX answers
// repeated eventually consistent reads from memory before they reach the table.

type PatternId = "shipper" | "steady" | "live";
type ModeId = "prov" | "od" | "dax";

const HOURS = 24;
const PARTS = 4;
const PART_MAX = 3000;
const MIN_PROV = 1000;
const TARGET = 0.7;
const EVEN = [0.25, 0.25, 0.25, 0.25];
const HOT = [0.1, 0.7, 0.1, 0.1];

const PATTERNS: Record<PatternId, { name: Bi; about: Bi; need: number[]; hit: number; hot: number[] }> = {
  shipper: {
    name: { vi: "Ứng dụng shipper: ban đêm thấp, ban ngày biến động", en: "Shipper app: quiet at night, spiky by day" },
    about: { vi: "Shipper chỉ làm việc ban ngày. Đơn hàng phát sinh theo đợt, tải tăng gấp nhiều lần chỉ trong vài phút. Vị trí thay đổi liên tục nên hiếm khi đọc lại đúng dữ liệu cũ.", en: "Shippers work only during the day. Orders arrive in bursts, and load multiplies within minutes. Locations change constantly, so the same data is rarely read again." },
    need: [20, 20, 20, 20, 20, 20, 300, 2600, 900, 3800, 1200, 4200, 1500, 600, 3600, 900, 4400, 5200, 1600, 700, 300, 40, 20, 20],
    hit: 0.15,
    hot: [],
  },
  steady: {
    name: { vi: "Danh mục sản phẩm: tải ổn định, dự đoán được", en: "Product catalog: steady, predictable load" },
    about: { vi: "Người dùng xem sản phẩm suốt cả ngày; tải tăng giảm dần theo giờ và lặp lại giống nhau giữa các ngày.", en: "Users browse products all day; load rises and falls gradually by the hour and repeats the same way every day." },
    need: [1500, 1400, 1300, 1300, 1400, 1600, 2000, 2500, 3000, 3500, 3800, 4000, 4100, 4000, 3900, 3900, 4000, 4300, 4600, 4800, 4600, 3800, 2800, 2000],
    hit: 0.6,
    hot: [],
  },
  live: {
    name: { vi: "Livestream của một shop có lưu lượng lớn", en: "Livestream of a high-traffic shop" },
    about: { vi: "Từ 19h đến 22h, hàng chục nghìn người dùng cùng truy cập trang của một shop. Phần lớn lượt đọc tập trung vào cùng một partition key.", en: "From 19:00 to 22:00, tens of thousands of users visit one shop’s page at once. Most reads hit the same partition key." },
    need: [800, 700, 600, 600, 600, 700, 1000, 1500, 2000, 2400, 2600, 2800, 3000, 2800, 2600, 2600, 2800, 3200, 3600, 4500, 8000, 7600, 3000, 1400],
    hit: 0.95,
    hot: [19, 20, 21],
  },
};

const MODES: { id: ModeId; name: string }[] = [
  { id: "prov", name: "Provisioned + Auto Scaling" },
  { id: "od", name: "On-Demand" },
  { id: "dax", name: "On-Demand + DAX" },
];

const BEST: Record<PatternId, ModeId> = { shipper: "od", steady: "prov", live: "dax" };

const NOTE: Record<PatternId, Record<ModeId, Bi>> = {
  shipper: {
    prov: { vi: "Auto Scaling cần vài phút để tăng capacity, nên các đợt tăng đột ngột bị **throttle**. Ban đêm gần như không có người dùng nhưng vẫn phát sinh phí cho capacity tối thiểu.", en: "Auto Scaling needs a few minutes to add capacity, so sudden bursts are **throttled**. At night there are almost no users, but you still pay for the minimum capacity." },
    od: { vi: "**On-Demand** tính phí theo từng request: ban đêm không có request thì không phát sinh phí đọc ghi, ban ngày tải tăng đột biến vẫn được phục vụ ngay. Phù hợp với tải không dự đoán được, có thời điểm gần bằng 0.", en: "**On-Demand** charges per request: with no requests at night there are no read or write charges, and daytime spikes are still served immediately. It suits unpredictable load that at times drops to almost zero." },
    dax: { vi: "Vị trí shipper thay đổi liên tục nên tỷ lệ cache hit rất thấp. DAX cluster chạy 24/7 nhưng gần như không giảm được tải trên bảng.", en: "Shipper locations change constantly, so the cache hit ratio is very low. The DAX cluster runs 24/7 but barely reduces the load." },
  },
  steady: {
    prov: { vi: "Tải ổn định, dự đoán được: **Provisioned + Auto Scaling** giữ capacity sát nhu cầu, đơn giá mỗi đơn vị capacity thấp hơn so với tính phí theo request. Đây là phương án chi phí thấp nhất cho mẫu tải này.", en: "Steady, predictable load: **Provisioned + Auto Scaling** keeps capacity close to demand, and the unit price of capacity is lower than per-request billing. This is the lowest-cost option for this load pattern." },
    od: { vi: "Hoạt động ổn định, không bị throttle. Tuy nhiên, với tải ổn định cả ngày, tính phí theo từng request có chi phí cao hơn cấp phát trước capacity.", en: "Runs smoothly with no throttling. However, with steady load all day, per-request billing costs more than provisioning capacity in advance." },
    dax: { vi: "Hoạt động ổn định, nhưng bảng không gặp vấn đề về hiệu năng. Chi phí DAX cluster phát sinh mà không cần thiết.", en: "Runs smoothly, but the table has no performance problem. The DAX cluster cost is unnecessary." },
  },
  live: {
    prov: { vi: "Tổng capacity của bảng đủ đáp ứng, nhưng 70% lượt đọc tập trung vào **một partition**, vượt giới hạn 3.000 RCU của partition đó. Tăng RCU cho toàn bảng cũng không khắc phục được.", en: "The table has enough total capacity, but 70% of reads land on **one partition**, exceeding that partition’s 3,000 RCU limit. Adding RCUs to the whole table does not fix it." },
    od: { vi: "On-Demand tự động co giãn theo tải của toàn bảng, nhưng giới hạn của **mỗi partition** vẫn áp dụng. Hot partition vẫn bị throttle.", en: "On-Demand scales automatically with the load on the whole table, but the **per-partition** limit still applies. The hot partition is still throttled." },
    dax: { vi: "**DAX** phục vụ các lượt đọc lặp lại từ bộ nhớ trong vài micro giây. Chỉ phần nhỏ còn lại được chuyển tới DynamoDB, hot partition không còn quá tải. Ứng dụng gần như không cần thay đổi vì DAX sử dụng cùng API với DynamoDB.", en: "**DAX** serves repeated reads from memory in microseconds. Only the small remainder reaches DynamoDB, so the hot partition is no longer overloaded. The application barely needs to change because DAX uses the same API as DynamoDB." },
  },
};

interface Hour { need: number; cap: number; table: number; parts: number[]; throttled: boolean }

function simulate(p: PatternId, mode: ModeId): Hour[] {
  const { need, hit, hot } = PATTERNS[p];
  return need.map((n, h) => {
    const prev = need[(h + HOURS - 1) % HOURS];
    const cap = mode === "prov" ? Math.max(MIN_PROV, Math.round(prev / TARGET)) : n;
    const table = mode === "dax" ? Math.round(n * (1 - hit)) : n;
    const share = hot.includes(h) ? HOT : EVEN;
    const parts = share.map((s) => Math.round(table * s));
    const throttled = table > cap || parts.some((v) => v > PART_MAX);
    return { need: n, cap, table, parts, throttled };
  });
}

const X0 = 52;
const W = 500;
const Y0 = 30;
const H = 190;
const MAXV = 9000;
const bw = W / HOURS;
const y = (v: number) => Y0 + H - (Math.min(v, MAXV) / MAXV) * H;
const PX0 = 610;
const PW = 40;
const PGAP = 10;
const PMAX = 6000;
const py = (v: number) => Y0 + H - (Math.min(v, PMAX) / PMAX) * H;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CapacitySim() {
  const L = useLang();
  const fmt = (n: number) => n.toLocaleString(L({ vi: "vi-VN", en: "en-US" }));
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [pattern, setPattern] = useState<PatternId>("shipper");
  const [mode, setMode] = useState<ModeId>("prov");
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const hours = simulate(pattern, mode);
  const visible = shown + 1;
  const done = shown === HOURS - 1;
  const peakOf = (hr: Hour) => Math.max(...hr.parts);
  const peak = hours.reduce((best, hr, h) => (peakOf(hr) > peakOf(hours[best]) ? h : best), 0);
  const at = done ? peak : Math.max(0, shown);
  const now = hours[Math.max(0, shown)];
  const part = hours[at];
  const throttled = hours.slice(0, visible).filter((h) => h.throttled).length;
  const idle = mode === "prov" ? hours.slice(0, visible).reduce((s, h) => s + Math.max(0, h.cap - h.table), 0) : 0;
  const fits = BEST[pattern] === mode;

  function change(fn: () => void) {
    if (busy) return;
    fn();
    setShown(-1);
  }

  async function play() {
    if (busy) return;
    setBusy(true);
    setShown(-1);
    const fast = prefersReducedMotion();
    for (let h = 0; h < HOURS; h++) {
      if (!alive.current) return;
      setShown(h);
      const layer = fx.current;
      if (layer && !fast && hours[h].throttled) {
        flashText(layer, X0 + h * bw + bw / 2, y(hours[h].need) - 8, "throttle", "dcap-flash", 650);
      }
      if (!fast) await sleep(170);
    }
    setBusy(false);
  }

  const line = mode === "prov"
    ? hours.slice(0, visible).map((hr, h) => `${h ? "L" : "M"}${X0 + h * bw} ${y(hr.cap)} H${X0 + (h + 1) * bw}`).join(" ")
    : "";

  return (
    <div className="stage">
      <div className="flex flex-wrap gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Mẫu tải", en: "Load pattern" })}>
        {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === pattern} disabled={busy && id !== pattern} onClick={() => change(() => setPattern(id))}>
            {L(PATTERNS[id].name)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Capacity mode</span>
        {MODES.map((m) => (
          <button key={m.id} className="btn" aria-pressed={m.id === mode} disabled={busy && m.id !== mode} onClick={() => change(() => setMode(m.id))}>
            {m.name}
          </button>
        ))}
        <button className="btn primary ml-auto" onClick={play} disabled={busy}>{L({ vi: "Mô phỏng một ngày", en: "Simulate one day" })}</button>
      </div>
      <p className="mx-4 mt-2.5 mb-0 text-step--1 text-muted">{L(PATTERNS[pattern].about)}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 268" role="img" aria-label={L({ vi: "Biểu đồ 24 giờ: cột là lượt đọc, đường là capacity của bảng; bên phải là tải trên bốn partition so với giới hạn 3.000 RCU", en: "24-hour chart: bars are reads, the line is the table capacity; on the right is the load on four partitions against the 3,000 RCU limit" })}>
          {[0, 3000, 6000, 9000].map((v) => (
            <g key={v}>
              <line className="dcap-grid" x1={X0} x2={X0 + W} y1={y(v)} y2={y(v)} />
              <text className="ts" x={X0 - 6} y={y(v) + 4} textAnchor="end">{v / 1000}k</text>
            </g>
          ))}
          {hours.map((hr, h) => {
            const x = X0 + h * bw + 2;
            const ghost = h >= visible;
            const cls = ghost ? " ghost" : hr.throttled ? " over" : "";
            return (
              <g key={h}>
                <rect className={"dcap-bar" + cls} x={x} y={y(hr.need)} width={bw - 4} height={y(0) - y(hr.need)} rx={2} />
                {mode === "dax" && !ghost && (
                  <rect className="dcap-bar cached" x={x} y={y(hr.need)} width={bw - 4} height={y(hr.table) - y(hr.need)} rx={2} />
                )}
              </g>
            );
          })}
          {line && <path className="dcap-cap" d={line} />}
          {visible > 0 && visible < HOURS && (
            <line className="dcap-now" x1={X0 + visible * bw} x2={X0 + visible * bw} y1={Y0 - 6} y2={y(0)} />
          )}
          {Array.from({ length: HOURS / 3 }, (_, i) => i * 3).map((h) => (
            <text key={h} className="ts" x={X0 + h * bw + bw / 2} y={y(0) + 16} textAnchor="middle">{h}h</text>
          ))}

          <text className="dcap-title" x={PX0} y={Y0 - 12}>{shown < 0 ? "Partition" : done ? L({ vi: `Partition lúc ${at}h (cao điểm)`, en: `Partitions at ${at}h (peak)` }) : L({ vi: `Partition lúc ${at}h`, en: `Partitions at ${at}h` })}</text>
          {Array.from({ length: PARTS }, (_, i) => {
            const v = shown < 0 ? 0 : part.parts[i];
            const x = PX0 + i * (PW + PGAP);
            return (
              <g key={i}>
                <rect className="dcap-slot" x={x} y={Y0} width={PW} height={H} rx={4} />
                <rect className={"dcap-part" + (v > PART_MAX ? " over" : "")} x={x} y={py(v)} width={PW} height={py(0) - py(v)} rx={4} />
                <text className="ts" x={x + PW / 2} y={y(0) + 16} textAnchor="middle">P{i + 1}</text>
              </g>
            );
          })}
          <line className="dcap-ceil" x1={PX0 - 6} x2={PX0 + PARTS * (PW + PGAP) - PGAP + 6} y1={py(PART_MAX)} y2={py(PART_MAX)} />
          <text className="dcap-ceil-t" x={PX0 + PARTS * (PW + PGAP) - PGAP} y={py(PART_MAX) - 9} textAnchor="end">{L({ vi: "giới hạn 3.000 RCU", en: "3,000 RCU limit" })}</text>

          <g transform={`translate(${X0} 258)`}>
            <rect className="dcap-bar" x={0} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={17} y={0}>{L({ vi: "lượt đọc tới bảng (RCU)", en: "reads to the table (RCU)" })}</text>
            <rect className="dcap-bar over" x={180} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={197} y={0}>{L({ vi: "bị throttle", en: "throttled" })}</text>
            {mode === "prov" && <>
              <line className="dcap-cap" x1={290} x2={310} y1={-4} y2={-4} />
              <text className="ts" x={316} y={0}>{L({ vi: "capacity đã cấp phát", en: "provisioned capacity" })}</text>
            </>}
            {mode === "dax" && <>
              <rect className="dcap-bar cached" x={290} y={-9} width={12} height={10} rx={2} />
              <text className="ts" x={307} y={0}>{L({ vi: "DAX phục vụ từ cache", en: "served by DAX cache" })}</text>
            </>}
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn mẫu tải và capacity mode, sau đó nhấn <b>Mô phỏng một ngày</b>. Mô hình đã được đơn giản hoá: Auto Scaling đặt capacity theo tải của giờ trước, với mức sử dụng mục tiêu 70%.</>, en: <>Choose a load pattern and a capacity mode, then press <b>Simulate one day</b>. The model is simplified: Auto Scaling sets capacity from the previous hour’s load, with a 70% target utilization.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{shown}h · {fmt(now.need)} RCU{mode === "dax" ? L({ vi: ` · ${fmt(now.table)} tới bảng`, en: ` · ${fmt(now.table)} to the table` }) : ""}</span>
              <span className={"pill " + (throttled ? "bad" : "ok")}><i />{L({ vi: `${throttled} giờ bị throttle`, en: `${throttled} ${throttled === 1 ? "hour" : "hours"} throttled` })}</span>
              {mode === "prov" && <span className="pill border border-line bg-bg text-muted"><i />{L({ vi: `${fmt(idle)} RCU-giờ trả phí nhưng không sử dụng`, en: `${fmt(idle)} RCU-hours paid for but unused` })}</span>}
              {mode === "od" && <span className="pill border border-line bg-bg text-muted"><i />{L({ vi: "tính phí theo từng request", en: "billed per request" })}</span>}
              {mode === "dax" && <span className="pill border border-line bg-bg text-muted"><i />{L({ vi: "DAX cluster chạy liên tục 24 giờ", en: "DAX cluster runs 24 hours a day" })}</span>}
            </div>
            {done && (
              <p className={`mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 ${fits ? "bg-ok-soft" : "bg-bad-soft"}`}>
                <b>{fits ? L({ vi: "Phù hợp với mẫu tải này. ", en: "A good fit for this load pattern. " }) : L({ vi: "Chưa phù hợp. ", en: "Not a good fit. " })}</b>{rich(L(NOTE[pattern][mode]))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
