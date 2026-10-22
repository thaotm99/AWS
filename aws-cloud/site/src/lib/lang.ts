import { useI18n } from "../app/i18n";

/** Text in both site languages, for strings that live inside a lesson simulation. */
export interface Bi<T = string> {
  vi: T;
  en: T;
}

/**
 * Picks the current language's form of a bilingual value and re-renders on a language switch:
 *   const L = useLang();  …  L({ vi: "Chạy mô phỏng", en: "Run simulation" })
 */
export function useLang() {
  const { locale } = useI18n();
  return <T,>(value: Bi<T>): T => value[locale];
}
