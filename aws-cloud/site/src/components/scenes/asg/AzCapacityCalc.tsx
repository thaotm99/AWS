import { useId, useState } from "react";
import { useLang } from "../../../lib/lang";
import "./asg-sims.css";

// How many instances, in how many AZs, keep the required minimum running after one AZ
// fails (exam2_q31, exam5_q61).
export default function AzCapacityCalc() {
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
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
        <label className="label" htmlFor={`${uid}-needN`}>{L({ vi: "Số instance tối thiểu", en: "Minimum instances" })}: {need}</label>
        <input id={`${uid}-needN`} type="range" min={2} max={12} value={need} onChange={(e) => setNeed(Number(e.target.value))} />
        <span className="sep" />
        <span className="label">{L({ vi: "Số AZ", en: "AZs" })}</span>
        {[2, 3, 4].map((k) => (
          <button key={k} className="btn" aria-pressed={k === azs} onClick={() => setAzs(k)}>{L({ vi: `${k} AZ`, en: `${k} AZs` })}</button>
        ))}
        <span className="sep" />
        <button className="btn danger" aria-pressed={down} onClick={() => setDown(!down)}>{down ? L({ vi: "Khôi phục AZ 1", en: "Restore AZ 1" }) : L({ vi: "Mô phỏng sự cố AZ 1", en: "Simulate AZ 1 failure" })}</button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 p-3.5">
        {Array.from({ length: azs }, (_, i) => (
          <div key={i} className={"asg-zone" + (down && i === 0 ? " down" : "")}>
            <b>AZ {i + 1}</b>
            <div className="flex min-h-6 flex-wrap gap-1.5">
              {Array.from({ length: perAz }, (_, j) => <span key={j} className="asg-unit" aria-hidden="true" />)}
            </div>
            <span className="count">{L({ vi: `${perAz} instance`, en: `${perAz} instances` })}</span>
          </div>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className="count">{L({ vi: `Tổng: ${total} instance · còn lại khi mất 1 AZ: ${total - perAz}`, en: `Total: ${total} instances · left after losing 1 AZ: ${total - perAz}` })}</span>
          <span className={"pill " + (total === best ? "ok" : "bad")}><i />{total === best ? L({ vi: "Chi phí thấp nhất", en: "Lowest cost" }) : L({ vi: `Chưa tối ưu chi phí (tối thiểu ${best})`, en: `Not cost-optimal (minimum ${best})` })}</span>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          {L({ vi: `Mỗi AZ cần ⌈${need} ÷ (${azs} − 1)⌉ = ${perAz} instance để khi mất một AZ vẫn duy trì đủ ${need} instance.`,
            en: `Each AZ needs ⌈${need} ÷ (${azs} − 1)⌉ = ${perAz} instances so that ${need} instances still run after losing one AZ.` })}
          {" "}{L({ vi: "So sánh", en: "Compare" })}: {options.map((o) => `${o.k} AZ → ${o.total}`).join(", ")}.
        </p>
      </div>
    </div>
  );
}
