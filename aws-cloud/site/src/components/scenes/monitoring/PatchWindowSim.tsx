import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./monitoring-sims.css";

// ShopViet patches its three web instances in a Systems Manager maintenance window,
// one instance at a time. Patched straight away, an instance reboots while the ALB is
// still sending it customers, so requests fail. With the Automation runbook
// AWSEC2-PatchLoadBalancerInstance it leaves the target group first, waits for open
// requests, patches, reboots and only comes back once healthy.

type Mode = "direct" | "runbook";
type Phase = "serve" | "drain" | "patch" | "reboot" | "rejoin";

const SEQ: Record<Mode, Phase[]> = {
  direct: ["patch", "patch", "patch", "reboot", "reboot"],
  runbook: ["drain", "patch", "patch", "patch", "reboot", "reboot", "rejoin"],
};

const PHASE_TEXT: Record<Phase, string> = {
  serve: "đang phục vụ request",
  drain: "rời target group, chờ request",
  patch: "đang cài đặt bản vá",
  reboot: "đang khởi động lại",
  rejoin: "đăng ký lại, chờ healthy",
};

const MODES: { id: Mode; name: string; doc: string }[] = [
  { id: "direct", name: "Run Command vá trực tiếp", doc: "AWS-RunPatchBaseline" },
  { id: "runbook", name: "Automation runbook", doc: "AWSEC2-PatchLoadBalancerInstance" },
];

const N = 3;
const PER_TICK = 3;
const ticksOf = (m: Mode) => N * SEQ[m].length + 2;

function phase(m: Mode, i: number, t: number): Phase {
  const len = SEQ[m].length;
  const k = t - i * len;
  return k >= 0 && k < len ? SEQ[m][k] : "serve";
}
/** Instances the ALB sends customers to at tick t. */
function inTarget(m: Mode, i: number, t: number) {
  const p = phase(m, i, t);
  return m === "direct" ? true : p === "serve";
}

