import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./asg-sims.css";

// Building the ShopViet web Auto Scaling group: launch template vs launch configuration,
// subnets (AZs of one Region only), and purchase options of a mixed instances group
// (On-Demand base capacity + On-Demand percentage above base, the rest Spot).

const SUBNETS = [
  { id: "a", az: "ap-southeast-1a", region: "ap-southeast-1" },
  { id: "b", az: "ap-southeast-1b", region: "ap-southeast-1" },
  { id: "c", az: "ap-southeast-1c", region: "ap-southeast-1" },
  { id: "x", az: "us-east-1a", region: "us-east-1" },
];
const PCTS = [100, 50, 25, 0];

/** Instances by purchase option, as the mixed instances docs describe (round up in favor of On-Demand). */
export function mix(desired: number, baseOd: number, pct: number) {
  const base = Math.min(desired, baseOd);
  const rest = desired - base;
  const od = Math.ceil((rest * pct) / 100);
  return { base, od, spot: rest - od };
}

export default function GroupSetupSim() {
  const L = useLang();
  const [lt, setLt] = useState(true);
  const [subnets, setSubnets] = useState<string[]>(["a", "b"]);
  const [baseOd, setBaseOd] = useState(4);
  const [pct, setPct] = useState(25);
  const [desired, setDesired] = useState(8);

  const chosen = SUBNETS.filter((s) => subnets.includes(s.id));
  const regions = [...new Set(chosen.map((s) => s.region))];
  const azs = chosen.filter((s) => s.region === "ap-southeast-1");
  const m = lt ? mix(desired, baseOd, pct) : { base: 0, od: desired, spot: 0 };

  const issues: { ok: boolean; text: Bi }[] = [];
  if (regions.length > 1)
    issues.push({ ok: false, text: { vi: "Không tạo được: Auto Scaling group là tài nguyên theo Region, trải được trên nhiều AZ nhưng **không trải được trên nhiều Region**. Subnet us-east-1a cần một ASG riêng tại us-east-1.", en: "Cannot create: an Auto Scaling group is a regional construct; it can span Availability Zones but **not AWS Regions**. The us-east-1a subnet needs a separate ASG in us-east-1." } });
  if (chosen.length === 0)
    issues.push({ ok: false, text: { vi: "Cần chọn ít nhất một subnet.", en: "Choose at least one subnet." } });
  else if (azs.length === 1 && regions.length === 1)
    issues.push({ ok: false, text: { vi: "Chỉ một AZ: khi AZ đó gặp sự cố, toàn bộ nhóm ngừng phục vụ. AWS khuyến nghị trải ASG trên nhiều AZ.", en: "A single AZ: if that AZ fails, the whole group stops serving. AWS recommends spanning the ASG across multiple AZs." } });
  else if (regions.length === 1)
    issues.push({ ok: true, text: { vi: `Trải trên ${azs.length} AZ trong ap-southeast-1; ASG cố gắng phân bổ đều instance giữa các AZ.`, en: `Spans ${azs.length} AZs in ap-southeast-1; the ASG tries to distribute instances evenly across the AZs.` } });
  if (!lt)
    issues.push({ ok: false, text: { vi: "Launch configuration không hỗ trợ kết hợp On-Demand với Spot hay nhiều instance type. AWS khuyến nghị dùng **launch template**.", en: "A launch configuration does not support combining On-Demand and Spot or multiple instance types. AWS recommends a **launch template**." } });

  const valid = regions.length === 1 && chosen.length > 0;
  const perAz = valid ? azs.map((_, i) => Math.floor(desired / azs.length) + (i < desired % azs.length ? 1 : 0)) : [];
  // Order of boxes: base On-Demand first, then On-Demand above base, then Spot.
  const kinds = [...Array(m.base).fill("base"), ...Array(m.od).fill("od"), ...Array(m.spot).fill("spot")] as string[];
  let k = 0;

  return (
    <div className="stage gss">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Cấu hình launch", en: "Launch settings" })}</span>
        <button className="btn" aria-pressed={lt} onClick={() => setLt(true)}>Launch template</button>
        <button className="btn" aria-pressed={!lt} onClick={() => setLt(false)}>{L({ vi: "Launch configuration (cũ)", en: "Launch configuration (legacy)" })}</button>
      </div>
      <p className="sps-about">{lt
        ? L({ vi: "Launch template lt-shopviet-web, phiên bản 3: AMI của ứng dụng, instance type, key pair, security group, user data. Mỗi lần đổi AMI, tạo phiên bản mới thay vì tạo lại từ đầu.", en: "Launch template lt-shopviet-web, version 3: the application AMI, instance type, key pair, security group, user data. Each AMI change becomes a new version instead of a new resource." })
        : L({ vi: "Launch configuration chứa cùng loại thông tin nhưng không có phiên bản và không sửa được sau khi tạo.", en: "A launch configuration holds the same kind of information, but has no versions and cannot be modified after creation." })}</p>
      <div className="stage-bar">
        <span className="label">Subnets</span>
        {SUBNETS.map((s) => (
          <button key={s.id} className="chip" aria-pressed={subnets.includes(s.id)} onClick={() => setSubnets(subnets.includes(s.id) ? subnets.filter((x) => x !== s.id) : [...subnets, s.id])}>
            {s.az}{s.region !== "ap-southeast-1" ? L({ vi: " (Region khác)", en: " (other Region)" }) : ""}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Purchase options", en: "Purchase options" })}</span>
        <label className="gss-field">
          <span>{L({ vi: "On-Demand base", en: "On-Demand base" })}: <b>{lt ? baseOd : "—"}</b></span>
          <input type="range" min={0} max={10} value={baseOd} disabled={!lt} onChange={(e) => setBaseOd(Number(e.target.value))} aria-label="On-Demand base capacity" />
        </label>
        <span className="gss-field"><span>{L({ vi: "On-Demand trên phần base", en: "On-Demand above base" })}</span>
          <span className="gss-chips">{PCTS.map((p) => (
            <button key={p} className="chip" aria-pressed={pct === p} disabled={!lt} onClick={() => setPct(p)}>{p}%</button>
          ))}</span>
        </span>
        <label className="gss-field">
          <span>{L({ vi: "Desired capacity", en: "Desired capacity" })}: <b>{desired}</b></span>
          <input type="range" min={2} max={20} value={desired} onChange={(e) => setDesired(Number(e.target.value))} aria-label="Desired capacity" />
        </label>
      </div>
      {valid && (
        <div className="hrs-grid gss-azs">
          {azs.map((s, i) => (
            <div key={s.id} className="term-az">
              <b>{s.az}</b>
              <div className="gss-insts">
                {Array.from({ length: perAz[i] }, () => kinds[k++]).map((kind, j) => <span key={j} className={`gss-inst ${kind}`} title={kind} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="readout" aria-live="polite">
        {valid && (
          <div className="status">
            <span className="gss-key"><span className="gss-inst base" />{L({ vi: `On-Demand base: ${m.base}`, en: `On-Demand base: ${m.base}` })}</span>
            <span className="gss-key"><span className="gss-inst od" />{L({ vi: `On-Demand: ${m.od}`, en: `On-Demand: ${m.od}` })}</span>
            <span className="gss-key"><span className="gss-inst spot" />{`Spot: ${m.spot}`}</span>
          </div>
        )}
        <ul className="gss-issues">
          {issues.map((x, i) => <li key={i} className={x.ok ? "ok" : "bad"}>{rich(L(x.text))}</li>)}
          {lt && valid && <li className="ok">{rich(L({ vi: "Mixed instances policy: phần **base** luôn là On-Demand (ASG launch đủ base trước khi launch Spot); phần vượt base chia theo tỉ lệ phần trăm, làm tròn lên về phía On-Demand. Reserved Instances hoặc Savings Plans giảm giá cho các instance On-Demand, Spot giảm chi phí cho phần tải tăng thêm của ứng dụng stateless.", en: "Mixed instances policy: the **base** is always On-Demand (the ASG launches the base before any Spot); capacity above base is split by percentage, rounded up in favor of On-Demand. Reserved Instances or Savings Plans discount the On-Demand instances, while Spot lowers the cost of the extra capacity of a stateless application." }))}</li>}
        </ul>
      </div>
    </div>
  );
}
