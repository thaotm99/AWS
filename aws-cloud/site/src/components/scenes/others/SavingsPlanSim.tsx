import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./savings-plan-sim.css";

// MFTECH's steady workloads after launch: EC2 in two Regions, Fargate, Lambda and a
// SageMaker inference endpoint. Tick the Savings Plans to buy, press apply, and the
// discount travels from each plan to every workload it covers. Goal: every workload
// discounted with as few plans as possible.

type PlanId = "ec2i" | "compute" | "sm";
type WorkId = "web" | "batch" | "fargate" | "lambda" | "sm";

const PLANS: { id: PlanId; l1: string; l2: Bi; y: number }[] = [
  { id: "ec2i", l1: "EC2 Instance Savings Plans", l2: { vi: "family m5 · Singapore", en: "m5 family · Singapore" }, y: 70 },
  { id: "compute", l1: "Compute Savings Plans", l2: { vi: "mọi family, mọi Region", en: "any family, any Region" }, y: 150 },
  { id: "sm", l1: "SageMaker AI Savings Plans", l2: { vi: "mọi loại instance SageMaker AI", en: "any SageMaker AI instance type" }, y: 230 },
];
const WORKS: { id: WorkId; l1: Bi; l2: Bi; y: number }[] = [
  { id: "web", l1: { vi: "EC2 web", en: "EC2 web" }, l2: { vi: "m5 · Singapore", en: "m5 · Singapore" }, y: 50 },
  { id: "batch", l1: { vi: "EC2 xử lý ảnh", en: "EC2 image processing" }, l2: { vi: "c6g · Tokyo", en: "c6g · Tokyo" }, y: 100 },
  { id: "fargate", l1: { vi: "ECS trên Fargate", en: "ECS on Fargate" }, l2: { vi: "API đơn hàng", en: "order API" }, y: 150 },
  { id: "lambda", l1: { vi: "AWS Lambda", en: "AWS Lambda" }, l2: { vi: "xử lý sự kiện", en: "event processing" }, y: 200 },
  { id: "sm", l1: { vi: "SageMaker", en: "SageMaker" }, l2: { vi: "endpoint gợi ý sản phẩm", en: "product recommendation endpoint" }, y: 250 },
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

function verdict(sel: PlanId[]): { ok: boolean; text: Bi } {
  const covered = new Set(sel.flatMap((p) => COVERS[p]));
  const missing = WORKS.filter((w) => !covered.has(w.id)).map((w) => w.l1.vi);
  const missingEn = WORKS.filter((w) => !covered.has(w.id)).map((w) => w.l1.en);
  if (sel.length === 0) return { ok: false, text: { vi: "Chưa mua plan nào: mọi workload chạy theo giá On-Demand.", en: "No plan bought yet: every workload runs at On-Demand prices." } };
  if (missing.length) {
    let why = "";
    let whyEn = "";
    if (!sel.includes("compute")) {
      why += sel.includes("ec2i")
        ? " EC2 Instance Savings Plans chỉ giảm giá cho **một instance family trong một Region**, không áp dụng cho Fargate hay Lambda."
        : " Loại plan áp dụng đồng thời cho EC2, Fargate và Lambda là **Compute Savings Plans**.";
      whyEn += sel.includes("ec2i")
        ? " EC2 Instance Savings Plans discount only **one instance family in one Region** and do not apply to Fargate or Lambda."
        : " The plan type that applies to EC2, Fargate and Lambda together is **Compute Savings Plans**.";
    }
    if (missing.includes("SageMaker")) {
      why += " **SageMaker không thuộc phạm vi Compute Savings Plans** mà có SageMaker AI Savings Plans riêng.";
      whyEn += " **SageMaker is outside the scope of Compute Savings Plans** and has its own SageMaker AI Savings Plans.";
    }
    return { ok: false, text: { vi: `Vẫn chạy theo giá On-Demand: ${missing.join(", ")}.${why}`, en: `Still running at On-Demand prices: ${missingEn.join(", ")}.${whyEn}` } };
  }
  if (sel.includes("ec2i")) return { ok: false, text: { vi: "Đã áp dụng cho mọi workload nhưng **dư một plan**: Compute Savings Plans đã giảm giá cho EC2 web. Bỏ EC2 Instance Savings Plans để giảm số plan cần quản lý.",
    en: "Applied to every workload, but with **one plan too many**: Compute Savings Plans already discount EC2 web. Drop EC2 Instance Savings Plans to reduce the number of plans to manage." } };
  return { ok: true, text: { vi: "Hai plan áp dụng cho cả năm workload: **Compute Savings Plans** cho EC2 (mọi instance family, mọi Region), Fargate và Lambda; **SageMaker AI Savings Plans** cho SageMaker. Không cần thay đổi kiến trúc.",
    en: "Two plans cover all five workloads: **Compute Savings Plans** for EC2 (any instance family, any Region), Fargate and Lambda; **SageMaker AI Savings Plans** for SageMaker. No architecture change needed." } };
}

export default function SavingsPlanSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Mua", en: "Buy" })}</span>
        {PLANS.map((p) => (
          <button key={p.id} className="btn" aria-pressed={sel.includes(p.id)} disabled={busy} onClick={() => toggle(p.id)}>
            {p.l1}
          </button>
        ))}
        <button className="btn primary ml-auto" onClick={apply} disabled={busy}>{L({ vi: "Áp dụng giảm giá", en: "Apply discounts" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 290" role="img" aria-label={L({ vi: "Các Savings Plans ở bên trái, workload của MFTECH ở bên phải; đường nối thể hiện plan giảm giá cho workload", en: "Savings Plans on the left, MFTECH workloads on the right; lines show which plan discounts which workload" })}>
          <text className="sav-cap" x={PX} y={22} textAnchor="middle">Savings Plans</text>
          <text className="sav-cap" x={WX} y={22} textAnchor="middle">{L({ vi: "Workload có tải ổn định", en: "Steady-state workloads" })}</text>
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
              <text className="sav-s" x={PX} y={p.y + 13} textAnchor="middle">{L(p.l2)}</text>
            </g>
          ))}
          {WORKS.map((w) => (
            <g key={w.id} className={"sav-node" + (lit.includes(w.id) ? " ok" : done ? " bad" : "")}>
              <rect x={WX - WW / 2} y={w.y - 19} width={WW} height={38} rx={8} />
              <text className="sav-t" x={WX} y={w.y - 3} textAnchor="middle">{L(w.l1)}</text>
              <text className="sav-s" x={WX} y={w.y + 12} textAnchor="middle">{lit.includes(w.id) ? L({ vi: "giá Savings Plans", en: "Savings Plans price" }) : done ? L({ vi: "giá On-Demand", en: "On-Demand price" }) : L(w.l2)}</text>
            </g>
          ))}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!done ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn các Savings Plans cần mua, sau đó chọn <b>Áp dụng giảm giá</b>. Mục tiêu: mọi workload được giảm giá với số plan tối thiểu.</>, en: <>Choose the Savings Plans to buy, then choose <b>Apply discounts</b>. Goal: every workload discounted with the fewest plans.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className={"pill " + (coveredCount === WORKS.length ? "ok" : "bad")}><i />{coveredCount}/{WORKS.length} {L({ vi: "workload được giảm giá", en: "workloads discounted" })}</span>
              <span className="count">{sel.length} {L({ vi: "plan", en: sel.length === 1 ? "plan" : "plans" })}</span>
            </div>
            <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (v.ok ? "bg-ok-soft" : "bg-bad-soft")}>{rich(L(v.text))}</p>
          </>
        )}
      </div>
    </div>
  );
}
