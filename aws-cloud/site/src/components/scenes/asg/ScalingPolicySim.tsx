import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
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

const PATTERNS: Record<PatternId, { name: Bi; about: Bi; need: number[] }> = {
  daily: {
    name: { vi: "Ngày bình thường", en: "Normal day" },
    about: { vi: "Lượng truy cập tăng vào buổi trưa và buổi tối, lặp lại hằng ngày.", en: "Traffic rises at noon and in the evening, repeating every day." },
    need: [2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 6, 7, 8, 7, 6, 6, 7, 8, 9, 9, 8, 6, 4, 3],
  },
  sale: {
    name: { vi: "Flash sale lúc 20h", en: "Flash sale at 20:00" },
    about: { vi: "Chương trình đã được thông báo trước: mở bán đúng 20h, tải tăng gấp ba trong hai giờ.", en: "The sale was announced in advance: it opens at exactly 20:00 and load triples for two hours." },
    need: [2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 5, 4, 4, 4, 4, 5, 5, 6, 12, 12, 8, 4],
  },
  queue: {
    name: { vi: "Đơn hàng dồn vào hàng đợi", en: "Orders pile up in a queue" },
    about: { vi: "Đối tác đẩy một loạt đơn hàng vào SQS lúc 9h. Worker EC2 đọc hàng đợi để xử lý.", en: "A partner pushes a batch of orders into SQS at 9:00. EC2 workers read the queue to process them." },
    need: [2, 2, 2, 2, 2, 2, 2, 2, 2, 9, 10, 10, 8, 6, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2],
  },
  viral: {
    name: { vi: "Lưu lượng đột biến không dự báo", en: "Unforecast traffic spike" },
    about: { vi: "Lúc 14h, một video review lan truyền nhanh mà không được dự báo trước.", en: "At 14:00, a review video goes viral without any warning." },
    need: [3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 5, 11, 11, 10, 7, 5, 5, 4, 4, 3, 3],
  },
};

