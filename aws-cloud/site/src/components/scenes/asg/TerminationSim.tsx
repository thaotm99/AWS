import { useState } from "react";

// Default termination policy, step by step (exam4_q16, exam2_q65):
// 1. AZ with the most instances; 2. instances using a launch configuration go before those
// using a launch template, oldest first; 3. closest to the next billing hour.
interface Inst { id: string; az: string; kind: "LT" | "LC"; age: number; label: string; billing: number }

const SCENARIOS: { name: string; instances: Inst[] }[] = [
  {
    name: "AZ-A 3 instance, AZ-B 4 instance",
    instances: [
      { id: "a1", az: "AZ-A", kind: "LT", age: 3, label: "template v1", billing: 40 },
      { id: "a2", az: "AZ-A", kind: "LT", age: 2, label: "template v2", billing: 15 },
      { id: "a3", az: "AZ-A", kind: "LT", age: 1, label: "template v3", billing: 30 },
      { id: "b1", az: "AZ-B", kind: "LT", age: 2, label: "template v2", billing: 10 },
      { id: "b2", az: "AZ-B", kind: "LT", age: 3, label: "template v1", billing: 50 },
      { id: "b3", az: "AZ-B", kind: "LT", age: 1, label: "template v3", billing: 5 },
      { id: "b4", az: "AZ-B", kind: "LT", age: 1, label: "template v3", billing: 25 },
    ],
  },
  {
    name: "4 instance trong một AZ",
    instances: [
      { id: "A", az: "us-east-1a", kind: "LT", age: 3, label: "launch template cũ nhất", billing: 30 },
      { id: "B", az: "us-east-1a", kind: "LC", age: 3, label: "launch configuration cũ nhất", billing: 45 },
      { id: "C", az: "us-east-1a", kind: "LC", age: 1, label: "launch configuration mới nhất", billing: 20 },
      { id: "D", az: "us-east-1a", kind: "LT", age: 1, label: "gần giờ tính phí nhất", billing: 2 },
      { id: "E", az: "us-east-1b", kind: "LT", age: 2, label: "launch template", billing: 35 },
      { id: "F", az: "us-east-1b", kind: "LT", age: 2, label: "launch template", billing: 12 },
    ],
  },
];

function decide(list: Inst[]) {
  const steps: { text: string; keep: string[] }[] = [];
  const counts: Record<string, number> = {};
  list.forEach((i) => (counts[i.az] = (counts[i.az] ?? 0) + 1));
  const max = Math.max(...Object.values(counts));
  const azs = Object.keys(counts).filter((k) => counts[k] === max);
  let pool = list.filter((i) => azs.includes(i.az));
  steps.push({ text: `Chọn AZ có nhiều instance nhất: ${azs.join(", ")} (${max} instance), nhằm duy trì cân bằng giữa các AZ.`, keep: pool.map((i) => i.id) });
  const lc = pool.filter((i) => i.kind === "LC");
  if (lc.length) {
    const oldest = Math.max(...lc.map((i) => i.age));
    pool = lc.filter((i) => i.age === oldest);
    steps.push({ text: "Có instance dùng launch configuration: các instance này bị terminate trước instance dùng launch template. Trong nhóm đó, chọn instance có cấu hình cũ nhất.", keep: pool.map((i) => i.id) });
  } else {
    const oldest = Math.max(...pool.map((i) => i.age));
    pool = pool.filter((i) => i.age === oldest);
    steps.push({ text: "Chọn instance dùng launch template cũ nhất.", keep: pool.map((i) => i.id) });
  }
  if (pool.length > 1) {
    const min = Math.min(...pool.map((i) => i.billing));
    pool = pool.filter((i) => i.billing === min);
    steps.push({ text: "Vẫn còn nhiều instance: chọn instance gần giờ tính phí tiếp theo nhất.", keep: pool.map((i) => i.id) });
  }
  return { steps, victim: pool[0].id };
}

export default function TerminationSim() {
  const [si, setSi] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const sc = SCENARIOS[si];
  const { steps, victim } = decide(sc.instances);
  const keep = shown ? steps[shown - 1].keep : sc.instances.map((i) => i.id);
  const azs = [...new Set(sc.instances.map((i) => i.az))];
  const done = shown === steps.length;

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">Kịch bản</span>
        {SCENARIOS.map((s, i) => (
          <button key={s.name} className="btn" aria-pressed={i === si} onClick={() => { setSi(i); setGuess(null); setShown(0); }}>{s.name}</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={() => setShown(Math.min(steps.length, shown + 1))} disabled={!guess || done}>
          {shown === 0 ? "Scale in: quan sát từng bước đánh giá" : "Bước tiếp theo"}
        </button>
      </div>
      <div className="term-grid">
        {azs.map((az) => (
          <div key={az} className="term-az">
            <b>{az}</b>
            <div className="term-list">
              {sc.instances.filter((i) => i.az === az).map((i) => {
                const cls = ["term-inst", guess === i.id ? "guess" : "", keep.includes(i.id) ? "" : "out", done && i.id === victim ? "victim" : ""].filter(Boolean).join(" ");
                return (
                  <button key={i.id} className={cls} onClick={() => !shown && setGuess(i.id)} disabled={shown > 0}>
                    <span className="term-id">{i.id}</span>
                    <span>{i.label}</span>
                    <span className="term-meta">{i.kind === "LC" ? "launch configuration" : "launch template"} · còn {i.billing} phút tới giờ tính phí</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        {!guess && <p style={{ margin: 0 }}>ASG chuẩn bị scale in 1 instance. Chọn instance dự đoán sẽ bị terminate, sau đó quan sát từng bước đánh giá của ASG.</p>}
        {guess && (
          <ol className="term-steps">
            {steps.slice(0, shown).map((s, i) => <li key={i}>{s.text}</li>)}
          </ol>
        )}
        {done && (
          <span className={"pill " + (guess === victim ? "ok" : "bad")}><i />
            {guess === victim ? `Chính xác: ${victim} bị terminate` : `Chưa chính xác: ASG terminate ${victim}`}
          </span>
        )}
      </div>
    </div>
  );
}
