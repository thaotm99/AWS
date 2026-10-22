import { DEFAULT_LOCALE, isLocale, type Locale } from "./types";

/**
 * Where the chosen language is kept. Abstract so it can later sync with a user
 * profile on the server; the browser copy is still needed to render the first
 * paint in the right language.
 */
export abstract class LocalePreference {
  abstract read(): Locale;
  abstract write(locale: Locale): void;
  /** Calls back when another bundle or tab changes the language. */
  abstract watch(onChange: () => void): void;
}

const STORAGE_KEY = "locale";
const CHANGE_EVENT = "locale-change";

export class BrowserLocalePreference extends LocalePreference {
  /** Also used by the inline script in <head> that runs before any bundle. */
  static readonly storageKey = STORAGE_KEY;

  read(): Locale {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return isLocale(saved) ? saved : DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }

  write(locale: Locale): void {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  watch(onChange: () => void): void {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", (e) => e.key === STORAGE_KEY && onChange());
  }
}

/** Build time and server rendering: always the default language. */
export class FixedLocalePreference extends LocalePreference {
  read(): Locale {
    return DEFAULT_LOCALE;
  }
  write(): void {}
  watch(): void {}
}
