import type { ReactNode } from "react";

// Shared, data-driven diagram used by ScenarioFlow and StepSim so lessons can describe
// architectures in MDX: boxes (Regions, VPCs, subnets), nodes (resources) and flows
// between nodes (drawn edge to edge, coloured by whether the exam favours them).

export type NodeKind = "ec2" | "db" | "net" | "store" | "site" | "user" | "edge" | "warn";

export interface DNode {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  kind?: NodeKind;
}

export interface DBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  tone?: "region" | "subnet" | "public" | "onprem";
}

export interface DFlow {
  /** Node ids the flow passes through, in order. */
  path: string[];
  tone?: "good" | "bad" | "neutral";
  heavy?: boolean;
  dashed?: boolean;
  /** Stopped before reaching the last node (drawn short, with a cross). */
  blocked?: boolean;
  label?: string;
}

/** Tiny formatter for lesson text: **bold** and `code`. */
export function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**")) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

// Widen boxes so labels never overflow (about 7.4px per character at 12.5px).
const textWidth = (t?: string) => (t ? t.length * 7.4 + 22 : 0);
const size = (n: DNode) => ({
  w: Math.max(n.w ?? 110, textWidth(n.label), n.sub ? n.sub.length * 6.4 + 20 : 0),
  h: n.h ?? (n.sub ? 46 : 40),
});
const center = (n: DNode) => { const { w, h } = size(n); return [n.x + w / 2, n.y + h / 2] as const; };

/** Point where the segment from `from` toward the centre of `n` meets the edge of n's box. */
function edgePoint(n: DNode, from: readonly [number, number]) {
  const [cx, cy] = center(n);
  const { w, h } = size(n);
  const dx = from[0] - cx, dy = from[1] - cy;
  if (dx === 0 && dy === 0) return [cx, cy] as const;
  const sx = dx === 0 ? Infinity : (w / 2 + 4) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (h / 2 + 4) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [cx + dx * s, cy + dy * s] as const;
}

export function flowPoints(nodes: Record<string, DNode>, path: string[]): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = nodes[path[i]], b = nodes[path[i + 1]];
    if (!a || !b) throw new Error(`diagram: unknown node in path ${path.join(" → ")}`);
    const start = edgePoint(a, center(b));
    const end = edgePoint(b, center(a));
    if (i === 0) pts.push([start[0], start[1]]);
    else pts.push([center(a)[0], center(a)[1]]);
    if (i === path.length - 2) pts.push([end[0], end[1]]);
  }
  return pts;
}

export function DiagramDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={`${id}-good`} viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-free" d="M0 0 L10 5 L0 10 z" /></marker>
      <marker id={`${id}-bad`} viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-paid" d="M0 0 L10 5 L0 10 z" /></marker>
      <marker id={`${id}-neutral`} viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-neutral" d="M0 0 L10 5 L0 10 z" /></marker>
    </defs>
  );
}

export function Boxes({ boxes }: { boxes: DBox[] }) {
  return (
    <>
      {boxes.map((b, i) => (
        <g key={i}>
          <rect className={`dbox dbox-${b.tone ?? "region"}`} x={b.x} y={b.y} width={b.w} height={b.h} rx={10} />
          {b.label && <text className={b.tone === "subnet" || b.tone === "public" ? "ts" : "t"} x={b.x + 12} y={b.y + (b.tone === "subnet" || b.tone === "public" ? 16 : 22)}>{b.label}</text>}
        </g>
      ))}
    </>
  );
}

export function Nodes({ nodes, hidden = [], pop = [] }: { nodes: DNode[]; hidden?: string[]; pop?: string[] }) {
  return (
    <>
      {nodes.filter((n) => !hidden.includes(n.id)).map((n) => {
        const { w, h } = size(n);
        return (
          <g key={n.id} className={`res res-${n.kind ?? "site"}${pop.includes(n.id) ? " pop" : ""}`}>
            <rect x={n.x} y={n.y} width={w} height={h} rx={7} />
            <text className="res-t" x={n.x + w / 2} y={n.y + (n.sub ? 19 : h / 2 + 5)} textAnchor="middle">{n.label}</text>
            {n.sub && <text className="res-s" x={n.x + w / 2} y={n.y + 35} textAnchor="middle">{n.sub}</text>}
          </g>
        );
      })}
    </>
  );
}

export function Flows({ id, nodes, flows }: { id: string; nodes: Record<string, DNode>; flows: DFlow[] }) {
  return (
    <>
      {flows.map((f, i) => {
        let pts = flowPoints(nodes, f.path);
        let cross: [number, number] | null = null;
        if (f.blocked) {
          // Stop two thirds of the way along the last segment.
          const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
          cross = [p[0] + (q[0] - p[0]) * 0.66, p[1] + (q[1] - p[1]) * 0.66];
          pts = [...pts.slice(0, -1), cross];
        }
        const d = "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
        const tone = f.blocked ? "bad" : f.tone ?? "neutral";
        const [a, b] = [pts[0], pts[1]];
        const horizontal = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
        return (
          <g key={i}>
            <path className={`flow tone-${tone}${f.heavy ? " heavy" : ""}${f.dashed || f.blocked ? " still" : ""}`} d={d}
              markerEnd={cross ? undefined : `url(#${id}-${tone})`} />
            {cross && <text className="block-x" x={cross[0]} y={cross[1] + 6} textAnchor="middle">✕</text>}
            {f.label && (
              <text className={`flow-t tone-${tone}`} x={(a[0] + b[0]) / 2 + (horizontal ? 0 : 8)} y={(a[1] + b[1]) / 2 - (horizontal ? 8 : 0)}
                textAnchor={horizontal ? "middle" : "start"}>{f.label}</text>
            )}
          </g>
        );
      })}
    </>
  );
}
