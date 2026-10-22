import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./packet-sim.css";

// Small engine shared by the ELB, Auto Scaling, container and Lambda simulations.
// Each scenario is a real ShopViet situation: pick it, flip its switch, press the
// action button and a packet walks node by node. Every node it reaches lights up
// (pass / block / change / wait / skip) and adds a line to the log; the last line
// says what the customer or the team actually sees.

export type PState = "pass" | "block" | "skip" | "change" | "wait";

export interface PNode {
  id: string;
  /** Centre of the node. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  l1: string;
  l2?: string;
  /** Draw a person icon instead of a box. */
  user?: boolean;
}

export interface PBox { x: number; y: number; w: number; h: number; label: string; edge?: boolean }

export interface PLayout {
  viewBox: string;
  nodes: PNode[];
  links: [string, string][];
  boxes?: PBox[];
  aria: string;
}

export interface PStep {
  at: string;
  state: PState;
  msg: string;
  /** Start this hop from another node (the packet path restarts there). */
  from?: string;
  /** Go back to the start node right after arriving (a ping and its answer). */
  roundTrip?: boolean;
  /** Text of the log tag; defaults to the state name. */
  tag?: string;
  /** Log label; defaults to the node's first line. */
  label?: string;
  /** Short text flashed above the node. */
  flash?: string;
  /** Change the node's text from this step on. */
  relabel?: { l1?: string; l2?: string };
  /** Light the node without moving the packet (something happens on the node itself). */
  jump?: boolean;
}

export interface POutcome {
  steps: PStep[];
  ok: boolean;
  result: string;
  /** Packet returns to where it started at the end (default true). */
  back?: boolean;
}

export interface PScenario {
  name: string;
  /** Label of the action button for this scenario. */
  action?: string;
  request: string | ((on: boolean) => string);
  from?: string;
  toggle?: { label: string; initial: boolean };
  /** Overrides the shared layout for this scenario; may depend on the switch. */
  layout?: PLayout | ((on: boolean) => PLayout);
  run(on: boolean): POutcome;
}

interface Props {
  scenarios: PScenario[];
  layout?: PLayout;
  action?: string;
  /** Text shown before the first run. */
  hint?: string;
}

const TAG: Record<PState, { text: string; cls: string }> = {
  pass: { text: "QUA", cls: "hit" },
  block: { text: "CHẶN", cls: "bad" },
  skip: { text: "BỎ QUA", cls: "info" },
  change: { text: "ĐỔI", cls: "miss" },
  wait: { text: "CHỜ", cls: "info" },
};

const size = (n: PNode) => ({ w: n.w ?? 120, h: n.h ?? (n.l2 ? 48 : 38) });

/** Orthogonal route between two node centres; links are drawn on the same route. */
function route(a: PNode, b: PNode): Pt[] {
  if (Math.abs(a.y - b.y) < 1 || Math.abs(a.x - b.x) < 1) return [[a.x, a.y], [b.x, b.y]];
  const mx = (a.x + b.x) / 2;
  return [[a.x, a.y], [mx, a.y], [mx, b.y], [b.x, b.y]];
}

const length = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const dur = (pts: Pt[]) => Math.max(260, Math.min(900, length(pts) * 1.7));
const d = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");

type LogLine = { tag?: PState; tagText?: string; ok?: boolean; label?: string; msg: ReactNode };

