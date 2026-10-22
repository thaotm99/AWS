import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./capacity-sim.css";

// One day of reads on a ShopViet DynamoDB table, hour by hour. Bars are the reads the
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

const PATTERNS: Record<PatternId, { name: string; about: string; need: number[]; hit: number; hot: number[] }> = {
  shipper: {
    name: "App shipper: đêm vắng, ngày thất thường",
    about: "Shipper chỉ làm ban ngày. Đơn đổ về theo đợt, tăng gấp mấy lần chỉ trong vài phút. Vị trí đổi liên tục nên ít khi đọc lại đúng dữ liệu cũ.",
    need: [20, 20, 20, 20, 20, 20, 300, 2600, 900, 3800, 1200, 4200, 1500, 600, 3600, 900, 4400, 5200, 1600, 700, 300, 40, 20, 20],
    hit: 0.15,
    hot: [],
  },
  steady: {
    name: "Danh mục sản phẩm: tải đều, đoán trước được",
    about: "Khách xem sản phẩm cả ngày, tăng giảm từ từ theo giờ, ngày nào cũng giống ngày nào.",
    need: [1500, 1400, 1300, 1300, 1400, 1600, 2000, 2500, 3000, 3500, 3800, 4000, 4100, 4000, 3900, 3900, 4000, 4300, 4600, 4800, 4600, 3800, 2800, 2000],
    hit: 0.6,
    hot: [],
  },
  live: {
    name: "Livestream của một shop nổi tiếng",
    about: "Từ 19h đến 22h, hàng chục nghìn người cùng mở trang của một shop. Phần lớn lượt đọc rơi vào cùng một partition key.",
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

const NOTE: Record<PatternId, Record<ModeId, string>> = {
  shipper: {
    prov: "Auto Scaling cần vài phút mới nâng capacity, đợt tăng đột ngột bị **throttle**. Ban đêm gần như không ai dùng mà vẫn trả tiền cho capacity tối thiểu.",
    od: "**On-Demand** trả theo từng request: đêm không có request thì không tốn tiền đọc ghi, ban ngày tăng vọt vẫn phục vụ ngay. Hợp tải không đoán trước, có lúc gần như bằng 0.",
    dax: "Vị trí shipper đổi liên tục, cache hiếm khi trúng. Thêm cụm DAX chạy 24/7 mà gần như không đỡ được gì.",
  },
  steady: {
    prov: "Tải đều, đoán trước được: **Provisioned + Auto Scaling** giữ capacity sát nhu cầu, giá mỗi đơn vị capacity thấp hơn trả theo request. Đây là cách rẻ nhất cho kiểu tải này.",
    od: "Chạy tốt, không throttle. Nhưng tải đều cả ngày thì trả theo từng request đắt hơn đặt trước capacity.",
    dax: "Chạy tốt, nhưng bảng không có vấn đề về tốc độ. Trả thêm tiền cụm DAX mà không cần.",
  },
  live: {
    prov: "Tổng capacity của bảng đủ, nhưng 70% lượt đọc dồn vào **một partition**, vượt trần 3.000 RCU của partition đó. Tăng RCU cho cả bảng cũng không giúp.",
    od: "On-Demand tự co giãn theo tải của cả bảng, nhưng trần **mỗi partition** vẫn còn. Partition nóng vẫn bị throttle.",
    dax: "**DAX** trả các lượt đọc lặp lại từ bộ nhớ trong vài micro giây. Chỉ phần nhỏ còn lại tới DynamoDB, partition nóng hết nóng. Ứng dụng gần như không phải sửa vì DAX dùng cùng API với DynamoDB.",
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
const fmt = (n: number) => n.toLocaleString("vi-VN");

export default function CapacitySim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [pattern, setPattern] = useState<PatternId>("shipper");
  const [mode, setMode] = useState<ModeId>("prov");
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

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
    <div className="stage dcap">
      <div className="dcap-row" role="group" aria-label="Kiểu tải">
        {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === pattern} disabled={busy && id !== pattern} onClick={() => change(() => setPattern(id))}>
            {PATTERNS[id].name}
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
        <button className="btn primary dcap-play" onClick={play} disabled={busy}>Chạy một ngày</button>
      </div>
      <p className="dcap-about">{PATTERNS[pattern].about}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 268" role="img" aria-label="Biểu đồ 24 giờ: cột là lượt đọc, đường là capacity của bảng; bên phải là tải trên bốn partition so với trần 3.000 RCU">
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

          <text className="dcap-title" x={PX0} y={Y0 - 12}>{shown < 0 ? "Partition" : done ? `Partition lúc ${at}h (đỉnh)` : `Partition lúc ${at}h`}</text>
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
          <text className="dcap-ceil-t" x={PX0 + PARTS * (PW + PGAP) - PGAP} y={py(PART_MAX) - 6} textAnchor="end">trần 3.000 RCU</text>

          <g transform={`translate(${X0} 258)`}>
            <rect className="dcap-bar" x={0} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={17} y={0}>lượt đọc tới bảng (RCU)</text>
            <rect className="dcap-bar over" x={180} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={197} y={0}>bị throttle</text>
            {mode === "prov" && <>
              <line className="dcap-cap" x1={290} x2={310} y1={-4} y2={-4} />
              <text className="ts" x={316} y={0}>capacity đã đặt</text>
            </>}
            {mode === "dax" && <>
              <rect className="dcap-bar cached" x={290} y={-9} width={12} height={10} rx={2} />
              <text className="ts" x={307} y={0}>DAX trả từ cache</text>
            </>}
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="dcap-hint">Chọn kiểu tải và capacity mode, rồi bấm <b>Chạy một ngày</b>. Mô hình đơn giản hoá: Auto Scaling đặt capacity theo tải giờ trước, nhắm 70%.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{shown}h · {fmt(now.need)} RCU{mode === "dax" ? ` · ${fmt(now.table)} tới bảng` : ""}</span>
              <span className={"pill " + (throttled ? "bad" : "ok")}><i />{throttled} giờ bị throttle</span>
              {mode === "prov" && <span className="pill dcap-muted"><i />{fmt(idle)} RCU-giờ trả mà không dùng</span>}
              {mode === "od" && <span className="pill dcap-muted"><i />trả theo từng request</span>}
              {mode === "dax" && <span className="pill dcap-muted"><i />cụm DAX chạy suốt 24 giờ</span>}
            </div>
            {done && (
              <p className={`dcap-result ${fits ? "ok" : "bad"}`}>
                <b>{fits ? "Hợp với kiểu tải này. " : "Chưa hợp. "}</b>{rich(NOTE[pattern][mode])}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
