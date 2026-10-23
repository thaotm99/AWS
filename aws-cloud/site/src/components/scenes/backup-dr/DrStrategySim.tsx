import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./dr-strategy-sim.css";

// MFTECH runs in Singapore and keeps a disaster recovery copy in Tokyo. Pick how much
// the business can lose (a target), pick one of the four DR strategies, then take
// Singapore down. The Tokyo side comes up step by step while a clock runs; the timeline
// below shows the data lost before the outage (RPO) and the downtime after it (RTO)
// against the target, and the meter shows what keeping Tokyo ready costs each month.

type StratId = "br" | "pilot" | "warm" | "multi";
type TargetId = "blog" | "daily" | "sale" | "pay";
type NodeState = "run" | "idle" | "none" | "down" | "work";
type DrNode = "ami" | "web" | "db";

interface Step { at: DrNode | "r53"; min: number; msg: Bi; l2?: Bi }

interface Strategy {
  name: string;
  about: Bi;
  /** Extra monthly cost of keeping Tokyo ready (illustrative). */
  cost: number;
  /** Data lost, in minutes. */
  rpo: number;
  rest(ami: boolean): Record<DrNode, { state: NodeState; l2: Bi }>;
  steps(ami: boolean): Step[];
  /** Whether the AMI switch matters for this strategy. */
  usesAmi: boolean;
}

const COPIED: Bi = { vi: "đã copy", en: "copied" };
const NOT_COPIED: Bi = { vi: "chưa copy", en: "not copied" };
const REPLICA: Bi = { vi: "replica, đang chạy", en: "replica, running" };
const NEW_PRIMARY: Bi = { vi: "primary mới", en: "new primary" };
const FOUR: Bi = { vi: "4 instance", en: "4 instances" };
const PROMOTE: Bi = { vi: "**Promote** replica thành database chính.", en: "**Promote** the replica to be the primary database." };
const ROUTE: Bi = { vi: "Route 53 định tuyến người dùng sang Tokyo.", en: "Route 53 routes users to Tokyo." };

