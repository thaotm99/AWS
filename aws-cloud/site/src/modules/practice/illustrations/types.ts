// Data shapes of an illustration: an architecture diagram for one question, plus one scenario per option
// that plays a request through it and ends in a verdict. New questions only add a spec file (see specs/).
import type { ContentLocale, OptionKey } from "../domain/types";

/** Text in every language of the site. Captions must be written in both. */
export type Bilingual = Record<ContentLocale, string>;
/** A plain string is the same in every language (AWS names stay in English). */
export type Label = string | Bilingual;

/** Grid cell, in columns and rows from the top-left. Fractions are allowed. */
export type Cell = readonly [col: number, row: number];

/**
 * Look of a node.
 * actor: a person or client · service: an AWS service · data: a data store · onprem: on-premises
 * ghost: something the option relies on that cannot do the job, or does not exist as described.
 */
export type NodeKind = "actor" | "service" | "data" | "onprem" | "ghost";

export interface NodeSpec {
  id: string;
  label: Label;
  /** Second line, smaller. */
  sub?: Label;
  kind?: NodeKind;
  at: Cell;
}

export type ZoneTone = "region" | "vpc" | "az" | "account" | "onprem" | "group";

/** A boundary drawn behind nodes: Region, VPC, AZ, account, data center, Auto Scaling group… */
export interface ZoneSpec {
  id: string;
  label: Label;
  tone: ZoneTone;
  /** Top-left and bottom-right cells it covers. */
  from: Cell;
  to: Cell;
  /** Extra space around the cells, in px; nested zones use a larger pad on the outer one. */
  pad?: number;
}

/** ok: the flow does its job · warn: works, with a cost or a caveat · bad: the flow fails or does harm. */
export type Tone = "ok" | "warn" | "bad";

interface StepBase {
  /** One sentence under the diagram while this step plays. */
  caption: Bilingual;
  /** Short tag left on the step's target node (e.g. "HIT", "/orders", "×2"). */
  badge?: Label;
}

/** Packets travel along each path in order (several paths move together). */
export interface FlowStepSpec extends StepBase {
  flow: string[] | string[][];
  tone?: Tone;
  /** A response travelling back: drawn in the response colour. */
  back?: boolean;
  /** Several packets one after another, e.g. many requests. */
  times?: number;
}

/** A packet leaves `from` and is stopped at `at`, which gets a failure marker. */
export interface StopStepSpec extends StepBase {
  stop: readonly [from: string, at: string];
}

/** Nodes change state without traffic: one fails, recovers, or is singled out. */
export interface MarkStepSpec extends StepBase {
  mark: string | string[];
  tone: Tone | "dim";
}

export type StepSpec = FlowStepSpec | StopStepSpec | MarkStepSpec;

export interface ScenarioSpec {
  option: OptionKey;
  /** Nodes and zones that do not exist in this option. */
  hide?: string[];
  steps: StepSpec[];
  /** Does the option meet the question's requirements, and why. */
  verdict: { works: boolean; caption: Bilingual };
}

export interface IllustrationSpec {
  /** Numeric question id from the practice test source. Never the exam/question code. */
  questionId: number;
  cols: number;
  rows: number;
  nodes: NodeSpec[];
  zones?: ZoneSpec[];
  /** Links always drawn; links a scenario's packets travel along are added automatically. */
  links?: [string, string][];
  scenarios: ScenarioSpec[];
}