const POLICIES: { id: PolicyId; name: string | Bi }[] = [
  { id: "tt", name: "Target tracking CPU 50%" },
  { id: "sqs", name: { vi: "Target tracking theo backlog SQS", en: "Target tracking on SQS backlog" } },
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

const NOTE: Record<PatternId, Record<PolicyId, Bi>> = {
  daily: {
    tt: { vi: "Policy phản ứng theo CPU nên luôn **trễ một chu kỳ**: tải tăng rồi mới bổ sung instance. Mỗi buổi sáng có vài giờ người dùng phải chờ.", en: "The policy reacts to CPU, so it is always **one period behind**: load rises before instances are added. Every morning there are a few hours when users wait." },
    sqs: { vi: "Request web không đi qua hàng đợi, metric backlog không thay đổi nên ASG giữ nguyên ở mức tối thiểu.", en: "Web requests do not go through a queue, so the backlog metric does not change and the ASG stays at the minimum." },
    sched: { vi: "Lịch cấu hình thủ công chỉ phản ánh gần đúng tải thực tế. Những giờ lệch so với lịch dẫn tới thiếu hoặc thừa capacity.", en: "A manually configured schedule only approximates the real load. Hours that deviate from the schedule lead to too little or too much capacity." },
    pred: { vi: "**Predictive scaling** phân tích chu kỳ của các ngày trước và bổ sung instance **trước** khi tải tăng. Target tracking đi kèm xử lý phần sai lệch.", en: "**Predictive scaling** analyzes the cycles of previous days and adds instances **before** load rises. The accompanying target tracking handles deviations." },
  },
  sale: {
    tt: { vi: "Lúc 20h tải tăng đột ngột; target tracking phải chờ metric tăng rồi mới bổ sung instance. Khung giờ mở bán quan trọng nhất lại bị quá tải.", en: "At 20:00 load jumps suddenly; target tracking must wait for the metric to rise before adding instances. The most important hours of the sale are overloaded." },
    sqs: { vi: "Request web không đi qua hàng đợi, metric backlog không thay đổi. ASG không phản ứng.", en: "Web requests do not go through a queue, so the backlog metric does not change. The ASG does not react." },
    sched: { vi: "Thời điểm mở bán đã biết chính xác, do đó cấu hình **scheduled action** nâng desired capacity lên 12 lúc 19h và hạ xuống sau 22h. Capacity sẵn sàng trước khi lượng truy cập tăng.", en: "The sale's start time is known exactly, so a **scheduled action** raises desired capacity to 12 at 19:00 and lowers it after 22:00. Capacity is ready before traffic rises." },
    pred: { vi: "Predictive scaling dự báo từ dữ liệu metric của tối đa 14 ngày trước; dữ liệu đó chưa có đợt khuyến mãi này nên không dự báo được. Chỉ còn target tracking phản ứng sau khi tải tăng.", en: "Predictive scaling forecasts from up to 14 days of past metric data; that data does not include this sale, so it cannot forecast it. Only target tracking reacts, after load rises." },
  },
  queue: {
    tt: { vi: "Trong mô phỏng này, worker đọc hàng đợi luôn bận ở cùng mức CPU nên CPU không phản ánh **số đơn hàng đang chờ**. ASG bổ sung instance rất chậm, đơn hàng tồn đọng hàng giờ.", en: "In this simulation, queue workers are always busy at the same CPU level, so CPU does not reflect **the number of orders waiting**. The ASG adds instances very slowly and orders back up for hours." },
    sqs: { vi: "Đo **số message chờ trên mỗi instance** (backlog per instance) và áp dụng target tracking theo giá trị này, như tài liệu Auto Scaling khuyến nghị. Khi hàng đợi tăng, worker được bổ sung tương ứng.", en: "Measure **the number of waiting messages per instance** (backlog per instance) and apply target tracking to that value, as the Auto Scaling documentation recommends. As the queue grows, workers are added to match." },
    sched: { vi: "Thời điểm đối tác đẩy đơn hàng không được biết trước, do đó lịch cố định không có tác dụng.", en: "When the partner pushes orders is not known in advance, so a fixed schedule does not help." },
    pred: { vi: "Chu kỳ theo ngày không liên quan tới thời điểm đối tác đẩy đơn hàng. Phần target tracking theo CPU vẫn phản ứng chậm như trước.", en: "The daily cycle has nothing to do with when the partner pushes orders. The CPU target tracking part still reacts as slowly as before." },
  },
  viral: {
    tt: { vi: "Tải không được dự báo trước, nhưng target tracking phát hiện CPU tăng và bổ sung instance sau một chu kỳ. Hệ thống chỉ thiếu capacity trong giờ đầu tiên của đợt đột biến.", en: "The load was not forecast, but target tracking detects the CPU rise and adds instances after one period. The system is short of capacity only in the first hour of the spike." },
    sqs: { vi: "Request web không đi qua hàng đợi, metric backlog không thay đổi. ASG giữ nguyên số instance.", en: "Web requests do not go through a queue, so the backlog metric does not change. The ASG keeps the same number of instances." },
    sched: { vi: "Lịch cố định không dự liệu được tải đột biến. Hệ thống thiếu capacity trong suốt đợt đột biến.", en: "A fixed schedule cannot anticipate a spike. The system is short of capacity for the whole spike." },
    pred: { vi: "Predictive scaling chuẩn bị capacity cho chu kỳ quen thuộc, còn **target tracking** đi kèm xử lý phần tải bất thường. Đây là lý do nên kết hợp cả hai.", en: "Predictive scaling prepares capacity for the familiar cycle, while the accompanying **target tracking** handles the unusual load. This is why the two should be combined." },
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
  const L = useLang();
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
        else if (need[h] > cap[h]) flashText(layer, cx, y(need[h]) - 8, L({ vi: "thiếu", en: "short" }), "sps-flash bad", 500);
      }
      if (!fast) await sleep(170);
    }
    setBusy(false);
  }

  const line = cap.slice(0, visible).map((c, h) => `${h ? "L" : "M"}${X0 + h * bw} ${y(c)} H${X0 + (h + 1) * bw}`).join(" ");

  return (
    <div className="stage sps">
      <div className="sps-row" role="group" aria-label={L({ vi: "Dạng tải trong ngày", en: "Daily load pattern" })}>
        {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === pattern} disabled={busy && id !== pattern} onClick={() => change(() => setPattern(id))}>
            {L(PATTERNS[id].name)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Scaling policy</span>
        {POLICIES.map((p) => (
          <button key={p.id} className="btn" aria-pressed={p.id === policy} disabled={busy && p.id !== policy} onClick={() => change(() => setPolicy(p.id))}>
            {typeof p.name === "string" ? p.name : L(p.name)}
          </button>
        ))}
        <button className="btn primary sps-play" onClick={play} disabled={busy}>{L({ vi: "Chạy một ngày", en: "Run one day" })}</button>
      </div>
      <p className="sps-about">{L(PATTERNS[pattern].about)}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 248" role="img" aria-label={L({ vi: "Biểu đồ 24 giờ: cột là số instance tải yêu cầu, đường là số instance Auto Scaling group đang chạy", en: "24-hour chart: bars are the instances the load needs, the line is the instances the Auto Scaling group runs" })}>
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
            <text className="ts" x={18} y={0}>{L({ vi: "nhu cầu (instance)", en: "demand (instances)" })}</text>
            <rect className="sps-bar over" x={150} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={168} y={0}>{L({ vi: "thiếu capacity", en: "capacity shortfall" })}</text>
            <line className="sps-cap" x1={330} x2={350} y1={-4} y2={-4} />
            <text className="ts" x={356} y={0}>{L({ vi: "số instance ASG đang chạy", en: "instances the ASG runs" })}</text>
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="sps-hint">{L({ vi: <>Chọn dạng tải và scaling policy, sau đó nhấn <b>Chạy một ngày</b>.</>, en: <>Pick a load pattern and a scaling policy, then press <b>Run one day</b>.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{L({ vi: `Thời điểm ${shown}h · ${cap[shown]} instance đang chạy`, en: `Time ${shown}h · ${cap[shown]} instances running` })}</span>
              <span className={"pill " + (over ? "bad" : "ok")}><i />{L({ vi: `${over} giờ thiếu capacity`, en: `${over} hours short of capacity` })}</span>
              <span className="pill sps-idle"><i />{L({ vi: `${idle} instance-giờ nhàn rỗi`, en: `${idle} idle instance-hours` })}</span>
            </div>
            {done && (
              <p className={`sps-result ${fits ? "ok" : "bad"}`}>
                <b>{fits ? L({ vi: "Phù hợp với dạng tải này. ", en: "Fits this load pattern. " }) : L({ vi: "Chưa phù hợp. ", en: "Not a good fit. " })}</b>{rich(L(NOTE[pattern][policy]))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