const STRATS: Record<StratId, Strategy> = {
  br: {
    name: "Backup and restore",
    about: { vi: "Tokyo chỉ lưu **bản backup**: snapshot database mỗi 4 giờ và (nếu đã copy) AMI của web. Không có instance nào đang chạy.",
      en: "Tokyo keeps only **backups**: a database snapshot every 4 hours and (if copied) the web AMI. No instances are running." },
    cost: 120,
    rpo: 240,
    usesAmi: true,
    rest: (ami) => ({
      ami: ami ? { state: "idle", l2: COPIED } : { state: "none", l2: NOT_COPIED },
      web: { state: "none", l2: { vi: "chưa triển khai", en: "not deployed" } },
      db: { state: "idle", l2: { vi: "snapshot 4 giờ/lần", en: "snapshot every 4 h" } },
    }),
    steps: (ami) => [
      { at: "db", min: 90, l2: { vi: "đã restore", en: "restored" }, msg: { vi: "Restore database từ snapshot gần nhất. Do dung lượng database lớn, quá trình mất khoảng **1,5 giờ**.", en: "Restore the database from the latest snapshot. Because the database is large, this takes about **1.5 hours**." } },
      ami
        ? { at: "web", min: 10, l2: FOUR, msg: { vi: "Launch 4 EC2 instance từ **AMI đã được copy sẵn** sang Tokyo.", en: "Launch 4 EC2 instances from the **AMI already copied** to Tokyo." } }
        : { at: "web", min: 55, l2: FOUR, msg: { vi: "Không có AMI tại Tokyo: launch instance trống rồi **cài đặt ứng dụng từ đầu**, mất hơn 45 phút.", en: "No AMI in Tokyo: launch empty instances, then **install the application from scratch**, which takes more than 45 minutes." } },
      { at: "r53", min: 5, msg: { vi: "Cập nhật bản ghi DNS trên Route 53 sang Tokyo.", en: "Update the DNS record in Route 53 to Tokyo." } },
    ],
  },
  pilot: {
    name: "Pilot light",
    about: { vi: "Phần lõi luôn hoạt động: **database replica** tại Tokyo nhận dữ liệu liên tục. EC2 instance của web tier chưa chạy (**tắt**) và được launch từ AMI khi cần.",
      en: "The core is always running: a **database replica** in Tokyo receives data continuously. Web tier EC2 instances are not running (**off**) and are launched from the AMI when needed." },
    cost: 450,
    rpo: 5 / 60,
    usesAmi: true,
    rest: (ami) => ({
      ami: ami ? { state: "idle", l2: COPIED } : { state: "none", l2: NOT_COPIED },
      web: { state: "none", l2: { vi: "tắt", en: "off" } },
      db: { state: "run", l2: REPLICA },
    }),
    steps: (ami) => [
      { at: "db", min: 5, l2: NEW_PRIMARY, msg: PROMOTE },
      ami
        ? { at: "web", min: 15, l2: FOUR, msg: { vi: "Launch 4 EC2 instance từ AMI đã có sẵn tại Tokyo.", en: "Launch 4 EC2 instances from the AMI already in Tokyo." } }
        : { at: "web", min: 60, l2: FOUR, msg: { vi: "Không có AMI tại Tokyo: phải **cài đặt ứng dụng từ đầu** trên instance mới.", en: "No AMI in Tokyo: the application must be **installed from scratch** on new instances." } },
      { at: "r53", min: 5, msg: ROUTE },
    ],
  },
  warm: {
    name: "Warm standby",
    about: { vi: "Một **phiên bản thu nhỏ nhưng đầy đủ chức năng** luôn hoạt động tại Tokyo: 1 EC2 instance của web tier với instance type nhỏ và database replica. Khi có sự cố chỉ cần scale lên.",
      en: "A **scaled-down but fully functional copy** is always running in Tokyo: 1 web tier EC2 instance of a small instance type and a database replica. On failure, it only needs to scale up." },
    cost: 1300,
    rpo: 5 / 60,
    usesAmi: false,
    rest: () => ({
      ami: { state: "idle", l2: COPIED },
      web: { state: "run", l2: { vi: "1 instance nhỏ, đang chạy", en: "1 small instance, running" } },
      db: { state: "run", l2: REPLICA },
    }),
    steps: () => [
      { at: "db", min: 5, l2: NEW_PRIMARY, msg: PROMOTE },
      { at: "web", min: 5, l2: FOUR, msg: { vi: "Auto Scaling tăng từ 1 lên 4 instance. Instance nhỏ đã phục vụ người dùng trong thời gian chờ.", en: "Auto Scaling grows from 1 to 4 instances. The small instance already serves users in the meantime." } },
      { at: "r53", min: 1, msg: ROUTE },
    ],
  },
  multi: {
    name: "Multi-site active/active",
    about: { vi: "Tokyo là **một site đầy đủ** đang phục vụ người dùng đồng thời với Singapore. Database cho phép ghi tại cả hai Region.",
      en: "Tokyo is **a full site** serving users at the same time as Singapore. The database accepts writes in both Regions." },
    cost: 3200,
    rpo: 1 / 60,
    usesAmi: false,
    rest: () => ({
      ami: { state: "idle", l2: COPIED },
      web: { state: "run", l2: { vi: "4 instance, đang phục vụ", en: "4 instances, serving" } },
      db: { state: "run", l2: { vi: "đang nhận ghi", en: "accepting writes" } },
    }),
    steps: () => [
      { at: "r53", min: 0.5, msg: { vi: "Health check phát hiện Singapore gặp sự cố; Route 53 chỉ định tuyến người dùng sang Tokyo.", en: "A health check detects that Singapore has failed; Route 53 routes users only to Tokyo." } },
    ],
  },
};
const ORDER: StratId[] = ["br", "pilot", "warm", "multi"];

const TARGETS: Record<TargetId, { name: Bi; about: Bi; rpo: number; rto: number }> = {
  blog: { name: { vi: "Blog và trang giới thiệu", en: "Blog and about pages" },
    about: { vi: "Nội dung ít thay đổi. Mất dữ liệu nửa ngày hoặc gián đoạn nửa ngày đều chấp nhận được.", en: "Content rarely changes. Losing half a day of data or half a day of downtime are both acceptable." }, rpo: 720, rto: 720 },
  daily: { name: { vi: "Cửa hàng ngày thường", en: "Store on a normal day" },
    about: { vi: "Được phép mất tối đa dữ liệu đơn hàng của 15 phút; phải hoạt động trở lại trong 1 giờ.", en: "At most 15 minutes of order data may be lost; must be back within 1 hour." }, rpo: 15, rto: 60 },
  sale: { name: { vi: "Mùa sale lớn", en: "Big sale season" },
    about: { vi: "Mỗi phút gián đoạn gây mất nhiều đơn hàng: mất tối đa 1 phút dữ liệu, hoạt động trở lại trong 15 phút.", en: "Every minute of downtime loses many orders: at most 1 minute of data lost, back within 15 minutes." }, rpo: 1, rto: 15 },
  pay: { name: { vi: "Cổng thanh toán", en: "Payment gateway" },
    about: { vi: "Gần như không được phép gián đoạn: hoạt động trở lại trong 1 phút, chỉ được mất vài giây dữ liệu.", en: "Almost no downtime allowed: back within 1 minute, losing only a few seconds of data." }, rpo: 10 / 60, rto: 1 },
};

