import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./case-sim.css";

// A small engine for "try it on ShopViet" simulations, in the style of
// cloudfront/EdgePipelineSim: pick a situation, flip a switch or pick an option,
// press the action button and watch one packet walk the diagram. Every station
// it reaches lights up (pass / block / change) and writes one line in the log.
// Each lesson owns its own data (see the *Sim.tsx files next to the lessons).

export type CaseState = "pass" | "block" | "skip" | "change" | "down";

export interface CaseNode {
  id: string;
  /** Top-left corner. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  l1: string;
  l2?: string;
  /** Draw a person icon instead of a box. */
  user?: boolean;
}

export interface CaseLink {
  id?: string;
  a: string;
  b: string;
  via?: Pt[];
  label?: string;
  lx?: number;
  ly?: number;
  dashed?: boolean;
}

export interface CaseBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  edge?: boolean;
}

export interface CaseStep {
  /** Node the packet moves to. */
  at: string;
  /** Corner points on the way, so the packet follows the drawn link. */
  via?: Pt[];
  state: CaseState;
  msg: string;
  /** Overrides the default tag text (QUA, CHẶN...). */
  tag?: string;
  /** Short text flashed over the node when it blocks. */
  flash?: string;
  pkt?: "pkt" | "pkt-edge";
}

export interface CaseOutcome {
  steps: CaseStep[];
  ok: boolean;
  result: string;
  /** Send a reply packet back to the start when the request goes through. Default true. */
  back?: boolean;
  /** States shown before sending (a link that is down, a chosen option...). */
  marks?: Partial<Record<string, CaseState>>;
  /** Nodes or links that do not exist with this choice. */
  hide?: string[];
}

export interface CaseScenario {
  name: string;
  request: string;
  from?: string;
  boxes?: CaseBox[];
  nodes: CaseNode[];
  links: CaseLink[];
  start: string;
  toggle?: { label: string; initial: boolean };
  choices?: { label: string; options: string[]; initial?: number };
  run(v: number): CaseOutcome;
}

const TAG: Record<CaseState, { text: string; cls: string }> = {
  pass: { text: "QUA", cls: "hit" },
  block: { text: "CHẶN", cls: "bad" },
  skip: { text: "BỎ QUA", cls: "info" },
  change: { text: "ĐỔI", cls: "miss" },
  down: { text: "HỎNG", cls: "bad" },
};

const NODE_CLS: Record<CaseState, string> = { pass: "ok", block: "bad", change: "chg", skip: "dim", down: "down" };

const nw = (n: CaseNode) => n.w ?? 120;
const nh = (n: CaseNode) => n.h ?? 46;
const center = (n: CaseNode): Pt => [n.x + nw(n) / 2, n.y + nh(n) / 2];
const linkId = (l: CaseLink) => l.id ?? `${l.a}-${l.b}`;

/** Vertical extent of everything a scenario draws (all choices), so the SVG has no empty bands. */
function fit(sc: CaseScenario): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of sc.nodes) {
    lo = Math.min(lo, n.y);
    hi = Math.max(hi, n.y + nh(n) + (n.user ? 22 : 0));
  }
  for (const b of sc.boxes ?? []) {
    lo = Math.min(lo, b.y);
    hi = Math.max(hi, b.y + b.h);
  }
  for (const l of sc.links) {
    for (const [, y] of l.via ?? []) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  // Room above for the flash text over a blocked node, and below for the last line.
  const top = Math.floor(lo - 26);
  return [top, Math.ceil(hi + 10 - top)];
}

function initial(sc: CaseScenario): number {
  if (sc.choices) return sc.choices.initial ?? 0;
  return sc.toggle?.initial ? 1 : 0;
}

interface LogLine {
  tag?: { text: string; cls: string };
  node?: string;
  ok?: boolean;
  msg: ReactNode;
}

