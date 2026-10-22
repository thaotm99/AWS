import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./cost-watch-sim.css";

// One month of a ShopViet cost problem, day by day. Pick the problem, pick the tool the
// team would reach for, then play the month: the bars show what happens to the money (or
// to the Savings Plans coverage) and the flashes show when the tool warns somebody or
// acts on its own. The right tool is the one that changes the bars without anyone
// having to watch a dashboard.

type ProblemId = "dev" | "coverage" | "rightsize";

interface Tool {
  name: string;
  /** Day index when somebody gets told. */
  alertDay?: number;
  alertText?: string;
  /** Day index from which the daily value changes. */
  actDay?: number;
  actText?: string;
  after?: number;
  ok: boolean;
  note: string;
}

interface Problem {
  name: string;
  about: string;
  /** Daily value before any tool acts. */
  base: (d: number) => number;
  cumulative: boolean;
  max: number;
  ticks: number[];
  limit: number;
  limitLabel: string;
  /** Bars above the limit are bad, or below it. */
  badWhen: "above" | "below";
  unit: (v: number) => string;
  summary: (vals: number[]) => string;
  tools: Tool[];
}

const DAYS = 30;
const usd = (v: number) => `${Math.round(v).toLocaleString("en-US")} USD`;

const PROBLEMS: Record<ProblemId, Problem> = {
  dev: {
    name: "Tài khoản dev quên tắt máy",
    about: "Mỗi lập trình viên có một tài khoản riêng, ngân sách 300 USD/tháng. Ngày 8, một bạn bật mấy máy GPU để thử rồi đi nghỉ phép.",
    base: (d) => (d < 7 ? 6 : 40),
    cumulative: true,
    max: 1000,
    ticks: [0, 300, 600, 900],
    limit: 300,
    limitLabel: "ngân sách 300 USD",
    badWhen: "above",
    unit: usd,
    summary: (v) => `Cả tháng: ${usd(v.reduce((s, x) => s + x, 0))}`,
    tools: [
      { name: "Cost Explorer", ok: false,
        note: "Cost Explorer vẽ rất rõ chi phí tăng, nhưng **chỉ khi có người mở ra xem**. Không ai xem nên cuối tháng mới biết." },
      { name: "AWS Budgets: chỉ cảnh báo", alertDay: 7, alertText: "email", ok: false,
        note: "Budgets gửi email ngay khi **dự báo** vượt ngân sách. Nhưng người nhận đang nghỉ phép, không ai tắt máy." },
      { name: "AWS Budgets: cảnh báo + action", alertDay: 7, alertText: "email", actDay: 12, actText: "action", after: 2, ok: true,
        note: "Khi chi tiêu chạm 80% ngân sách, **Budgets action** tự gắn IAM policy DenyAll vào role của lập trình viên và stop các EC2 đang chạy. Chi phí dừng lại mà không ai phải trực." },
    ],
  },
  coverage: {
    name: "Độ phủ Savings Plans tụt",
    about: "ShopViet đã mua Compute Savings Plans. Từ ngày 10, đội khác chạy thêm nhiều Fargate và Lambda theo giá on-demand nên phần được giảm giá (coverage) tụt.",
    base: (d) => (d < 9 ? 95 : 74),
    cumulative: false,
    max: 100,
    ticks: [0, 50, 90, 100],
    limit: 90,
    limitLabel: "ngưỡng 90%",
    badWhen: "below",
    unit: (v) => `${Math.round(v)}%`,
    summary: (v) => `Coverage trung bình: ${Math.round(v.reduce((s, x) => s + x, 0) / v.length)}%`,
    tools: [
      { name: "CloudWatch dashboard tự tính", alertDay: 15, alertText: "alarm", ok: false,
        note: "CloudWatch không có sẵn metric coverage của Savings Plans. Phải **viết script** lấy số liệu, tự tính bằng metric math, rồi tự sửa khi có service mới. Báo trễ và tốn công." },
      { name: "Compute Optimizer", ok: false,
        note: "Compute Optimizer khuyến nghị **kích cỡ tài nguyên**. Nó không theo dõi coverage của Savings Plans nên không ai được báo." },
      { name: "AWS Budgets: coverage budget", alertDay: 9, alertText: "email", actDay: 12, actText: "mua thêm", after: 94, ok: true,
        note: "Một **Savings Plans coverage budget** theo ngày, ngưỡng 90%. Ngay ngày đầu tụt, Budgets gửi email/SNS. Đội vận hành mua thêm Savings Plans, coverage lên lại. Không phải viết dòng code nào." },
    ],
  },
  rightsize: {
    name: "Hoá đơn cao, không biết cắt chỗ nào",
    about: "Sau một năm, hoá đơn EC2, RDS và S3 của ShopViet cao hơn nhu cầu thật. Không ai biết máy nào đang thừa.",
    base: () => 100,
    cumulative: false,
    max: 120,
    ticks: [0, 40, 80, 120],
    limit: 80,
    limitLabel: "mục tiêu 80 USD/ngày",
    badWhen: "above",
    unit: usd,
    summary: (v) => `Cả tháng: ${usd(v.reduce((s, x) => s + x, 0))}`,
    tools: [
      { name: "Trusted Advisor tự gia hạn RI", ok: false,
        note: "Trusted Advisor **kiểm tra và khuyến nghị**, nó không tự gia hạn Reserved Instance hay sửa gì. Hoá đơn giữ nguyên." },
      { name: "Compute Optimizer mua RI giúp", ok: false,
        note: "Compute Optimizer gợi ý **loại và kích cỡ** instance. Nó không chọn cách mua hay đặt chỗ Reserved Instance. Hoá đơn giữ nguyên." },
      { name: "Cost Optimization Hub + Compute Optimizer", alertDay: 2, alertText: "báo cáo", actDay: 7, actText: "−32%", after: 68, ok: true,
        note: "**Cost Optimization Hub** gom khuyến nghị của mọi tài khoản và Region vào một chỗ: 2 EC2 không ai dùng, vài máy quá lớn. **Compute Optimizer** chỉ ra kích cỡ vừa đủ. Xoá máy thừa, đổi máy nhỏ hơn, hoá đơn giảm." },
    ],
  },
};
const ORDER: ProblemId[] = ["dev", "coverage", "rightsize"];

