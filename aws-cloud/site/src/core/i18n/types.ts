export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Same keys as T with every leaf typed as string, so other languages can fill any wording. */
export type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> };

/** Dotted path to a leaf, e.g. "practice.exam.check". Depth is capped so generic code type-checks. */
export type MessageKey<T, P extends string = "", D extends unknown[] = []> = D["length"] extends 6
  ? never
  : { [K in keyof T & string]: T[K] extends string ? `${P}${K}` : MessageKey<T[K], `${P}${K}.`, [...D, 0]> }[keyof T & string];

export type MessageParams = Record<string, string | number>;

/** Placeholder values written into static markup; a `{ vi, en }` value is read in the chosen language. */
export type DomParams = Record<string, string | number | Record<Locale, string>>;
