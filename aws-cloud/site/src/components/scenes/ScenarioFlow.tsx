import { useId, useState } from "react";
import { Boxes, DiagramDefs, Flows, Nodes, rich, type DBox, type DFlow, type DNode } from "./diagram";

export interface FlowOption {
  name: string;
  /** good = what the exam picks; bad = a tempting wrong answer. */
  verdict: "good" | "bad";
  verdictLabel?: string;
  flows: DFlow[];
  hide?: string[];
  text: string;
}

export interface Scenario {
  name: string;
  refs: string[];
  boxes?: DBox[];
  nodes: DNode[];
  options: FlowOption[];
}

interface Props {
  scenarios: Scenario[];
  height?: number;
  legend?: [good: string, bad: string];
}

/** Compare answer options on one architecture diagram, scenario by scenario. */
export default function ScenarioFlow({ scenarios, height = 260, legend = ["Đề chọn", "Đáp án sai hay gặp"] }: Props) {
  const [si, setSi] = useState(0);
  const [oi, setOi] = useState(0);
  const uid = useId().replace(/:/g, "");
  const s = scenarios[si];
  const o = s.options[oi];
  const byId = Object.fromEntries(s.nodes.map((n) => [n.id, n]));

  return (
    <div className="stage">
      {scenarios.length > 1 && (
        <div className="stage-bar" role="group" aria-label="Chọn dạng câu hỏi">
          <span className="label">Dạng đề</span>
          {scenarios.map((x, i) => (
            <button key={x.name} className="btn" aria-pressed={i === si} onClick={() => { setSi(i); setOi(0); }}>{x.name}</button>
          ))}
        </div>
      )}
      <div className="stage-bar" role="group" aria-label="Chọn phương án">
        <span className="label">Phương án</span>
        {s.options.map((x, i) => (
          <button key={x.name} className="btn" aria-pressed={i === oi} onClick={() => setOi(i)}>{x.name}</button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 760 ${height}`} role="img" aria-label={`${s.name}: ${o.name}`}>
          <DiagramDefs id={uid} />
          <Boxes boxes={s.boxes ?? []} />
          <g key={`${si}-${oi}`}><Flows id={uid} nodes={byId} flows={o.flows} /></g>
          <Nodes nodes={s.nodes} hidden={o.hide} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <strong>
          {o.name} · <span className={o.verdict === "good" ? "verdict ok" : "verdict bad"}>{o.verdictLabel ?? (o.verdict === "good" ? legend[0] : legend[1])}</span>
        </strong>
        {rich(o.text)}
        <p className="exam-refs" style={{ marginTop: 8 }}><span>Đề hỏi ở</span>{s.refs.map((r) => <code key={r}>{r}</code>)}</p>
      </div>
    </div>
  );
}
