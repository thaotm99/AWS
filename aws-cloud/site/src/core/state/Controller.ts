import type { EventBus } from "./EventBus";
import type { Store } from "./Store";

/**
 * Handles one area's events: calls services, then writes the result to its
 * store. Controllers never touch the DOM and the UI never calls services.
 */
export abstract class Controller<E extends { type: string }, S, St extends Store<S>> {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    protected readonly bus: EventBus<E>,
    readonly store: St,
  ) {}

  /** Register event handlers with `this.on`. */
  protected abstract bind(): void;

  attach(): this {
    this.bind();
    return this;
  }

  detach(): void {
    this.unsubscribers.splice(0).forEach((off) => off());
  }

  protected on<T extends E["type"]>(type: T, handler: (event: Extract<E, { type: T }>) => void | Promise<void>): void {
    this.unsubscribers.push(this.bus.on(type, handler));
  }

  protected static message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
}
