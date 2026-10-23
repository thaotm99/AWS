import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../app/i18n";
import { getKnown, onKnownChange, setKnown } from "../../lib/known-terms";
import { useLang, type Bi } from "../../lib/lang";
import type { GlossaryText } from "../../data/glossary";
import { ACRONYM } from "../../data/glossary-rules";
import FlowFigure from "./FlowFigure";

export interface StripTerm {
  id: string;
  name: string;
  docs: string;
  flow?: string[];
  /** Spellings to find in the scene text (glossary aliases). */
  spell: string[];
  vi: GlossaryText;
  en: GlossaryText;
  /** The lesson that teaches the term, when it is not the current one. */
  learn?: { id: string } & Bi;
}

/** Chips shown before "+N". */
const VISIBLE = 8;

const T = {
  title: { vi: "Từ khóa của phần này", en: "Key terms in this section" },
  hint: { vi: "Chọn một từ để xem nghĩa trước khi đọc", en: "Pick a term to see what it means before reading" },
  allKnown: { vi: "Bạn đã hiểu mọi từ khóa của phần này", en: "You know every key term in this section" },
  review: { vi: "Xem lại", en: "Review" },
  more: { vi: "Xem thêm", en: "Show more" },
  example: { vi: "Ở MFTech:", en: "At MFTech:" },
  learn: { vi: "Học kỹ ở bài", en: "Covered in" },
  glossary: { vi: "Mở trong trang Thuật ngữ", en: "Open in the glossary" },
  docs: { vi: "Tài liệu AWS", en: "AWS documentation" },
  mark: { vi: "Tôi đã hiểu từ này", en: "I understand this term" },
  understood: { vi: "Đã hiểu", en: "Understood" },
};

/** Text the strip must not touch: interactive islands, headings, code, links and controls. */
const SKIP = "astro-island, .kw-strip, .scene-head, h1, h2, h3, h4, code, pre, a, button, svg, summary, script, style";

/** Wraps the first use of each term in the scene's own text in a button; returns a cleanup. */
function markTerms(section: Element, terms: StripTerm[], pick: (id: string) => void): () => void {
  const byKey = new Map<string, { id: string; text: string; exact: boolean }>();
  for (const t of terms) for (const text of t.spell) byKey.set(text.toLowerCase(), { id: t.id, text, exact: ACRONYM.test(text) });
  if (!byKey.size) return () => {};
  const alternatives = [...byKey.values()]
    .map((a) => a.text)
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])(${alternatives.join("|")})(?![\\p{L}\\p{N}_])`, "giu");

  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  const done = new Set<string>();
  const made: { button: HTMLButtonElement; text: Text }[] = [];
  for (const node of nodes) {
    const text = node.data;
    const hits: { start: number; end: number; id: string }[] = [];
    for (const m of text.matchAll(regex)) {
      const alias = byKey.get(m[1].toLowerCase());
      if (!alias || (alias.exact && m[1] !== alias.text) || done.has(alias.id)) continue;
      done.add(alias.id);
      hits.push({ start: m.index!, end: m.index! + m[0].length, id: alias.id });
    }
    if (!hits.length) continue;
    const frag = document.createDocumentFragment();
    let at = 0;
    for (const h of hits) {
      frag.append(text.slice(at, h.start));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kw-term";
      button.dataset.term = h.id;
      button.textContent = text.slice(h.start, h.end);
      button.addEventListener("click", () => pick(h.id));
      frag.append(button);
      made.push({ button, text: document.createTextNode(button.textContent) });
      at = h.end;
    }
    frag.append(text.slice(at));
    node.replaceWith(frag);
  }
  return () => {
    for (const { button, text } of made) button.replaceWith(text);
    section.normalize();
  };
}

function Ring({ done, total }: { done: number; total: number }) {
  const c = 2 * Math.PI * 15;
  return (
    <span className="kw-ring">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="15" className="kw-ring-bg" />
        <circle cx="20" cy="20" r="15" className="kw-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} transform="rotate(-90 20 20)" />
      </svg>
      <span>{done}/{total}</span>
    </span>
  );
}

/** The key-terms strip at the top of a lesson scene: chips, a definition panel and marks in the text. */
export default function KeywordStrip({ terms }: { terms: StripTerm[] }) {
  const L = useLang();
  const { locale } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const [known, setKnownState] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [review, setReview] = useState(false);

  useEffect(() => {
    const sync = () => setKnownState(getKnown());
    sync();
    return onKnownChange(sync);
  }, []);

  useEffect(() => {
    const section = root.current?.closest("section.scene");
    if (!section) return;
    return markTerms(section, terms, (id) => {
      setOpen(id);
      setReview(true);
      if (terms.findIndex((t) => t.id === id) >= VISIBLE) setMore(true);
      root.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [terms]);

  useEffect(() => {
    root.current
      ?.closest("section.scene")
      ?.querySelectorAll<HTMLElement>(".kw-term")
      .forEach((b) => b.classList.toggle("known", known.has(b.dataset.term!)));
  }, [known]);

  const knownCount = terms.filter((t) => known.has(t.id)).length;
  const collapsed = knownCount === terms.length && !review;
  const shown = more ? terms : terms.slice(0, VISIBLE);
  const cur = collapsed ? undefined : terms.find((t) => t.id === open);
  const curKnown = cur ? known.has(cur.id) : false;

  return (
    <div className="kw-strip" ref={root}>
      <div className="kw-bar">
        <Ring done={knownCount} total={terms.length} />
        <div className="kw-title">
          <b>{L(T.title)}</b>
          <span>{collapsed ? L(T.allKnown) : L(T.hint)}</span>
        </div>
        {collapsed ? (
          <button type="button" className="kw-review" onClick={() => setReview(true)}>{L(T.review)}</button>
        ) : (
          <div className="kw-chips" role="group" aria-label={L(T.title)}>
            {shown.map((t) => (
              <button key={t.id} type="button" className="kw-chip" aria-pressed={open === t.id} data-known={known.has(t.id) || undefined} onClick={() => setOpen(open === t.id ? null : t.id)}>
                {known.has(t.id) && (
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
                {t.name}
              </button>
            ))}
            {!more && terms.length > VISIBLE && (
              <button type="button" className="kw-more" aria-label={`${L(T.more)} ${terms.length - VISIBLE}`} onClick={() => setMore(true)}>+{terms.length - VISIBLE}</button>
            )}
          </div>
        )}
      </div>
      {cur && (
        <div className="kw-panel" key={cur.id} aria-live="polite">
          <div className="kw-panel-text">
            <b className="kw-name">{cur.name}</b>
            <p>{L({ vi: cur.vi.def, en: cur.en.def })}</p>
            {cur.vi.example && (
              <p className="kw-ex"><b>{L(T.example)}</b> {L({ vi: cur.vi.example, en: cur.en.example ?? cur.vi.example })}</p>
            )}
            <p className="kw-links">
              {cur.learn && <a href={`/concepts/${cur.learn.id}/`}>{L(T.learn)} {L(cur.learn)} →</a>}
              <a href={`/glossary/#${cur.id}`}>{L(T.glossary)}</a>
              <a href={cur.docs} target="_blank" rel="noopener">{L(T.docs)} ↗</a>
            </p>
          </div>
          <div className="kw-panel-side">
            {cur.flow && <FlowFigure flow={cur.flow} lang={locale} />}
            <button type="button" className="kw-mark" aria-pressed={curKnown} onClick={() => setKnown(cur.id, !curKnown)}>
              {curKnown ? `${L(T.understood)} ✓` : L(T.mark)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
