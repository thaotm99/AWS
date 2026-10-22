import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./containers-sims.css";

// Scaling happens in two layers. On EKS with EC2 nodes, the Horizontal Pod Autoscaler changes the
// number of Pods (target CPU utilization; needs a metrics source such as the Metrics Server) and the
// Cluster Autoscaler changes the number of nodes through the Auto Scaling group when Pods cannot be
// scheduled (eks/latest/userguide/horizontal-pod-autoscaler.html, autoscaling.html).
// On ECS, Service Auto Scaling changes the desired number of tasks (AmazonECS/latest/developerguide/
// service-auto-scaling.html); a Fargate task's CPU and memory are set at the task level in the task
// definition and change only through a new revision and a service update
// (fargate-tasks-services.html, update-task-definition-console-v2.html).
// Source questions: exam4_q56, exam5_q36.

type Platform = "eks" | "ecs";
type EcsMode = "single" | "sas";

const MAX_LEVEL = 3;
const SLOTS = 2; // Pods per node in this model
const START_NODES = 2;
const MAX_NODES = 5;
const MIN_PODS = 2;
const MAX_PODS = 10;

/** Load expressed as "Pods (or tasks) needed at the 50% CPU target". */
const eksDemand = (level: number) => 2 + level * 2; // 2, 4, 6, 8
const ecsDemand = (level: number) => 1 + level; // 1, 2, 3, 4

function eksState(level: number, hpa: boolean, ca: boolean): { demand: number; pods: number; nodes: number; running: number; pending: number; pendingBefore: number; cpu: number; overloaded: boolean } {
  const demand = eksDemand(level);
  const pods = hpa ? Math.min(MAX_PODS, Math.max(MIN_PODS, demand)) : MIN_PODS;
  // Traffic only grows in this model, so nodes added at an earlier level stay.
  let nodes = level > 0 ? eksState(level - 1, hpa, ca).nodes : START_NODES;
  const pendingBefore = Math.max(0, pods - nodes * SLOTS);
  if (ca && pendingBefore > 0) nodes = Math.min(MAX_NODES, Math.ceil(pods / SLOTS));
  const running = Math.min(pods, nodes * SLOTS);
  const pending = pods - running;
  const cpu = Math.round((demand / running) * 50); // % of each Pod's CPU request
  return { demand, pods, nodes, running, pending, pendingBefore, cpu, overloaded: demand > running };
}

function ecsState(level: number, mode: EcsMode) {
  const demand = ecsDemand(level);
  const tasks = mode === "sas" ? demand : 1;
  const cpu = Math.min(100, Math.round((demand / tasks) * 50));
  return { demand, tasks, cpu, overloaded: demand > tasks };
}

type Entry = { ok: boolean; msg: string };

