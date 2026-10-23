import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./asg-sims.css";

// The same sudden surge, minute by minute, under three dynamic scaling policies:
// simple scaling (one fixed adjustment, then wait for the activity and the cooldown),
// step scaling (adjustment sized by the breach, keeps answering alarms, counts instances
// still warming up toward desired capacity) and target tracking (capacity in proportion
// to the metric). Simulation assumptions: a new instance is ready 2 minutes after launch,
// CPU cannot read above 100%.

type PolicyId = "simple" | "step" | "tt";

const MINUTES = 25;
const START = 4;
const MAXCAP = 20;
const READY_AFTER = 2;
const ALARM = 60;
const TARGET = 50;
/** Load in "instances at 100% CPU": 2 before the surge, 8 from minute 4. */
const load = (t: number) => (t < 4 ? 2 : 8);

interface Ev { t: number; text: Bi }
interface Run { cpu: number[]; ready: number[]; desired: number[]; events: Ev[]; cooldownUntil: number[] }

function simulate(policy: PolicyId, cooldownMin: number): Run {
  const cpu: number[] = [];
  const ready: number[] = [];
  const desired: number[] = [];
  const cooldownUntil: number[] = [];
  const events: Ev[] = [];
  const launches: { at: number; n: number }[] = [];
  let want = START;
  let busyUntil = -1; // simple scaling: the scaling activity in progress
  let coolUntil = -1; // simple scaling: end of the cooldown
  for (let t = 0; t < MINUTES; t++) {
    const r = START + launches.filter((l) => l.at + READY_AFTER <= t).reduce((s, l) => s + l.n, 0);
    const c = Math.min(100, Math.round((load(t) / r) * 100));
    ready.push(r);
    cpu.push(c);
    let next = want;
    if (policy === "simple") {
      if (c > ALARM) {
        if (t < busyUntil) {
          // waiting for the in-progress scaling activity
        } else if (t < coolUntil) {
          // waiting for the cooldown
        } else {
          next = Math.min(MAXCAP, want + 2);
          busyUntil = t + READY_AFTER;
          coolUntil = busyUntil + cooldownMin;
          events.push({ t, text: { vi: `Alarm CPU ${c}% > ${ALARM}%: thêm 2 instance (desired ${next}). Policy chờ instance khởi động xong, sau đó chờ cooldown tới phút ${coolUntil}.`, en: `Alarm CPU ${c}% > ${ALARM}%: add 2 instances (desired ${next}). The policy waits for the instances to finish launching, then for the cooldown until minute ${coolUntil}.` } });
        }
      }
    } else if (policy === "step") {
      if (c >= ALARM) {
        const adj = c >= 90 ? 6 : c >= 75 ? 4 : 2;
        const target = Math.min(MAXCAP, r + adj);
        if (target > want) {
          next = target;
          events.push({ t, text: { vi: `CPU ${c}% thuộc bước ${c >= 90 ? "≥ 90%: +6" : c >= 75 ? "75–90%: +4" : "60–75%: +2"}. Tính từ ${r} instance đang chạy: desired = ${next}.`, en: `CPU ${c}% falls in step ${c >= 90 ? "≥ 90%: +6" : c >= 75 ? "75–90%: +4" : "60–75%: +2"}. From ${r} running instances: desired = ${next}.` } });
        } else if (want > r) {
          events.push({ t, text: { vi: `Alarm vẫn vượt ngưỡng, nhưng instance đang warm up đã được tính vào desired (${want}). Không thêm instance.`, en: `The alarm is still in breach, but the instances warming up already count toward desired (${want}). No instances are added.` } });
        }
      }
    } else {
      if (c > TARGET) {
        const target = Math.min(MAXCAP, Math.ceil((r * c) / TARGET));
        if (target > want) {
          next = target;
          events.push({ t, text: { vi: `CPU trung bình ${c}%, mục tiêu ${TARGET}%: desired = ⌈${r} × ${c} ÷ ${TARGET}⌉ = ${next}.`, en: `Average CPU ${c}%, target ${TARGET}%: desired = ⌈${r} × ${c} ÷ ${TARGET}⌉ = ${next}.` } });
        }
      }
    }
    if (next > want) launches.push({ at: t, n: next - want });
    want = next;
    desired.push(want);
    cooldownUntil.push(policy === "simple" ? coolUntil : -1);
  }
  return { cpu, ready, desired, events, cooldownUntil };
}

