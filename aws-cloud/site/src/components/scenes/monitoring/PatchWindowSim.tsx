import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./monitoring-sims.css";

// MFTech patches its three web instances in a Systems Manager maintenance window,
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

const PHASE_TEXT: Record<Phase, Bi> = {
  serve: { vi: "đang phục vụ request", en: "serving requests" },
  drain: { vi: "rời target group, chờ request", en: "left target group, draining" },
  patch: { vi: "đang cài đặt bản vá", en: "installing patches" },
  reboot: { vi: "đang khởi động lại", en: "rebooting" },
  rejoin: { vi: "gắn lại vào target group", en: "rejoining target group" },
};

const MODES: { id: Mode; name: Bi; doc: string }[] = [
  { id: "direct", name: { vi: "Run Command vá trực tiếp", en: "Run Command patches directly" }, doc: "AWS-RunPatchBaseline" },
  { id: "runbook", name: { vi: "Automation runbook", en: "Automation runbook" }, doc: "AWSEC2-PatchLoadBalancerInstance" },
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
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [mode, setMode] = useState<Mode>("direct");
  const [tick, setTick] = useState(-1);
  const [ok, setOk] = useState(0);
  const [fail, setFail] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
      <div className="stage-bar" role="group" aria-label={L({ vi: "Phương án vá", en: "Patching approach" })}>
        <span className="label">{L({ vi: "Phương án vá", en: "Patching approach" })}</span>
        {MODES.map((m) => (
          <button key={m.id} className="btn" aria-pressed={m.id === mode} disabled={busy && m.id !== mode} onClick={() => pick(m.id)}>{L(m.name)}</button>
        ))}
        <button className="btn primary pws-play" onClick={play} disabled={busy}>{L({ vi: "Mở Maintenance Window", en: "Open Maintenance Window" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 264" role="img" aria-label={L({ vi: "ALB định tuyến request tới ba EC2 instance trong khi Systems Manager vá lần lượt từng instance", en: "The ALB routes requests to three EC2 instances while Systems Manager patches them one at a time" })}>
          <rect className="dbox dbox-region" x={490} y={12} width={318} height={242} rx={10} />
          <text className="ts" x={502} y={32}>{L({ vi: "Maintenance Window · CN 02:00 · 1 instance/lượt", en: "Maintenance Window · Sun 02:00 · 1 instance at a time" })}</text>
          <text className="pws-clock" x={20} y={30}>{tick < 0 ? "01:59" : `02:${String(tick).padStart(2, "0")}`}</text>
          <text className="ts" x={20} y={48}>{doc}</text>
          <circle cx={USERS[0]} cy={USERS[1] - 10} r={7} className="pws-user" />
          <path d={`M${USERS[0] - 13} ${USERS[1] + 12} a13 13 0 0 1 26 0 z`} className="pws-user" />
          <text className="pws-l2" x={USERS[0]} y={USERS[1] + 32} textAnchor="middle">{L({ vi: "Người dùng", en: "Users" })}</text>
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
                <text className="pws-l2" x={x} y={y + 13} textAnchor="middle">{L(PHASE_TEXT[p])}</text>
              </g>
            );
          })}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {tick < 0 ? (
          <p className="pws-hint">{L({ vi: <>Chọn phương án vá, sau đó chọn <b>Mở Maintenance Window</b>. Người dùng vẫn mua hàng lúc 2h sáng.</>, en: <>Choose a patching approach, then choose <b>Open Maintenance Window</b>. Users are still shopping at 2:00 a.m.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">02:{String(tick).padStart(2, "0")} · {L({ vi: "bước", en: "step" })} {tick + 1}/{total}</span>
              <span className="pill ok"><i />{ok} {L({ vi: "request thành công", en: "successful requests" })}</span>
              <span className={"pill " + (fail ? "bad" : "ok")}><i />{fail} {L({ vi: "request lỗi", en: "failed requests" })}</span>
            </div>
            {done && (
              <p className={`pws-result ${fail ? "bad" : "ok"}`}>
                {rich(mode === "direct"
                  ? L({ vi: "Bản vá được cài đặt thành công trên cả ba instance, nhưng mỗi instance reboot trong khi ALB **vẫn định tuyến request tới**. Người dùng gặp lỗi 502 và timeout. Vá thành công không đồng nghĩa với vá an toàn.",
                    en: "The patches install successfully on all three instances, but each instance reboots while the ALB **is still routing requests to it**. Users get 502 errors and timeouts. A successful patch is not the same as a safe patch." })
                  : L({ vi: "Không có request nào lỗi. Runbook `AWSEC2-PatchLoadBalancerInstance` kiểm tra instance healthy, gỡ instance khỏi target group, chờ hết thời gian connection draining, gọi `AWS-RunPatchBaseline` để vá, rồi gắn instance trở lại target group. **Maintenance Window** thực thi runbook vào khung giờ ít người dùng; concurrency 1 để vá lần lượt từng instance.",
                    en: "No request fails. The `AWSEC2-PatchLoadBalancerInstance` runbook checks that the instance is healthy, removes it from the target group, waits for the connection draining timeout, calls `AWS-RunPatchBaseline` to patch, then reattaches the instance to the target group. The **Maintenance Window** runs the runbook during low-traffic hours; concurrency 1 patches the instances one at a time." }))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