export default function ScaleLayersSim() {
  const L = useLang();
  const [platform, setPlatform] = useState<Platform>("eks");
  const [hpa, setHpa] = useState(false);
  const [ca, setCa] = useState(false);
  const [mode, setMode] = useState<EcsMode>("single");
  const [level, setLevel] = useState(0);
  const [log, setLog] = useState<Entry[]>([]);

  function reset() {
    setLevel(0);
    setLog([]);
  }

  function eksMessage(lv: number): Entry {
    const s = eksState(lv, hpa, ca);
    const x = lv + 1;
    if (!hpa) {
      return { ok: false, msg: L({
        vi: `Lưu lượng tăng gấp ${x}. Không có HPA nên Deployment giữ **${s.pods} replica**; CPU mỗi Pod đạt ${s.cpu}% so với request và người dùng gặp độ trễ cao. Không có Pod nào **Pending** nên Cluster Autoscaler${ca ? "" : " (nếu được bật)"} không bổ sung node: nó phản ứng với Pod không lập lịch được, không phản ứng với CPU.`,
        en: `Traffic grows ${x}x. Without an HPA the Deployment stays at **${s.pods} replicas**; each Pod runs at ${s.cpu}% of its CPU request and users see high latency. No Pod is **Pending**, so the Cluster Autoscaler${ca ? "" : " (if enabled)"} adds no node: it reacts to Pods that cannot be scheduled, not to CPU.` }) };
    }
    if (s.pendingBefore === 0) {
      return { ok: true, msg: L({
        vi: `Lưu lượng tăng gấp ${x}. **HPA** tăng Deployment lên ${s.pods} replica để giữ CPU quanh target 50%; các node hiện có vẫn đủ chỗ.`,
        en: `Traffic grows ${x}x. The **HPA** raises the Deployment to ${s.pods} replicas to keep CPU near the 50% target; the existing nodes still have room.` }) };
    }
    if (!ca) {
      return { ok: false, msg: L({
        vi: `Lưu lượng tăng gấp ${x}. HPA tăng lên ${s.pods} replica nhưng chỉ ${s.running} Pod chạy được; **${s.pending} Pod Pending** vì ${s.nodes} node đã hết CPU. Số node giữ nguyên: HPA chỉ thay đổi số Pod, không thêm node.`,
        en: `Traffic grows ${x}x. The HPA raises the Deployment to ${s.pods} replicas, but only ${s.running} Pods can run; **${s.pending} Pods are Pending** because the ${s.nodes} nodes are out of CPU. The node count stays the same: the HPA changes the number of Pods, not the number of nodes.` }) };
    }
    return { ok: true, msg: L({
      vi: `Lưu lượng tăng gấp ${x}. HPA tăng lên ${s.pods} replica; ${s.pendingBefore} Pod Pending. **Cluster Autoscaler** tăng desired capacity của Auto Scaling group lên ${s.nodes} node và các Pod được lập lịch lên node mới.`,
      en: `Traffic grows ${x}x. The HPA raises the Deployment to ${s.pods} replicas; ${s.pendingBefore} Pods are Pending. The **Cluster Autoscaler** raises the Auto Scaling group's desired capacity to ${s.nodes} nodes and the Pods are scheduled onto the new nodes.` }) };
  }

  function ecsMessage(lv: number): Entry {
    const s = ecsState(lv, mode);
    const x = lv + 1;
    if (mode === "single") {
      return { ok: false, msg: L({
        vi: `Lưu lượng tăng gấp ${x}; CPU của task đạt ${s.cpu}% và ứng dụng trả lỗi 5xx. CloudWatch alarm chuyển sang ALARM, nhưng **CPU và memory của task Fargate được khai báo ở task level trong task definition**: alarm không thay đổi được kích thước task đang chạy. Muốn task lớn hơn phải tạo task definition revision mới và cập nhật service; task mới thay task cũ và ứng dụng vẫn chỉ có **một task**, không có dự phòng.`,
        en: `Traffic grows ${x}x; the task's CPU reaches ${s.cpu}% and the application returns 5xx errors. The CloudWatch alarm goes into ALARM, but **a Fargate task's CPU and memory are set at the task level in the task definition**: the alarm cannot resize the running task. A bigger task needs a new task definition revision and a service update; the new task replaces the old one and the application still has **one task**, with no redundancy.` }) };
    }
    return { ok: true, msg: L({
      vi: `Lưu lượng tăng gấp ${x}. **Service Auto Scaling** (target tracking theo CPU trung bình của service) tăng desired count lên ${s.tasks} task; ALB phân phối request cho các task. Fargate cấp tài nguyên cho từng task, không có node nào cần bổ sung.`,
      en: `Traffic grows ${x}x. **Service Auto Scaling** (target tracking on the service's average CPU) raises the desired count to ${s.tasks} tasks; the ALB spreads requests across them. Fargate provides capacity for each task, so there are no nodes to add.` }) };
  }

  function step() {
    if (level >= MAX_LEVEL) return;
    const lv = level + 1;
    setLevel(lv);
    const e = platform === "eks" ? eksMessage(lv) : ecsMessage(lv);
    setLog((l) => [e, ...l].slice(0, 4));
  }

  const pick = (fn: () => void) => () => { fn(); reset(); };

  // ---------- drawing ----------
  let svg: JSX.Element;
  let stats: { k: Bi; v: string; tone?: "bad" | "ok" }[];
  if (platform === "eks") {
    const s = eksState(level, hpa, ca);
    const nodeW = 116, gap = 10, x0 = 170, y0 = 70;
    const nodes = Array.from({ length: MAX_NODES }, (_, i) => i);
    let podIdx = 0;
    svg = (
      <svg viewBox="0 20 820 200" role="img" aria-label={L({ vi: "Cluster EKS: các node EC2 trong Auto Scaling group, mỗi node chứa hai Pod; Pod không có chỗ nằm ở hàng chờ Pending", en: "EKS cluster: EC2 nodes in an Auto Scaling group, each holding two Pods; Pods with no room wait in the Pending queue" })}>
        <rect className="ctx-box" x={x0 - 12} y={y0 - 38} width={MAX_NODES * (nodeW + gap) + 10} height={150} rx={10} />
        <text className="ctx-s" x={x0} y={y0 - 20}>{L({ vi: "EC2 Auto Scaling group của node (max 5)", en: "Node EC2 Auto Scaling group (max 5)" })}</text>
        {nodes.map((i) => {
          const on = i < s.nodes;
          const isNew = on && i >= START_NODES;
          const x = x0 + i * (nodeW + gap);
          const pods = on ? Math.min(SLOTS, Math.max(0, s.running - i * SLOTS)) : 0;
          return (
            <g key={i} className={`ctx-node ${on ? (s.overloaded && pods === SLOTS ? "hot" : isNew ? "new" : "") : "off"}`}>
              <rect x={x} y={y0} width={nodeW} height={96} rx={8} />
              <text className="ctx-t" x={x + nodeW / 2} y={y0 + 18} textAnchor="middle">{`Node ${i + 1}`}</text>
              {Array.from({ length: SLOTS }, (_, j) => {
                const px = x + 8 + j * 52;
                if (j < pods) {
                  podIdx++;
                  return (
                    <g key={j}>
                      <rect className={`ctx-pod ${s.overloaded ? "hot" : ""}`} x={px} y={y0 + 30} width={48} height={52} rx={6} />
                      <text className="ctx-p" x={px + 24} y={y0 + 54} textAnchor="middle">{`Pod ${podIdx}`}</text>
                      <text className="ctx-p" x={px + 24} y={y0 + 70} textAnchor="middle">{`${Math.min(s.cpu, 999)}%`}</text>
                    </g>
                  );
                }
                return <rect key={j} className="ctx-slot" x={px} y={y0 + 30} width={48} height={52} rx={6} />;
              })}
            </g>
          );
        })}
        <text className="ctx-t" x={70} y={y0 - 20} textAnchor="middle">Pending</text>
        {Array.from({ length: Math.min(s.pending, 6) }, (_, i) => (
          <g key={i}>
            <rect className="ctx-pod pend" x={22 + (i % 2) * 52} y={y0 + (Math.floor(i / 2)) * 44 - 4} width={46} height={38} rx={6} />
            <text className="ctx-p" x={45 + (i % 2) * 52} y={y0 + Math.floor(i / 2) * 44 + 19} textAnchor="middle">Pod</text>
          </g>
        ))}
        {s.pending === 0 && <text className="ctx-s" x={70} y={y0 + 40} textAnchor="middle">{L({ vi: "(trống)", en: "(empty)" })}</text>}
      </svg>
    );
    stats = [
      { k: { vi: "Lưu lượng", en: "Traffic" }, v: `x${level + 1}` },
      { k: { vi: "Replica (HPA)", en: "Replicas (HPA)" }, v: String(s.pods) },
      { k: { vi: "Pod đang chạy", en: "Running Pods" }, v: String(s.running) },
      { k: { vi: "Pod Pending", en: "Pending Pods" }, v: String(s.pending), tone: s.pending ? "bad" : undefined },
      { k: { vi: "Node", en: "Nodes" }, v: String(s.nodes), tone: s.nodes > START_NODES ? "ok" : undefined },
      { k: { vi: "CPU/Pod", en: "CPU per Pod" }, v: `${s.cpu}%`, tone: s.overloaded ? "bad" : "ok" },
    ];
  } else {
    const s = ecsState(level, mode);
    const tw = 116, gap = 16, x0 = 250;
    svg = (
      <svg viewBox="0 20 820 200" role="img" aria-label={L({ vi: "ALB phân phối request tới các task ECS trên Fargate", en: "An ALB spreads requests across ECS tasks on Fargate" })}>
        <g className="ctx-node">
          <rect x={40} y={92} width={130} height={56} rx={8} />
          <text className="ctx-t" x={105} y={116} textAnchor="middle">{mode === "sas" ? "ALB" : L({ vi: "Endpoint", en: "Endpoint" })}</text>
          <text className="ctx-s" x={105} y={133} textAnchor="middle">{L({ vi: "request người dùng", en: "user requests" })}</text>
        </g>
        <rect className="ctx-box" x={x0 - 14} y={34} width={4 * (tw + gap) + 12} height={176} rx={10} />
        <text className="ctx-s" x={x0} y={52}>{L({ vi: "ECS service trên Fargate", en: "ECS service on Fargate" })}</text>
        {Array.from({ length: s.tasks }, (_, i) => (
          <path key={i} className="ctx-wire" d={`M170 120 H215 V76 H${x0 + i * (tw + gap) + tw / 2} V92`} />
        ))}
        {Array.from({ length: 4 }, (_, i) => {
          const on = i < s.tasks;
          const x = x0 + i * (tw + gap);
          return (
            <g key={i}>
              <g className={`ctx-node ${on ? (s.overloaded ? "hot" : i > 0 ? "new" : "") : "off"}`}>
                <rect x={x} y={92} width={tw} height={76} rx={8} />
                <text className="ctx-t" x={x + tw / 2} y={114} textAnchor="middle">{`Task ${i + 1}`}</text>
                <text className="ctx-s" x={x + tw / 2} y={132} textAnchor="middle">1 vCPU · 2 GB</text>
                {on && <text className="ctx-p" x={x + tw / 2} y={152} textAnchor="middle">{`CPU ${s.cpu}%`}</text>}
              </g>
            </g>
          );
        })}
      </svg>
    );
    stats = [
      { k: { vi: "Lưu lượng", en: "Traffic" }, v: `x${level + 1}` },
      { k: { vi: "Task", en: "Tasks" }, v: String(s.tasks), tone: s.tasks > 1 ? "ok" : undefined },
      { k: { vi: "CPU/task", en: "CPU per task" }, v: `${s.cpu}%`, tone: s.overloaded ? "bad" : "ok" },
      { k: { vi: "Lỗi 5xx", en: "5xx errors" }, v: s.overloaded ? L({ vi: "có", en: "yes" }) : L({ vi: "không", en: "no" }), tone: s.overloaded ? "bad" : "ok" },
    ];
  }

  return (
    <div className="stage ctx">
      <div className="ctx-row" role="group" aria-label={L({ vi: "Nền tảng", en: "Platform" })}>
        <span className="ctx-lbl">{L({ vi: "Nền tảng", en: "Platform" })}</span>
        <button className="chip" aria-pressed={platform === "eks"} onClick={pick(() => setPlatform("eks"))}>{L({ vi: "EKS · node EC2", en: "EKS · EC2 nodes" })}</button>
        <button className="chip" aria-pressed={platform === "ecs"} onClick={pick(() => setPlatform("ecs"))}>{L({ vi: "ECS · Fargate", en: "ECS · Fargate" })}</button>
      </div>
      <div className="ctx-row" role="group" aria-label={L({ vi: "Cấu hình mở rộng", en: "Scaling configuration" })}>
        <span className="ctx-lbl">{L({ vi: "Cấu hình", en: "Setup" })}</span>
        {platform === "eks" ? (
          <>
            <label className="ctx-toggle"><input type="checkbox" checked={hpa} onChange={pick(() => setHpa((v) => !v))} />Horizontal Pod Autoscaler</label>
            <label className="ctx-toggle"><input type="checkbox" checked={ca} onChange={pick(() => setCa((v) => !v))} />Cluster Autoscaler</label>
          </>
        ) : (
          <>
            <button className="chip" aria-pressed={mode === "single"} onClick={pick(() => setMode("single"))}>{L({ vi: "1 task + CloudWatch alarm tăng CPU/RAM", en: "1 task + CloudWatch alarm to add CPU/memory" })}</button>
            <button className="chip" aria-pressed={mode === "sas"} onClick={pick(() => setMode("sas"))}>{L({ vi: "Service Auto Scaling + ALB", en: "Service Auto Scaling + ALB" })}</button>
          </>
        )}
      </div>
      <div className="ctx-stats" aria-live="polite">
        {stats.map((x) => (
          <div key={x.k.en} className={`ctx-stat ${x.tone ?? ""}`}><span>{L(x.k)}</span><b>{x.v}</b></div>
        ))}
      </div>
      <div className="svg-wrap">{svg}</div>
      <div className="stage-bar">
        <button className="btn" onClick={reset} disabled={level === 0}>{L({ vi: "Đặt lại", en: "Reset" })}</button>
        <button className="btn primary" onClick={step} disabled={level >= MAX_LEVEL}>{L({ vi: "Tăng lưu lượng", en: "Increase traffic" })}</button>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="ctx-hint">{L({
            vi: platform === "eks" ? "Chọn cấu hình, sau đó nhấn Tăng lưu lượng ba lần. Thử lần lượt: không bật gì, chỉ HPA, chỉ Cluster Autoscaler, cả hai." : "Chọn cách mở rộng, sau đó nhấn Tăng lưu lượng ba lần và so sánh hai cách.",
            en: platform === "eks" ? "Choose a setup, then press Increase traffic three times. Try in turn: nothing, HPA only, Cluster Autoscaler only, both." : "Choose how to scale, then press Increase traffic three times and compare the two approaches." })}</p>
        ) : (
          <ul className="log">
            {log.map((e, i) => (
              <li key={log.length - i}>
                <span className={`tag ${e.ok ? "hit" : "bad"}`}>{e.ok ? "OK" : L({ vi: "QUÁ TẢI", en: "OVERLOAD" })}</span>
                <span>{rich(e.msg)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
