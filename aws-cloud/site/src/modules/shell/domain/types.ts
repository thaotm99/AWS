import type { Locale } from "../../../core/i18n/types";
import type { Theme } from "../../../core/theme/types";

/** Per-viewer settings. Moves to the user profile once accounts exist. */
export interface Preferences {
  locale?: Locale;
  theme?: Theme;
}
