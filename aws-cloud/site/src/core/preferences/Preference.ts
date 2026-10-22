/**
 * One viewer choice (language, theme…). Abstract so it can be backed by the
 * API; the browser copy is still needed to render the first paint correctly.
 */
export abstract class Preference<T> {
  abstract read(): T;
  abstract write(value: T): void;
  /** Calls back when another bundle or tab changes the value. */
  abstract watch(onChange: () => void): void;
}

/** Kept in localStorage; bundles on the same page stay in sync through a window event. */
export class BrowserPreference<T> extends Preference<T> {
  constructor(
    /** Also read by the inline script in <head> that runs before any bundle. */
    readonly storageKey: string,
    private readonly isValid: (value: unknown) => value is T,
    private readonly fallback: T,
  ) {
    super();
  }

  private get eventName(): string {
    return `preference:${this.storageKey}`;
  }

  read(): T {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return this.isValid(saved) ? saved : this.fallback;
    } catch {
      return this.fallback;
    }
  }

  write(value: T): void {
    try {
      localStorage.setItem(this.storageKey, String(value));
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(this.eventName));
  }

  watch(onChange: () => void): void {
    window.addEventListener(this.eventName, onChange);
    window.addEventListener("storage", (e) => e.key === this.storageKey && onChange());
  }
}

/** Build time: always the default value. */
export class FixedPreference<T> extends Preference<T> {
  constructor(private readonly value: T) {
    super();
  }
  read(): T {
    return this.value;
  }
  write(): void {}
  watch(): void {}
}
