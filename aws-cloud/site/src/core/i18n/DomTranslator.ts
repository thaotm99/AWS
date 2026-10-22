import type { MessageParams } from "./types";

interface Lookup {
  locale: string;
  lookup(key: string, params?: MessageParams): string;
}

/**
 * Translates the static (Astro) parts of a page:
 *   data-i18n="key"                text content
 *   data-i18n-attr="attr:key;…"    attributes
 *   data-i18n-params='{"n":1}'     placeholder values for either
 *   <html data-i18n-title="key">   document title
 */
export class DomTranslator {
  constructor(private readonly root: ParentNode = document) {}

  private static params(el: Element): MessageParams | undefined {
    const raw = el.getAttribute("data-i18n-params");
    return raw ? (JSON.parse(raw) as MessageParams) : undefined;
  }

  apply({ locale, lookup }: Lookup): void {
    const html = document.documentElement;
    html.lang = locale;
    for (const el of this.root.querySelectorAll("[data-i18n]")) {
      el.textContent = lookup(el.getAttribute("data-i18n")!, DomTranslator.params(el));
    }
    for (const el of this.root.querySelectorAll("[data-i18n-attr]")) {
      for (const pair of el.getAttribute("data-i18n-attr")!.split(";")) {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, lookup(key, DomTranslator.params(el)));
      }
    }
    const titleKey = html.getAttribute("data-i18n-title");
    if (titleKey) document.title = lookup(titleKey, DomTranslator.params(html));
    html.classList.remove("i18n-pending");
  }
}