const COST_MAX = 3200;

function fmt(min: number): string {
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} giây`;
  if (min < 60) return `${Math.round(min)} phút`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

/** English form of fmt. */
function fmtEn(min: number): string {
  if (min < 1) {
    const s = Math.max(1, Math.round(min * 60));
    return `${s} second${s === 1 ? "" : "s"}`;
  }
  if (min < 60) {
    const m = Math.round(min);
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  const hs = `${h} hour${h === 1 ? "" : "s"}`;
  return m ? `${hs} ${m} min` : hs;
}

const total = (s: StratId, ami: boolean) => STRATS[s].steps(ami).reduce((t, x) => t + x.min, 0);
const meets = (s: StratId, t: TargetId, ami: boolean) => STRATS[s].rpo <= TARGETS[t].rpo && total(s, ami) <= TARGETS[t].rto;
function cheapest(t: TargetId, ami: boolean): StratId {
  return ORDER.find((s) => meets(s, t, ami)) ?? "multi";
}

// Timeline: the outage is the centre; seconds on a log scale to both sides.
const CX = 410;
const HALF = 360;
const LOG_MAX = Math.log10(1 + 86400);
const off = (min: number) => (Math.log10(1 + min * 60) / LOG_MAX) * HALF;
const TICKS: [number, Bi][] = [[1, { vi: "1 phút", en: "1 min" }], [10, { vi: "10 phút", en: "10 min" }], [60, { vi: "1 giờ", en: "1 h" }], [720, { vi: "12 giờ", en: "12 h" }]];
const TL_Y = 330;

// Map
const PRIMARY: { id: string; x: number; l1: string; l2: Bi }[] = [
  { id: "pweb", x: 110, l1: "Web", l2: { vi: "4 EC2 instance", en: "4 EC2 instances" } },
  { id: "pdb", x: 250, l1: "Database", l2: { vi: "chính", en: "primary" } },
];
const DR: { id: DrNode; x: number; l1: Bi }[] = [
  { id: "ami", x: 520, l1: { vi: "AMI web", en: "Web AMI" } },
  { id: "web", x: 630, l1: { vi: "Web", en: "Web" } },
  { id: "db", x: 740, l1: { vi: "Database", en: "Database" } },
];
const ROW = 196;
const R53: Pt = [410, 104];
const USER: Pt = [410, 34];
const NW = 104;
const NH = 46;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function DrStrategySim() {
  const L = useLang();
  /** Duration in the page language. */
  const fm = (min: number) => L({ vi: fmt(min), en: fmtEn(min) });
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [target, setTarget] = useState<TargetId>("daily");
  const [strat, setStrat] = useState<StratId>("br");
  const [ami, setAmi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"ready" | "down" | "done">("ready");
  const [elapsed, setElapsed] = useState(0);
  const [nodes, setNodes] = useState<Record<DrNode, { state: NodeState; l2: Bi }>>(STRATS.br.rest(false));
  const [log, setLog] = useState<Bi[]>([]);

  const S = STRATS[strat];
  const T = TARGETS[target];
  const rto = total(strat, ami);
  const ok = meets(strat, target, ami);
  // Compare with a well-prepared Tokyo (AMI copied): that is the setup worth paying for.
  const best = cheapest(target, true);

  function reset(s = strat, a = ami) {
    setPhase("ready");
    setElapsed(0);
    setLog([]);
    setNodes(STRATS[s].rest(a));
  }

  function change(fn: () => void) {
    if (busy) return;
    fn();
  }

  async function run() {
    const layer = fx.current;
    if (busy || !layer) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    const wait = (ms: number) => (fast ? Promise.resolve() : sleep(ms));
    await wait(150);
    setPhase("down");
    flashText(layer, 180, 136, L({ vi: "Region gặp sự cố", en: "Region failure" }), "drs-flash bad", 1300);
    setLog([{ vi: `Toàn bộ Region Singapore ngừng hoạt động. Dữ liệu chỉ còn tới bản sao gần nhất tại Tokyo: **mất ${fmt(S.rpo)}** dữ liệu đơn hàng.`, en: `The entire Singapore Region becomes unavailable. Data survives only up to the latest copy in Tokyo: **${fmtEn(S.rpo)}** of order data is **lost**.` }]);
    await wait(700);
    let t = 0;
    for (const step of S.steps(ami)) {
      if (!alive.current) return;
      const to: Pt = step.at === "r53" ? R53 : [DR.find((d) => d.id === step.at)!.x, ROW];
      if (step.at !== "r53") setNodes((n) => ({ ...n, [step.at]: { ...n[step.at as DrNode], state: "work" } }));
      await travel(layer, [R53, [to[0], R53[1]], to], 520, "pkt-edge");
      // Let the clock run with the step.
      const frames = fast ? 1 : 12;
      for (let f = 1; f <= frames; f++) {
        setElapsed(t + (step.min * f) / frames);
        await wait(45);
      }
      t += step.min;
      if (step.at !== "r53") setNodes((n) => ({ ...n, [step.at]: { state: "run", l2: step.l2 ?? n[step.at as DrNode].l2 } }));
      setLog((l) => [...l, { vi: `+${fmt(step.min)}: ${step.msg.vi}`, en: `+${fmtEn(step.min)}: ${step.msg.en}` }]);
    }
    if (!alive.current) return;
    await travel(layer, [USER, R53, [630, R53[1]], [630, ROW]], 700, "pkt-back");
    flashText(layer, USER[0] + 50, 76, L({ vi: "hoạt động lại", en: "back online" }), "drs-flash", 1200);
    setPhase("done");
    setBusy(false);
  }

  const lostW = phase === "ready" ? 0 : off(S.rpo);
  const downW = phase === "ready" ? 0 : off(elapsed);
  const rpoBad = S.rpo > T.rpo;
  const rtoBad = elapsed > T.rto;

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Mục tiêu của MFTECH", en: "MFTECH objectives" })}>
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Mục tiêu", en: "Objective" })}</span>
        {(Object.keys(TARGETS) as TargetId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === target} disabled={busy && id !== target} onClick={() => change(() => { setTarget(id); reset(); })}>
            {L(TARGETS[id].name)}
          </button>
        ))}
      </div>
      <p className="mx-4 mt-2 mb-2.5 text-step--1 text-muted [&_b]:text-ink">{L(T.about)} <b>RPO ≤ {fm(T.rpo)}, RTO ≤ {fm(T.rto)}.</b></p>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Chiến lược", en: "Strategy" })}</span>
        {ORDER.map((id) => (
          <button key={id} className="btn" aria-pressed={id === strat} disabled={busy && id !== strat} onClick={() => change(() => { setStrat(id); reset(id); })}>
            {STRATS[id].name}
          </button>
        ))}
      </div>
      <div className="stage-bar pt-0">
        {S.usesAmi ? (
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-step--1">
            <input type="checkbox" checked={ami} disabled={busy} onChange={(e) => { setAmi(e.target.checked); reset(strat, e.target.checked); }} />
            {L({ vi: "Đã copy AMI của web sang Tokyo", en: "Web AMI already copied to Tokyo" })}
          </label>
        ) : (
          <span className="text-step--1 text-muted">{L({ vi: "Web tại Tokyo đã chạy sẵn, không cần launch từ AMI.", en: "The web tier in Tokyo is already running; no launch from an AMI is needed." })}</span>
        )}
        <button className="btn primary ml-auto" onClick={run} disabled={busy}>{L({ vi: "Mô phỏng sự cố Singapore", en: "Simulate Singapore failure" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 390" role="img" aria-label={L({ vi: "Region Singapore chính và Region Tokyo dự phòng; bên dưới là trục thời gian thể hiện dữ liệu bị mất và thời gian gián đoạn", en: "The primary Singapore Region and the standby Tokyo Region; below, a timeline shows data lost and downtime" })}>
          <g className="drs-user">
            <circle cx={USER[0]} cy={USER[1] - 8} r={7} />
            <path d={`M${USER[0] - 13} ${USER[1] + 14} a13 13 0 0 1 26 0 z`} />
            <text className="drs-t" x={USER[0] + 22} y={USER[1] + 6}>{L({ vi: "Người dùng MFTECH", en: "MFTECH users" })}</text>
          </g>
          <path className="drs-link" d={`M${USER[0]} ${USER[1] + 16} V${R53[1] - 18}`} />
          <path className={"drs-link" + (phase === "ready" || strat === "multi" ? "" : " off")} d={`M${R53[0] - 60} ${R53[1]} H180 V${ROW - NH / 2}`} />
          <path className={"drs-link" + (strat === "multi" || phase === "done" ? " on" : " off")} d={`M${R53[0] + 60} ${R53[1]} H630 V${ROW - NH / 2}`} />
          <g className="drs-node r53">
            <rect x={R53[0] - 60} y={R53[1] - 18} width={120} height={36} rx={8} />
            <text className="drs-t" x={R53[0]} y={R53[1] + 4} textAnchor="middle">Route 53</text>
          </g>

          <g className={"drs-region" + (phase !== "ready" ? " down" : "")}>
            <rect x={30} y={140} width={300} height={100} rx={12} />
            <text x={44} y={160}>{L({ vi: "ap-southeast-1 · Singapore (chính)", en: "ap-southeast-1 · Singapore (primary)" })}</text>
          </g>
          {PRIMARY.map((n) => (
            <g key={n.id} className={"drs-node " + (phase === "ready" ? "run" : "down")}>
              <rect x={n.x - 60} y={ROW - NH / 2} width={120} height={NH} rx={8} />
              <text className="drs-t" x={n.x} y={ROW - 2} textAnchor="middle">{n.l1}</text>
              <text className="drs-s" x={n.x} y={ROW + 14} textAnchor="middle">{phase === "ready" ? L(n.l2) : L({ vi: "mất kết nối", en: "unreachable" })}</text>
            </g>
          ))}

          <g className="drs-region dr">
            <rect x={460} y={140} width={340} height={100} rx={12} />
            <text x={474} y={160}>ap-northeast-1 · Tokyo (DR)</text>
          </g>
          {DR.map((n) => {
            const st = nodes[n.id];
            return (
              <g key={n.id} className={"drs-node " + st.state}>
                <rect x={n.x - NW / 2} y={ROW - NH / 2} width={NW} height={NH} rx={8} />
                <text className="drs-t" x={n.x} y={ROW - 2} textAnchor="middle">{L(n.l1)}</text>
                <text className="drs-s" x={n.x} y={ROW + 14} textAnchor="middle">{L(st.l2)}</text>
              </g>
            );
          })}

          {/* Timeline */}
          <line className="drs-axis" x1={CX - HALF} x2={CX + HALF} y1={TL_Y} y2={TL_Y} />
          {TICKS.map(([m, label]) => (
            <g key={m}>
              <line className="drs-tick" x1={CX - off(m)} x2={CX - off(m)} y1={TL_Y - 4} y2={TL_Y + 4} />
              <line className="drs-tick" x1={CX + off(m)} x2={CX + off(m)} y1={TL_Y - 4} y2={TL_Y + 4} />
              <text className="ts" x={CX - off(m)} y={TL_Y + 18} textAnchor="middle">{L(label)}</text>
              <text className="ts" x={CX + off(m)} y={TL_Y + 18} textAnchor="middle">{L(label)}</text>
            </g>
          ))}
          <text className="drs-cap" x={CX - 12} y={262} textAnchor="end">{L({ vi: "← dữ liệu bị mất (RPO)", en: "← data lost (RPO)" })}</text>
          <text className="drs-cap" x={CX + 12} y={262} textAnchor="start">{L({ vi: "thời gian gián đoạn (RTO) →", en: "downtime (RTO) →" })}</text>
          <rect className={"drs-bar" + (rpoBad ? " bad" : " ok")} x={CX - lostW} y={TL_Y - 34} width={lostW} height={22} rx={4} />
          <rect className={"drs-bar grow" + (rtoBad ? " bad" : " ok")} x={CX} y={TL_Y - 34} width={downW} height={22} rx={4} />
          <line className="drs-target" x1={CX - off(T.rpo)} x2={CX - off(T.rpo)} y1={TL_Y - 46} y2={TL_Y + 2} />
          <line className="drs-target" x1={CX + off(T.rto)} x2={CX + off(T.rto)} y1={TL_Y - 46} y2={TL_Y + 2} />
          <text className="drs-tl" x={CX - off(T.rpo)} y={TL_Y - 50} textAnchor="middle">{L({ vi: "mục tiêu", en: "target" })}</text>
          <text className="drs-tl" x={CX + off(T.rto)} y={TL_Y - 50} textAnchor="middle">{L({ vi: "mục tiêu", en: "target" })}</text>
          <line className="drs-now" x1={CX} x2={CX} y1={TL_Y - 56} y2={TL_Y + 6} />
          <text className="drs-t" x={CX} y={TL_Y + 38} textAnchor="middle">{L({ vi: "Thời điểm sự cố", en: "Time of failure" })}</text>
          {phase !== "ready" && (
            <text className="drs-clock" x={downW > 250 ? CX + downW - 8 : CX + downW + 6} y={TL_Y - 18} textAnchor={downW > 250 ? "end" : "start"}>{fm(elapsed)}</text>
          )}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-step--1 font-semibold">{L({ vi: "Chi phí duy trì Tokyo ở trạng thái sẵn sàng", en: "Cost of keeping Tokyo ready" })}</span>
          <span className="h-2.5 max-w-[260px] flex-[1_1_120px] overflow-hidden rounded-[999px] border border-line bg-bg"><i className="block h-full bg-accent transition-[width] duration-350 ease-[ease]" style={{ width: `${(S.cost / COST_MAX) * 100}%` }} /></span>
          <span className="count">~{S.cost.toLocaleString("en-US")} {L({ vi: "USD/tháng (minh hoạ)", en: "USD/month (illustrative)" })}</span>
        </div>
        {phase === "ready" ? (
          <p className="m-0 text-step--1 text-muted [&_b]:text-ink">{rich(L(S.about))} {L({ vi: <>Chọn <b>Mô phỏng sự cố Singapore</b> để xem thời gian khôi phục tại Tokyo.</>, en: <>Choose <b>Simulate Singapore failure</b> to see the recovery time in Tokyo.</> })}</p>
        ) : (
          <>
            <ul className="log [&>li]:block">
              {log.map((l, i) => <li key={i}>{rich(L(l))}</li>)}
            </ul>
            {phase === "done" && (
              <>
                <div className="status mt-2.5">
                  <span className={"pill " + (rpoBad ? "bad" : "ok")}><i />RPO: {L({ vi: `mất ${fmt(S.rpo)}`, en: `${fmtEn(S.rpo)} lost` })}</span>
                  <span className={"pill " + (rtoBad ? "bad" : "ok")}><i />RTO: {fm(rto)}</span>
                </div>
                <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (!ok ? "bg-bad-soft" : best === strat ? "bg-ok-soft" : "bg-accent-soft")}>
                  {rich(L(
                    !ok
                      ? { vi: `Chưa đạt mục tiêu. ${S.usesAmi && !ami && meets(strat, target, true) ? "Nếu copy AMI sang Tokyo từ trước, mục tiêu sẽ đạt do loại bỏ được bước cài đặt ứng dụng. " : ""}Với mục tiêu này, phương án có chi phí thấp nhất vẫn đạt yêu cầu là **${STRATS[best].name}**.`,
                        en: `Objective not met. ${S.usesAmi && !ami && meets(strat, target, true) ? "If the AMI had been copied to Tokyo in advance, the objective would be met because the application installation step is removed. " : ""}For this objective, the lowest-cost option that still meets the requirement is **${STRATS[best].name}**.` }
                      : best === strat
                        ? { vi: `Đạt mục tiêu với chi phí thấp nhất. **${S.name}** là lựa chọn phù hợp cho "${T.name.vi}".`,
                          en: `Objective met at the lowest cost. **${S.name}** is the right choice for "${T.name.en}".` }
                        : { vi: `Đạt mục tiêu nhưng **chi phí cao hơn mức cần thiết**: ${STRATS[best].name} cũng đạt yêu cầu với chi phí thấp hơn.`,
                          en: `Objective met, but **at a higher cost than necessary**: ${STRATS[best].name} also meets the requirement at a lower cost.` },
                  ))}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
