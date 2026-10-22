import { useSyncExternalStore } from "react";
import type { I18n } from "./I18n";
import type { Translator } from "./Translator";

/** Current translator; re-renders the component when the language changes. */
export function useTranslator<M>(i18n: I18n<M>): Translator<M> {
  return useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getServerSnapshot);
}