const ALB: Pt = [250, 145];
const USERS: Pt = [70, 145];
const INST = (i: number): Pt => [610, 75 + i * 70];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PatchWindowSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [mode, setMode] = useState<Mode>("direct");
  const [tick, setTick] = useState(-1);
  const [ok, setOk] = useState(0);
  const [fail, setFail] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

  const total = ticksOf(mode);
  const done = tick === total - 1;

  function pick(m: Mode) {
    if (busy) return;
    setMode(m);
    setTick(-1);
    setOk(0);
    setFail(0);
  }

  async function play() {
    const layer = fx.current;
    if (busy || !layer) return;
    setBusy(true);
    setOk(0);
    setFail(0);
    const fast = prefersReducedMotion();
    let rr = 0;
    for (let t = 0; t < total; t++) {
      if (!alive.current) return;
      setTick(t);
      const targets = Array.from({ length: N }, (_, i) => i).filter((i) => inTarget(mode, i, t));
      const sends: Promise<void>[] = [];
      let good = 0;
      let bad = 0;
      for (let r = 0; r < PER_TICK; r++) {
        const i = targets[rr++ % targets.length];
        const down = phase(mode, i, t) === "reboot";
        if (down) bad++;
        else good++;
        const [x, y] = INST(i);
        const path: Pt[] = [USERS, ALB, [430, ALB[1]], [430, y], [x - 100, y]];
        sends.push(
          sleep(r * 120).then(() => travel(layer, path, fast ? 150 : 520, down ? "pkt-bad" : "pkt", 5)).then(() => {
            if (down) flashText(layer, x - 100, y - 30, "502", "pws-flash", 600);
          }),
        );
      }
      await Promise.all(sends);
      setOk((v) => v + good);
      setFail((v) => v + bad);
      if (!fast) await sleep(220);
    }
    setBusy(false);
  }

  const doc = MODES.find((m) => m.id === mode)!.doc;

  return (
    <div className="stage pws">
      <div className="stage-bar" role="group" aria-label="Phương án vá">
        <span className="label">Phương án vá</span>
        {MODES.map((m) => (
          <button key={m.id} className="btn" aria-pressed={m.id === mode} disabled={busy && m.id !== mode} onClick={() => pick(m.id)}>{m.name}</button>
        ))}
        <button className="btn primary pws-play" onClick={play} disabled={busy}>Mở Maintenance Window</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 264" role="img" aria-label="ALB định tuyến request tới ba EC2 instance trong khi Systems Manager vá lần lượt từng instance">
          <rect className="dbox dbox-region" x={490} y={12} width={318} height={242} rx={10} />
          <text className="ts" x={502} y={32}>Maintenance Window · CN 02:00 · 1 instance/lượt</text>
          <text className="pws-clock" x={20} y={30}>{tick < 0 ? "01:59" : `02:${String(tick).padStart(2, "0")}`}</text>
          <text className="ts" x={20} y={48}>{doc}</text>
          <circle cx={USERS[0]} cy={USERS[1] - 10} r={7} className="pws-user" />
          <path d={`M${USERS[0] - 13} ${USERS[1] + 12} a13 13 0 0 1 26 0 z`} className="pws-user" />
          <text className="pws-l2" x={USERS[0]} y={USERS[1] + 32} textAnchor="middle">Người dùng</text>
          <path className="pws-link" d={`M${USERS[0] + 16} ${ALB[1]} H${ALB[0] - 60}`} />
          {Array.from({ length: N }, (_, i) => {
            const [x, y] = INST(i);
            const active = tick >= 0 && inTarget(mode, i, tick);
            return <path key={i} className={"pws-link" + (tick >= 0 && !active ? " off" : "")} d={`M${ALB[0] + 60} ${ALB[1]} H430 V${y} H${x - 100}`} />;
          })}
          <g className="pws-node serve">
            <rect x={ALB[0] - 60} y={ALB[1] - 24} width={120} height={48} rx={8} />
            <text className="pws-l1" x={ALB[0]} y={ALB[1] - 3} textAnchor="middle">ALB</text>
            <text className="pws-l2" x={ALB[0]} y={ALB[1] + 13} textAnchor="middle">target group web</text>
          </g>
          {Array.from({ length: N }, (_, i) => {
            const [x, y] = INST(i);
            const p = tick < 0 ? "serve" : phase(mode, i, tick);
            const cls = `pws-node ${p}${mode === "runbook" ? " out" : ""}`;
            return (
              <g key={i} className={cls}>
                <rect x={x - 100} y={y - 25} width={200} height={50} rx={8} />
                <text className="pws-l1" x={x} y={y - 4} textAnchor="middle">i-web{i + 1}</text>
                <text className="pws-l2" x={x} y={y + 13} textAnchor="middle">{PHASE_TEXT[p]}</text>
              </g>
            );
          })}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {tick < 0 ? (
          <p className="pws-hint">Chọn phương án vá, sau đó chọn <b>Mở Maintenance Window</b>. Người dùng vẫn mua hàng lúc 2h sáng.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">02:{String(tick).padStart(2, "0")} · bước {tick + 1}/{total}</span>
              <span className="pill ok"><i />{ok} request thành công</span>
              <span className={"pill " + (fail ? "bad" : "ok")}><i />{fail} request lỗi</span>
            </div>
            {done && (
              <p className={`pws-result ${fail ? "bad" : "ok"}`}>
                {rich(mode === "direct"
                  ? "Bản vá được cài đặt thành công trên cả ba instance, nhưng mỗi instance reboot trong khi ALB **vẫn định tuyến request tới**. Người dùng gặp lỗi 502 và timeout. Vá thành công không đồng nghĩa với vá an toàn."
                  : "Không có request nào lỗi. Runbook `AWSEC2-PatchLoadBalancerInstance` gỡ instance khỏi target group, chờ các request đang xử lý hoàn tất, vá, reboot, đăng ký lại và chờ trạng thái healthy trước khi chuyển sang instance tiếp theo. **Maintenance Window** thực thi runbook vào khung giờ ít người dùng, lần lượt từng instance.")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
