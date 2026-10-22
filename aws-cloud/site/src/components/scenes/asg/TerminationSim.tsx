import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";

// Default termination policy, step by step (exam4_q16, exam2_q65):
// 1. AZ with the most instances; 2. outdated configurations: launch configuration first,
// then the oldest launch template version; 3. if several remain, closest to the next billing hour.
interface Inst { id: string; az: string; kind: "LT" | "LC"; age: number; label: string | Bi; billing: number; prot?: boolean }

type Lang = ReturnType<typeof useLang>;

const SCENARIOS: { name: Bi; instances: Inst[] }[] = [
  {
    name: { vi: "AZ-A 3 instance, AZ-B 4 instance", en: "AZ-A 3 instances, AZ-B 4 instances" },
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
    name: { vi: "4 instance trong một AZ", en: "4 instances in one AZ" },
    instances: [
      { id: "A", az: "us-east-1a", kind: "LT", age: 3, label: { vi: "launch template, phiên bản cũ nhất", en: "launch template, oldest version" }, billing: 30 },
      { id: "B", az: "us-east-1a", kind: "LC", age: 3, label: { vi: "launch configuration cũ", en: "old launch configuration" }, billing: 45 },
      { id: "C", az: "us-east-1a", kind: "LC", age: 1, label: { vi: "launch configuration mới hơn", en: "newer launch configuration" }, billing: 20 },
      { id: "D", az: "us-east-1a", kind: "LT", age: 1, label: { vi: "gần giờ tính phí nhất", en: "closest to billing hour" }, billing: 2 },
      { id: "E", az: "us-east-1b", kind: "LT", age: 2, label: "launch template", billing: 35 },
      { id: "F", az: "us-east-1b", kind: "LT", age: 2, label: "launch template", billing: 12 },
    ],
  },
  {
    name: { vi: "Có instance được bật scale-in protection", en: "Some instances have scale-in protection" },
    instances: [
      { id: "p1", az: "AZ-A", kind: "LT", age: 3, label: { vi: "template v1 · đang điều tra lỗi", en: "template v1 · under investigation" }, billing: 8, prot: true },
      { id: "p2", az: "AZ-A", kind: "LT", age: 3, label: { vi: "template v1 · đang điều tra lỗi", en: "template v1 · under investigation" }, billing: 20, prot: true },
      { id: "p3", az: "AZ-A", kind: "LT", age: 3, label: { vi: "template v1 · đang điều tra lỗi", en: "template v1 · under investigation" }, billing: 33, prot: true },
      { id: "q1", az: "AZ-B", kind: "LT", age: 3, label: "template v1", billing: 40 },
      { id: "q2", az: "AZ-B", kind: "LT", age: 1, label: "template v2", billing: 6 },
    ],
  },
];