export default function PacketSim({ scenarios, layout, action = "Gửi request", hint }: Props) {
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = scenarios[index];
  const [on, setOn] = useState(sc.toggle?.initial ?? false);
  const own = typeof sc.layout === "function" ? sc.layout(on) : sc.layout;
  const lay = own ?? layout!;
  const byId: Record<string, PNode> = Object.fromEntries(lay.nodes.map((n) => [n.id, n]));
  const act = sc.action ?? action;
  const request = typeof sc.request === "function" ? sc.request(on) : sc.request;
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Record<string, PState>>({});
  const [names, setNames] = useState<Record<string, { l1?: string; l2?: string }>>({});
  const [log, setLog] = useState<LogLine[]>([]);

  function reset() {
    setLit({});
    setNames({});
    setLog([]);
  }

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(scenarios[i].toggle?.initial ?? false);
    reset();
  }

  async function run() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    reset();
    const out = sc.run(on);
    const start = lay.nodes[0];
    let cur: PNode = start;
    let origin: PNode = start;
    let path: Pt[] = [[start.x, start.y]];
    let lastBlocked = false;
    const shownName: Record<string, string> = {};
    for (const step of out.steps) {
      const target = byId[step.at];
      if (!target) continue;
      if (step.from && byId[step.from]) {
        cur = origin = byId[step.from];
        path = [[cur.x, cur.y]];
      }
      const hop = step.jump || cur.id === target.id ? [[cur.x, cur.y] as Pt] : route(cur, target);
      const cls = step.state === "block" ? "pkt-bad" : step.state === "change" ? "pkt-edge" : "pkt";
      if (hop.length > 1) await travel(layer, hop, dur(hop), cls);
      if (!step.jump) path = path.concat(hop.slice(1));
      setLit((s) => ({ ...s, [target.id]: step.state }));
      if (step.relabel) setNames((s) => ({ ...s, [target.id]: { ...s[target.id], ...step.relabel } }));
      const label = step.label ?? shownName[target.id] ?? target.l1;
      if (step.relabel?.l1) shownName[target.id] = step.relabel.l1;
      setLog((l) => [...l, { tag: step.state, tagText: step.tag, label, msg: rich(step.msg) }]);
      if (step.flash) {
        const { h } = size(target);
        flashText(layer, target.x, target.y - h / 2 - 8, step.flash, step.state === "block" ? "pks-flash bad" : "pks-flash", 1100);
      }
      lastBlocked = step.state === "block" && !step.jump;
      if (step.jump) continue;
      if (step.roundTrip || lastBlocked) {
        const backTo = [...path].reverse();
        if (backTo.length > 1) await travel(layer, backTo, dur(backTo), lastBlocked ? "pkt-bad" : "pkt-back");
        cur = origin;
        path = [[cur.x, cur.y]];
      } else {
        cur = target;
      }
    }
    if (out.back !== false && !lastBlocked && path.length > 1) {
      const back = [...path].reverse();
      await travel(layer, back, dur(back), out.ok ? "pkt-back" : "pkt-bad");
    }
    setLog((l) => [...l, { ok: out.ok, msg: rich(out.result) }]);
    setBusy(false);
  }

  return (
    <div className="stage pks">
      <div className="pks-scenarios" role="group" aria-label="Tình huống">
        {scenarios.map((s, i) => (
          <button key={s.name} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="pks-req">{request}</code>
        {sc.from && <span className="pks-from">{sc.from}</span>}
        {sc.toggle && (
          <label className="pks-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary" onClick={run} disabled={busy}>{act}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox={lay.viewBox} role="img" aria-label={lay.aria}>
          {(lay.boxes ?? []).map((b, i) => (
            <g key={i} className={"pks-box" + (b.edge ? " edge" : "")}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} />
              <text x={b.x + 12} y={b.y + 18}>{b.label}</text>
            </g>
          ))}
          {lay.links.map(([a, b]) => byId[a] && byId[b] && (
            <path key={a + b} className="pks-link" d={d(route(byId[a], byId[b]))} />
          ))}
          {lay.nodes.map((n) => {
            const name = { l1: n.l1, l2: n.l2, ...names[n.id] };
            if (n.user) {
              return (
                <g key={n.id} className={`pks-user ${lit[n.id] ?? ""}`}>
                  <circle cx={n.x} cy={n.y - 10} r={7} />
                  <path d={`M${n.x - 13} ${n.y + 12} a13 13 0 0 1 26 0 z`} />
                  <text className="pks-l1" x={n.x} y={n.y + 32} textAnchor="middle">{name.l1}</text>
                  {name.l2 && <text className="pks-l2" x={n.x} y={n.y + 46} textAnchor="middle">{name.l2}</text>}
                </g>
              );
            }
            const { w, h } = size(n);
            return (
              <g key={n.id} className={`pks-node ${lit[n.id] ?? ""}`}>
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={8} />
                <text className="pks-l1" x={n.x} y={name.l2 ? n.y - 3 : n.y + 4} textAnchor="middle">{name.l1}</text>
                {name.l2 && <text className="pks-l2" x={n.x} y={n.y + 13} textAnchor="middle">{name.l2}</text>}
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="pks-hint">
            {hint ?? <>Bấm <b>{act}</b> để xem từng bước.</>}
            {sc.toggle && !hint ? " Đổi công tắc rồi chạy lại để so sánh." : ""}
          </p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === undefined ? (
                <li key={i} className={`pks-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag pks-tag ${TAG[e.tag].cls}`}>{e.tagText ?? TAG[e.tag].text}</span>
                  <span><b>{e.label}:</b> {e.msg}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
