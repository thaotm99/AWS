import type { DomParams, Locale, MessageParams } from "./types";

interface Lookup {
  locale: Locale;
  lookup(key: string, params?: MessageParams): string;
}

/**
 * Translates the static (Astro) parts of a page:
 *   data-i18n="key"                text content
 *   data-i18n-attr="attr:key;…"    attributes
 *   data-i18n-params='{"n":1}'     placeholder values for either; {"title":{"vi":…,"en":…}} per language
 *   <html data-i18n-title="key">   document title
 */
export class DomTranslator {
  constructor(private readonly root: ParentNode = document) {}

  private static params(el: Element, locale: Locale): MessageParams | undefined {
    const raw = el.getAttribute("data-i18n-params");
    if (!raw) return undefined;
    const params = JSON.parse(raw) as DomParams;
    return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === "object" ? v[locale] : v]));
  }

  apply({ locale, lookup }: Lookup): void {
    const html = document.documentElement;
    html.lang = locale;
    for (const el of this.root.querySelectorAll("[data-i18n]")) {
      el.textContent = lookup(el.getAttribute("data-i18n")!, DomTranslator.params(el, locale));
    }
    for (const el of this.root.querySelectorAll("[data-i18n-attr]")) {
      for (const pair of el.getAttribute("data-i18n-attr")!.split(";")) {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, lookup(key, DomTranslator.params(el, locale)));
      }
    }
    const titleKey = html.getAttribute("data-i18n-title");
    if (titleKey) document.title = lookup(titleKey, DomTranslator.params(html, locale));
    html.classList.remove("i18n-pending");
  }
}