const X0 = 64;
const W = 736;
const Y0 = 30;
const H = 176;
const bw = W / DAYS;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function series(p: Problem, t: Tool): number[] {
  const daily = Array.from({ length: DAYS }, (_, d) => (t.actDay !== undefined && t.after !== undefined && d >= t.actDay ? t.after : p.base(d)));
  if (!p.cumulative) return daily;
  let s = 0;
  return daily.map((v) => (s += v));
}

export default function CostWatchSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [pid, setPid] = useState<ProblemId>("dev");
  const [ti, setTi] = useState(0);
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);

  const P = PROBLEMS[pid];
  const T = P.tools[ti];
  const vals = series(P, T);
  const daily = series({ ...P, cumulative: false }, T);
  /** What the month looks like if nobody does anything: drawn faintly before playing. */
  const untouched = series(P, { name: "", ok: false, note: "" });
  const y = (v: number) => Y0 + H - (Math.min(v, P.max) / P.max) * H;
  const bad = (v: number) => (P.badWhen === "above" ? v > P.limit : v < P.limit);
  const done = shown === DAYS - 1;

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
    for (let d = 0; d < DAYS; d++) {
      if (!alive.current) return;
      setShown(d);
      const layer = fx.current;
      const cx = X0 + d * bw + bw / 2;
      if (layer && d === T.alertDay) flashText(layer, cx, y(vals[d]) - 10, T.alertText ?? "báo", "cws-flash alert", 1400);
      if (layer && d === T.actDay) flashText(layer, cx, y(vals[d]) - 24, T.actText ?? "action", "cws-flash act", 1400);
      if (!fast) await sleep(d === T.alertDay || d === T.actDay ? 600 : 110);
    }
    setBusy(false);
  }

  return (
    <div className="stage cws">
      <div className="cws-row" role="group" aria-label="Vấn đề chi phí">
        {ORDER.map((id) => (
          <button key={id} className="chip" aria-pressed={id === pid} disabled={busy && id !== pid} onClick={() => change(() => { setPid(id); setTi(0); })}>
            {PROBLEMS[id].name}
          </button>
        ))}
      </div>
      <p className="cws-about">{P.about}</p>
      <div className="stage-bar">
        <span className="label">Công cụ</span>
        {P.tools.map((t, i) => (
          <button key={t.name} className="btn" aria-pressed={i === ti} disabled={busy && i !== ti} onClick={() => change(() => setTi(i))}>{t.name}</button>
        ))}
        <button className="btn primary cws-play" onClick={play} disabled={busy}>Chạy một tháng</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 240" role="img" aria-label={`Biểu đồ 30 ngày: ${P.cumulative ? "chi tiêu cộng dồn" : "giá trị mỗi ngày"} so với ${P.limitLabel}`}>
          {P.ticks.map((v) => (
            <g key={v}>
              <line className="cws-grid" x1={X0} x2={X0 + W} y1={y(v)} y2={y(v)} />
              <text className="ts" x={X0 - 8} y={y(v) + 4} textAnchor="end">{P.unit === usd ? v : `${v}%`}</text>
            </g>
          ))}
          {vals.map((v, d) => {
            const cls = d > shown ? "cws-bar ghost" : bad(v) ? "cws-bar bad" : "cws-bar";
            const top = y(d > shown ? untouched[d] : v);
            return <rect key={d} className={cls} x={X0 + d * bw + 2} y={top} width={bw - 4} height={y(0) - top} rx={2} />;
          })}
          <line className="cws-limit" x1={X0} x2={X0 + W} y1={y(P.limit)} y2={y(P.limit)} />
          <text className="cws-limit-t" x={X0 + W} y={y(P.limit) - 6} textAnchor="end">{P.limitLabel}</text>
          {T.alertDay !== undefined && shown >= T.alertDay && (
            <line className="cws-mark alert" x1={X0 + T.alertDay * bw + bw / 2} x2={X0 + T.alertDay * bw + bw / 2} y1={Y0 - 6} y2={y(0)} />
          )}
          {T.actDay !== undefined && shown >= T.actDay && (
            <line className="cws-mark act" x1={X0 + T.actDay * bw + bw / 2} x2={X0 + T.actDay * bw + bw / 2} y1={Y0 - 6} y2={y(0)} />
          )}
          {[0, 9, 19, 29].map((d) => (
            <text key={d} className="ts" x={X0 + d * bw + bw / 2} y={y(0) + 16} textAnchor="middle">ngày {d + 1}</text>
          ))}
          <text className="ts" x={X0} y={14}>{P.cumulative ? "Cột: chi tiêu cộng dồn từ đầu tháng" : pid === "coverage" ? "Cột: coverage của Savings Plans mỗi ngày" : "Cột: chi phí mỗi ngày"}</text>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="cws-hint">Chọn công cụ rồi bấm <b>Chạy một tháng</b>.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">Ngày {shown + 1} · {P.unit(vals[shown])}</span>
              <span className={"pill " + (T.alertDay !== undefined && shown >= T.alertDay ? "ok" : "bad")}><i />{T.alertDay !== undefined && shown >= T.alertDay ? `đã báo ngày ${T.alertDay + 1}` : "chưa ai được báo"}</span>
              {done && <span className="pill cws-sum"><i />{P.summary(daily)}</span>}
            </div>
            {done && (
              <p className={"cws-result " + (T.ok ? "ok" : "bad")}>
                <b>{T.ok ? "Đúng công cụ. " : "Chưa giải quyết được. "}</b>{rich(T.note)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
