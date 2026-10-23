import type { I18n } from "../../core/i18n/I18n";
import { COLORS, CONTEXT, NOTES_EVENT, addNote, findQuote, readNotes, removeNote, updateNote, type Highlight, type HighlightColor } from "../../lib/notes";

interface Page {
  lesson: string;
  part: string;
  title: { vi: string; en: string };
}

interface Indexed {
  nodes: { n: Text; start: number }[];
  text: string;
}

/** Text that is not lesson prose: simulations (islands), controls and code that is not read as text. */
const SKIP = "astro-island, script, style, svg, input, textarea, select, .notes-panel, .hl-bar";

function index(container: HTMLElement): Indexed {
  const nodes: Indexed["nodes"] = [];
  let text = "";
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    nodes.push({ n, start: text.length });
    text += n.data;
  }
  return { nodes, text };
}

/** A range boundary as an offset into the indexed text. */
function offset(idx: Indexed, node: Node, off: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const e = idx.nodes.find((x) => x.n === node);
    if (e) return e.start + off;
  }
  const r = document.createRange();
  r.setStart(node, off);
  for (const e of idx.nodes) if (r.comparePoint(e.n, 0) >= 0) return e.start;
  return idx.text.length;
}

function wrap(idx: Indexed, start: number, end: number, h: Pick<Highlight, "id" | "color">) {
  const parts = idx.nodes
    .map((e) => ({ e, s: Math.max(start, e.start) - e.start, t: Math.min(end, e.start + e.n.data.length) - e.start }))
    .filter((x) => x.s < x.t && x.e.n.data.slice(x.s, x.t).trim());
  for (const { e, s, t } of parts) {
    let node = e.n;
    if (t < node.data.length) node.splitText(t);
    if (s > 0) node = node.splitText(s);
    const mark = document.createElement("mark");
    mark.className = "hl";
    mark.dataset.hl = h.id;
    mark.dataset.color = h.color;
    node.replaceWith(mark);
    mark.append(node);
  }
}

