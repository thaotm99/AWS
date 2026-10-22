import { BrowserLocalePreference } from "../../../core/i18n/LocalePreference";
import type { Locale } from "../../../core/i18n/types";
import type { PreferenceService } from "../services/PreferenceService";

/**
 * Saves the language through the API like any other data. The browser copy
 * stays as a cache so the first paint is already in the right language.
 */
export class ApiLocalePreference extends BrowserLocalePreference {
  constructor(private readonly preferences: PreferenceService) {
    super();
  }

  override write(locale: Locale): void {
    super.write(locale);
    this.preferences.update({ locale }).catch((e) => console.error("[i18n] could not save language", e));
  }

  /** Brings the cache in line with the stored value, e.g. one chosen on another device. */
  async load(): Promise<Locale | undefined> {
    const { locale } = await this.preferences.get();
    return locale;
  }
}
