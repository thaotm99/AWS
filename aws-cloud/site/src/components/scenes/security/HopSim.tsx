import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./hop-sim.css";

// Small engine for "pick a situation, flip a switch, run it" simulations, in the style of
// cloudfront/EdgePipelineSim. Each scenario draws its own nodes; running it sends a packet
// along a list of hops, lights each node it reaches and writes one log line per hop.
// Used by the KMS, security, Cognito and EC2 lessons.

export type HopState = "pass" | "block" | "change" | "skip" | "alert";
export type HopKind = "user" | "bad" | "app" | "store" | "key" | "log" | "svc" | "aws";

export interface HNode {
  id: string;
  /** Centre of the box. */
  x: number;
  y: number;
  w?: number;
  label: string;
  sub?: string;
  kind?: HopKind;
}

export interface HBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: "account" | "region" | "onprem";
}

export interface Hop {
  /** Defaults to where the previous hop ended (or the scenario's start node). */
  from?: string;
  to: string;
  state: HopState;
  msg: string;
  /** Short tag in the log; defaults by state. */
  tag?: string;
  /** Short text flashed above the target node. */
  flash?: string;
  /** Send several packets one after another (e.g. many requests). */
  times?: number;
  packet?: "pkt" | "pkt-back" | "pkt-bad" | "pkt-edge";
  /** Animate only, no log line. */
  silent?: boolean;
}

export interface HopRun {
  hops: Hop[];
  ok: boolean;
  result: string;
}

export interface HopScenario {
  name: string;
  /** One line shown before running: what is going on at MFTECH. */
  story: string;
  /** Short code-style label of what is being sent. */
  request: string;
  toggle?: { label: string; initial: boolean };
  start: string;
  nodes: HNode[];
  boxes?: HBox[];
  /** Nodes to hide for a toggle position. */
  hidden?: (on: boolean) => string[];
  run(on: boolean): HopRun;
}

interface Props {
  scenarios: HopScenario[];
  /** Label of the run button, e.g. "Upload file". */
  action: string;
  height: number;
  label: string;
}

const TAG: Record<HopState, { text: Bi; cls: string }> = {
  pass: { text: { vi: "THÔNG QUA", en: "PASS" }, cls: "hit" },
  block: { text: { vi: "CHẶN", en: "BLOCKED" }, cls: "bad" },
  change: { text: { vi: "XỬ LÝ", en: "PROCESSED" }, cls: "miss" },
  skip: { text: { vi: "BỎ QUA", en: "SKIPPED" }, cls: "info" },
  alert: { text: { vi: "CẢNH BÁO", en: "WARNING" }, cls: "bad" },
};

const PACKET: Record<HopState, Hop["packet"]> = {
  pass: "pkt", block: "pkt-bad", change: "pkt-edge", skip: "pkt", alert: "pkt-bad",
};

const FLASH: Record<HopState, string> = {
  pass: "hop-flash ok", block: "hop-flash bad", change: "hop-flash edge", skip: "hop-flash", alert: "hop-flash bad",
};

function size(n: HNode) {
  return {
    w: Math.max(n.w ?? 104, n.label.length * 7.2 + 22, n.sub ? n.sub.length * 6 + 18 : 0),
    h: n.sub ? 46 : 38,
  };
}

/** Where the segment from the centre of `n` toward `to` leaves n's box. */
function edge(n: HNode, to: Pt): Pt {
  const { w, h } = size(n);
  const dx = to[0] - n.x, dy = to[1] - n.y;
  if (!dx && !dy) return [n.x, n.y];
  const sx = dx ? (w / 2 + 3) / Math.abs(dx) : Infinity;
  const sy = dy ? (h / 2 + 3) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy, 1);
  return [n.x + dx * s, n.y + dy * s];
}

