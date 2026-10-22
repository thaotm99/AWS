import type { Bilingual, FlowStepSpec, Label, MarkStepSpec, StepSpec, StopStepSpec, Tone } from "./types";

/** What the diagram shows after some steps: node and link states and the tags left on nodes. */
export interface Scene {
  nodes: Readonly<Record<string, Tone | "dim">>;
  links: Readonly<Record<string, Tone>>;
  badges: Readonly<Record<string, { text: Label; tone: Tone }>>;
  /** Nodes with a failure marker. */
  stops: readonly string[];
}

export const EMPTY_SCENE: Scene = { nodes: {}, links: {}, badges: {}, stops: [] };

export type PacketKind = "request" | "response" | "warn" | "bad";

/** Where steps draw their animation. The player implements it on the SVG. */
export interface Stage {
  /** Move `times` packets from one node to another; resolves when the last one arrives. */
  travel(from: string, to: string, packet: PacketKind, times: number): Promise<void>;
}

/** Key of the undirected link between two nodes. */
export const linkKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** One step of a scenario: a caption, an animation, and the scene it leaves behind. */
export abstract class Step {
  constructor(
    readonly caption: Bilingual,
    readonly badge: Label | undefined,
  ) {}

  /** Every node the step touches, for validation. */
  abstract get nodeIds(): string[];
  /** Pairs of nodes packets travel between, so the diagram draws those links. */
  abstract get hops(): [string, string][];
  /** Scene after this step. Pure, so any step can be shown without playing the ones before. */
  abstract apply(scene: Scene): Scene;
  /** Animation that leads to `apply`. Nothing by default. */
  async animate(_stage: Stage): Promise<void> {}

  protected withBadge(scene: Scene, node: string, tone: Tone): Scene {
    return this.badge === undefined ? scene : { ...scene, badges: { ...scene.badges, [node]: { text: this.badge, tone } } };
  }
}

export class FlowStep extends Step {
  readonly paths: string[][];
  readonly tone: Tone;

  constructor(private readonly spec: FlowStepSpec) {
    super(spec.caption, spec.badge);
    this.paths = (Array.isArray(spec.flow[0]) ? spec.flow : [spec.flow]) as string[][];
    this.tone = spec.tone ?? "ok";
  }

  get nodeIds() {
    return this.paths.flat();
  }

  get hops() {
    return this.paths.flatMap((p) => p.slice(1).map((to, i) => [p[i], to] as [string, string]));
  }

  private get packet(): PacketKind {
    if (this.tone !== "ok") return this.tone;
    return this.spec.back ? "response" : "request";
  }

  async animate(stage: Stage) {
    const longest = Math.max(...this.paths.map((p) => p.length));
    for (let i = 1; i < longest; i++) {
      await Promise.all(this.paths.filter((p) => p.length > i).map((p) => stage.travel(p[i - 1], p[i], this.packet, this.spec.times ?? 1)));
    }
  }

  apply(scene: Scene): Scene {
    const nodes = { ...scene.nodes };
    const links = { ...scene.links };
    for (const p of this.paths) {
      // The node a flow starts from lights up too, unless an earlier step already gave it a state.
      nodes[p[0]] ??= this.tone;
      for (let i = 1; i < p.length; i++) {
        links[linkKey(p[i - 1], p[i])] = this.tone;
        nodes[p[i]] = this.tone;
      }
    }
    const first = this.paths[0];
    const last = first[first.length - 1];
    return this.withBadge({ ...scene, nodes, links }, last, this.tone);
  }
}

export class StopStep extends Step {
  constructor(private readonly spec: StopStepSpec) {
    super(spec.caption, spec.badge);
  }

  get nodeIds() {
    return [...this.spec.stop];
  }

  get hops() {
    return [[...this.spec.stop] as [string, string]];
  }

  async animate(stage: Stage) {
    const [from, at] = this.spec.stop;
    await stage.travel(from, at, "bad", 1);
  }

  apply(scene: Scene): Scene {
    const [from, at] = this.spec.stop;
    const next: Scene = {
      // A node already working (e.g. a firewall that let other traffic through) keeps its colour: it is
      // doing the stopping. Otherwise the node itself is where the flow fails.
      nodes: { ...scene.nodes, [from]: scene.nodes[from] ?? "ok", [at]: scene.nodes[at] === "ok" ? "ok" : "bad" },
      links: { ...scene.links, [linkKey(from, at)]: "bad" },
      badges: scene.badges,
      stops: scene.stops.includes(at) ? scene.stops : [...scene.stops, at],
    };
    return this.withBadge(next, at, "bad");
  }
}

export class MarkStep extends Step {
  private readonly ids: string[];

  constructor(private readonly spec: MarkStepSpec) {
    super(spec.caption, spec.badge);
    this.ids = typeof spec.mark === "string" ? [spec.mark] : spec.mark;
  }

  get nodeIds() {
    return this.ids;
  }

  get hops() {
    return [];
  }

  apply(scene: Scene): Scene {
    const nodes = { ...scene.nodes };
    for (const id of this.ids) nodes[id] = this.spec.tone;
    // A node that recovers loses its failure marker.
    const stops = this.spec.tone === "ok" ? scene.stops.filter((s) => !this.ids.includes(s)) : scene.stops;
    const tone: Tone = this.spec.tone === "dim" ? "warn" : this.spec.tone;
    return this.withBadge({ ...scene, nodes, stops }, this.ids[0], tone);
  }
}

/** Builds step objects from spec data. */
export function createStep(spec: StepSpec): Step {
  if ("flow" in spec) return new FlowStep(spec);
  if ("stop" in spec) return new StopStep(spec);
  return new MarkStep(spec);
}
