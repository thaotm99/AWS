import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./dr-strategy-sim.css";

// ShopViet runs in Singapore and keeps a disaster recovery copy in Tokyo. Pick how much
// the business can lose (a target), pick one of the four DR strategies, then take
// Singapore down. The Tokyo side comes up step by step while a clock runs; the timeline
// below shows the data lost before the outage (RPO) and the downtime after it (RTO)
// against the target, and the meter shows what keeping Tokyo ready costs each month.

type StratId = "br" | "pilot" | "warm" | "multi";
type TargetId = "blog" | "daily" | "sale" | "pay";
type NodeState = "run" | "idle" | "none" | "down" | "work";
type DrNode = "ami" | "web" | "db";

interface Step { at: DrNode | "r53"; min: number; msg: string; l2?: string }

interface Strategy {
  name: string;
  about: string;
  /** Extra monthly cost of keeping Tokyo ready (illustrative). */
  cost: number;
  /** Data lost, in minutes. */
  rpo: number;
  rest(ami: boolean): Record<DrNode, { state: NodeState; l2: string }>;
  steps(ami: boolean): Step[];
  /** Whether the AMI switch matters for this strategy. */
  usesAmi: boolean;
}

const STRATS: Record<StratId, Strategy> = {
  br: {
    name: "Backup & restore",
    about: "Tokyo chỉ lưu **bản backup**: snapshot database mỗi 4 giờ và (nếu đã copy) AMI của web. Không có instance nào đang chạy.",
    cost: 120,
    rpo: 240,
    usesAmi: true,
    rest: (ami) => ({
      ami: ami ? { state: "idle", l2: "đã copy" } : { state: "none", l2: "chưa copy" },
      web: { state: "none", l2: "chưa triển khai" },
      db: { state: "idle", l2: "snapshot 4 giờ/lần" },
    }),
    steps: (ami) => [
      { at: "db", min: 90, l2: "đã restore", msg: "Restore database từ snapshot gần nhất. Do dung lượng database lớn, quá trình mất khoảng **1,5 giờ**." },
      ami
        ? { at: "web", min: 10, l2: "4 instance", msg: "Launch 4 EC2 instance từ **AMI đã được copy sẵn** sang Tokyo." }
        : { at: "web", min: 55, l2: "4 instance", msg: "Không có AMI tại Tokyo: launch instance trống rồi **cài đặt ứng dụng từ đầu**, mất hơn 45 phút." },
      { at: "r53", min: 5, msg: "Cập nhật bản ghi DNS trên Route 53 sang Tokyo." },
    ],
  },
  pilot: {
    name: "Pilot light",
    about: "Phần lõi luôn hoạt động: **database replica** tại Tokyo nhận dữ liệu liên tục. Web server ở trạng thái **tắt** và được khởi tạo từ AMI khi cần.",
    cost: 450,
    rpo: 5 / 60,
    usesAmi: true,
    rest: (ami) => ({
      ami: ami ? { state: "idle", l2: "đã copy" } : { state: "none", l2: "chưa copy" },
      web: { state: "none", l2: "tắt" },
      db: { state: "run", l2: "replica, đang chạy" },
    }),
    steps: (ami) => [
      { at: "db", min: 5, l2: "primary mới", msg: "**Promote** replica thành database chính." },
      ami
        ? { at: "web", min: 15, l2: "4 instance", msg: "Launch 4 EC2 instance từ AMI đã có sẵn tại Tokyo." }
        : { at: "web", min: 60, l2: "4 instance", msg: "Không có AMI tại Tokyo: phải **cài đặt ứng dụng từ đầu** trên instance mới." },
      { at: "r53", min: 5, msg: "Route 53 định tuyến người dùng sang Tokyo." },
    ],
  },
  warm: {
    name: "Warm standby",
    about: "Một **phiên bản thu nhỏ nhưng đầy đủ chức năng** luôn hoạt động tại Tokyo: 1 web server kích thước nhỏ và database replica. Khi có sự cố chỉ cần scale lên.",
    cost: 1300,
    rpo: 5 / 60,
    usesAmi: false,
    rest: () => ({
      ami: { state: "idle", l2: "đã copy" },
      web: { state: "run", l2: "1 instance nhỏ, đang chạy" },
      db: { state: "run", l2: "replica, đang chạy" },
    }),
    steps: () => [
      { at: "db", min: 5, l2: "primary mới", msg: "**Promote** replica thành database chính." },
      { at: "web", min: 5, l2: "4 instance", msg: "Auto Scaling tăng từ 1 lên 4 instance. Instance nhỏ đã phục vụ người dùng trong thời gian chờ." },
      { at: "r53", min: 1, msg: "Route 53 định tuyến người dùng sang Tokyo." },
    ],
  },
  multi: {
    name: "Multi-site active-active",
    about: "Tokyo là **một site đầy đủ** đang phục vụ người dùng đồng thời với Singapore. Database cho phép ghi tại cả hai Region.",
    cost: 3200,
    rpo: 1 / 60,
    usesAmi: false,
    rest: () => ({
      ami: { state: "idle", l2: "đã copy" },
      web: { state: "run", l2: "4 instance, đang phục vụ" },
      db: { state: "run", l2: "đang nhận ghi" },
    }),
    steps: () => [
      { at: "r53", min: 0.5, msg: "Health check phát hiện Singapore gặp sự cố; Route 53 chỉ định tuyến người dùng sang Tokyo." },
    ],
  },
};
const ORDER: StratId[] = ["br", "pilot", "warm", "multi"];

