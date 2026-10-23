import { useEffect, useState } from "react";
import { IMPORTANCE_NAMES, type RoadmapLayer } from "../data/curriculum";
import { getDone, onProgressChange } from "../lib/progress";
import { useI18n } from "../app/i18n";

/** Status dot of a lesson, also used in the legend. */
const DOT = "size-1.75 flex-none rounded-full border-[1.5px]";
const DOT_READY = "border-accent bg-accent";
const DOT_DONE = "border-ok bg-ok";

interface Props {
  layers: RoadmapLayer[];
  current?: string;
  /** The open page is the current lesson's question set. */
  currentQuiz?: boolean;
  ready: string[];
}

export default function Roadmap({ layers, current, currentQuiz = false, ready }: Props) {
  const { t, locale } = useI18n();
  const en = locale === "en";
  const currentLayer = layers.find((l) => l.concepts.some((c) => c.id === current))?.n ?? 0;
  const [done, setDoneState] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<number>>(new Set([currentLayer]));

  // Read browser-only state after hydration so server and client markup match.
  useEffect(() => {
    const sync = () => setDoneState(getDone());
    sync();
    // Also after Back/Forward (bfcache) and when another tab changes progress.
    return onProgressChange(sync);
  }, []);

  function toggleLayer(n: number) {
    const next = new Set(open);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setOpen(next);
  }

  const total = ready.length;
  const finished = ready.filter((id) => done.has(id)).length;
  const percent = total ? Math.round((finished / total) * 100) : 0;

  return (
    <>
      <div className="mb-3 rounded-[18px] border border-line bg-surface px-3.5 py-3">
        <div className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{t("shell.roadmap.title")}</div>
        <p className="mt-1 mb-2 text-[0.875rem] font-semibold">{t("shell.roadmap.progress", { done: finished, total })}</p>
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("shell.roadmap.title")}>
            <i className="block h-full rounded-[3px] bg-ok transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </span>
          <span className="font-mono text-[0.75rem] font-semibold text-ok">{percent}%</span>
        </div>
      </div>
      <p className="mt-0 mb-3.5 text-step--1 text-muted">{t("shell.roadmap.note")}</p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {layers.map((layer) => (
          <li key={layer.n}>
            <button className="flex w-full cursor-pointer items-baseline gap-2.5 border-0 bg-transparent px-1 py-1.75 text-left font-medium"
              aria-expanded={open.has(layer.n)} onClick={() => toggleLayer(layer.n)}>
              <span className="w-5.5 flex-none font-mono text-[0.75rem] text-muted">{layer.n}</span>
              <span>{en ? layer.nameEn : layer.name}</span>
            </button>
            <ul className="mt-0 mr-0 mb-1.5 ml-3.5 list-none border-l border-line py-0 pr-0 pl-3.5" hidden={!open.has(layer.n)}>
              {layer.concepts.map((c) => {
                const dot = done.has(c.id) ? DOT_DONE : ready.includes(c.id) ? DOT_READY : "border-muted";
                const here = c.id === current;
                return (
                  <li key={c.id}>
                    <a
                      className="flex w-full cursor-pointer items-start gap-2 rounded-[10px] px-2 py-1.5 text-left text-[0.875rem] leading-[1.35] text-ink no-underline hover:bg-surface aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent"
                      href={`/concepts/${c.id}/`} aria-current={here && !currentQuiz ? "page" : undefined}>
                      <span className={`mt-1.5 ${DOT} ${dot}`} aria-hidden="true" />
                      <span>{en ? c.titleEn : c.title}</span>
                      {!c.intro && (
                        <span className={`imp imp-${c.importance} ml-auto`} title={t(`shell.importance.${IMPORTANCE_NAMES[c.importance]}`)}>
                          <i /><i /><i />
                        </span>
                      )}
                    </a>
                    {ready.includes(c.id) && c.quiz > 0 && (
                      <a
                        className="mt-px mr-0 mb-1 ml-6.5 flex items-center gap-1.5 rounded-[10px] px-2 py-0.75 text-[0.8125rem] text-muted no-underline hover:bg-surface hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent"
                        href={`/concepts/${c.id}/quiz/`}
                        aria-current={here && currentQuiz ? "page" : undefined}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                          <rect x="2" y="2" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{t("shell.roadmap.quiz")}</span>
                        <span className="ml-auto font-mono text-[0.75rem]">{t("shell.roadmap.quizCount", { n: c.quiz })}</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-3.5 flex flex-wrap gap-3.5 text-[0.75rem] text-muted *:inline-flex *:items-center *:gap-1.5">
        <span><i className={`inline-block ${DOT} ${DOT_READY}`} />{t("shell.roadmap.ready")}</span>
        <span><i className={`inline-block ${DOT} border-muted`} />{t("shell.roadmap.soon")}</span>
        <span><i className={`inline-block ${DOT} ${DOT_DONE}`} />{t("shell.roadmap.done")}</span>
      </div>
    </>
  );
}
