import { prefersReducedMotion, travel } from "../../../lib/animate";
import type { ContentLocale } from "../domain/types";
import type { Illustration, Scenario } from "./Illustration";
import type { PacketKind, Stage } from "./steps";

const PACKET_CLASS: Record<PacketKind, string> = { request: "pkt", response: "pkt-back", warn: "pkt-edge", bad: "pkt-bad" };

/** Called when the caption moves to step `current` and when `applied` steps are on screen. */
export type ProgressListener = (current: number, applied: number) => void;

/**
 * Plays a scenario on an SVG layer: animates each step, then leaves time to read its caption.
 * Starting again or stopping cancels the run in progress. With reduced motion, jumps to the end.
 */
export class ScenarioPlayer implements Stage {
  private run = 0;

  constructor(
    private readonly layer: SVGGElement,
    private readonly illustration: Illustration,
    private readonly locale: ContentLocale,
  ) {}

  stop() {
    this.run++;
    this.layer.replaceChildren();
  }

  /** Resolves true when the scenario played to the end, false when it was cancelled. */
  async play(scenario: Scenario, onProgress: ProgressListener): Promise<boolean> {
    this.stop();
    const run = this.run;
    const n = scenario.steps.length;
    if (prefersReducedMotion()) {
      onProgress(n - 1, n);
      return true;
    }
    for (let i = 0; i < n; i++) {
      const step = scenario.steps[i];
      onProgress(i, i);
      await step.animate(this);
      if (run !== this.run) return false;
      onProgress(i, i + 1);
      await this.pause(ScenarioPlayer.readingTime(step.caption[this.locale]));
      if (run !== this.run) return false;
    }
    return true;
  }

  /** Time to read a caption after its animation, in ms. */
  static readingTime(caption: string) {
    return Math.min(3400, 900 + caption.length * 16);
  }

  async travel(from: string, to: string, packet: PacketKind, times: number): Promise<void> {
    const [p, q] = this.illustration.segment(from, to, this.locale);
    const dur = Math.max(420, Math.hypot(q[0] - p[0], q[1] - p[1]) * 2.2);
    const run = this.run;
    const one = async (i: number) => {
      await this.pause(i * 160);
      if (run === this.run) await travel(this.layer, [p, q], dur, PACKET_CLASS[packet], 6);
    };
    await Promise.all(Array.from({ length: times }, (_, i) => one(i)));
  }

  private pause(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
