import { I18n } from "../core/i18n/I18n";
import { combineMessages } from "../core/i18n/messages";
import { DEFAULT_LOCALE, isLocale, type MessageKey } from "../core/i18n/types";
import { useTranslator } from "../core/i18n/useTranslator";
import { practiceMessages } from "../modules/practice/i18n";
import { shellMessages } from "../modules/shell/i18n";
import { viewerPreference } from "./preferences";

// Each module owns its messages; the site registers them here under a namespace.
const messages = combineMessages({ shell: shellMessages, practice: practiceMessages });

export type SiteMessages = (typeof messages)["vi"];
export type SiteMessageKey = MessageKey<SiteMessages>;

// Build time renders the default language; the browser saves the choice through the API.
const { preference, connect } = viewerPreference("locale", isLocale, DEFAULT_LOCALE);

export const i18n = new I18n<SiteMessages>(messages, preference);
connect(i18n);

export function useI18n() {
  return useTranslator(i18n);
}
