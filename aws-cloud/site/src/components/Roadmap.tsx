import { useEffect, useState } from "react";
import { IMPORTANCE_NAMES, type RoadmapLayer } from "../data/curriculum";
import { getDone, PROGRESS_EVENT } from "../lib/progress";
import { useI18n } from "../app/i18n";

interface Props {
  layers: RoadmapLayer[];
  current?: string;
  ready: string[];
}

export default function Roadmap({ layers, current, ready }: Props) {
  const { t } = useI18n();
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

  return (
    <>
      <div className="side-label">{t("shell.roadmap.title")}</div>
      <p className="filter-note">{t("shell.roadmap.note")}</p>
      <ul className="layers">
        {layers.map((layer) => (
          <li className="layer" key={layer.n}>
            <button aria-expanded={open.has(layer.n)} onClick={() => toggleLayer(layer.n)}>
              <span className="layer-num">{layer.n}</span>
              <span>{layer.name}</span>
            </button>
            <ul className="concepts" hidden={!open.has(layer.n)}>
              {layer.concepts.map((c) => {
                const cls = ["concept", ready.includes(c.id) ? "ready" : "", done.has(c.id) ? "done" : ""]
                  .filter(Boolean).join(" ");
                return (
                  <li key={c.id}>
                    <a className={cls} href={`/concepts/${c.id}/`} aria-current={c.id === current ? "page" : undefined}>
                      <span className="dot" aria-hidden="true" />
                      <span>{c.title}</span>
                      <span className={`imp imp-${c.importance}`} title={t(`shell.importance.${IMPORTANCE_NAMES[c.importance]}`)}>
                        <i /><i /><i />
                      </span>
                    </a>
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
