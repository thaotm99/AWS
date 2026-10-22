import { useEffect, useState } from "react";
import type { Layer } from "../data/curriculum";
import { getDone, PROGRESS_EVENT } from "../lib/progress";

interface Props {
  layers: Layer[];
  current?: string;
  ready: string[];
}

export default function Roadmap({ layers, current, ready }: Props) {
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
      <div className="side-label">Lộ trình SAA-C03</div>
      <p className="filter-note">Số bên phải: số câu trong 6 đề luyện thi. Dấu ~ là ước lượng.</p>
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
                      <span className="q-count">{c.exact ? "" : "~"}{c.questions}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <div className="legend">
        <span><i className="r" />Có bài</span>
        <span><i />Sắp có</span>
        <span><i className="d" />Đã học</span>
      </div>
    </>
  );
}