const NOTE: Record<PolicyId, Bi> = {
  simple: {
    vi: "**Simple scaling** chỉ có một mức điều chỉnh cố định. Sau mỗi lần scale, policy phải chờ scaling activity hoàn tất **và** cooldown kết thúc mới phản hồi alarm tiếp theo, nên capacity tăng theo từng nấc chậm. AWS khuyến nghị không dùng simple scaling và cooldown; dùng target tracking hoặc step scaling.",
    en: "**Simple scaling** has a single fixed adjustment. After each scaling activity, the policy must wait for the activity to complete **and** the cooldown to end before it responds to the next alarm, so capacity climbs in slow increments. AWS recommends against simple scaling and cooldowns; use target tracking or step scaling.",
  },
  step: {
    vi: "**Step scaling** chọn mức điều chỉnh theo độ lớn của alarm breach và tiếp tục phản hồi alarm trong khi scaling activity đang diễn ra; không có cooldown. Instance đang warm up được tính vào desired capacity nên các breach cùng một bước không tạo thêm instance. Người thiết kế phải tự tạo CloudWatch alarm và tự ước lượng các bước.",
    en: "**Step scaling** picks the adjustment by the size of the alarm breach and keeps responding to alarms while a scaling activity is in progress; there is no cooldown. Instances still warming up count toward desired capacity, so breaches within the same step add nothing. The designer creates the CloudWatch alarms and estimates the steps.",
  },
  tt: {
    vi: "**Target tracking** chỉ cần metric và giá trị mục tiêu (CPU trung bình 50%). Auto Scaling tự tạo và quản lý CloudWatch alarm, tính capacity tỉ lệ với metric để đưa metric về gần mục tiêu. Đây là lựa chọn AWS khuyến nghị cho metric thay đổi tỉ lệ nghịch với số instance.",
    en: "**Target tracking** needs only a metric and a target value (average CPU 50%). Auto Scaling creates and manages the CloudWatch alarms and calculates capacity in proportion to the metric to bring it close to the target. This is what AWS recommends for metrics that change inversely with the number of instances.",
  },
};