function decide(L: Lang, list: Inst[]) {
  const steps: { text: string; keep: string[] }[] = [];
  const counts: Record<string, number> = {};
  list.forEach((i) => (counts[i.az] = (counts[i.az] ?? 0) + 1));
  // Only AZs with at least one instance that is not protected from scale in qualify.
  const open = Object.keys(counts).filter((k) => list.some((i) => i.az === k && !i.prot));
  const max = Math.max(...open.map((k) => counts[k]));
  const azs = open.filter((k) => counts[k] === max);
  let pool = list.filter((i) => azs.includes(i.az) && !i.prot);
  const skipped = Object.keys(counts).filter((k) => !open.includes(k));
  steps.push({ text: skipped.length
    ? L({ vi: `${skipped.join(", ")} : mọi instance đều được bật scale-in protection, nên AZ này bị bỏ qua dù có nhiều instance hơn. Chọn AZ có nhiều instance nhất còn instance không được bảo vệ: ${azs.join(", ")}.`, en: `${skipped.join(", ")} : every instance is protected from scale in, so this AZ is skipped even though it has more instances. Pick the AZ with the most instances that has an unprotected instance: ${azs.join(", ")}.` })
    : L({ vi: `Chọn AZ có nhiều instance nhất: ${azs.join(", ")} (${max} instance), nhằm duy trì cân bằng giữa các AZ.`, en: `Pick the AZ with the most instances: ${azs.join(", ")} (${max} instances), to keep the AZs balanced.` }), keep: pool.map((i) => i.id) });
  const lc = pool.filter((i) => i.kind === "LC");
  if (lc.length) {
    pool = lc;
    steps.push({ text: L({ vi: "Cấu hình lỗi thời: instance dùng launch configuration được xét trước instance dùng launch template.", en: "Outdated configuration: instances using a launch configuration are considered before instances using a launch template." }), keep: pool.map((i) => i.id) });
  } else {
    const oldest = Math.max(...pool.map((i) => i.age));
    pool = pool.filter((i) => i.age === oldest);
    steps.push({ text: L({ vi: "Cấu hình lỗi thời: chọn instance dùng phiên bản cũ nhất của launch template hiện tại.", en: "Outdated configuration: pick the instances using the oldest version of the current launch template." }), keep: pool.map((i) => i.id) });
  }
  if (pool.length > 1) {
    const min = Math.min(...pool.map((i) => i.billing));
    pool = pool.filter((i) => i.billing === min);
    steps.push({ text: L({ vi: "Vẫn còn nhiều instance: chọn instance gần giờ tính phí tiếp theo nhất (AWS lưu ý tiêu chí này ít tác dụng vì phần lớn EC2 tính phí theo giây).", en: "Several instances remain: pick the one closest to the next billing hour (AWS notes this criterion has little effect because most EC2 usage is billed per second)." }), keep: pool.map((i) => i.id) });
  }
  return { steps, victim: pool[0].id };
}

export default function TerminationSim() {
  const L = useLang();
  const [si, setSi] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const sc = SCENARIOS[si];
  const { steps, victim } = decide(L, sc.instances);
  const keep = shown ? steps[shown - 1].keep : sc.instances.map((i) => i.id);
  const azs = [...new Set(sc.instances.map((i) => i.az))];
  const done = shown === steps.length;

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Kịch bản", en: "Scenario" })}</span>
        {SCENARIOS.map((s, i) => (
          <button key={s.name.vi} className="btn" aria-pressed={i === si} onClick={() => { setSi(i); setGuess(null); setShown(0); }}>{L(s.name)}</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={() => setShown(Math.min(steps.length, shown + 1))} disabled={!guess || done}>
          {shown === 0 ? L({ vi: "Scale in: quan sát từng bước đánh giá", en: "Scale in: follow each evaluation step" }) : L({ vi: "Bước tiếp theo", en: "Next step" })}
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
                    <span>{typeof i.label === "string" ? i.label : L(i.label)}{i.prot && <b className="term-prot"> · scale-in protection</b>}</span>
                    <span className="term-meta">{i.kind === "LC" ? "launch configuration" : "launch template"} · {L({ vi: `còn ${i.billing} phút tới giờ tính phí`, en: `${i.billing} min to billing hour` })}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        {!guess && <p style={{ margin: 0 }}>{L({ vi: "ASG chuẩn bị scale in 1 instance. Chọn instance dự đoán sẽ bị terminate, sau đó quan sát từng bước đánh giá của ASG.", en: "The ASG is about to scale in by 1 instance. Pick the instance you predict will be terminated, then follow each step of the ASG evaluation." })}</p>}
        {guess && (
          <ol className="term-steps">
            {steps.slice(0, shown).map((s, i) => <li key={i}>{s.text}</li>)}
          </ol>
        )}
        {done && (
          <span className={"pill " + (guess === victim ? "ok" : "bad")}><i />
            {guess === victim ? L({ vi: `Chính xác: ${victim} bị terminate`, en: `Correct: ${victim} is terminated` }) : L({ vi: `Chưa chính xác: ASG terminate ${victim}`, en: `Not quite: the ASG terminates ${victim}` })}
          </span>
        )}
      </div>
    </div>
  );
}
