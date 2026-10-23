import type { I18n } from "../../../core/i18n/I18n";
import type { Locale } from "../../../core/i18n/types";

/** One entry of /search-index/<lang>.json. */
interface Entry {
  kind: "lesson" | "part" | "term";
  url: string;
  title: string;
  context: string;
  text: string;
}

/** An entry prepared for one language: original strings plus folded copies of the same length. */
interface Doc {
  entry: Entry;
  title: string;
  context: string;
  text: string;
  fTitle: string;
  fContext: string;
  fText: string;
}

const MAX_RESULTS = 30;
const KIND_ORDER = { part: 0, lesson: 1, term: 2 } as const;

/** Lower case without Vietnamese marks, one output character per input character, so match offsets line up. */
function fold(s: string): string {
  let out = "";
  for (const ch of s) {
    const f = ch.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();
    out += f.length === 1 ? f : ch.toLowerCase().length === 1 ? ch.toLowerCase() : "?";
  }
  return out;
}

const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/**
 * Where `token` occurs in `folded` as a whole word, or as the start of a word when `prefix` is set
 * (the last word of a query may still be being typed). So "do" matches "độ" but not "đời" or "domain".
 */
function matches(folded: string, token: string, prefix: boolean): number[] {
  const at: number[] = [];
  for (let i = folded.indexOf(token); i >= 0; i = folded.indexOf(token, i + 1)) {
    if (isWordChar(folded[i - 1])) continue;
    if (!prefix && isWordChar(folded[i + token.length])) continue;
    at.push(i);
  }
  return at;
}

/** The query as tokens, each with whether it may match a word start only (the last one). */
type Token = { t: string; prefix: boolean };
const has = (folded: string, k: Token) => matches(folded, k.t, k.prefix).length > 0;

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** `text` with every match of the tokens wrapped in <mark>, HTML-escaped. */
function highlight(text: string, folded: string, tokens: Token[]): string {
  const marks: [number, number][] = [];
  for (const k of tokens) for (const i of matches(folded, k.t, k.prefix)) marks.push([i, i + k.t.length]);
  marks.sort((a, b) => a[0] - b[0]);
  let html = "";
  let at = 0;
  for (const [a, b] of marks) {
    if (a < at) continue;
    html += escape(text.slice(at, a)) + "<mark>" + escape(text.slice(a, b)) + "</mark>";
    at = b;
  }
  return html + escape(text.slice(at));
}

/**
 * Site search: a dialog opened from the top bar, with "/" or Ctrl/Cmd+K. The index
 * (/search-index.json) is fetched the first time the dialog opens.
 */
export class SiteSearch<M> {
  /** Prepared entries and in-flight loads, per language: only the language in use is fetched. */
  private docs = new Map<Locale, Doc[]>();
  private loading = new Map<Locale, Promise<Doc[]>>();
  private active = -1;

  constructor(
    private readonly i18n: I18n<M>,
    private readonly dialog: HTMLDialogElement,
    private readonly opener: HTMLElement,
  ) {}

  private get input() {
    return this.dialog.querySelector<HTMLInputElement>("input")!;
  }

  private get list() {
    return this.dialog.querySelector<HTMLElement>("[data-search-results]")!;
  }

  private get status() {
    return this.dialog.querySelector<HTMLElement>("[data-search-status]")!;
  }

  private t(key: string, params?: Record<string, string | number>): string {
    return (this.i18n.translator() as unknown as { lookup(k: string, p?: Record<string, string | number>): string }).lookup(key, params);
  }

