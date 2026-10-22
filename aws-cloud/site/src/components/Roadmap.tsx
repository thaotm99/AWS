import { useEffect, useState } from "react";
import { IMPORTANCE_NAMES, type RoadmapLayer } from "../data/curriculum";
import { getDone, PROGRESS_EVENT } from "../lib/progress";
import { useI18n } from "../app/i18n";

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
    setDoneState(getDone());
    const sync = () => setDoneState(getDone());
    window.addEventListener(PROGRESS_EVENT, sync);
    return () => window.removeEventListener(PROGRESS_EVENT, sync);
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
      <div className="course-card">
        <div className="side-label">{t("shell.roadmap.title")}</div>
        <p className="course-progress-text">{t("shell.roadmap.progress", { done: finished, total })}</p>
        <div className="course-progress">
          <span className="course-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("shell.roadmap.title")}>
            <i style={{ width: `${percent}%` }} />
          </span>
          <span className="course-percent">{percent}%</span>
        </div>
      </div>
      <p className="filter-note">{t("shell.roadmap.note")}</p>
      <ul className="layers">
        {layers.map((layer) => (
          <li className="layer" key={layer.n}>
            <button aria-expanded={open.has(layer.n)} onClick={() => toggleLayer(layer.n)}>
              <span className="layer-num">{layer.n}</span>
              <span>{en ? layer.nameEn : layer.name}</span>
            </button>
            <ul className="concepts" hidden={!open.has(layer.n)}>
              {layer.concepts.map((c) => {
                const cls = ["concept", ready.includes(c.id) ? "ready" : "", done.has(c.id) ? "done" : ""]
                  .filter(Boolean).join(" ");
                const here = c.id === current;
                return (
                  <li key={c.id}>
                    <a className={cls} href={`/concepts/${c.id}/`} aria-current={here && !currentQuiz ? "page" : undefined}>
                      <span className="dot" aria-hidden="true" />
                      <span>{en ? c.titleEn : c.title}</span>
                      <span className={`imp imp-${c.importance}`} title={t(`shell.importance.${IMPORTANCE_NAMES[c.importance]}`)}>
                        <i /><i /><i />
                      </span>
                    </a>
                    {ready.includes(c.id) && c.quiz > 0 && (
                      <a
                        className="concept-quiz"
                        href={`/concepts/${c.id}/kiem-tra/`}
                        aria-current={here && currentQuiz ? "page" : undefined}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                          <rect x="2" y="2" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{t("shell.roadmap.quiz")}</span>
                        <span className="concept-quiz-n">{t("shell.roadmap.quizCount", { n: c.quiz })}</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <div className="legend">
        <span><i className="r" />{t("shell.roadmap.ready")}</span>
        <span><i />{t("shell.roadmap.soon")}</span>
        <span><i className="d" />{t("shell.roadmap.done")}</span>
      </div>
    </>
  );
}