const X0 = 46;
const W = 760;
const bw = W / MINUTES;
const CPU_Y0 = 30;
const CPU_H = 90;
const INST_Y0 = 150;
const INST_H = 100;
const yc = (v: number) => CPU_Y0 + CPU_H - (v / 100) * CPU_H;
const yi = (v: number) => INST_Y0 + INST_H - (v / MAXCAP) * INST_H;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function DynamicPolicySim() {
  const L = useLang();
  const alive = useRef(true);
  const gen = useRef(0);
  const [policy, setPolicy] = useState<PolicyId>("simple");
  const [cooldown, setCooldown] = useState(5);
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = simulate(policy, cooldown);
  const visible = shown + 1;
  const hot = run.cpu.slice(0, visible).filter((c) => c > ALARM).length;
  const done = shown === MINUTES - 1;

  function change(fn: () => void) {
    if (busy) return;
    gen.current++;
    fn();
    setShown(-1);
  }

  async function play() {
    if (busy) return;
    const my = ++gen.current;
    setBusy(true);
    try {
      setShown(-1);
      const fast = prefersReducedMotion();
      for (let t = 0; t < MINUTES; t++) {
        if (!alive.current || gen.current !== my) return;
        setShown(t);
        if (!fast) await sleep(220);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const POLICIES: { id: PolicyId; name: string }[] = [
    { id: "simple", name: "Simple scaling" },
    { id: "step", name: "Step scaling" },
    { id: "tt", name: "Target tracking 50%" },
  ];
  const readyLine = run.ready.slice(0, visible).map((v, t) => `${t ? "L" : "M"}${X0 + t * bw} ${yi(v)} H${X0 + (t + 1) * bw}`).join(" ");
  const desiredLine = run.desired.slice(0, visible).map((v, t) => `${t ? "L" : "M"}${X0 + t * bw} ${yi(v)} H${X0 + (t + 1) * bw}`).join(" ");
  const events = run.events.filter((e) => e.t <= shown);

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Policy", en: "Policy" })}</span>
        {POLICIES.map((p) => (
          <button key={p.id} className="btn" aria-pressed={p.id === policy} disabled={busy && p.id !== policy} onClick={() => change(() => setPolicy(p.id))}>{p.name}</button>
        ))}
        <button className="btn primary ml-auto" onClick={play} disabled={busy}>{L({ vi: "Chạy 25 phút", en: "Run 25 minutes" })}</button>
      </div>
      <div className="stage-bar">
        {policy === "simple" ? (
          <>
            <span className="label">Cooldown</span>
            {[5, 1].map((m) => (
              <button key={m} className="chip" aria-pressed={cooldown === m} disabled={busy && cooldown !== m} onClick={() => change(() => setCooldown(m))}>
                {m === 5 ? L({ vi: "300 giây (mặc định)", en: "300 seconds (default)" }) : L({ vi: "60 giây", en: "60 seconds" })}
              </button>
            ))}
            <span className="font-mono text-[0.78rem] text-muted">{L({ vi: `Alarm CPU > ${ALARM}% → thêm 2 instance`, en: `Alarm CPU > ${ALARM}% → add 2 instances` })}</span>
          </>
        ) : policy === "step" ? (
          <span className="font-mono text-[0.78rem] text-muted">{L({ vi: "Alarm CPU ≥ 60%: bước 60–75% +2 · 75–90% +4 · ≥ 90% +6 instance", en: "Alarm CPU ≥ 60%: step 60–75% +2 · 75–90% +4 · ≥ 90% +6 instances" })}</span>
        ) : (
          <span className="font-mono text-[0.78rem] text-muted">{L({ vi: "Metric: CPU trung bình của nhóm · giá trị mục tiêu 50%", en: "Metric: group average CPU · target value 50%" })}</span>
        )}
      </div>
      <p className="mx-4 mt-2.5 mb-0 text-step--1 text-muted">{L({ vi: "Lúc phút 4, MFTech mở bán một sản phẩm được quảng bá rộng rãi: tải tăng gấp bốn và giữ nguyên. Nhóm đang chạy 4 instance, tối đa 20. Trong mô phỏng, instance mới sẵn sàng sau 2 phút.", en: "At minute 4, MFTech opens sales of a heavily promoted product: load quadruples and stays there. The group runs 4 instances, maximum 20. In the simulation, a new instance is ready 2 minutes after launch." })}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 286" role="img" aria-label={L({ vi: "Biểu đồ 25 phút: CPU trung bình phía trên, số instance phía dưới", en: "25-minute chart: average CPU on top, number of instances below" })}>
          <text className="ts dps-axis" x={X0} y={CPU_Y0 - 10}>{L({ vi: "CPU trung bình (%)", en: "Average CPU (%)" })}</text>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line className="sps-grid" x1={X0} x2={X0 + W} y1={yc(v)} y2={yc(v)} />
              <text className="ts" x={X0 - 6} y={yc(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          <line className="dps-thr" x1={X0} x2={X0 + W} y1={yc(policy === "tt" ? TARGET : ALARM)} y2={yc(policy === "tt" ? TARGET : ALARM)} />
          <text className="ts dps-thr-t" x={X0 + W} y={yc(policy === "tt" ? TARGET : ALARM) - 4} textAnchor="end">{policy === "tt" ? L({ vi: "mục tiêu 50%", en: "target 50%" }) : L({ vi: "ngưỡng alarm 60%", en: "alarm threshold 60%" })}</text>
          {run.cpu.map((c, t) => {
            const cls = t >= visible ? "sps-bar ghost" : c > ALARM ? "sps-bar over" : "sps-bar";
            return <rect key={t} className={cls} x={X0 + t * bw + 2} y={yc(c)} width={bw - 4} height={yc(0) - yc(c)} rx={2} />;
          })}
          {run.cooldownUntil.map((u, t) => (t < visible && u > t && run.desired[t] === run.ready[t] ? <rect key={"cd" + t} className="dps-cool" x={X0 + t * bw} y={INST_Y0} width={bw} height={INST_H} /> : null))}
          <text className="ts dps-axis" x={X0} y={INST_Y0 - 8}>{L({ vi: "Số instance", en: "Instances" })}</text>
          {[0, 10, 20].map((v) => (
            <g key={v}>
              <line className="sps-grid" x1={X0} x2={X0 + W} y1={yi(v)} y2={yi(v)} />
              <text className="ts" x={X0 - 6} y={yi(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          {visible > 0 && <path className="dps-desired" d={desiredLine} />}
          {visible > 0 && <path className="sps-cap" d={readyLine} />}
          {Array.from({ length: 9 }, (_, i) => i * 3).filter((t) => t < MINUTES).map((t) => (
            <text key={t} className="ts" x={X0 + t * bw + bw / 2} y={yi(0) + 15} textAnchor="middle">{L({ vi: `${t}′`, en: `${t}′` })}</text>
          ))}
          <g transform={`translate(${X0} 280)`}>
            <line className="sps-cap" x1={0} x2={20} y1={-4} y2={-4} />
            <text className="ts" x={26} y={0}>{L({ vi: "instance sẵn sàng", en: "ready instances" })}</text>
            <line className="dps-desired" x1={170} x2={190} y1={-4} y2={-4} />
            <text className="ts" x={196} y={0}>desired capacity</text>
            {policy === "simple" && <>
              <rect className="dps-cool" x={340} y={-12} width={16} height={12} />
              <text className="ts" x={362} y={0}>{L({ vi: "đang chờ cooldown", en: "waiting for cooldown" })}</text>
            </>}
          </g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown < 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn policy, sau đó nhấn <b>Chạy 25 phút</b>. Với simple scaling, thử cả hai giá trị cooldown.</>, en: <>Choose a policy, then press <b>Run 25 minutes</b>. With simple scaling, try both cooldown values.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{L({ vi: `Phút ${shown} · ${run.ready[shown]} instance sẵn sàng · desired ${run.desired[shown]}`, en: `Minute ${shown} · ${run.ready[shown]} ready instances · desired ${run.desired[shown]}` })}</span>
              <span className={"pill " + (hot > 8 ? "bad" : "ok")}><i />{L({ vi: `${hot} phút CPU > 60%`, en: `${hot} minutes with CPU > 60%` })}</span>
            </div>
            <ol className="list-decimal mx-0 mt-2 mb-0 grid gap-1 pl-5 text-step--1 [&_.count]:mr-1">
              {events.map((e, i) => <li key={i}><span className="count">{L({ vi: `phút ${e.t}`, en: `min ${e.t}` })}</span> {L(e.text)}</li>)}
            </ol>
            {done && <p className={`mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 ${policy === "simple" ? "bg-bad-soft" : "bg-ok-soft"}`}>{rich(L(NOTE[policy]))}</p>}
          </>
        )}
      </div>
    </div>
  );
}
