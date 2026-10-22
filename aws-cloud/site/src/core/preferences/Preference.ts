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

interface PreferenceWrite<T> {
  value: T;
  /** False when localStorage refused the value and it lives in memory only. */
  saved: boolean;
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

  /**
   * The last value written while localStorage refused it (quota, blocked site data). `read()`
   * returns it for the rest of the page, so listeners don't snap back to the stale stored value.
   */
  private unsaved: { value: T } | null = null;

  read(): T {
    if (this.unsaved) return this.unsaved.value;
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
      this.unsaved = null;
    } catch {
      // Storage blocked: the choice lasts for this page only.
      this.unsaved = { value };
    }
    // Other bundles may hold their own copy of this preference; tell them what was (not) saved.
    const detail: PreferenceWrite<T> = { value, saved: this.unsaved === null };
    window.dispatchEvent(new CustomEvent(this.eventName, { detail }));
  }

  watch(onChange: () => void): void {
    window.addEventListener(this.eventName, (e) => {
      const detail = (e as CustomEvent<PreferenceWrite<T> | null>).detail;
      if (detail) this.unsaved = detail.saved ? null : { value: detail.value };
      onChange();
    });
    window.addEventListener("storage", (e) => {
      if (e.key !== this.storageKey) return;
      // Another tab managed to save a value: that one is current now.
      this.unsaved = null;
      onChange();
    });
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
