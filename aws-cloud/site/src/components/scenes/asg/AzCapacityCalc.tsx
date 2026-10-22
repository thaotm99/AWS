import { useState } from "react";

// How many instances, in how many AZs, keep the required minimum running after one AZ
// fails (exam2_q31, exam5_q61).
export default function AzCapacityCalc() {
  const [need, setNeed] = useState(4);
  const [azs, setAzs] = useState(2);
  const [down, setDown] = useState(false);
  const perAz = Math.ceil(need / (azs - 1));
  const total = perAz * azs;
  const options = [2, 3, 4].map((k) => ({ k, total: Math.ceil(need / (k - 1)) * k }));
  const best = Math.min(...options.map((o) => o.total));

  return (
    <div className="stage">
      <div className="stage-bar">
        <label className="label" htmlFor="needN">Luôn cần ít nhất: {need} instance</label>
        <input id="needN" type="range" min={2} max={12} value={need} onChange={(e) => setNeed(Number(e.target.value))} />
        <span className="sep" />
        <span className="label">Số AZ</span>
        {[2, 3, 4].map((k) => (
          <button key={k} className="btn" aria-pressed={k === azs} onClick={() => setAzs(k)}>{k} AZ</button>
        ))}
        <span className="sep" />
        <button className="btn danger" aria-pressed={down} onClick={() => setDown(!down)}>{down ? "Khôi phục AZ 1" : "Sập AZ 1"}</button>
      </div>
      <div className="cap-grid">
        {Array.from({ length: azs }, (_, i) => (
          <div key={i} className={"cap-az" + (down && i === 0 ? " down" : "")}>
            <b>AZ {i + 1}</b>
            <div className="cap-insts">
              {Array.from({ length: perAz }, (_, j) => <span key={j} className="cap-inst" aria-hidden="true" />)}
            </div>
            <span className="count">{perAz} instance</span>
          </div>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className="count">Tổng: {total} instance · còn lại khi mất 1 AZ: {total - perAz}</span>
          <span className={"pill " + (total === best ? "ok" : "bad")}><i />{total === best ? "Rẻ nhất" : `Chưa rẻ nhất (tối thiểu ${best})`}</span>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          Mỗi AZ cần ⌈{need} ÷ ({azs} − 1)⌉ = {perAz} instance để khi mất một AZ vẫn còn đủ {need}.
          So sánh: {options.map((o) => `${o.k} AZ → ${o.total}`).join(", ")}.
        </p>
      </div>
    </div>
  );
}
