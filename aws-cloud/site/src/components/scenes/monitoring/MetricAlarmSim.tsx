import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./monitoring-sims.css";

// Thirty minutes of one ShopViet metric, minute by minute. The faint line is what
// really happened; the dots are the datapoints CloudWatch receives (every minute, or
// every 5 minutes with EC2 basic monitoring). The alarm fires when 2 datapoints in a
// row are above the threshold, then runs its action. Scaling actions bring the metric
// back down a few minutes later; a notification only tells the team.

type ScenarioId = "ec2" | "lambda" | "ecs";

interface Scenario {
  name: Bi;
  about: Bi;
  metric: Bi;
  unit: string;
  max: number;
  threshold: number;
  /** Raw value of each minute when nothing is done. */
  base: number[];
  /** Raw value once the action has had time to work (null: the action changes nothing). */
  after: ((m: number) => number) | null;
  /** Minutes between the alarm and the action taking effect. */
  lag: number;
  action: Bi;
  flash: string;
  /** Only EC2 has a choice between basic (5 min) and detailed (1 min) monitoring. */
  canBasic: boolean;
  note: (fired: number | null, detailed: boolean) => Bi;
}

const MINUTES = 30;

const ramp = (pts: [number, number][]) => {
  const out: number[] = [];
  for (let m = 0; m < MINUTES; m++) {
    let i = 0;
    while (i < pts.length - 2 && m >= pts[i + 1][0]) i++;
    const [m0, v0] = pts[i];
    const [m1, v1] = pts[i + 1];
    const f = m1 === m0 ? 1 : Math.min(1, Math.max(0, (m - m0) / (m1 - m0)));
    out.push(Math.round(v0 + (v1 - v0) * f + ((m * 37) % 7) - 3));
  }
  return out;
};

