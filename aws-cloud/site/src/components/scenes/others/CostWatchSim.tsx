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
    name: "Account dev không tắt instance",
    about: "Mỗi lập trình viên có một account riêng, ngân sách 300 USD/tháng. Ngày 8, một lập trình viên khởi chạy một số GPU instance để thử nghiệm rồi nghỉ phép.",
    base: (d) => (d < 7 ? 6 : 40),
    cumulative: true,
    max: 1000,
    ticks: [0, 300, 600, 900],
    limit: 300,
    limitLabel: "ngân sách 300 USD",
    badWhen: "above",
    unit: usd,
    summary: (v) => `Tổng cả tháng: ${usd(v.reduce((s, x) => s + x, 0))}`,
    tools: [
      { name: "Cost Explorer", ok: false,
        note: "Cost Explorer thể hiện rõ chi phí tăng, nhưng **chỉ khi có người truy cập để xem**. Do không ai theo dõi, sự cố chỉ được phát hiện vào cuối tháng." },
      { name: "AWS Budgets: chỉ cảnh báo", alertDay: 7, alertText: "email", ok: false,
        note: "Budgets gửi email khi chi phí **dự báo** vượt ngân sách (dữ liệu Budgets được cập nhật tối đa ba lần mỗi ngày). Tuy nhiên, người nhận đang nghỉ phép nên các instance không được tắt." },
      { name: "AWS Budgets: cảnh báo + action", alertDay: 7, alertText: "email", actDay: 12, actText: "action", after: 2, ok: true,
        note: "Ngưỡng 80% ngân sách được gắn **hai budget action** chạy tự động: một action gắn IAM policy DenyAll vào role của lập trình viên, một action nhắm vào các EC2 instance đang chạy để stop. Mỗi action thuộc một loại (IAM policy, SCP, hoặc EC2/RDS instance); nhiều action có thể cùng gắn với một ngưỡng. Chi phí ngừng tăng mà không cần giám sát thủ công." },
    ],
  },
  coverage: {
    name: "Độ phủ Savings Plans giảm",
    about: "ShopViet đã mua Compute Savings Plans. Từ ngày 10, một đội khác chạy thêm nhiều Fargate và Lambda theo giá on-demand nên tỷ lệ được giảm giá (coverage) giảm.",
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
      { name: "CloudWatch dashboard tự xây dựng", alertDay: 15, alertText: "alarm", ok: false,
        note: "Dashboard tự xây dựng đòi hỏi **viết script** thu thập số liệu coverage, tự tính toán và tự cập nhật khi có service mới, trong khi AWS Budgets có sẵn loại Savings Plans coverage budget. Cảnh báo bị trễ và tốn công sức." },
      { name: "Compute Optimizer", ok: false,
        note: "Compute Optimizer khuyến nghị **kích thước tài nguyên**. Dịch vụ này không theo dõi coverage của Savings Plans nên không có cảnh báo nào được gửi." },
      { name: "AWS Budgets: coverage budget", alertDay: 9, alertText: "email", actDay: 12, actText: "mua thêm", after: 94, ok: true,
        note: "Một **Savings Plans coverage budget** theo ngày, ngưỡng 90%. Khi coverage xuống dưới ngưỡng, Budgets gửi thông báo qua email hoặc SNS sau lần cập nhật dữ liệu kế tiếp (tối đa ba lần mỗi ngày). Đội vận hành mua thêm Savings Plans và coverage tăng trở lại. Không cần viết mã." },
    ],
  },
  rightsize: {
    name: "Chi phí cao, chưa xác định điểm cắt giảm",
    about: "Sau một năm, chi phí EC2, RDS và S3 của ShopViet cao hơn nhu cầu thực tế. Chưa xác định được tài nguyên nào đang dư thừa.",
    base: () => 100,
    cumulative: false,
    max: 120,
    ticks: [0, 40, 80, 120],
    limit: 80,
    limitLabel: "mục tiêu 80 USD/ngày",
    badWhen: "above",
    unit: usd,
    summary: (v) => `Tổng cả tháng: ${usd(v.reduce((s, x) => s + x, 0))}`,
    tools: [
      { name: "Trusted Advisor tự động gia hạn RI", ok: false,
        note: "Trusted Advisor **kiểm tra và đưa ra khuyến nghị**, không tự động gia hạn Reserved Instance hay thay đổi tài nguyên. Chi phí không thay đổi." },
      { name: "Compute Optimizer tự động mua RI", ok: false,
        note: "Compute Optimizer đề xuất **loại và kích thước** instance; dịch vụ này không lựa chọn phương thức mua hay đặt trước Reserved Instance. Chi phí không thay đổi." },
      { name: "Cost Optimization Hub + Compute Optimizer", alertDay: 2, alertText: "báo cáo", actDay: 7, actText: "−32%", after: 68, ok: true,
        note: "**Cost Optimization Hub** tổng hợp khuyến nghị của các account và Region tại một nơi: 2 EC2 không được sử dụng (idle), một số instance có kích thước quá lớn (rightsizing). **Compute Optimizer** đề xuất kích thước phù hợp. Xoá instance dư thừa và giảm kích thước instance giúp giảm chi phí." },
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
      if (layer && d === T.alertDay) flashText(layer, cx, y(vals[d]) - 10, T.alertText ?? "cảnh báo", "cws-flash alert", 1400);
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
        <button className="btn primary cws-play" onClick={play} disabled={busy}>Chạy mô phỏng một tháng</button>
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
          <p className="cws-hint">Chọn công cụ, sau đó chọn <b>Chạy mô phỏng một tháng</b>.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">Ngày {shown + 1} · {P.unit(vals[shown])}</span>
              <span className={"pill " + (T.alertDay !== undefined && shown >= T.alertDay ? "ok" : "bad")}><i />{T.alertDay !== undefined && shown >= T.alertDay ? `đã cảnh báo ngày ${T.alertDay + 1}` : "chưa có cảnh báo"}</span>
              {done && <span className="pill cws-sum"><i />{P.summary(daily)}</span>}
            </div>
            {done && (
              <p className={"cws-result " + (T.ok ? "ok" : "bad")}>
                <b>{T.ok ? "Công cụ phù hợp. " : "Chưa giải quyết được vấn đề. "}</b>{rich(T.note)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
