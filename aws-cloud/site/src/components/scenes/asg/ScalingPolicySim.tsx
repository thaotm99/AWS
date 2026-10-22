import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./asg-sims.css";

// One day of ShopViet traffic, hour by hour. Bars are how many EC2 instances the load
// really needs; the line is how many the Auto Scaling group runs under the chosen
// scaling policy. Red bars are hours when customers wait. Each load pattern has a
// policy that fits it: predictive for daily cycles, scheduled for a known sale,
// SQS backlog for a queue of orders, target tracking for surprises.

type PatternId = "daily" | "sale" | "queue" | "viral";
type PolicyId = "tt" | "sqs" | "sched" | "pred";

const MIN = 2;
const MAX = 14;
const HOURS = 24;

const PATTERNS: Record<PatternId, { name: string; about: string; need: number[] }> = {
  daily: {
    name: "Ngày bình thường",
    about: "Khách vào nhiều buổi trưa và buổi tối, lặp lại mỗi ngày.",
    need: [2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 6, 7, 8, 7, 6, 6, 7, 8, 9, 9, 8, 6, 4, 3],
  },
  sale: {
    name: "Flash sale 20h",
    about: "Đã quảng cáo trước: đúng 20h mở bán, tải tăng gấp ba trong hai giờ.",
    need: [2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 5, 4, 4, 4, 4, 5, 5, 6, 12, 12, 8, 4],
  },
  queue: {
    name: "Đơn dồn vào hàng đợi",
    about: "Đối tác đẩy một loạt đơn vào SQS lúc 9h. Worker EC2 đọc hàng đợi để xử lý.",
    need: [2, 2, 2, 2, 2, 2, 2, 2, 2, 9, 10, 10, 8, 6, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2],
  },
  viral: {
    name: "Video viral bất ngờ",
    about: "14h một video review lan truyền, không ai biết trước.",
    need: [3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 5, 11, 11, 10, 7, 5, 5, 4, 4, 3, 3],
  },
};

const POLICIES: { id: PolicyId; name: string }[] = [
  { id: "tt", name: "Target tracking CPU 50%" },
  { id: "sqs", name: "Target tracking theo backlog SQS" },
  { id: "sched", name: "Scheduled action" },
  { id: "pred", name: "Predictive + target tracking" },
];

const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));
const flat = (v: number) => Array.from({ length: HOURS }, () => clamp(v));
/** What predictive scaling learned from past days: an ordinary day. */
const HISTORY = PATTERNS.daily.need;
/** Desired capacity set by a schedule: [hour, capacity] pairs. */
function schedule(points: [number, number][]) {
  const out: number[] = [];
  let cur = MIN;
  for (let h = 0; h < HOURS; h++) {
    const hit = points.find((p) => p[0] === h);
    if (hit) cur = hit[1];
    out.push(clamp(cur));
  }
  return out;
}

function capacity(p: PatternId, pol: PolicyId): number[] {
  const need = PATTERNS[p].need;
  const react = (h: number) => (h === 0 ? need[0] : need[h - 1]);
  switch (pol) {
    case "tt":
      if (p === "queue") {
        // Workers stay busy at the same CPU however long the queue gets: one instance more per hour.
        const out: number[] = [];
        for (let h = 0; h < HOURS; h++) out.push(clamp(h === 0 ? need[0] : Math.min(react(h), out[h - 1] + 1)));
        return out;
      }
      return need.map((_, h) => clamp(react(h)));
    case "sqs":
      return p === "queue" ? need.map(clamp) : flat(MIN);
    case "sched":
      if (p === "daily") return schedule([[0, 2], [7, 6], [12, 8], [17, 9], [22, 4]]);
      if (p === "sale") return schedule([[0, 2], [6, 3], [8, 4], [12, 5], [19, 12], [22, 8], [23, 4]]);
      return flat(p === "viral" ? 5 : MIN);
    case "pred":
      if (p === "queue") return capacity("queue", "tt").map((c, h) => clamp(Math.max(c, Math.min(HISTORY[h], 3))));
      return need.map((_, h) => clamp(Math.max(HISTORY[h], react(h))));
  }
}

const BEST: Record<PatternId, PolicyId[]> = { daily: ["pred"], sale: ["sched"], queue: ["sqs"], viral: ["tt", "pred"] };

const NOTE: Record<PatternId, Record<PolicyId, string>> = {
  daily: {
    tt: "Bám theo CPU nên luôn **trễ một nhịp**: tải tăng rồi mới thêm máy. Mỗi sáng có vài giờ khách phải chờ.",
    sqs: "Web không đi qua hàng đợi nào, metric backlog không đổi nên ASG đứng yên ở mức tối thiểu.",
    sched: "Lịch đặt tay chỉ đúng gần đúng. Giờ nào lệch so với lịch thì hoặc thiếu máy hoặc thừa máy.",
    pred: "**Predictive scaling** học chu kỳ của các ngày trước và thêm máy **trước** khi tải lên. Target tracking đi kèm lo phần lệch.",
  },
  sale: {
    tt: "20h tải nhảy vọt, target tracking phải đợi metric tăng rồi mới thêm máy. Giờ mở bán quan trọng nhất lại quá tải.",
    sqs: "Web không đi qua hàng đợi, metric backlog không đổi. ASG không phản ứng.",
    sched: "Biết chính xác giờ mở bán nên đặt **scheduled action** nâng desired capacity lên 12 lúc 19h, hạ xuống sau 22h. Đủ máy trước khi khách tới.",
    pred: "Lịch sử chưa có đợt sale này nên predictive không đoán được. Chỉ còn target tracking chạy theo sau.",
  },
  queue: {
    tt: "Worker đọc hàng đợi lúc nào cũng bận như nhau, CPU không phản ánh **số đơn đang chờ**. ASG thêm máy rất chậm, đơn tồn hàng giờ.",
    sqs: "Đo **số message chờ trên mỗi instance** (backlog per instance) rồi target tracking theo con số đó. Hàng đợi dài ra là thêm worker ngay.",
    sched: "Không biết trước lúc nào đối tác đẩy đơn, lịch không giúp được.",
    pred: "Chu kỳ ngày không liên quan tới lúc đối tác đẩy đơn. Phần target tracking theo CPU vẫn chậm như trước.",
  },
  viral: {
    tt: "Không ai biết trước, nhưng target tracking thấy CPU tăng và thêm máy sau một nhịp. Đợt đột biến chỉ thiếu máy trong giờ đầu tiên.",
    sqs: "Web không đi qua hàng đợi, metric backlog không đổi. ASG đứng yên.",
    sched: "Lịch không biết có video viral. Suốt đợt đột biến thiếu máy.",
    pred: "Predictive chuẩn bị cho chu kỳ quen thuộc, còn **target tracking** đi kèm bắt được phần bất ngờ. Đây là lý do nên dùng cả hai.",
  },
};