const SCENARIOS: Record<ScenarioId, Scenario> = {
  ec2: {
    name: { vi: "Livestream bán hàng", en: "Sales livestream" },
    about: { vi: "Tại phút thứ 10, phiên livestream của ShopViet bắt đầu. CPU của nhóm web tăng đột biến trong khoảng 10 phút rồi giảm.",
      en: "At minute 10, ShopViet's livestream starts. The web group's CPU spikes for about 10 minutes, then drops." },
    metric: { vi: "CPUUtilization (EC2, trung bình nhóm web)", en: "CPUUtilization (EC2, web group average)" },
    unit: "%",
    max: 100,
    threshold: 70,
    base: ramp([[0, 38], [8, 42], [10, 90], [19, 92], [21, 45], [29, 40]]),
    after: (m) => Math.min(58, 38 + ((m * 13) % 9)),
    lag: 3,
    action: { vi: "Auto Scaling group thêm 2 instance", en: "Auto Scaling group adds 2 instances" },
    flash: "ALARM → scale out",
    canBasic: true,
    note: (fired, detailed) =>
      detailed
        ? { vi: `Do có datapoint mỗi phút, alarm chuyển sang trạng thái ALARM tại phút ${fired}, chỉ 2 phút sau khi tải tăng. Instance mới được bổ sung kịp thời và CPU giảm. **Detailed monitoring** của EC2 gửi metric mỗi 1 phút thay vì 5 phút.`,
          en: `With a datapoint every minute, the alarm goes into the ALARM state at minute ${fired}, only 2 minutes after the load rises. New instances are added in time and CPU drops. EC2 **detailed monitoring** sends metrics every 1 minute instead of 5 minutes.` }
        : fired === null
          ? { vi: "Mỗi 5 phút mới có một datapoint là giá trị trung bình, do đó đợt tăng tải bị làm phẳng. Livestream đã kết thúc trước khi alarm chuyển sang trạng thái ALARM.",
            en: "There is only one datapoint every 5 minutes, an average, so the load spike is flattened. The livestream is over before the alarm goes into the ALARM state." }
          : { vi: `Theo mặc định, EC2 chỉ gửi metric **mỗi 5 phút**. Alarm phải chờ 2 datapoint chu kỳ 5 phút nên tới phút ${fired} mới chuyển sang ALARM, khi đợt cao điểm gần kết thúc. Cần bật **detailed monitoring** để có dữ liệu theo chu kỳ 1 phút.`,
            en: `By default, EC2 sends metrics only **every 5 minutes**. The alarm must wait for 2 datapoints with a 5-minute period, so it only goes into ALARM at minute ${fired}, when the peak is almost over. Enable **detailed monitoring** to get data at a 1-minute period.` },
  },
  lambda: {
    name: { vi: "Lambda bị gọi với tần suất bất thường", en: "Lambda invoked at an unusual rate" },
    about: { vi: "Một lỗi khiến function xử lý ảnh ghi vào bảng DynamoDB có stream kích hoạt lại chính function đó. Lambda recursive loop detection không phát hiện vòng lặp có DynamoDB; số lần thực thi đồng thời tăng dần tới giới hạn của account.",
      en: "A bug makes the image-processing function write to a DynamoDB table whose stream invokes that same function again. Lambda recursive loop detection does not detect loops that involve DynamoDB; concurrent executions keep rising toward the account limit." },
    metric: { vi: "ConcurrentExecutions (Lambda)", en: "ConcurrentExecutions (Lambda)" },
    unit: "",
    max: 1000,
    threshold: 600,
    base: ramp([[0, 60], [6, 80], [12, 400], [18, 760], [24, 960], [29, 990]]).map((v) => Math.min(1000, Math.max(0, v))),
    after: null,
    lag: 0,
    action: { vi: "SNS gửi email và SMS tới đội trực", en: "SNS sends email and SMS to the on-call team" },
    flash: "ALARM → SNS",
    canBasic: false,
    note: (fired) => ({
      vi: `Vòng lặp ngoài ý muốn có thể làm Lambda scale và dùng hết concurrency của account, đồng thời phát sinh chi phí. Tài liệu Lambda khuyến nghị alarm báo khi concurrency hoặc số lần gọi tăng đột biến. Alarm trên **ConcurrentExecutions** (hoặc **Invocations**) chuyển sang ALARM tại phút ${fired ?? "?"} và gửi thông báo qua **SNS**. Alarm chỉ thông báo, không tự khắc phục: đội trực cần vô hiệu hoá trigger hoặc đặt reserved concurrency.`,
      en: `An unintended loop can make Lambda scale and use up the account's concurrency, while also incurring cost. The Lambda documentation recommends an alarm that fires when concurrency or invocations spike. The alarm on **ConcurrentExecutions** (or **Invocations**) goes into ALARM at minute ${fired ?? "?"} and sends a notification through **SNS**. The alarm only notifies; it does not fix anything: the on-call team must disable the trigger or set reserved concurrency.`,
    }),
  },
  ecs: {
    name: { vi: "ECS service quá tải", en: "Overloaded ECS service" },
    about: { vi: "Service đặt hàng chạy trên ECS phía sau một ALB. Vào buổi trưa, lưu lượng người dùng tăng và thời gian phản hồi của các task bắt đầu tăng.",
      en: "The ordering service runs on ECS behind an ALB. At noon, user traffic grows and the tasks' response time starts to rise." },
    metric: { vi: "CPUUtilization (ECS service order-api)", en: "CPUUtilization (ECS service order-api)" },
    unit: "%",
    max: 100,
    threshold: 75,
    base: ramp([[0, 45], [9, 50], [13, 88], [29, 92]]),
    after: (m) => Math.min(62, 50 + ((m * 11) % 9)),
    lag: 2,
    action: { vi: "Service Auto Scaling tăng desired count thêm 2 task", en: "Service Auto Scaling raises the desired count by 2 tasks" },
    flash: "ALARM → +2 task",
    canBasic: false,
    note: (fired) => ({
      vi: `Metric phù hợp là **CPU của chính ECS service** (namespace AWS/ECS, theo ClusterName và ServiceName). Alarm chuyển sang ALARM tại phút ${fired ?? "?"}, **Service Auto Scaling** bổ sung task, CPU trung bình giảm. Metric của ALB phản ánh request và thời gian phản hồi, không phản ánh CPU của task.`,
      en: `The right metric is **the CPU of the ECS service itself** (namespace AWS/ECS, by ClusterName and ServiceName). The alarm goes into ALARM at minute ${fired ?? "?"}, **Service Auto Scaling** adds tasks, and average CPU drops. ALB metrics reflect requests and response time, not task CPU.`,
    }),
  },
};

