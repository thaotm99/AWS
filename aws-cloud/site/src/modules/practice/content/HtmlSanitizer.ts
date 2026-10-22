// Build-time only. Keeps the small set of tags the practice-test HTML uses and
// drops everything else (scripts, styles, event handlers, unknown attributes).

const ALLOWED: Record<string, string[]> = {
  p: [], br: [], strong: [], b: [], em: [], i: [], code: [], pre: [],
  ul: [], ol: [], li: [], a: ["href"], img: ["src", "alt"],
};
const VOID = new Set(["br", "img"]);
const URL_ATTRS = new Set(["href", "src"]);
const NAMES = Object.keys(ALLOWED).join("|");
/**
 * A tag exactly as `pass` rebuilds it: an allowed name, then only `name="value"` pairs.
 * Anything else that starts with "<" after sanitizing is text and gets escaped.
 */
const REBUILT_OR_LT = new RegExp(`<\\/(?:${NAMES})>|<(?:${NAMES})(?: [a-z]+="[^"]*")*>|<`, "g");
/** Removing one tag can join its neighbours into a new one ("<<x>script>"), so passes repeat; this caps them. */
const MAX_PASSES = 20;

export class HtmlSanitizer {
  sanitize(html: string): string {
    let out = html;
    for (let i = 0; ; i++) {
      const next = this.pass(out);
      if (next === out) break;
      if (i === MAX_PASSES) throw new Error("HtmlSanitizer: HTML did not settle; refusing to emit it");
      out = next;
    }
    // Whatever "<" is left does not open an allowed tag (e.g. "<img onerror=…" with no ">"): make it text.
    return out.replace(REBUILT_OR_LT, (m) => (m === "<" ? "&lt;" : m)).trim();
  }

  /** One round of block removal and tag rebuilding. Idempotent on its own output once it settles. */
  private pass(html: string): string {
    return html
      .replace(/<(script|style|iframe|object)[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?([a-zA-Z][\w-]*)([^>]*)>/g, (tag, rawName: string, rawAttrs: string) => {
        const name = rawName.toLowerCase();
        if (!(name in ALLOWED)) return "";
        if (tag.startsWith("</")) return VOID.has(name) ? "" : `</${name}>`;
        return `<${name}${this.attributes(name, rawAttrs)}>`;
      });
  }

  private attributes(name: string, raw: string): string {
    const out: string[] = [];
    for (const [, key, , v1, v2] of raw.matchAll(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const attr = key.toLowerCase();
      const value = (v1 ?? v2 ?? "").trim();
      if (!ALLOWED[name].includes(attr)) continue;
      if (URL_ATTRS.has(attr) && !/^https?:\/\//i.test(value)) continue;
      out.push(`${attr}="${value.replace(/"/g, "&quot;")}"`);
    }
    if (name === "a") out.push('target="_blank"', 'rel="noopener noreferrer"');
    if (name === "img") out.push('loading="lazy"');
    return out.length ? " " + out.join(" ") : "";
  }
}
