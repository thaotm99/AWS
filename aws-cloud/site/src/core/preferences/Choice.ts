import type { Preference } from "./Preference";

/**
 * Observable current value of a Preference. Base of I18n (language) and
 * ThemeManager (light/dark); subclasses react to changes in `onChange`.
 */
export abstract class Choice<T> {
  private readonly listeners = new Set<() => void>();
  private current: T;

  constructor(protected readonly preference: Preference<T>) {
    this.current = preference.read();
    preference.watch(() => this.update(preference.read()));
  }

  get value(): T {
    return this.current;
  }

  set(value: T): void {
    this.update(value);
    this.preference.write(value);
  }

  protected update(value: T): void {
    if (value === this.current) return;
    this.current = value;
    this.onChange(value);
    for (const l of this.listeners) l();
  }

  /** Side effect of a change, e.g. updating <html>. */
  protected onChange(_value: T): void {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