const X0 = 50;
const W = 750;
const Y0 = 34;
const H = 176;
const bw = W / HOURS;
const y = (v: number) => Y0 + H - (v / MAX) * H;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ScalingPolicySim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [pattern, setPattern] = useState<PatternId>("daily");
  const [policy, setPolicy] = useState<PolicyId>("tt");
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

  const need = PATTERNS[pattern].need;
  const cap = capacity(pattern, policy);
  const visible = shown + 1;
  const over = need.slice(0, visible).filter((n, h) => n > cap[h]).length;
  const idle = need.slice(0, visible).reduce((s, n, h) => s + Math.max(0, cap[h] - n), 0);
  const done = shown === HOURS - 1;
  const fits = BEST[pattern].includes(policy);

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
      if (layer && !fast) {
        const d = h === 0 ? 0 : cap[h] - cap[h - 1];
        const cx = X0 + h * bw + bw / 2;
        if (d) flashText(layer, cx, y(cap[h]) - 8, d > 0 ? `+${d}` : `${d}`, d > 0 ? "sps-flash up" : "sps-flash", 700);
        else if (need[h] > cap[h]) flashText(layer, cx, y(need[h]) - 8, "chờ", "sps-flash bad", 500);
      }
      if (!fast) await sleep(170);
    }
    setBusy(false);
  }

  const line = cap.slice(0, visible).map((c, h) => `${h ? "L" : "M"}${X0 + h * bw} ${y(c)} H${X0 + (h + 1) * bw}`).join(" ");

  return (
    <div className="stage sps">
      <div className="sps-row" role="group" aria-label="Kiểu tải trong ngày">
        {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === pattern} disabled={busy && id !== pattern} onClick={() => change(() => setPattern(id))}>
            {PATTERNS[id].name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Scaling policy</span>
        {POLICIES.map((p) => (
          <button key={p.id} className="btn" aria-pressed={p.id === policy} disabled={busy && p.id !== policy} onClick={() => change(() => setPolicy(p.id))}>
            {p.name}
          </button>
        ))}
        <button className="btn primary sps-play" onClick={play} disabled={busy}>Chạy một ngày</button>
      </div>
      <p className="sps-about">{PATTERNS[pattern].about}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 248" role="img" aria-label="Biểu đồ 24 giờ: cột là số instance tải cần, đường là số instance Auto Scaling group đang chạy">
          {[0, 4, 8, 12].map((v) => (
            <g key={v}>
              <line className="sps-grid" x1={X0} x2={X0 + W} y1={y(v)} y2={y(v)} />
              <text className="ts" x={X0 - 8} y={y(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          {need.map((n, h) => {
            const cls = h >= visible ? "sps-bar ghost" : n > cap[h] ? "sps-bar over" : "sps-bar";
            return <rect key={h} className={cls} x={X0 + h * bw + 3} y={y(n)} width={bw - 6} height={y(0) - y(n)} rx={3} />;
          })}
          {visible > 0 && <path className="sps-cap" d={line} />}
          {visible > 0 && visible <= HOURS && (
            <line className="sps-now" x1={X0 + visible * bw} x2={X0 + visible * bw} y1={Y0 - 6} y2={y(0)} />
          )}
          {Array.from({ length: HOURS / 3 }, (_, i) => i * 3).map((h) => (
            <text key={h} className="ts" x={X0 + h * bw + bw / 2} y={y(0) + 16} textAnchor="middle">{h}h</text>
          ))}
          <g className="sps-legend" transform={`translate(${X0} 240)`}>
            <rect className="sps-bar" x={0} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={18} y={0}>tải cần (instance)</text>
            <rect className="sps-bar over" x={150} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={168} y={0}>thiếu máy, khách chờ</text>
            <line className="sps-cap" x1={330} x2={350} y1={-4} y2={-4} />
            <text className="ts" x={356} y={0}>số instance ASG chạy</text>
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="sps-hint">Chọn kiểu tải và scaling policy, rồi bấm <b>Chạy một ngày</b>.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">Đã chạy tới {shown}h · đang có {cap[shown]} instance</span>
              <span className={"pill " + (over ? "bad" : "ok")}><i />{over} giờ thiếu máy</span>
              <span className="pill sps-idle"><i />{idle} instance-giờ để không</span>
            </div>
            {done && (
              <p className={`sps-result ${fits ? "ok" : "bad"}`}>
                <b>{fits ? "Hợp với kiểu tải này. " : "Chưa hợp. "}</b>{rich(NOTE[pattern][policy])}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