interface Run {
  raw: number[];
  points: { m: number; v: number }[];
  fired: number | null;
}

function simulate(sc: Scenario, detailed: boolean): Run {
  const period = detailed || !sc.canBasic ? 1 : 5;
  const raw: number[] = [];
  const points: { m: number; v: number }[] = [];
  let fired: number | null = null;
  for (let m = 0; m < MINUTES; m++) {
    raw.push(fired !== null && sc.after && m >= fired + sc.lag ? Math.min(sc.base[m], sc.after(m)) : sc.base[m]);
    if (m % period === period - 1) {
      const slice = raw.slice(m - period + 1, m + 1);
      points.push({ m, v: Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) });
      const last = points.slice(-2);
      if (fired === null && last.length === 2 && last.every((p) => p.v > sc.threshold)) fired = m;
    }
  }
  return { raw, points, fired };
}

const X0 = 54;
const W = 740;
const Y0 = 24;
const H = 170;
const step = W / (MINUTES - 1);
const px = (m: number) => X0 + m * step;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function MetricAlarmSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [id, setId] = useState<ScenarioId>("ec2");
  const [detailed, setDetailed] = useState(false);
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

  const sc = SCENARIOS[id];
  const run = simulate(sc, detailed);
  const py = (v: number) => Y0 + H - (v / sc.max) * H;
  const firedShown = run.fired !== null && run.fired <= shown;
  const lastPts = run.points.filter((p) => p.m <= shown).slice(-2);
  const backToOk = firedShown && lastPts.length > 0 && lastPts[lastPts.length - 1].v <= sc.threshold;
  const done = shown === MINUTES - 1;
  const ok = sc.canBasic ? detailed : true;

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
    for (let m = 0; m < MINUTES; m++) {
      if (!alive.current) return;
      setShown(m);
      const layer = fx.current;
      if (layer && m === run.fired) {
        flashText(layer, px(m), py(run.points.find((p) => p.m === m)?.v ?? sc.threshold) - 14, sc.flash, "mas-flash", 1600);
        if (!fast) await sleep(700);
      }
      if (!fast) await sleep(120);
    }
    setBusy(false);
  }

  const rawLine = run.raw.slice(0, shown + 1).map((v, m) => `${m ? "L" : "M"}${px(m)} ${py(v)}`).join(" ");
  const pts = run.points.filter((p) => p.m <= shown);
  const ticks = sc.max === 100 ? [0, 25, 50, 75, 100] : [0, 250, 500, 750, 1000];

  return (
    <div className="stage mas">
      <div className="mas-row" role="group" aria-label={L({ vi: "Tình huống", en: "Scenarios" })}>
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((k) => (
          <button key={k} className="chip" aria-pressed={k === id} disabled={busy && k !== id} onClick={() => change(() => setId(k))}>
            {L(SCENARIOS[k].name)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="mas-metric">{L(sc.metric)} &gt; {sc.threshold}{sc.unit} {L({ vi: "trong 2 datapoint liên tiếp", en: "for 2 consecutive datapoints" })}</code>
        {sc.canBasic && (
          <label className="mas-toggle">
            <input type="checkbox" checked={detailed} disabled={busy} onChange={(e) => change(() => setDetailed(e.target.checked))} />
            {L({ vi: "Detailed monitoring (1 phút)", en: "Detailed monitoring (1 minute)" })}
          </label>
        )}
        <button className="btn primary mas-play" onClick={play} disabled={busy}>{L({ vi: "Chạy mô phỏng 30 phút", en: "Run 30-minute simulation" })}</button>
      </div>
      <p className="mas-about">{L(sc.about)}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 250" role="img" aria-label={L({ vi: `Biểu đồ ${sc.metric.vi} trong 30 phút, có đường ngưỡng của alarm`, en: `Chart of ${sc.metric.en} over 30 minutes, with the alarm threshold line` })}>
          {ticks.map((v) => (
            <g key={v}>
              <line className="mas-grid" x1={X0} x2={X0 + W} y1={py(v)} y2={py(v)} />
              <text className="ts" x={X0 - 8} y={py(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          <rect className="mas-zone" x={X0} y={Y0} width={W} height={py(sc.threshold) - Y0} />
          <line className="mas-threshold" x1={X0} x2={X0 + W} y1={py(sc.threshold)} y2={py(sc.threshold)} />
          <text className="mas-th-label" x={X0 + W - 4} y={py(sc.threshold) - 6} textAnchor="end">{L({ vi: "ngưỡng alarm", en: "alarm threshold" })} {sc.threshold}{sc.unit}</text>
          {[0, 5, 10, 15, 20, 25].map((m) => (
            <text key={m} className="ts" x={px(m)} y={Y0 + H + 18} textAnchor="middle">{L({ vi: "phút", en: "min" })} {m}</text>
          ))}
          {shown >= 0 && <path className="mas-raw" d={rawLine} />}
          {pts.map((p, i) => (
            <g key={p.m}>
              {i > 0 && <line className="mas-seg" x1={px(pts[i - 1].m)} y1={py(pts[i - 1].v)} x2={px(p.m)} y2={py(p.v)} />}
              <circle className={"mas-pt" + (p.v > sc.threshold ? " over" : "")} cx={px(p.m)} cy={py(p.v)} r={4.5} />
            </g>
          ))}
          {firedShown && run.fired !== null && (
            <line className="mas-fire" x1={px(run.fired)} x2={px(run.fired)} y1={Y0} y2={Y0 + H} />
          )}
          {shown >= 0 && shown < MINUTES - 1 && <line className="mas-now" x1={px(shown)} x2={px(shown)} y1={Y0} y2={Y0 + H} />}
          <g className="mas-legend" transform={`translate(${X0} 240)`}>
            <line className="mas-raw" x1={0} x2={20} y1={-4} y2={-4} />
            <text className="ts" x={26} y={0}>{L({ vi: "giá trị thực tế", en: "actual value" })}</text>
            <circle className="mas-pt" cx={130} cy={-4} r={4.5} />
            <text className="ts" x={140} y={0}>{L({ vi: "datapoint CloudWatch nhận được", en: "CloudWatch datapoints" })}</text>
            <line className="mas-threshold" x1={330} x2={350} y1={-4} y2={-4} />
            <text className="ts" x={356} y={0}>{L({ vi: "ngưỡng", en: "threshold" })}</text>
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="mas-hint">{L({ vi: <>Chọn tình huống, sau đó chọn <b>Chạy mô phỏng 30 phút</b>.{sc.canBasic ? " Chạy một lần khi tắt detailed monitoring và một lần khi bật để so sánh." : ""}</>, en: <>Choose a scenario, then choose <b>Run 30-minute simulation</b>.{sc.canBasic ? " Run it once with detailed monitoring off and once with it on to compare." : ""}</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{L({ vi: "Phút", en: "Minute" })} {shown} · {pts.length} {L({ vi: "datapoint", en: "datapoints" })}</span>
              <span className={"pill " + (firedShown && !backToOk ? "bad" : "ok")}><i />{!firedShown ? "OK" : backToOk ? L({ vi: `OK trở lại (ALARM ở phút ${run.fired})`, en: `OK again (ALARM at minute ${run.fired})` }) : L({ vi: `ALARM từ phút ${run.fired}`, en: `ALARM since minute ${run.fired}` })}</span>
              {firedShown && <span className="mas-action">Action: {L(sc.action)}</span>}
            </div>
            {done && <p className={`mas-result ${ok ? "ok" : "bad"}`}>{rich(L(sc.note(run.fired, detailed)))}</p>}
          </>
        )}
      </div>
    </div>
  );
}
