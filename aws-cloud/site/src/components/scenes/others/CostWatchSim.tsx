import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./cost-watch-sim.css";

// One month of a MFTech cost problem, day by day. Pick the problem, pick the tool the
// team would reach for, then play the month: the bars show what happens to the money (or
// to the Savings Plans coverage) and the flashes show when the tool warns somebody or
// acts on its own. The right tool is the one that changes the bars without anyone
// having to watch a dashboard.

type ProblemId = "dev" | "coverage" | "rightsize";

interface Tool {
  name: Bi;
  /** Day index when somebody gets told. */
  alertDay?: number;
  alertText?: Bi;
  /** Day index from which the daily value changes. */
  actDay?: number;
  actText?: Bi;
  after?: number;
  ok: boolean;
  note: Bi;
}

interface Problem {
  name: Bi;
  about: Bi;
  /** Daily value before any tool acts. */
  base: (d: number) => number;
  cumulative: boolean;
  max: number;
  ticks: number[];
  limit: number;
  limitLabel: Bi;
  /** Bars above the limit are bad, or below it. */
  badWhen: "above" | "below";
  unit: (v: number) => string;
  summary: (vals: number[]) => Bi;
  tools: Tool[];
}

const DAYS = 30;
const usd = (v: number) => `${Math.round(v).toLocaleString("en-US")} USD`;