  start(): void {
    this.opener.addEventListener("click", () => this.open());
    document.addEventListener("keydown", (e) => {
      const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        if (this.dialog.open) return;
        e.preventDefault();
        this.open();
      }
    });
    this.input.addEventListener("input", () => this.run());
    this.input.addEventListener("keydown", (e) => this.onKey(e));
    // A click on the backdrop (the dialog element itself, outside its panel) closes it.
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) this.dialog.close();
    });
    this.dialog.querySelector("[data-search-close]")?.addEventListener("click", () => this.dialog.close());
    // Opening a result on the same page (a glossary anchor) must not leave the dialog over it.
    this.list.addEventListener("click", (e) => (e.target as HTMLElement).closest("a") && this.dialog.close());
    this.i18n.subscribe(() => this.dialog.open && this.run());
  }

  open(): void {
    if (!this.dialog.open) this.dialog.showModal();
    this.input.select();
    this.run();
  }

  private load(locale: Locale): Promise<Doc[]> {
    let p = this.loading.get(locale);
    if (!p) {
      p = fetch(`/search-index/${locale}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: Entry[]) => {
          const docs = data.map((entry) => ({
            entry,
            title: entry.title,
            context: entry.context,
            text: entry.text,
            fTitle: fold(entry.title),
            fContext: fold(entry.context),
            fText: fold(entry.text),
          }));
          this.docs.set(locale, docs);
          return docs;
        });
      p.catch(() => this.loading.delete(locale)); // let the next search try again
      this.loading.set(locale, p);
    }
    return p;
  }

  private async run(): Promise<void> {
    const query = this.input.value;
    const words = fold(query).split(/\s+/).filter((t) => t.length > 0);
    const tokens: Token[] = words.map((t, i) => ({ t, prefix: i === words.length - 1 }));
    if (!tokens.length) {
      this.render([], [], "");
      this.status.textContent = this.t("shell.search.hint");
      return;
    }
    const locale = this.i18n.locale;
    let docs = this.docs.get(locale);
    if (!docs) {
      this.status.textContent = this.t("shell.search.loading");
      try {
        docs = await this.load(locale);
      } catch {
        this.status.textContent = this.t("shell.search.error");
        return;
      }
      if (this.input.value !== query || this.i18n.locale !== locale) return; // a newer search runs instead
    }
    const phrase: Token | undefined = words.length > 1 ? { t: words.join(" "), prefix: true } : undefined;
    const hits: { doc: Doc; score: number }[] = [];
    for (const doc of docs) {
      let score = 0;
      let all = true;
      for (const k of tokens) {
        const inTitle = has(doc.fTitle, k);
        if (!inTitle && !has(doc.fContext, k) && !has(doc.fText, k)) {
          all = false;
          break;
        }
        score += inTitle ? 10 + (doc.fTitle.startsWith(k.t) ? 5 : 0) : has(doc.fContext, k) ? 3 : 1;
      }
      if (!all) continue;
      // The words together, in order, count for much more than the same words scattered.
      if (phrase && has(doc.fTitle, phrase)) score += 30;
      else if (phrase && has(doc.fText, phrase)) score += doc.entry.kind === "term" ? 14 : 8;
      if (doc.fTitle === words.join(" ")) score += 20;
      hits.push({ doc, score });
    }
    // With several words, entries that have them together as a phrase replace the scattered matches.
    const together = phrase ? hits.filter((h) => has(h.doc.fTitle, phrase) || has(h.doc.fText, phrase)) : [];
    if (together.length) hits.splice(0, hits.length, ...together);
    hits.sort((a, b) => b.score - a.score || KIND_ORDER[a.doc.entry.kind] - KIND_ORDER[b.doc.entry.kind]);
    this.render(hits.slice(0, MAX_RESULTS).map((h) => h.doc), tokens, query, phrase);
    this.status.textContent = hits.length
      ? this.t("shell.search.count", { n: hits.length })
      : this.t("shell.search.empty", { q: query.trim() });
  }

  private render(docs: Doc[], tokens: Token[], query: string, phrase?: Token): void {
    this.active = docs.length ? 0 : -1;
    // Where the whole phrase occurs, mark only the phrase, not each of its words elsewhere.
    const mark = (text: string, folded: string) => highlight(text, folded, phrase && matches(folded, phrase.t, true).length ? [phrase] : tokens);
    this.list.innerHTML = docs
      .map((d, i) => {
        // Quote the text around the phrase, else around the first matching word, else from its start.
        const atPhrase = phrase ? matches(d.fText, phrase.t, true)[0] : undefined;
        const first = atPhrase ?? Math.min(...tokens.map((k) => matches(d.fText, k.t, k.prefix)[0] ?? Infinity));
        const from = Number.isFinite(first) ? Math.max(0, first - 60) : 0;
        const snippet = d.text.slice(from, from + 170);
        const fSnippet = d.fText.slice(from, from + 170);
        const kind = this.t(`shell.search.kind.${d.entry.kind}`);
        return `<li role="option" id="search-opt-${i}" aria-selected="${i === 0}">
          <a href="${escape(d.entry.url)}" tabindex="-1">
            <span class="sr-kind">${escape(kind)}${d.context ? " · " + escape(d.context) : ""}</span>
            <b>${mark(d.title, d.fTitle)}</b>
            ${snippet ? `<span class="sr-text">${from > 0 ? "…" : ""}${mark(snippet, fSnippet)}${from + 170 < d.text.length ? "…" : ""}</span>` : ""}
          </a>
        </li>`;
      })
      .join("");
    this.input.setAttribute("aria-activedescendant", docs.length ? "search-opt-0" : "");
    this.list.hidden = !query || !docs.length;
  }

  private onKey(e: KeyboardEvent): void {
    // A search input uses Escape to clear itself, which would keep the dialog open.
    if (e.key === "Escape") {
      e.preventDefault();
      this.dialog.close();
      return;
    }
    const items = [...this.list.querySelectorAll<HTMLElement>("[role=option]")];
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      this.active = (this.active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.setAttribute("aria-selected", String(i === this.active)));
      items[this.active].scrollIntoView({ block: "nearest" });
      this.input.setAttribute("aria-activedescendant", items[this.active].id);
    } else if (e.key === "Enter" && this.active >= 0) {
      e.preventDefault();
      items[this.active].querySelector("a")!.click();
    }
  }
}