function unwrap(id: string) {
  for (const m of document.querySelectorAll<HTMLElement>(`mark.hl[data-hl="${CSS.escape(id)}"]`)) {
    const parent = m.parentNode!;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    m.remove();
    parent.normalize();
  }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Highlights and notes on a lesson part: select text to highlight it in one of three colours or add a
 * note; press a highlight to change, annotate or remove it. The notes of the part are listed in a
 * panel after the text. Everything stays in this browser (lib/notes).
 */
export class Highlighter<M> {
  private bar?: HTMLElement;
  private pending: { lang: string; idx: Indexed; start: number; end: number } | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private shownAt = 0;

  constructor(
    private readonly body: HTMLElement,
    private readonly page: Page,
    private readonly i18n: I18n<M>,
    private readonly panel: HTMLElement,
  ) {}

  private t(key: string, params?: Record<string, string | number>): string {
    return (this.i18n.translator() as unknown as { lookup(k: string, p?: Record<string, string | number>): string }).lookup(`shell.notes.${key}`, params);
  }

  /** The text of each language on the page: the part body holds one block per language, or one block. */
  private containers(): [string, HTMLElement][] {
    const langs = [...this.body.querySelectorAll<HTMLElement>(":scope > [data-lang]")];
    return langs.length ? langs.map((el) => [el.dataset.lang!, el]) : [[document.documentElement.lang || "vi", this.body]];
  }

  private mine = () => readNotes().filter((h) => h.lesson === this.page.lesson && h.part === this.page.part);

  start(): void {
    for (const h of this.mine()) this.apply(h);
    const later = () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.onSelect(), 250);
    };
    document.addEventListener("selectionchange", later);
    document.addEventListener("pointerup", later);
    this.body.addEventListener("click", (e) => {
      const mark = (e.target as HTMLElement).closest<HTMLElement>("mark.hl");
      if (mark && getSelection()?.isCollapsed) this.showFor(mark);
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && this.bar && !this.bar.hidden && this.hide());
    // Scrolling away closes the bar, but not the scroll that brought the text into view as it opened.
    addEventListener("scroll", () => performance.now() - this.shownAt > 500 && this.bar && !this.bar.contains(document.activeElement) && this.hide(), { passive: true });
    addEventListener(NOTES_EVENT, () => this.renderPanel());
    addEventListener("storage", (e) => e.key === "notes" && this.renderPanel());
    this.i18n.subscribe(() => this.renderPanel());
    this.renderPanel();
  }

  private apply(h: Highlight) {
    const c = this.containers().find(([lang]) => lang === h.lang);
    if (!c) return;
    const idx = index(c[1]);
    const at = findQuote(idx.text, h.quote, h.prefix, h.suffix);
    if (at >= 0) wrap(idx, at, at + h.quote.length, h);
  }

  private onSelect() {
    const sel = getSelection();
    if (this.bar?.contains(document.activeElement)) return;
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      if (this.pending) this.hide();
      return;
    }
    const range = sel.getRangeAt(0);
    const found = this.containers().find(([, el]) => el.contains(range.commonAncestorContainer));
    if (!found || (range.commonAncestorContainer.parentElement ?? (range.commonAncestorContainer as Element)).closest?.(SKIP)) return;
    const idx = index(found[1]);
    let start = offset(idx, range.startContainer, range.startOffset);
    let end = offset(idx, range.endContainer, range.endOffset);
    while (start < end && /\s/.test(idx.text[start])) start++;
    while (end > start && /\s/.test(idx.text[end - 1])) end--;
    if (idx.text.slice(start, end).trim().length < 3) return;
    this.pending = { lang: found[0], idx, start, end };
    this.show(range.getBoundingClientRect(), null);
  }

  private create(color: HighlightColor): Highlight {
    const p = this.pending!;
    const h: Highlight = {
      id: newId(),
      ...this.page,
      lang: p.lang,
      quote: p.idx.text.slice(p.start, p.end),
      prefix: p.idx.text.slice(Math.max(0, p.start - CONTEXT), p.start),
      suffix: p.idx.text.slice(p.end, p.end + CONTEXT),
      color,
      note: "",
      at: Date.now(),
    };
    wrap(p.idx, p.start, p.end, h);
    addNote(h);
    getSelection()?.removeAllRanges();
    this.pending = null;
    return h;
  }

  private showFor(mark: HTMLElement) {
    const h = readNotes().find((x) => x.id === mark.dataset.hl);
    if (!h) return;
    this.pending = null;
    this.show(mark.getBoundingClientRect(), h);
  }

  /** The floating bar: colours and a note for a new selection, or for an existing highlight plus remove. */
  private show(rect: DOMRect, h: Highlight | null) {
    const bar = (this.bar ??= Object.assign(document.createElement("div"), { className: "hl-bar" }));
    if (!bar.isConnected) document.body.append(bar);
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", this.t("toolbar"));
    bar.innerHTML =
      COLORS.map((c) => `<button type="button" class="hl-swatch" data-color="${c}" aria-pressed="${h?.color === c}" aria-label="${esc(this.t(`color.${c}`))}"></button>`).join("") +
      `<span class="hl-sep" aria-hidden="true"></span><button type="button" class="hl-act" data-act="note">${esc(this.t(h?.note ? "editNote" : "addNote"))}</button>` +
      (h ? `<button type="button" class="hl-act" data-act="remove">${esc(this.t("remove"))}</button>` : "");
    bar.hidden = false;
    this.shownAt = performance.now();
    // Below the selection on touch screens, where the system's own menu sits above it.
    const below = matchMedia("(pointer: coarse)").matches || rect.top < 120;
    const w = bar.offsetWidth;
    bar.style.left = `${Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), innerWidth - w - 8)}px`;
    bar.style.top = `${below ? rect.bottom + 10 : rect.top - bar.offsetHeight - 10}px`;
    bar.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!b) return;
      const target = h ?? (b.dataset.color || b.dataset.act === "note" ? this.create((b.dataset.color as HighlightColor) || "yellow") : null);
      if (!target) return;
      if (b.dataset.color && h) {
        updateNote(h.id, { color: b.dataset.color as HighlightColor });
        document.querySelectorAll<HTMLElement>(`mark.hl[data-hl="${CSS.escape(h.id)}"]`).forEach((m) => (m.dataset.color = b.dataset.color));
        this.hide();
      } else if (b.dataset.act === "remove") {
        unwrap(target.id);
        removeNote(target.id);
        this.hide();
      } else if (b.dataset.act === "note") {
        this.editNote(target);
      } else this.hide();
    };
  }

  private editNote(h: Highlight) {
    const bar = this.bar!;
    bar.innerHTML = `<label class="hl-note"><span>${esc(this.t("note"))}</span><textarea rows="3"></textarea></label>
      <div class="hl-note-actions"><button type="button" class="hl-act" data-act="cancel">${esc(this.t("cancel"))}</button><button type="button" class="hl-act primary" data-act="save">${esc(this.t("save"))}</button></div>`;
    const ta = bar.querySelector("textarea")!;
    ta.value = readNotes().find((x) => x.id === h.id)?.note ?? "";
    ta.focus();
    bar.onclick = (e) => {
      const act = (e.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.act;
      if (act === "save") updateNote(h.id, { note: ta.value });
      if (act === "save" || act === "cancel") this.hide();
    };
  }

  private hide() {
    if (this.bar) this.bar.hidden = true;
    this.pending = null;
  }

  /** The notes of this part, after the text: each quote, its note (edited in place) and its place in the text. */
  private renderPanel() {
    const list = this.mine().sort((a, b) => a.at - b.at);
    const lang = document.documentElement.lang === "en" ? "en" : "vi";
    // Typing in a note writes on every keystroke; redrawing then would take the cursor away.
    if (this.panel.contains(document.activeElement) && document.activeElement?.tagName === "TEXTAREA") return;
    this.panel.innerHTML = `<div class="notes-head"><h2>${esc(this.t("panelTitle", { n: list.length }))}</h2><a href="/notes/">${esc(this.t("all"))}</a></div>` +
      (list.length
        ? `<ul>${list
            .map(
              (h) => `<li data-color="${h.color}"><blockquote lang="${h.lang}">${esc(h.quote)}</blockquote>
              <label><span class="sr-only">${esc(this.t("note"))}</span><textarea rows="2" data-id="${h.id}" placeholder="${esc(this.t("placeholder"))}">${esc(h.note)}</textarea></label>
              <div><button type="button" data-go="${h.id}"${h.lang !== lang ? " hidden" : ""}>${esc(this.t("show"))}</button><button type="button" data-del="${h.id}">${esc(this.t("remove"))}</button></div></li>`,
            )
            .join("")}</ul>`
        : `<p>${esc(this.t("empty"))}</p>`);
    this.panel.oninput = (e) => {
      const ta = e.target as HTMLTextAreaElement;
      if (ta.dataset.id) updateNote(ta.dataset.id, { note: ta.value });
    };
    this.panel.onclick = (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (b?.dataset.del) {
        unwrap(b.dataset.del);
        removeNote(b.dataset.del);
      } else if (b?.dataset.go) {
        const m = document.querySelector<HTMLElement>(`mark.hl[data-hl="${CSS.escape(b.dataset.go)}"]`);
        m?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        m?.classList.add("flash");
        setTimeout(() => m?.classList.remove("flash"), 1600);
      }
    };
  }
}
