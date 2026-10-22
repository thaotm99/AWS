import type { ContentLocale, OptionKey } from "../domain/types";
import { createStep, EMPTY_SCENE, type Scene, type Step } from "./steps";
import type { Bilingual, IllustrationSpec, Label, NodeSpec, ScenarioSpec, ZoneSpec } from "./types";

export type Pt = [number, number];

/** A node placed in pixels. */
export interface PlacedNode {
  spec: NodeSpec;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedZone {
  spec: ZoneSpec;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const text = (label: Label, locale: ContentLocale) => (typeof label === "string" ? label : label[locale]);

/** One option played through the diagram. */
export class Scenario {
  readonly steps: Step[];
  readonly hidden: ReadonlySet<string>;

  constructor(private readonly spec: ScenarioSpec) {
    this.steps = spec.steps.map(createStep);
    this.hidden = new Set(spec.hide ?? []);
  }

  get option() {
    return this.spec.option;
  }

  get verdict(): { works: boolean; caption: Bilingual } {
    return this.spec.verdict;
  }

  /** Scene after the first `count` steps. */
  sceneAfter(count: number): Scene {
    return this.steps.slice(0, count).reduce((scene, step) => step.apply(scene), EMPTY_SCENE);
  }
}

/** A question's diagram: grid layout, the scenario of each option, and the order of the option tabs. */
export class Illustration {
  static readonly CELL_W = 156;
  static readonly CELL_H = 86;
  static readonly PAD = 18;

  private readonly scenarios = new Map<OptionKey, Scenario>();
  private readonly nodes = new Map<string, NodeSpec>();

  constructor(readonly spec: IllustrationSpec) {
    for (const n of spec.nodes) this.nodes.set(n.id, n);
    for (const s of spec.scenarios) this.scenarios.set(s.option, new Scenario(s));
    this.validate();
  }

  get width() {
    return this.spec.cols * Illustration.CELL_W + 2 * Illustration.PAD;
  }

  get height() {
    return this.spec.rows * Illustration.CELL_H + 2 * Illustration.PAD;
  }

  scenario(option: OptionKey): Scenario | undefined {
    return this.scenarios.get(option);
  }

  /** Options to show as tabs: the correct ones first, then the rest in key order. */
  tabs(correct: readonly OptionKey[]): OptionKey[] {
    const keys = [...this.scenarios.keys()].sort();
    return [...keys.filter((k) => correct.includes(k)), ...keys.filter((k) => !correct.includes(k))];
  }

  /** Tab to open first: the learner's wrong choice if there is one, otherwise the first correct option. */
  initialTab(correct: readonly OptionKey[], chosen: readonly OptionKey[]): OptionKey {
    const tabs = this.tabs(correct);
    return tabs.find((k) => chosen.includes(k) && !correct.includes(k)) ?? tabs[0];
  }

  private centre(n: NodeSpec): Pt {
    const { CELL_W, CELL_H, PAD } = Illustration;
    return [PAD + (n.at[0] + 0.5) * CELL_W, PAD + (n.at[1] + 0.5) * CELL_H];
  }

  place(id: string, locale: ContentLocale): PlacedNode {
    const spec = this.nodes.get(id)!;
    const [x, y] = this.centre(spec);
    const label = text(spec.label, locale);
    const sub = spec.sub ? text(spec.sub, locale) : "";
    const w = Math.min(Illustration.CELL_W - 10, Math.max(92, label.length * 7 + 22, sub.length * 5.8 + 18));
    return { spec, x, y, w, h: sub ? 46 : 36 };
  }

  placeZone(z: ZoneSpec): PlacedZone {
    const { CELL_W, CELL_H, PAD } = Illustration;
    const pad = z.pad ?? 6;
    const x = PAD + z.from[0] * CELL_W - pad;
    const y = PAD + z.from[1] * CELL_H - pad;
    return { spec: z, x, y, w: (z.to[0] - z.from[0] + 1) * CELL_W + 2 * pad, h: (z.to[1] - z.from[1] + 1) * CELL_H + 2 * pad };
  }

  /** Where the segment from the centre of `n` toward `to` leaves n's box. */
  private exit(n: PlacedNode, to: Pt): Pt {
    const dx = to[0] - n.x;
    const dy = to[1] - n.y;
    if (!dx && !dy) return [n.x, n.y];
    const sx = dx ? (n.w / 2 + 3) / Math.abs(dx) : Infinity;
    const sy = dy ? (n.h / 2 + 3) / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy, 1);
    return [n.x + dx * s, n.y + dy * s];
  }

  segment(a: string, b: string, locale: ContentLocale): [Pt, Pt] {
    const pa = this.place(a, locale);
    const pb = this.place(b, locale);
    return [this.exit(pa, [pb.x, pb.y]), this.exit(pb, [pa.x, pa.y])];
  }

  /** Links drawn for a scenario: the declared ones plus every hop its packets take, minus hidden nodes. */
  links(scenario: Scenario): [string, string][] {
    const seen = new Map<string, [string, string]>();
    const add = ([a, b]: [string, string]) => {
      if (a === b || scenario.hidden.has(a) || scenario.hidden.has(b)) return;
      seen.set(a < b ? `${a}|${b}` : `${b}|${a}`, [a, b]);
    };
    (this.spec.links ?? []).forEach(add);
    scenario.steps.forEach((s) => s.hops.forEach(add));
    return [...seen.values()];
  }

  visibleNodes(scenario: Scenario): string[] {
    return this.spec.nodes.filter((n) => !scenario.hidden.has(n.id)).map((n) => n.id);
  }

  visibleZones(scenario: Scenario): ZoneSpec[] {
    return (this.spec.zones ?? []).filter((z) => !scenario.hidden.has(z.id));
  }

  /** Catches typos in spec data: unknown nodes, steps on hidden nodes, missing captions. */
  private validate() {
    const where = `illustration ${this.spec.questionId}`;
    const ids = new Set([...this.nodes.keys(), ...(this.spec.zones ?? []).map((z) => z.id)]);
    for (const [a, b] of this.spec.links ?? []) {
      if (!this.nodes.has(a) || !this.nodes.has(b)) throw new Error(`${where}: link ${a}–${b} has an unknown node`);
    }
    for (const sc of this.scenarios.values()) {
      for (const h of sc.hidden) if (!ids.has(h)) throw new Error(`${where} ${sc.option}: hides unknown ${h}`);
      if (!sc.steps.length) throw new Error(`${where} ${sc.option}: no steps`);
      sc.steps.forEach((step, i) => {
        for (const id of step.nodeIds) {
          if (!this.nodes.has(id)) throw new Error(`${where} ${sc.option} step ${i + 1}: unknown node ${id}`);
          if (sc.hidden.has(id)) throw new Error(`${where} ${sc.option} step ${i + 1}: node ${id} is hidden`);
        }
        if (!step.caption.vi || !step.caption.en) throw new Error(`${where} ${sc.option} step ${i + 1}: caption missing a language`);
      });
    }
  }
}
