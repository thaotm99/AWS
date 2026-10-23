import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../app/i18n";
import { BOX_DAYS, boxCounts, grade, readDeck, sessionCards, today, writeDeck, type Deck } from "../lib/flashcards";

interface Card {
  id: string;
  name: string;
  layer: number;
  lesson: { id: string; vi: string; en: string };
  def: { vi: string; en: string };
  example: { vi: string; en: string };
}

interface Layer {
  n: number;
  name: string;
  nameEn: string;
}

/**
 * Flashcards from the glossary with spaced repetition: each session holds the cards due today plus a
 * few new ones. Reveal the definition, then say whether you remembered it.
 */
export default function Flashcards({ layers }: { layers: Layer[] }) {
  const { t, locale } = useI18n();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState(false);
  const [deck, setDeck] = useState<Deck>({});
  const [layer, setLayer] = useState<number | "all">("all");
  const [queue, setQueue] = useState<string[]>([]);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const day = today();

  useEffect(() => {
    setDeck(readDeck());
    fetch("/flashcards.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setCards)
      .catch(() => setError(true));
  }, []);

  const pool = useMemo(() => (cards ?? []).filter((c) => layer === "all" || c.layer === layer), [cards, layer]);
  const ids = useMemo(() => pool.map((c) => c.id), [pool]);
  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards]);

  // A new session whenever the cards load or the layer filter changes.
  useEffect(() => {
    if (!cards) return;
    setQueue(sessionCards(ids, readDeck(), day));
    setShown(false);
    setDone(0);
  }, [cards, ids]);

  const current = queue.length ? byId.get(queue[0]) : undefined;

  function answer(remembered: boolean) {
    if (!current) return;
    const next = { ...deck, [current.id]: grade(deck[current.id], remembered, day) };
    setDeck(next);
    writeDeck(next);
    // A forgotten card comes back at the end of this session.
    setQueue((q) => (remembered ? q.slice(1) : [...q.slice(1), q[0]]));
    if (remembered) setDone((d) => d + 1);
    setShown(false);
  }

  // Keyboard: Space or Enter reveals; 1 = not yet, 2 = remembered.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select, dialog")) return;
      if (!current) return;
      if (!shown && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShown(true);
      } else if (shown && (e.key === "1" || e.key === "2")) {
        answer(e.key === "2");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (error) return <p className="fc-msg">{t("shell.flashcards.error")}</p>;
  if (!cards) return <p className="fc-msg">{t("shell.flashcards.loading")}</p>;

  const counts = boxCounts(ids, deck);
  const L = (x: { vi: string; en: string }) => x[locale] || x.vi;

  return (
    <div className="fc">
      <div className="fc-filters" role="group" aria-label={t("shell.flashcards.filter")}>
        <button type="button" className="gl-filter" aria-pressed={layer === "all"} onClick={() => setLayer("all")}>{t("shell.flashcards.all")}</button>
        {layers.map((l) => (
          <button key={l.n} type="button" className="gl-filter" aria-pressed={layer === l.n} onClick={() => setLayer(l.n)}>
            {l.n} · {locale === "en" ? l.nameEn : l.name}
          </button>
        ))}
      </div>

      <div className="fc-boxes" aria-label={t("shell.flashcards.boxes")}>
        {counts.map((n, i) => (
          <span key={i} className={`fc-box b${i}`} title={i ? t("shell.flashcards.boxHint", { n: i, days: BOX_DAYS[i - 1] }) : t("shell.flashcards.new")}>
            <b>{n}</b>
            <small>{i ? t("shell.flashcards.box", { n: i }) : t("shell.flashcards.new")}</small>
          </span>
        ))}
      </div>

      {current ? (
        <>
          <p className="fc-left" aria-live="polite">{t("shell.flashcards.left", { n: queue.length, done })}</p>
          <div className={`fc-card${shown ? " shown" : ""}`}>
            <button type="button" className="fc-front" aria-expanded={shown} onClick={() => setShown(true)} disabled={shown}>
              <small>{L(current.lesson)}</small>
              <b>{current.name}</b>
              {!shown && <span className="fc-hint">{t("shell.flashcards.reveal")}</span>}
            </button>
            {shown && (
              <div className="fc-back">
                <p>{L(current.def)}</p>
                {L(current.example) && <p className="fc-ex"><b>{t("shell.glossary.example")}</b> {L(current.example)}</p>}
                <a href={`/glossary/#${current.id}`}>{t("shell.flashcards.more")}</a>
              </div>
            )}
          </div>
          {shown && (
            <div className="fc-actions">
              <button type="button" className="btn fc-again" onClick={() => answer(false)}>{t("shell.flashcards.again")} <kbd>1</kbd></button>
              <button type="button" className="btn primary" onClick={() => answer(true)}>{t("shell.flashcards.good")} <kbd>2</kbd></button>
            </div>
          )}
        </>
      ) : (
        <div className="fc-done">
          <b>{t("shell.flashcards.doneTitle")}</b>
          <p>{done ? t("shell.flashcards.doneBody", { n: done }) : t("shell.flashcards.nothingDue")}</p>
        </div>
      )}
    </div>
  );
}