export default function CaseSim({ scenarios, action = "Gửi request", label }: { scenarios: CaseScenario[]; action?: string; label: string }) {
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = scenarios[index];
  const [v, setV] = useState(initial(sc));
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Record<string, CaseState>>({});
  const [log, setLog] = useState<LogLine[]>([]);

  const preview = sc.run(v);
  const hidden = new Set(preview.hide ?? []);
  const byId = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
  const [top, height] = fit(sc);

  function clear() {
    setLit({});
    setLog([]);
  }

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setV(initial(scenarios[i]));
    clear();
  }

  function choose(x: number) {
    if (busy) return;
    setV(x);
    clear();
  }

  async function send() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    clear();
    const out = sc.run(v);
    const startPt = center(byId[sc.start]);
    let at: Pt = startPt;
    const trail: Pt[] = [startPt];
    let blocked = false;
    for (const step of out.steps) {
      const node = byId[step.at];
      const target = center(node);
      const pts: Pt[] = [at, ...(step.via ?? []), target];
      let dist = 0;
      for (let i = 1; i < pts.length; i++) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (dist > 0) await travel(layer, pts, Math.max(260, dist * 1.7), step.state === "block" || step.state === "down" ? "pkt-bad" : step.pkt ?? "pkt");
      trail.push(...(step.via ?? []), target);
      at = target;
      setLit((s) => ({ ...s, [step.at]: step.state }));
      setLog((l) => [...l, { tag: step.tag ? { text: step.tag, cls: TAG[step.state].cls } : TAG[step.state], node: node.l1, msg: rich(step.msg) }]);
      if (step.state === "block" || step.state === "down") {
        flashText(layer, target[0], node.y - 10, step.flash ?? "✕", "cs-flash", 1000);
        blocked = true;
        if (trail.length > 1) await travel(layer, [...trail].reverse(), 600, "pkt-bad");
        break;
      }
    }
    if (!blocked && out.back !== false && trail.length > 1) {
      await travel(layer, [...trail].reverse(), 700, out.ok ? "pkt-back" : "pkt-bad");
    }
    setLog((l) => [...l, { ok: out.ok, msg: rich(out.result) }]);
    setBusy(false);
  }

  const marks: Partial<Record<string, CaseState>> = preview.marks ?? {};
  const stateOf = (id: string): CaseState | undefined => lit[id] ?? marks[id];

  return (
    <div className="stage cs">
      {scenarios.length > 1 && (
        <div className="cs-scenarios" role="group" aria-label="Tình huống">
          {scenarios.map((s, i) => (
            <button key={s.name} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="stage-bar">
        <code className="cs-req">{sc.request}</code>
        {sc.from && <span className="cs-from">{sc.from}</span>}
        {sc.toggle && (
          <label className="cs-toggle">
            <input type="checkbox" checked={v === 1} disabled={busy} onChange={(e) => choose(e.target.checked ? 1 : 0)} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary cs-go" onClick={send} disabled={busy}>{action}</button>
      </div>
      {sc.choices && (
        <div className="stage-bar cs-choices" role="group" aria-label={sc.choices.label}>
          <span className="label">{sc.choices.label}</span>
          {sc.choices.options.map((o, i) => (
            <button key={o} className="btn" aria-pressed={i === v} disabled={busy && i !== v} onClick={() => choose(i)}>{o}</button>
          ))}
        </div>
      )}
      <div className="svg-wrap">
        <svg viewBox={`0 ${top} 820 ${height}`} role="img" aria-label={`${label}: ${sc.name}`}>
          {sc.boxes?.map((b) => (
            <g key={b.label}>
              <rect className={b.edge ? "cs-box edge" : "cs-box"} x={b.x} y={b.y} width={b.w} height={b.h} rx={10} />
              <text className={b.edge ? "edge-t" : "ts"} x={b.x + 10} y={b.y + 16}>{b.label}</text>
            </g>
          ))}
          {sc.links.filter((l) => !hidden.has(linkId(l)) && !hidden.has(l.a) && !hidden.has(l.b)).map((l) => {
            const pts = [center(byId[l.a]), ...(l.via ?? []), center(byId[l.b])];
            const st = marks[linkId(l)];
            const mid = pts[Math.floor(pts.length / 2)];
            const prev = pts[Math.floor(pts.length / 2) - 1] ?? mid;
            return (
              <g key={linkId(l)}>
                <path className={`cs-link${l.dashed ? " dashed" : ""}${st ? " " + NODE_CLS[st] : ""}`} d={"M" + pts.map((p) => p.join(" ")).join(" L")} />
                {l.label && (
                  <text className="cs-ll" x={l.lx ?? (mid[0] + prev[0]) / 2} y={l.ly ?? (mid[1] + prev[1]) / 2 - 7} textAnchor="middle">{l.label}</text>
                )}
              </g>
            );
          })}
          {sc.nodes.filter((n) => !hidden.has(n.id)).map((n) => {
            const st = stateOf(n.id);
            const [cx, cy] = center(n);
            if (n.user) {
              return (
                <g key={n.id} className={`cs-user${st ? " " + NODE_CLS[st] : ""}`}>
                  <g transform={`translate(${cx} ${cy - 6})`} aria-hidden="true">
                    <circle className="user" cy={-9} r={7} />
                    <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
                  </g>
                  <text className="cs-t" x={cx} y={cy + 26} textAnchor="middle">{n.l1}</text>
                  {n.l2 && <text className="cs-s" x={cx} y={cy + 39} textAnchor="middle">{n.l2}</text>}
                </g>
              );
            }
            return (
              <g key={n.id} className={`cs-node${st ? " " + NODE_CLS[st] : ""}`}>
                <rect x={n.x} y={n.y} width={nw(n)} height={nh(n)} rx={8} />
                <text className="cs-t" x={cx} y={n.l2 ? cy - 3 : cy + 4} textAnchor="middle">{n.l1}</text>
                {n.l2 && <text className="cs-s" x={cx} y={cy + 13} textAnchor="middle">{n.l2}</text>}
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="cs-hint">
            Bấm <b>{action}</b> để xem từng bước.{sc.toggle || sc.choices ? " Đổi lựa chọn rồi chạy lại để so sánh." : ""}
          </p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag ? (
                <li key={i}>
                  <span className={`tag ${e.tag.cls}`}>{e.tag.text}</span>
                  <span><b>{e.node}:</b> {e.msg}</span>
                </li>
              ) : (
                <li key={i} className={`cs-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
