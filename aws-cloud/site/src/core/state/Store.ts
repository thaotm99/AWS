type Listener = () => void;

/** Observable state container. Shaped for React's useSyncExternalStore. */
export abstract class Store<S> {
  private readonly listeners = new Set<Listener>();
  private state: S;

  protected constructor(initial: S) {
    this.state = initial;
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getState = (): S => this.state;

  protected setState(patch: Partial<S> | ((s: S) => Partial<S>)): void {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) l();
  }
}

export type LoadStatus = "idle" | "loading" | "ready" | "error";
