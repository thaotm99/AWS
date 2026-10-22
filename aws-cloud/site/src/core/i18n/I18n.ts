import { Choice } from "../preferences/Choice";
import type { Preference } from "../preferences/Preference";
import { Translator } from "./Translator";
import { DEFAULT_LOCALE, type Locale } from "./types";

/** Holds every language's messages and the current choice; observable for React and the DOM. */
export class I18n<M> extends Choice<Locale> {
  private readonly translators = new Map<Locale, Translator<M>>();

  constructor(
    private readonly dictionaries: Record<Locale, M>,
    preference: Preference<Locale>,
  ) {
    super(preference);
  }

  get locale(): Locale {
    return this.value;
  }

  translator(locale: Locale = this.value): Translator<M> {
    let t = this.translators.get(locale);
    if (!t) this.translators.set(locale, (t = new Translator(locale, this.dictionaries[locale])));
    return t;
  }

  setLocale(locale: Locale): void {
    this.set(locale);
  }

  /** Snapshot for useSyncExternalStore: one Translator per locale keeps it stable. */
  readonly getSnapshot = (): Translator<M> => this.translator();
  /** Static HTML is rendered in the default language, so hydration starts from it. */
  readonly getServerSnapshot = (): Translator<M> => this.translator(DEFAULT_LOCALE);
}
