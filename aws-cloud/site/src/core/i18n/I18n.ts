import { BrowserLocalePreference, FixedLocalePreference, type LocalePreference } from "./LocalePreference";
import { Translator } from "./Translator";
import { DEFAULT_LOCALE, type Locale } from "./types";

/** Holds every language's messages and the current choice; observable for React and the DOM. */
export class I18n<M> {
  private readonly translators = new Map<Locale, Translator<M>>();
  private readonly listeners = new Set<() => void>();
  private current: Locale;

  constructor(
    private readonly dictionaries: Record<Locale, M>,
    private readonly preference: LocalePreference = typeof window === "undefined" ? new FixedLocalePreference() : new BrowserLocalePreference(),
  ) {
    this.current = preference.read();
    preference.watch(() => this.update(preference.read()));
  }

  get locale(): Locale {
    return this.current;
  }

  translator(locale: Locale = this.current): Translator<M> {
    let t = this.translators.get(locale);
    if (!t) this.translators.set(locale, (t = new Translator(locale, this.dictionaries[locale])));
    return t;
  }

  setLocale(locale: Locale): void {
    this.update(locale);
    this.preference.write(locale);
  }

  private update(locale: Locale): void {
    if (locale === this.current) return;
    this.current = locale;
    for (const l of this.listeners) l();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Snapshot for useSyncExternalStore: one Translator per locale keeps it stable. */
  readonly getSnapshot = (): Translator<M> => this.translator();
  /** Static HTML is rendered in the default language, so hydration starts from it. */
  readonly getServerSnapshot = (): Translator<M> => this.translator(DEFAULT_LOCALE);
}