const TARGETS: Record<TargetId, { name: string; about: string; rpo: number; rto: number }> = {
  blog: { name: "Blog và trang giới thiệu", about: "Nội dung ít thay đổi. Mất dữ liệu nửa ngày hoặc gián đoạn nửa ngày đều chấp nhận được.", rpo: 720, rto: 720 },
  daily: { name: "Cửa hàng ngày thường", about: "Được phép mất tối đa dữ liệu đơn hàng của 15 phút; phải hoạt động trở lại trong 1 giờ.", rpo: 15, rto: 60 },
  sale: { name: "Mùa sale lớn", about: "Mỗi phút gián đoạn gây mất nhiều đơn hàng: mất tối đa 1 phút dữ liệu, hoạt động trở lại trong 15 phút.", rpo: 1, rto: 15 },
  pay: { name: "Cổng thanh toán", about: "Gần như không được phép gián đoạn: hoạt động trở lại trong 1 phút, chỉ được mất vài giây dữ liệu.", rpo: 10 / 60, rto: 1 },
};

const COST_MAX = 3200;

function fmt(min: number): string {
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} giây`;
  if (min < 60) return `${Math.round(min)} phút`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
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
const TICKS: [number, string][] = [[1, "1 phút"], [10, "10 phút"], [60, "1 giờ"], [720, "12 giờ"]];
const TL_Y = 330;

// Map
const PRIMARY = [{ id: "pweb", x: 110, l1: "Web", l2: "4 EC2 instance" }, { id: "pdb", x: 250, l1: "Database", l2: "chính" }];
const DR: { id: DrNode; x: number; l1: string }[] = [{ id: "ami", x: 520, l1: "AMI web" }, { id: "web", x: 630, l1: "Web" }, { id: "db", x: 740, l1: "Database" }];
const ROW = 196;
const R53: Pt = [410, 104];
const USER: Pt = [410, 34];
const NW = 104;
const NH = 46;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function DrStrategySim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [target, setTarget] = useState<TargetId>("daily");
  const [strat, setStrat] = useState<StratId>("br");
  const [ami, setAmi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"ready" | "down" | "done">("ready");
  const [elapsed, setElapsed] = useState(0);
  const [nodes, setNodes] = useState<Record<DrNode, { state: NodeState; l2: string }>>(STRATS.br.rest(false));
  const [log, setLog] = useState<string[]>([]);

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
    flashText(layer, 180, 136, "Region gặp sự cố", "drs-flash bad", 1300);
    setLog([`Toàn bộ Region Singapore mất điện. Dữ liệu chỉ còn tới bản sao gần nhất tại Tokyo: **mất ${fmt(S.rpo)}** dữ liệu đơn hàng.`]);
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
      setLog((l) => [...l, `+${fmt(step.min)}: ${step.msg}`]);
    }
    if (!alive.current) return;
    await travel(layer, [USER, R53, [630, R53[1]], [630, ROW]], 700, "pkt-back");
    flashText(layer, USER[0] + 50, 76, "hoạt động lại", "drs-flash", 1200);
    setPhase("done");
    setBusy(false);
  }

  const lostW = phase === "ready" ? 0 : off(S.rpo);
  const downW = phase === "ready" ? 0 : off(elapsed);
  const rpoBad = S.rpo > T.rpo;
  const rtoBad = elapsed > T.rto;

  return (
    <div className="stage drs">
      <div className="drs-row" role="group" aria-label="Mục tiêu của ShopViet">
        <span className="drs-label">Mục tiêu</span>
        {(Object.keys(TARGETS) as TargetId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === target} disabled={busy && id !== target} onClick={() => change(() => { setTarget(id); reset(); })}>
            {TARGETS[id].name}
          </button>
        ))}
      </div>
      <p className="drs-about">{T.about} <b>RPO ≤ {fmt(T.rpo)}, RTO ≤ {fmt(T.rto)}.</b></p>
      <div className="stage-bar">
        <span className="label">Chiến lược</span>
        {ORDER.map((id) => (
          <button key={id} className="btn" aria-pressed={id === strat} disabled={busy && id !== strat} onClick={() => change(() => { setStrat(id); reset(id); })}>
            {STRATS[id].name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        {S.usesAmi ? (
          <label className="drs-toggle">
            <input type="checkbox" checked={ami} disabled={busy} onChange={(e) => { setAmi(e.target.checked); reset(strat, e.target.checked); }} />
            Đã copy AMI của web sang Tokyo
          </label>
        ) : (
          <span className="drs-note">Web tại Tokyo đã chạy sẵn, không cần launch từ AMI.</span>
        )}
        <button className="btn primary drs-play" onClick={run} disabled={busy}>Mô phỏng sự cố Singapore</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 390" role="img" aria-label="Region Singapore chính và Region Tokyo dự phòng; bên dưới là trục thời gian thể hiện dữ liệu bị mất và thời gian gián đoạn">
          <g className="drs-user">
            <circle cx={USER[0]} cy={USER[1] - 8} r={7} />
            <path d={`M${USER[0] - 13} ${USER[1] + 14} a13 13 0 0 1 26 0 z`} />
            <text className="drs-t" x={USER[0] + 22} y={USER[1] + 6}>Người dùng ShopViet</text>
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
            <text x={44} y={160}>ap-southeast-1 · Singapore (chính)</text>
          </g>
          {PRIMARY.map((n) => (
            <g key={n.id} className={"drs-node " + (phase === "ready" ? "run" : "down")}>
              <rect x={n.x - 60} y={ROW - NH / 2} width={120} height={NH} rx={8} />
              <text className="drs-t" x={n.x} y={ROW - 2} textAnchor="middle">{n.l1}</text>
              <text className="drs-s" x={n.x} y={ROW + 14} textAnchor="middle">{phase === "ready" ? n.l2 : "mất kết nối"}</text>
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
                <text className="drs-t" x={n.x} y={ROW - 2} textAnchor="middle">{n.l1}</text>
                <text className="drs-s" x={n.x} y={ROW + 14} textAnchor="middle">{st.l2}</text>
              </g>
            );
          })}

          {/* Timeline */}
          <line className="drs-axis" x1={CX - HALF} x2={CX + HALF} y1={TL_Y} y2={TL_Y} />
          {TICKS.map(([m, label]) => (
            <g key={m}>
              <line className="drs-tick" x1={CX - off(m)} x2={CX - off(m)} y1={TL_Y - 4} y2={TL_Y + 4} />
              <line className="drs-tick" x1={CX + off(m)} x2={CX + off(m)} y1={TL_Y - 4} y2={TL_Y + 4} />
              <text className="ts" x={CX - off(m)} y={TL_Y + 18} textAnchor="middle">{label}</text>
              <text className="ts" x={CX + off(m)} y={TL_Y + 18} textAnchor="middle">{label}</text>
            </g>
          ))}
          <text className="drs-cap" x={CX - 12} y={262} textAnchor="end">← dữ liệu bị mất (RPO)</text>
          <text className="drs-cap" x={CX + 12} y={262} textAnchor="start">thời gian gián đoạn (RTO) →</text>
          <rect className={"drs-bar" + (rpoBad ? " bad" : " ok")} x={CX - lostW} y={TL_Y - 34} width={lostW} height={22} rx={4} />
          <rect className={"drs-bar grow" + (rtoBad ? " bad" : " ok")} x={CX} y={TL_Y - 34} width={downW} height={22} rx={4} />
          <line className="drs-target" x1={CX - off(T.rpo)} x2={CX - off(T.rpo)} y1={TL_Y - 46} y2={TL_Y + 2} />
          <line className="drs-target" x1={CX + off(T.rto)} x2={CX + off(T.rto)} y1={TL_Y - 46} y2={TL_Y + 2} />
          <text className="drs-tl" x={CX - off(T.rpo)} y={TL_Y - 50} textAnchor="middle">mục tiêu</text>
          <text className="drs-tl" x={CX + off(T.rto)} y={TL_Y - 50} textAnchor="middle">mục tiêu</text>
          <line className="drs-now" x1={CX} x2={CX} y1={TL_Y - 56} y2={TL_Y + 6} />
          <text className="drs-t" x={CX} y={TL_Y + 38} textAnchor="middle">Thời điểm sự cố</text>
          {phase !== "ready" && (
            <text className="drs-clock" x={downW > 250 ? CX + downW - 8 : CX + downW + 6} y={TL_Y - 18} textAnchor={downW > 250 ? "end" : "start"}>{fmt(elapsed)}</text>
          )}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <div className="drs-cost">
          <span className="drs-cost-label">Chi phí duy trì Tokyo ở trạng thái sẵn sàng</span>
          <span className="drs-meter"><i style={{ width: `${(S.cost / COST_MAX) * 100}%` }} /></span>
          <span className="count">~{S.cost.toLocaleString("en-US")} USD/tháng (minh hoạ)</span>
        </div>
        {phase === "ready" ? (
          <p className="drs-hint">{rich(S.about)} Chọn <b>Mô phỏng sự cố Singapore</b> để xem thời gian khôi phục tại Tokyo.</p>
        ) : (
          <>
            <ul className="log drs-log">
              {log.map((l, i) => <li key={i}>{rich(l)}</li>)}
            </ul>
            {phase === "done" && (
              <>
                <div className="status drs-status">
                  <span className={"pill " + (rpoBad ? "bad" : "ok")}><i />RPO: mất {fmt(S.rpo)}</span>
                  <span className={"pill " + (rtoBad ? "bad" : "ok")}><i />RTO: {fmt(rto)}</span>
                </div>
                <p className={"drs-result " + (!ok ? "bad" : best === strat ? "ok" : "warn")}>
                  {rich(
                    !ok
                      ? `Chưa đạt mục tiêu. ${S.usesAmi && !ami && meets(strat, target, true) ? "Nếu copy AMI sang Tokyo từ trước, mục tiêu sẽ đạt do loại bỏ được bước cài đặt ứng dụng. " : ""}Với mục tiêu này, phương án có chi phí thấp nhất vẫn đạt yêu cầu là **${STRATS[best].name}**.`
                      : best === strat
                        ? `Đạt mục tiêu với chi phí thấp nhất. **${S.name}** là lựa chọn phù hợp cho "${T.name}".`
                        : `Đạt mục tiêu nhưng **chi phí cao hơn mức cần thiết**: ${STRATS[best].name} cũng đạt yêu cầu với chi phí thấp hơn.`,
                  )}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
