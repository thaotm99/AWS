import { useI18n } from "../../app/i18n";
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
export default function ScenarioFlow({ scenarios, height = 260, legend: custom }: Props) {
  const [si, setSi] = useState(0);
  const { t } = useI18n();
  const legend = custom ?? [t("lesson.flow.good"), t("lesson.flow.bad")];
  const [oi, setOi] = useState(0);
  const uid = useId().replace(/:/g, "");
  const s = scenarios[si];
  // Clamp: an option index from the previous scenario can outlive a switch to one with fewer options.
  const o = s.options[Math.min(oi, s.options.length - 1)];
  const byId = Object.fromEntries(s.nodes.map((n) => [n.id, n]));

  return (
    <div className="stage">
      {scenarios.length > 1 && (
        <div className="stage-bar" role="group" aria-label={t("lesson.flow.scenarioGroup")}>
          <span className="label">{t("lesson.flow.scenarios")}</span>
          {scenarios.map((x, i) => (
            <button key={x.name} className="btn" aria-pressed={i === si} onClick={() => { setSi(i); setOi(0); }}>{x.name}</button>
          ))}
        </div>
      )}
      <div className="stage-bar" role="group" aria-label={t("lesson.flow.optionGroup")}>
        <span className="label">{t("lesson.flow.options")}</span>
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
          <g key={"l" + `${si}-${oi}`}><Flows id={uid} nodes={byId} flows={o.flows} part="labels" /></g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <strong>
          {o.name} · <span className={o.verdict === "good" ? "verdict ok" : "verdict bad"}>{o.verdictLabel ?? (o.verdict === "good" ? legend[0] : legend[1])}</span>
        </strong>
        {rich(o.text)}
      </div>
    </div>
  );
}