function segment(a: HNode, b: HNode): [Pt, Pt] {
  return [edge(a, [b.x, b.y]), edge(b, [a.x, a.y])];
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Resolve every hop's `from`. */
function resolve(sc: HopScenario, run: HopRun): (Hop & { from: string })[] {
  let at = sc.start;
  return run.hops.map((h) => {
    const from = h.from ?? at;
    at = h.to;
    return { ...h, from };
  });
}

export default function HopSim({ scenarios, action, height, label }: Props) {
  const L = useLang();
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = scenarios[index];
  const [on, setOn] = useState(sc.toggle?.initial ?? false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Record<string, HopState>>({});
  const [links, setLinks] = useState<Record<string, HopState>>({});
  const [log, setLog] = useState<{ state?: HopState; tag?: string; who?: string; ok?: boolean; msg: ReactNode }[]>([]);

  const byId = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
  const hidden = new Set(sc.hidden?.(on) ?? []);
  const shown = sc.nodes.filter((n) => !hidden.has(n.id));

  // Draw every link the current switch position can use.
  const allLinks = new Map<string, [string, string]>();
  for (const h of resolve(sc, sc.run(on))) {
    if (h.from !== h.to) allLinks.set(key(h.from, h.to), [h.from, h.to]);
  }
  const drawn = [...allLinks.entries()].filter(([, [a, b]]) => !hidden.has(a) && !hidden.has(b));

  function reset() {
    setLit({});
    setLinks({});
    setLog([]);
  }

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(scenarios[i].toggle?.initial ?? false);
    reset();
  }

  async function go() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    try {
      reset();
      const out = sc.run(on);
      // The starting node lights up too, unless it is the trouble itself or AWS acting on its own.
      if (byId[sc.start] && byId[sc.start].kind !== "bad" && byId[sc.start].kind !== "aws" && !hidden.has(sc.start)) setLit({ [sc.start]: "pass" });
      for (const h of resolve(sc, out)) {
        const a = byId[h.from], b = byId[h.to];
        if (!a || !b) throw new Error(`HopSim: unknown node in hop ${h.from} → ${h.to}`);
        const [p, q] = segment(a, b);
        const dur = Math.max(320, Math.hypot(q[0] - p[0], q[1] - p[1]) * 1.5);
        const cls = h.packet ?? PACKET[h.state] ?? "pkt";
        const n = h.times ?? 1;
        await Promise.all(Array.from({ length: n }, (_, i) =>
          new Promise<void>((done) => setTimeout(() => travel(layer, [p, q], dur, cls, 5.5).then(done), i * 150))));
        setLit((s) => ({ ...s, [h.to]: h.state }));
        setLinks((s) => ({ ...s, [key(h.from, h.to)]: h.state }));
        if (h.flash) flashText(layer, b.x, b.y - size(b).h / 2 - 8, h.flash, FLASH[h.state], 1300);
        if (!h.silent) setLog((l) => [...l, { state: h.state, tag: h.tag, who: b.label, msg: rich(h.msg) }]);
        await new Promise((r) => setTimeout(r, 120));
      }
      setLog((l) => [...l, { ok: out.ok, msg: rich(out.result) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage">
      <div className="flex flex-wrap gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Tình huống", en: "Scenario" })}>
        {scenarios.map((s, i) => (
          <button key={s.name} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="rounded-[10px] border border-line bg-bg px-2 py-[3px] text-[0.8125rem] wrap-anywhere">{sc.request}</code>
        {sc.toggle && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-step--1">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary ml-auto" onClick={go} disabled={busy}>{action}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 820 ${height}`} role="img" aria-label={label}>
          {sc.boxes?.map((b) => (
            <g key={b.label} className={`hop-box t-${b.tone ?? "account"}`}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} />
              <text x={b.x + 12} y={b.y + 17}>{b.label}</text>
            </g>
          ))}
          {drawn.map(([k, [a, b]]) => {
            const [p, q] = segment(byId[a], byId[b]);
            return <line key={k} className={`hop-link ${links[k] ?? ""}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;
          })}
          {shown.map((n) => {
            const { w, h } = size(n);
            return (
              <g key={n.id} className={`hop-node k-${n.kind ?? "app"} ${lit[n.id] ?? ""}`}>
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={8} />
                <text className="hop-nt" x={n.x} y={n.sub ? n.y - 3 : n.y + 4} textAnchor="middle">{n.label}</text>
                {n.sub && <text className="hop-ns" x={n.x} y={n.y + 13} textAnchor="middle">{n.sub}</text>}
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="m-0 text-step--1">{rich(sc.story)} <span className="text-muted">{L({
            vi: <>Nhấn <b>{action}</b> để quan sát kết quả.{sc.toggle ? " Thay đổi cấu hình và chạy lại để so sánh." : ""}</>,
            en: <>Press <b>{action}</b> to see the result.{sc.toggle ? " Change the configuration and run again to compare." : ""}</>,
          })}</span></p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.state === undefined ? (
                <li key={i} className={`mt-1.5 block! rounded-[12px] px-2.5 py-2 ${e.ok ? "bg-ok-soft" : "bg-bad-soft"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag whitespace-nowrap ${TAG[e.state].cls}`}>{e.tag ?? L(TAG[e.state].text)}</span>
                  <span><b>{e.who}:</b> {e.msg}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
