import { useId, useRef, useState } from "react";
import { travel } from "../../lib/animate";
import { Boxes, DiagramDefs, Flows, Nodes, flowPoints, rich, type DBox, type DFlow, type DNode } from "./diagram";

export interface SimStep {
  /** Button label that performs this step. */
  button: string;
  /** Nodes that become visible after this step. */
  show?: string[];
  /** Flows added by this step; flows of earlier steps stay on the diagram. */
  flows?: DFlow[];
  /** Optional animated packet along one flow path when the step runs. */
  move?: string[];
  note: string;
}

interface Props {
  nodes: DNode[];
  boxes?: DBox[];
  /** Nodes visible before the first step. */
  initial: string[];
  intro: string;
  steps: SimStep[];
  height?: number;
  refs?: string[];
}

/** Build an architecture or a procedure step by step. */
export default function StepSim({ nodes, boxes = [], initial, intro, steps, height = 260, refs = [] }: Props) {
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const pk = useRef<SVGGElement>(null);
  const uid = useId().replace(/:/g, "");
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const visible = new Set(initial);
  steps.slice(0, done).forEach((s) => s.show?.forEach((id) => visible.add(id)));
  const flows = steps.slice(0, done).flatMap((s) => s.flows ?? []);
  const justShown = done ? steps[done - 1].show ?? [] : [];

  async function next() {
    const step = steps[done];
    if (step.move && pk.current) {
      setBusy(true);
      await travel(pk.current, flowPoints(byId, step.move), 900, "pkt", 6);
      setBusy(false);
    }
    setDone(done + 1);
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        {done < steps.length
          ? <button className="btn primary" onClick={next} disabled={busy}>{steps[done].button}</button>
          : <button className="btn" onClick={() => setDone(0)}>Làm lại</button>}
        <span className="count">Bước {Math.min(done, steps.length)}/{steps.length}</span>
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 760 ${height}`} role="img" aria-label={done ? steps[done - 1].button : "Trạng thái ban đầu"}>
          <DiagramDefs id={uid} />
          <Boxes boxes={boxes} />
          <g key={done}><Flows id={uid} nodes={byId} flows={flows} /></g>
          <Nodes nodes={nodes} hidden={nodes.filter((n) => !visible.has(n.id)).map((n) => n.id)} pop={justShown} />
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {rich(done ? steps[done - 1].note : intro)}
        {refs.length > 0 && <p className="exam-refs" style={{ marginTop: 8 }}><span>Đề hỏi ở</span>{refs.map((r) => <code key={r}>{r}</code>)}</p>}
      </div>
    </div>
  );
}
