import { LOCALES, type Locale, type Messages } from "./types";

/** A module's messages in every language, keyed by locale. */
export type ModuleMessages<T> = Record<Locale, Messages<T>>;

/** Pairs a module's source dictionary (Vietnamese) with its translations. */
export function defineMessages<T>(source: T, translations: Omit<ModuleMessages<T>, "vi">): ModuleMessages<T> {
  return { vi: source as Messages<T>, ...translations } as ModuleMessages<T>;
}

type Combined<R extends Record<string, ModuleMessages<unknown>>> = { [K in keyof R]: R[K]["vi"] };

/** Merges module dictionaries under their namespace: { shell: {...}, practice: {...} } per locale. */
export function combineMessages<R extends Record<string, ModuleMessages<unknown>>>(modules: R): Record<Locale, Combined<R>> {
  const byLocale = {} as Record<Locale, Combined<R>>;
  for (const locale of LOCALES) {
    byLocale[locale] = Object.fromEntries(Object.entries(modules).map(([ns, m]) => [ns, m[locale]])) as Combined<R>;
  }
  return byLocale;
}
