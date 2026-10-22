import { useState } from "react";

// Traffic share per target with cross-zone load balancing on or off. DNS splits traffic
// evenly between the load balancer nodes (one per AZ) (exam3_q14, exam4_q59).
export default function CrossZoneCalc() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(4);
  const [cross, setCross] = useState(true);
  const total = a + b;
  const share = (az: "a" | "b") => (cross ? 100 / total : 50 / (az === "a" ? a : b));
  const pct = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString("vi-VN")}%`;

  const column = (az: "a" | "b", n: number) => (
    <div className="cz-az">
      <div className="cz-head">
        <b>AZ {az.toUpperCase()}</b>
        <span className="count">node của LB nhận 50% từ DNS</span>
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
        <label className="label" htmlFor="czA">Target ở AZ A: {a}</label>
        <input id="czA" type="range" min={1} max={8} value={a} onChange={(e) => setA(Number(e.target.value))} />
        <label className="label" htmlFor="czB">Target ở AZ B: {b}</label>
        <input id="czB" type="range" min={1} max={8} value={b} onChange={(e) => setB(Number(e.target.value))} />
        <span className="sep" />
        <button className="btn" aria-pressed={cross} onClick={() => setCross(true)}>Cross-zone bật</button>
        <button className="btn" aria-pressed={!cross} onClick={() => setCross(false)}>Cross-zone tắt</button>
      </div>
      <div className="cz-grid">{column("a", a)}{column("b", b)}</div>
      <div className="readout" aria-live="polite">
        {cross
          ? <>Cross-zone bật: mỗi node chia traffic cho <b>mọi target ở mọi AZ</b>, nên mỗi target nhận 100% ÷ {total} = {pct(100 / total)}.</>
          : <>Cross-zone tắt: mỗi node chỉ chia cho target <b>cùng AZ</b>. Mỗi target ở AZ A nhận 50% ÷ {a} = {pct(50 / a)}, ở AZ B nhận 50% ÷ {b} = {pct(50 / b)}. AZ ít target thì từng target bị dồn tải.</>}
        <p className="note-small">Mặc định: ALB bật cross-zone; NLB và GWLB tắt cross-zone.</p>
      </div>
    </div>
  );
}
