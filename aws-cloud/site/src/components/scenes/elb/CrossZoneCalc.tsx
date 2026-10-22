import { useId, useState } from "react";
import { useLang } from "../../../lib/lang";

// Traffic share per target with cross-zone load balancing on or off. DNS splits traffic
// evenly between the load balancer nodes (one per AZ) (exam3_q14, exam4_q59).
export default function CrossZoneCalc() {
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
  const [a, setA] = useState(1);
  const [b, setB] = useState(4);
  const [cross, setCross] = useState(true);
  const total = a + b;
  const share = (az: "a" | "b") => (cross ? 100 / total : 50 / (az === "a" ? a : b));
  const pct = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString(L({ vi: "vi-VN", en: "en-US" }))}%`;

  const column = (az: "a" | "b", n: number) => (
    <div className="cz-az">
      <div className="cz-head">
        <b>AZ {az.toUpperCase()}</b>
        <span className="count">{L({ vi: "node của LB nhận 50% traffic từ DNS", en: "LB node gets 50% of traffic from DNS" })}</span>
      </div>
      <div className="cz-targets">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="cz-target">
            <div className="cz-bar"><i style={{ height: `${Math.min(100, share(az) * 2)}%` }} /></div>
            <span>{pct(share(az))}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="stage">
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-czA`}>{L({ vi: "Số target tại AZ A", en: "Targets in AZ A" })}: {a}</label>
        <input id={`${uid}-czA`} type="range" min={1} max={8} value={a} onChange={(e) => setA(Number(e.target.value))} />
        <label className="label" htmlFor={`${uid}-czB`}>{L({ vi: "Số target tại AZ B", en: "Targets in AZ B" })}: {b}</label>
        <input id={`${uid}-czB`} type="range" min={1} max={8} value={b} onChange={(e) => setB(Number(e.target.value))} />
        <span className="sep" />
        <button className="btn" aria-pressed={cross} onClick={() => setCross(true)}>{L({ vi: "Cross-zone bật", en: "Cross-zone on" })}</button>
        <button className="btn" aria-pressed={!cross} onClick={() => setCross(false)}>{L({ vi: "Cross-zone tắt", en: "Cross-zone off" })}</button>
      </div>
      <div className="cz-grid">{column("a", a)}{column("b", b)}</div>
      <div className="readout" aria-live="polite">
        {cross
          ? L({ vi: <>Cross-zone bật: mỗi node phân phối traffic cho <b>mọi target trên mọi AZ</b>, do đó mỗi target nhận 100% ÷ {total} = {pct(100 / total)}.</>,
              en: <>Cross-zone on: each node distributes traffic to <b>every target in every AZ</b>, so each target gets 100% ÷ {total} = {pct(100 / total)}.</> })
          : L({ vi: <>Cross-zone tắt: mỗi node chỉ phân phối cho các target <b>cùng AZ</b>. Mỗi target tại AZ A nhận 50% ÷ {a} = {pct(50 / a)}, tại AZ B nhận 50% ÷ {b} = {pct(50 / b)}. Tại AZ có ít target, mỗi target phải tiếp nhận tải lớn hơn.</>,
              en: <>Cross-zone off: each node distributes only to targets <b>in the same AZ</b>. Each target in AZ A gets 50% ÷ {a} = {pct(50 / a)}, and each in AZ B gets 50% ÷ {b} = {pct(50 / b)}. In the AZ with fewer targets, each target has to take more load.</> })}
        <p className="note-small">{L({ vi: "Cấu hình mặc định: ALB luôn bật cross-zone ở cấp load balancer (có thể tắt ở cấp target group); NLB và GWLB tắt cross-zone.",
          en: "Defaults: ALB always has cross-zone on at the load balancer level (it can be turned off at the target group level); NLB and GWLB have cross-zone off." })}</p>
      </div>
    </div>
  );
}
