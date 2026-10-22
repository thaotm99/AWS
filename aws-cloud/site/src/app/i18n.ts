import { I18n } from "../core/i18n/I18n";
import { FixedLocalePreference } from "../core/i18n/LocalePreference";
import { combineMessages } from "../core/i18n/messages";
import type { MessageKey } from "../core/i18n/types";
import { useTranslator } from "../core/i18n/useTranslator";
import { practiceMessages } from "../modules/practice/i18n";
import { shellMessages } from "../modules/shell/i18n";
import { ApiLocalePreference } from "../modules/shell/i18n/ApiLocalePreference";
import { PreferenceService } from "../modules/shell/services/PreferenceService";
import { getApiClient } from "./api";

// Each module owns its messages; the site registers them here under a namespace.
const messages = combineMessages({ shell: shellMessages, practice: practiceMessages });

export type SiteMessages = (typeof messages)["vi"];
export type SiteMessageKey = MessageKey<SiteMessages>;

function createI18n(): I18n<SiteMessages> {
  // Build time renders the default language; the browser saves the choice through the API.
  if (typeof window === "undefined") return new I18n(messages, new FixedLocalePreference());
  const preference = new ApiLocalePreference(new PreferenceService(getApiClient()));
  const i18n = new I18n(messages, preference);
  preference
    .load()
    .then((saved) => saved && saved !== i18n.locale && i18n.setLocale(saved))
    .catch((e) => console.error("[i18n] could not load language", e));
  return i18n;
}

export const i18n = createI18n();

export function useI18n() {
  return useTranslator(i18n);
}
