import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./asg-sims.css";

// Minimum, maximum and desired capacity: scaling policies and scheduled actions move
// desired capacity, always inside [min, max]. Setting min = max = 10 for a peak hour
// locks the group; setting desired = 10 leaves room for the policies.

interface Cap { min: number; desired: number; max: number }
interface Action { id: string; name: Bi; apply: (c: Cap) => { next: Cap; ok: boolean; msg: Bi } }

const START: Cap = { min: 2, desired: 2, max: 12 };
const SCALE = 16;

const ACTIONS: Action[] = [
  {
    id: "sched-desired",
    name: { vi: "Scheduled action 8:45 ngày cuối tháng: desired = 10", en: "Scheduled action 8:45 on the last day of the month: desired = 10" },
    apply: (c) => ({ next: { ...c, desired: Math.min(c.max, Math.max(c.min, 10)) }, ok: true, msg: { vi: "Desired capacity = 10: ASG launch thêm instance cho tới khi đủ 10 trước giờ chạy bảng lương. Min và max giữ nguyên, nên các scaling policy vẫn điều chỉnh được trong khoảng [min, max].", en: "Desired capacity = 10: the ASG launches instances until there are 10 before payroll runs. Min and max are unchanged, so scaling policies can still adjust within [min, max]." } }),
  },
  {
    id: "sched-minmax",
    name: { vi: "Scheduled action: min = max = 10", en: "Scheduled action: min = max = 10" },
    apply: () => ({ next: { min: 10, desired: 10, max: 10 }, ok: false, msg: { vi: "Nhóm cũng có 10 instance, nhưng min = max = 10 khoá kích thước nhóm: không policy nào tăng hoặc giảm được. Cần thêm scheduled action khác để trả min/max về giá trị cũ, nếu không nhóm giữ 10 instance mãi.", en: "The group also gets 10 instances, but min = max = 10 locks its size: no policy can scale out or in. Another scheduled action is needed to restore min/max, or the group keeps 10 instances indefinitely." } }),
  },
  {
    id: "out",
    name: { vi: "Target tracking muốn 15 instance", en: "Target tracking wants 15 instances" },
    apply: (c) => {
      const d = Math.min(c.max, 15);
      return { next: { ...c, desired: d }, ok: d === 15, msg: d === 15
        ? { vi: "Desired capacity = 15.", en: "Desired capacity = 15." }
        : { vi: `Scaling policy không tăng desired capacity vượt maximum: desired dừng ở ${d}.`, en: `A scaling policy cannot raise desired capacity above the maximum: desired stops at ${d}.` } };
    },
  },
  {
    id: "in",
    name: { vi: "Tải giảm, target tracking muốn 1 instance", en: "Load drops, target tracking wants 1 instance" },
    apply: (c) => {
      const d = Math.max(c.min, 1);
      return { next: { ...c, desired: d }, ok: true, msg: d === 1
        ? { vi: "Desired capacity = 1.", en: "Desired capacity = 1." }
        : { vi: `Scaling policy không giảm desired capacity dưới minimum: desired dừng ở ${d}.`, en: `A scaling policy cannot lower desired capacity below the minimum: desired stops at ${d}.` } };
    },
  },
  {
    id: "sched-14",
    name: { vi: "Scheduled action: desired = 14 (không đổi max)", en: "Scheduled action: desired = 14 (max unchanged)" },
    apply: (c) => (14 <= c.max
      ? { next: { ...c, desired: 14 }, ok: true, msg: { vi: "Desired capacity = 14, vẫn trong giới hạn.", en: "Desired capacity = 14, within the limits." } }
      : { next: c, ok: false, msg: { vi: `Desired capacity phải nằm trong [min, max] = [${c.min}, ${c.max}]. Scheduled action chạy mà không đặt min/max mới thì dùng min/max hiện tại; cần đặt kèm maximum mới (ví dụ 14).`, en: `Desired capacity must be within [min, max] = [${c.min}, ${c.max}]. A scheduled action that sets no new min/max uses the current ones; include a new maximum (for example 14).` } }),
  },
];

export default function CapacityRangeSim() {
  const L = useLang();
  const [cap, setCap] = useState<Cap>(START);
  const [log, setLog] = useState<{ name: Bi; ok: boolean; msg: Bi }[]>([]);

  function run(a: Action) {
    const r = a.apply(cap);
    setCap(r.next);
    setLog([{ name: a.name, ok: r.ok, msg: r.msg }, ...log].slice(0, 4));
  }
  const pct = (v: number) => `${(v / SCALE) * 100}%`;

  return (
    <div className="stage crs">
      <div className="crs-actions" role="group" aria-label={L({ vi: "Thao tác", en: "Actions" })}>
        {ACTIONS.map((a) => <button key={a.id} className="btn" onClick={() => run(a)}>{L(a.name)}</button>)}
        <button className="btn crs-reset" onClick={() => { setCap(START); setLog([]); }}>{L({ vi: "Đặt lại: min 2 · desired 2 · max 12", en: "Reset: min 2 · desired 2 · max 12" })}</button>
      </div>
      <div className="crs-track" aria-hidden="true">
        <div className="crs-band" style={{ left: pct(cap.min), width: `calc(${pct(cap.max - cap.min)} + 2px)` }} />
        <div className="crs-mark min" style={{ left: pct(cap.min) }}><span>min {cap.min}</span></div>
        <div className="crs-mark max" style={{ left: pct(cap.max) }}><span>max {cap.max}</span></div>
        <div className="crs-mark desired" style={{ left: pct(cap.desired) }}><span>desired {cap.desired}</span></div>
      </div>
      <div className="crs-insts" role="img" aria-label={L({ vi: `${cap.desired} instance đang chạy`, en: `${cap.desired} instances running` })}>
        {Array.from({ length: cap.desired }, (_, i) => <span key={i} className="cap-inst" />)}
      </div>
      <div className="readout" aria-live="polite">
        <span className="count">min {cap.min} · desired {cap.desired} · max {cap.max}</span>
        {log.length === 0
          ? <p className="sps-hint">{L({ vi: "Phòng kế toán của MFTech chạy bảng lương lúc 9:00 ngày cuối tháng, cần 10 instance; ngày thường 2 instance là đủ. Thử từng thao tác và quan sát desired capacity.", en: "MFTech's accounting team runs payroll at 9:00 on the last day of the month and needs 10 instances; 2 are enough on normal days. Try each action and watch desired capacity." })}</p>
          : (
            <ol className="dps-log">
              {log.map((x, i) => (
                <li key={log.length - i} className={i === 0 ? "" : "crs-old"}>
                  <span className={"pill " + (x.ok ? "ok" : "bad")}><i />{L(x.name)}</span> {rich(L(x.msg))}
                </li>
              ))}
            </ol>
          )}
      </div>
    </div>
  );
}