const PROBLEMS: Record<ProblemId, Problem> = {
  dev: {
    name: { vi: "Account dev không tắt instance", en: "Dev account leaves instances running" },
    about: { vi: "Mỗi lập trình viên có một account riêng, ngân sách 300 USD/tháng. Ngày 8, một lập trình viên khởi chạy một số GPU instance để thử nghiệm rồi nghỉ phép.",
      en: "Each developer has their own account with a budget of 300 USD/month. On day 8, a developer launches some GPU instances for testing, then goes on leave." },
    base: (d) => (d < 7 ? 6 : 40),
    cumulative: true,
    max: 1000,
    ticks: [0, 300, 600, 900],
    limit: 300,
    limitLabel: { vi: "ngân sách 300 USD", en: "budget 300 USD" },
    badWhen: "above",
    unit: usd,
    summary: (v) => ({ vi: `Tổng cả tháng: ${usd(v.reduce((s, x) => s + x, 0))}`, en: `Month total: ${usd(v.reduce((s, x) => s + x, 0))}` }),
    tools: [
      { name: { vi: "Cost Explorer", en: "Cost Explorer" }, ok: false,
        note: { vi: "Cost Explorer thể hiện rõ chi phí tăng, nhưng **chỉ khi có người truy cập để xem**. Do không ai theo dõi, sự cố chỉ được phát hiện vào cuối tháng.",
          en: "Cost Explorer clearly shows the cost rising, but **only when someone opens it to look**. Because no one is watching, the problem is discovered only at the end of the month." } },
      { name: { vi: "AWS Budgets: chỉ cảnh báo", en: "AWS Budgets: alert only" }, alertDay: 7, alertText: { vi: "email", en: "email" }, ok: false,
        note: { vi: "Budgets gửi email khi chi phí **dự báo** vượt ngân sách (dữ liệu Budgets được cập nhật tối đa ba lần mỗi ngày). Tuy nhiên, người nhận đang nghỉ phép nên các instance không được tắt.",
          en: "Budgets sends an email when the **forecasted** cost exceeds the budget (Budgets data is updated up to three times a day). However, the recipient is on leave, so the instances are not stopped." } },
      { name: { vi: "AWS Budgets: cảnh báo + action", en: "AWS Budgets: alert + action" }, alertDay: 7, alertText: { vi: "email", en: "email" }, actDay: 12, actText: { vi: "action", en: "action" }, after: 2, ok: true,
        note: { vi: "Ngưỡng 80% ngân sách được gắn **hai budget action** chạy tự động: một action gắn IAM policy DenyAll vào role của lập trình viên, một action nhắm vào các EC2 instance đang chạy để stop. Mỗi action thuộc một loại (IAM policy, SCP, hoặc EC2/RDS instance); nhiều action có thể cùng gắn với một ngưỡng. Chi phí ngừng tăng mà không cần giám sát thủ công.",
          en: "The 80% budget threshold has **two budget actions** that run automatically: one applies a DenyAll IAM policy to the developer's role, and one targets the running EC2 instances to stop them. Each action is of one type (IAM policy, SCP, or EC2/RDS instance); several actions can be attached to the same threshold. The cost stops rising with no manual monitoring." } },
    ],
  },
  coverage: {
    name: { vi: "Độ phủ Savings Plans giảm", en: "Savings Plans coverage drops" },
    about: { vi: "MFTech đã mua Compute Savings Plans. Từ ngày 10, một đội khác chạy thêm nhiều Fargate và Lambda theo giá On-Demand nên tỷ lệ được giảm giá (coverage) giảm.",
      en: "MFTech has bought Compute Savings Plans. From day 10, another team runs a lot more Fargate and Lambda at On-Demand prices, so the discounted share (coverage) drops." },
    base: (d) => (d < 9 ? 95 : 74),
    cumulative: false,
    max: 100,
    ticks: [0, 50, 90, 100],
    limit: 90,
    limitLabel: { vi: "ngưỡng 90%", en: "threshold 90%" },
    badWhen: "below",
    unit: (v) => `${Math.round(v)}%`,
    summary: (v) => ({ vi: `Coverage trung bình: ${Math.round(v.reduce((s, x) => s + x, 0) / v.length)}%`, en: `Average coverage: ${Math.round(v.reduce((s, x) => s + x, 0) / v.length)}%` }),
    tools: [
      { name: { vi: "CloudWatch dashboard tự xây dựng", en: "Custom CloudWatch dashboard" }, alertDay: 15, alertText: { vi: "alarm", en: "alarm" }, ok: false,
        note: { vi: "Dashboard tự xây dựng đòi hỏi **viết script** thu thập số liệu coverage, tự tính toán và tự cập nhật khi có service mới, trong khi AWS Budgets có sẵn loại Savings Plans coverage budget. Cảnh báo bị trễ và tốn công sức.",
          en: "A custom dashboard requires **writing scripts** to collect coverage data, calculating it yourself and updating it whenever a new service appears, while AWS Budgets already offers a Savings Plans coverage budget. The alert is late and takes effort." } },
      { name: { vi: "Compute Optimizer", en: "Compute Optimizer" }, ok: false,
        note: { vi: "Compute Optimizer khuyến nghị **cấu hình tài nguyên phù hợp (rightsizing)**. Dịch vụ này không theo dõi coverage của Savings Plans nên không có cảnh báo nào được gửi.",
          en: "Compute Optimizer recommends **right-sized resource configurations (rightsizing)**. It does not track Savings Plans coverage, so no alert is sent." } },
      { name: { vi: "AWS Budgets: coverage budget", en: "AWS Budgets: coverage budget" }, alertDay: 9, alertText: { vi: "email", en: "email" }, actDay: 12, actText: { vi: "mua thêm", en: "buy more" }, after: 94, ok: true,
        note: { vi: "Một **Savings Plans coverage budget** theo ngày, ngưỡng 90%. Khi coverage xuống dưới ngưỡng, Budgets gửi thông báo qua email hoặc SNS sau lần cập nhật dữ liệu kế tiếp (tối đa ba lần mỗi ngày). Đội vận hành mua thêm Savings Plans và coverage tăng trở lại. Không cần viết mã.",
          en: "A daily **Savings Plans coverage budget** with a 90% threshold. When coverage drops below the threshold, Budgets sends a notification by email or SNS after the next data refresh (up to three times a day). The operations team buys more Savings Plans and coverage rises again. No code to write." } },
    ],
  },
  rightsize: {
    name: { vi: "Chi phí cao, chưa xác định điểm cắt giảm", en: "High cost, no idea where to cut" },
    about: { vi: "Sau một năm, chi phí EC2, RDS và S3 của MFTech cao hơn nhu cầu thực tế. Chưa xác định được tài nguyên nào đang dư thừa.",
      en: "After a year, MFTech's EC2, RDS and S3 costs are higher than actual needs. No one knows yet which resources are surplus." },
    base: () => 100,
    cumulative: false,
    max: 120,
    ticks: [0, 40, 80, 120],
    limit: 80,
    limitLabel: { vi: "mục tiêu 80 USD/ngày", en: "target 80 USD/day" },
    badWhen: "above",
    unit: usd,
    summary: (v) => ({ vi: `Tổng cả tháng: ${usd(v.reduce((s, x) => s + x, 0))}`, en: `Month total: ${usd(v.reduce((s, x) => s + x, 0))}` }),
    tools: [
      { name: { vi: "Trusted Advisor tự động gia hạn RI", en: "Trusted Advisor auto-renews RIs" }, ok: false,
        note: { vi: "Trusted Advisor **kiểm tra và đưa ra khuyến nghị**, không tự động gia hạn Reserved Instance hay thay đổi tài nguyên. Chi phí không thay đổi.",
          en: "Trusted Advisor **inspects and makes recommendations**; it does not automatically renew Reserved Instances or change resources. The cost does not change." } },
      { name: { vi: "Compute Optimizer tự động mua RI", en: "Compute Optimizer auto-buys RIs" }, ok: false,
        note: { vi: "Compute Optimizer đề xuất **instance type và instance size**; dịch vụ này không lựa chọn phương thức mua hay đặt trước Reserved Instance. Chi phí không thay đổi.",
          en: "Compute Optimizer recommends **instance types and instance sizes**; it does not choose purchase options or reserve Reserved Instances. The cost does not change." } },
      { name: { vi: "Cost Optimization Hub + Compute Optimizer", en: "Cost Optimization Hub + Compute Optimizer" }, alertDay: 2, alertText: { vi: "báo cáo", en: "report" }, actDay: 7, actText: { vi: "−32%", en: "−32%" }, after: 68, ok: true,
        note: { vi: "**Cost Optimization Hub** tổng hợp khuyến nghị của các account và Region tại một nơi: 2 EC2 không được sử dụng (idle), một số instance có kích thước quá lớn (rightsizing). **Compute Optimizer** đề xuất kích thước phù hợp. Xoá instance dư thừa và giảm kích thước instance giúp giảm chi phí.",
          en: "**Cost Optimization Hub** consolidates recommendations across accounts and Regions in one place: 2 unused (idle) EC2 instances and some oversized instances (rightsizing). **Compute Optimizer** recommends the right sizes. Deleting surplus instances and downsizing instances reduces cost." } },
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
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [pid, setPid] = useState<ProblemId>("dev");
  const [ti, setTi] = useState(0);
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);

  const P = PROBLEMS[pid];
  const T = P.tools[ti];
  const vals = series(P, T);
  const daily = series({ ...P, cumulative: false }, T);
  /** What the month looks like if nobody does anything: drawn faintly before playing. */
  const untouched = series(P, { name: { vi: "", en: "" }, ok: false, note: { vi: "", en: "" } });
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
      if (layer && d === T.alertDay) flashText(layer, cx, y(vals[d]) - 10, L(T.alertText ?? { vi: "cảnh báo", en: "alert" }), "cws-flash alert", 1400);
      if (layer && d === T.actDay) flashText(layer, cx, y(vals[d]) - 24, L(T.actText ?? { vi: "action", en: "action" }), "cws-flash act", 1400);
      if (!fast) await sleep(d === T.alertDay || d === T.actDay ? 600 : 110);
    }
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="flex flex-wrap gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Vấn đề chi phí", en: "Cost problems" })}>
        {ORDER.map((id) => (
          <button key={id} className="chip" aria-pressed={id === pid} disabled={busy && id !== pid} onClick={() => change(() => { setPid(id); setTi(0); })}>
            {L(PROBLEMS[id].name)}
          </button>
        ))}
      </div>
      <p className="mx-4 mt-2 mb-2.5 text-step--1 text-muted">{L(P.about)}</p>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Công cụ", en: "Tool" })}</span>
        {P.tools.map((t, i) => (
          <button key={i} className="btn" aria-pressed={i === ti} disabled={busy && i !== ti} onClick={() => change(() => setTi(i))}>{L(t.name)}</button>
        ))}
        <button className="btn primary ml-auto" onClick={play} disabled={busy}>{L({ vi: "Chạy mô phỏng một tháng", en: "Run one-month simulation" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 240" role="img" aria-label={L({ vi: `Biểu đồ 30 ngày: ${P.cumulative ? "chi tiêu cộng dồn" : "giá trị mỗi ngày"} so với ${P.limitLabel.vi}`, en: `30-day chart: ${P.cumulative ? "cumulative spend" : "daily value"} against ${P.limitLabel.en}` })}>
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
          <text className="cws-limit-t" x={X0 + W} y={y(P.limit) - 9} textAnchor="end">{L(P.limitLabel)}</text>
          {T.alertDay !== undefined && shown >= T.alertDay && (
            <line className="cws-mark alert" x1={X0 + T.alertDay * bw + bw / 2} x2={X0 + T.alertDay * bw + bw / 2} y1={Y0 - 6} y2={y(0)} />
          )}
          {T.actDay !== undefined && shown >= T.actDay && (
            <line className="cws-mark act" x1={X0 + T.actDay * bw + bw / 2} x2={X0 + T.actDay * bw + bw / 2} y1={Y0 - 6} y2={y(0)} />
          )}
          {[0, 9, 19, 29].map((d) => (
            <text key={d} className="ts" x={X0 + d * bw + bw / 2} y={y(0) + 16} textAnchor="middle">{L({ vi: "ngày", en: "day" })} {d + 1}</text>
          ))}
          <text className="ts" x={X0} y={14}>{P.cumulative ? L({ vi: "Cột: chi tiêu cộng dồn từ đầu tháng", en: "Bars: cumulative spend since the start of the month" }) : pid === "coverage" ? L({ vi: "Cột: coverage của Savings Plans mỗi ngày", en: "Bars: daily Savings Plans coverage" }) : L({ vi: "Cột: chi phí mỗi ngày", en: "Bars: daily cost" })}</text>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn công cụ, sau đó chọn <b>Chạy mô phỏng một tháng</b>.</>, en: <>Choose a tool, then choose <b>Run one-month simulation</b>.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{L({ vi: "Ngày", en: "Day" })} {shown + 1} · {P.unit(vals[shown])}</span>
              <span className={"pill " + (T.alertDay !== undefined && shown >= T.alertDay ? "ok" : "bad")}><i />{T.alertDay !== undefined && shown >= T.alertDay ? L({ vi: `đã cảnh báo ngày ${T.alertDay + 1}`, en: `alerted on day ${T.alertDay + 1}` }) : L({ vi: "chưa có cảnh báo", en: "no alert yet" })}</span>
              {done && <span className="pill border border-line bg-bg text-ink"><i />{L(P.summary(daily))}</span>}
            </div>
            {done && (
              <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (T.ok ? "bg-ok-soft" : "bg-bad-soft")}>
                <b>{T.ok ? L({ vi: "Công cụ phù hợp. ", en: "The right tool. " }) : L({ vi: "Chưa giải quyết được vấn đề. ", en: "The problem is not solved. " })}</b>{rich(L(T.note))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
