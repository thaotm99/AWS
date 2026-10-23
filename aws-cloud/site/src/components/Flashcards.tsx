import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../app/i18n";
import { BOX_DAYS, boxCounts, grade, readDeck, sessionCards, today, writeDeck, type Deck } from "../lib/flashcards";
import { noteCard, readSettings, readTimer, writeTimer } from "../lib/pomodoro";
import { recordActivity } from "../lib/goals";

interface Card {
  id: string;
  name: string;
  layer: number;
  lesson: { id: string; vi: string; en: string };
  def: { vi: string; en: string };
  example: { vi: string; en: string };
}

/** Keyboard hint inside an answer button. */
const KBD = "ml-1.5 font-mono text-[0.75rem] opacity-70";

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
    // A Pomodoro break links here with a few cards to review (?limit=5).
    const limit = Number(new URLSearchParams(location.search).get("limit"));
    const session = sessionCards(ids, readDeck(), day);
    setQueue(Number.isInteger(limit) && limit > 0 ? session.slice(0, limit) : session);
    setShown(false);
    setDone(0);
  }, [cards, ids]);

  const current = queue.length ? byId.get(queue[0]) : undefined;

  function answer(remembered: boolean) {
    if (!current) return;
    const next = { ...deck, [current.id]: grade(deck[current.id], remembered, day) };
    setDeck(next);
    writeDeck(next);
    recordActivity("cards");
    // Cards answered during a Pomodoro break show up in its summary.
    const timer = readTimer(readSettings());
    const noted = noteCard(timer, remembered);
    if (noted !== timer) writeTimer(noted);
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

  if (error) return <p className="text-muted">{t("shell.flashcards.error")}</p>;
  if (!cards) return <p className="text-muted">{t("shell.flashcards.loading")}</p>;

  const counts = boxCounts(ids, deck);
  const L = (x: { vi: string; en: string }) => x[locale] || x.vi;

  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <div className="gl-filters gap-1.5" role="group" aria-label={t("shell.flashcards.filter")}>
        <button type="button" className="gl-filter" aria-pressed={layer === "all"} onClick={() => setLayer("all")}>{t("shell.flashcards.all")}</button>
        {layers.map((l) => (
          <button key={l.n} type="button" className="gl-filter" aria-pressed={layer === l.n} onClick={() => setLayer(l.n)}>
            {l.n} · {locale === "en" ? l.nameEn : l.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-1.5" aria-label={t("shell.flashcards.boxes")}>
        {counts.map((n, i) => (
          <span key={i} className="flex flex-col items-center gap-0.5 rounded-[14px] border border-line bg-surface px-1 py-2" title={i ? t("shell.flashcards.boxHint", { n: i, days: BOX_DAYS[i - 1] }) : t("shell.flashcards.new")}>
            <b className={`font-mono text-[1.05rem]${i === 5 ? " text-ok" : ""}`}>{n}</b>
            <small className="text-[0.75rem] text-muted">{i ? t("shell.flashcards.box", { n: i }) : t("shell.flashcards.new")}</small>
          </span>
        ))}
      </div>

      {current ? (
        <>
          <p className="m-0 text-[0.875rem] text-muted" aria-live="polite">{t("shell.flashcards.left", { n: queue.length, done })}</p>
          <div className={`overflow-hidden rounded-[18px] border-2 bg-surface shadow-[0_4px_0] shadow-line ${shown ? "border-accent" : "border-line"}`}>
            <button type="button" className="flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 p-6 text-center text-ink disabled:min-h-0 disabled:cursor-default disabled:pb-2" aria-expanded={shown} onClick={() => setShown(true)} disabled={shown}>
              <small className="text-[0.8125rem] text-muted">{L(current.lesson)}</small>
              <b className="text-[clamp(1.4rem,4vw,2rem)] leading-[1.2]">{current.name}</b>
              {!shown && <span className="text-[0.8125rem] text-accent">{t("shell.flashcards.reveal")}</span>}
            </button>
            {shown && (
              <div className="animate-[fc-in_0.25s_ease] border-t border-dashed border-line px-[22px] pt-1 pb-5 motion-reduce:animate-none">
                <p className="mx-0 mt-3 mb-0 leading-[1.65]">{L(current.def)}</p>
                {L(current.example) && <p className="mx-0 mt-3 mb-0 text-[0.9rem] leading-[1.65] text-muted"><b className="text-edge">{t("shell.glossary.example")}</b> {L(current.example)}</p>}
                <a className="mt-3 inline-block text-[0.875rem]" href={`/glossary/#${current.id}`}>{t("shell.flashcards.more")}</a>
              </div>
            )}
          </div>
          {shown && (
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" className="btn min-h-12 font-bold" onClick={() => answer(false)}>{t("shell.flashcards.again")} <kbd className={KBD}>1</kbd></button>
              <button type="button" className="btn primary min-h-12 font-bold" onClick={() => answer(true)}>{t("shell.flashcards.good")} <kbd className={KBD}>2</kbd></button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-[20px] border border-dashed border-line bg-surface p-[22px]">
          <b>{t("shell.flashcards.doneTitle")}</b>
          <p className="mx-0 mt-1.5 mb-0 text-muted">{done ? t("shell.flashcards.doneBody", { n: done }) : t("shell.flashcards.nothingDue")}</p>
        </div>
      )}
    </div>
  );
}
