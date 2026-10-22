import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./savings-plan-sim.css";

// ShopViet's steady workloads after launch: EC2 in two Regions, Fargate, Lambda and a
// SageMaker inference endpoint. Tick the Savings Plans to buy, press apply, and the
// discount travels from each plan to every workload it covers. Goal: every workload
// discounted with as few plans as possible.

type PlanId = "ec2i" | "compute" | "sm";
type WorkId = "web" | "batch" | "fargate" | "lambda" | "sm";

const PLANS: { id: PlanId; l1: string; l2: string; y: number }[] = [
  { id: "ec2i", l1: "EC2 Instance Savings Plans", l2: "family m5 · Singapore", y: 70 },
  { id: "compute", l1: "Compute Savings Plans", l2: "mọi family, mọi Region", y: 150 },
  { id: "sm", l1: "SageMaker Savings Plans", l2: "mọi loại instance SageMaker", y: 230 },
];
const WORKS: { id: WorkId; l1: string; l2: string; y: number }[] = [
  { id: "web", l1: "EC2 web", l2: "m5 · Singapore", y: 50 },
  { id: "batch", l1: "EC2 xử lý ảnh", l2: "c6g · Tokyo", y: 100 },
  { id: "fargate", l1: "ECS trên Fargate", l2: "API đơn hàng", y: 150 },
  { id: "lambda", l1: "AWS Lambda", l2: "xử lý sự kiện", y: 200 },
  { id: "sm", l1: "SageMaker", l2: "endpoint gợi ý sản phẩm", y: 250 },
];
const COVERS: Record<PlanId, WorkId[]> = {
  ec2i: ["web"],
  compute: ["web", "batch", "fargate", "lambda"],
  sm: ["sm"],
};
const PX = 170;
const WX = 650;
const PW = 250;
const WW = 210;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function verdict(sel: PlanId[]): { ok: boolean; text: string } {
  const covered = new Set(sel.flatMap((p) => COVERS[p]));
  const missing = WORKS.filter((w) => !covered.has(w.id)).map((w) => w.l1);
  if (sel.length === 0) return { ok: false, text: "Chưa mua plan nào: mọi workload chạy theo giá on-demand." };
  if (missing.length) {
    let why = "";
    if (!sel.includes("compute")) {
      why += sel.includes("ec2i")
        ? " EC2 Instance Savings Plans chỉ giảm giá cho **một instance family trong một Region**, không áp dụng cho Fargate hay Lambda."
        : " Loại plan áp dụng đồng thời cho EC2, Fargate và Lambda là **Compute Savings Plans**.";
    }
    if (missing.includes("SageMaker")) why += " **SageMaker không thuộc phạm vi Compute Savings Plans** mà có Savings Plans riêng.";
    return { ok: false, text: `Vẫn chạy theo giá on-demand: ${missing.join(", ")}.${why}` };
  }
  if (sel.includes("ec2i")) return { ok: false, text: "Đã áp dụng cho mọi workload nhưng **dư một plan**: Compute Savings Plans đã giảm giá cho EC2 web. Bỏ EC2 Instance Savings Plans để giảm số plan cần quản lý." };
  return { ok: true, text: "Hai plan áp dụng cho cả năm workload: **Compute Savings Plans** cho EC2 (mọi instance family, mọi Region), Fargate và Lambda; **SageMaker Savings Plans** cho SageMaker. Không cần thay đổi kiến trúc." };
}

export default function SavingsPlanSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [sel, setSel] = useState<PlanId[]>(["ec2i"]);
  const [lit, setLit] = useState<WorkId[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function toggle(p: PlanId) {
    if (busy) return;
    setSel((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
    setLit([]);
    setDone(false);
  }

  async function apply() {
    const layer = fx.current;
    if (busy || !layer) return;
    setBusy(true);
    setLit([]);
    setDone(false);
    const fast = prefersReducedMotion();
    for (const p of PLANS.filter((x) => sel.includes(x.id))) {
      const from: Pt = [PX + PW / 2, p.y];
      await Promise.all(COVERS[p.id].map((w) => {
        const to = WORKS.find((x) => x.id === w)!;
        const mid = (from[0] + WX - WW / 2) / 2;
        return travel(layer, [from, [mid, p.y], [mid, to.y], [WX - WW / 2, to.y]], 700, "pkt-back").then(() => {
          if (alive.current) setLit((l) => (l.includes(w) ? l : [...l, w]));
        });
      }));
      if (!fast) await sleep(200);
    }
    if (!alive.current) return;
    setDone(true);
    setBusy(false);
  }

  const v = verdict(sel);
  const coveredCount = done ? lit.length : 0;

  return (
    <div className="stage sav">
      <div className="stage-bar">
        <span className="label">Mua</span>
        {PLANS.map((p) => (
          <button key={p.id} className="btn" aria-pressed={sel.includes(p.id)} disabled={busy} onClick={() => toggle(p.id)}>
            {p.l1}
          </button>
        ))}
        <button className="btn primary sav-play" onClick={apply} disabled={busy}>Áp dụng giảm giá</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 290" role="img" aria-label="Các Savings Plans ở bên trái, workload của ShopViet ở bên phải; đường nối thể hiện plan giảm giá cho workload">
          <text className="sav-cap" x={PX} y={22} textAnchor="middle">Savings Plans</text>
          <text className="sav-cap" x={WX} y={22} textAnchor="middle">Workload có tải ổn định</text>
          {PLANS.filter((p) => sel.includes(p.id)).flatMap((p) => COVERS[p.id].map((w) => {
            const to = WORKS.find((x) => x.id === w)!;
            const x1 = PX + PW / 2;
            const x2 = WX - WW / 2;
            const mid = (x1 + x2) / 2;
            return <path key={p.id + w} className="sav-link" d={`M${x1} ${p.y} H${mid} V${to.y} H${x2}`} />;
          }))}
          {PLANS.map((p) => (
            <g key={p.id} className={"sav-node plan" + (sel.includes(p.id) ? " on" : "")}>
              <rect x={PX - PW / 2} y={p.y - 22} width={PW} height={44} rx={8} />
              <text className="sav-t" x={PX} y={p.y - 3} textAnchor="middle">{p.l1}</text>
              <text className="sav-s" x={PX} y={p.y + 13} textAnchor="middle">{p.l2}</text>
            </g>
          ))}
          {WORKS.map((w) => (
            <g key={w.id} className={"sav-node" + (lit.includes(w.id) ? " ok" : done ? " bad" : "")}>
              <rect x={WX - WW / 2} y={w.y - 19} width={WW} height={38} rx={8} />
              <text className="sav-t" x={WX} y={w.y - 3} textAnchor="middle">{w.l1}</text>
              <text className="sav-s" x={WX} y={w.y + 12} textAnchor="middle">{lit.includes(w.id) ? "giá Savings Plans" : done ? "giá on-demand" : w.l2}</text>
            </g>
          ))}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!done ? (
          <p className="sav-hint">Chọn các Savings Plans cần mua, sau đó chọn <b>Áp dụng giảm giá</b>. Mục tiêu: mọi workload được giảm giá với số plan tối thiểu.</p>
        ) : (
          <>
            <div className="status">
              <span className={"pill " + (coveredCount === WORKS.length ? "ok" : "bad")}><i />{coveredCount}/{WORKS.length} workload được giảm giá</span>
              <span className="count">{sel.length} plan</span>
            </div>
            <p className={"sav-result " + (v.ok ? "ok" : "bad")}>{rich(v.text)}</p>
          </>
        )}
      </div>
    </div>
  );
}
