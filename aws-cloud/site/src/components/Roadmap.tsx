import { useEffect, useState } from "react";
import { CERTS, CURRICULUM } from "../data/curriculum";
import { getCertFilter, getDone, PROGRESS_EVENT, setCertFilter } from "../lib/progress";

interface Props {
  current?: string;
  ready: string[];
}

export default function Roadmap({ current, ready }: Props) {
  const currentLayer = CURRICULUM.find((l) => l.concepts.some((c) => c.id === current))?.n ?? 0;
  const [cert, setCert] = useState("all");
  const [done, setDoneState] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<number>>(new Set([currentLayer]));

  // Read browser-only state after hydration so server and client markup match.
  useEffect(() => {
    setCert(getCertFilter());
    setDoneState(getDone());
    const sync = () => setDoneState(getDone());
    window.addEventListener(PROGRESS_EVENT, sync);
    return () => window.removeEventListener(PROGRESS_EVENT, sync);
  }, []);

  const inCert = (certs: string[]) => cert === "all" || certs.includes(cert);
  const total = CURRICULUM.reduce((s, l) => s + l.concepts.length, 0);
  const matching = CURRICULUM.reduce((s, l) => s + l.concepts.filter((c) => inCert(c.certs)).length, 0);

  function pickCert(next: string) {
    setCert(next);
    setCertFilter(next);
  }

  function toggleLayer(n: number) {
    const next = new Set(open);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setOpen(next);
  }

  return (
    <>
      <div className="side-label">Lọc theo chứng chỉ</div>
      <div className="filter" role="group" aria-label="Lọc theo chứng chỉ">
        {["all", ...CERTS].map((c) => (
          <button key={c} className="chip" aria-pressed={c === cert} onClick={() => pickCert(c)}>
            {c === "all" ? "Tất cả" : c}
          </button>
        ))}
      </div>
      <p className="filter-note">
        {cert === "all" ? `${total} khái niệm, 7 lớp nền` : `${matching}/${total} khái niệm thuộc đề ${cert}`}
      </p>
      <ul className="layers">
        {CURRICULUM.map((layer) => (
          <li className="layer" key={layer.n}>
            <button aria-expanded={open.has(layer.n)} onClick={() => toggleLayer(layer.n)}>
              <span className="layer-num">{layer.n}</span>
              <span>{layer.name}</span>
              <span className="layer-count">{layer.concepts.filter((c) => inCert(c.certs)).length}</span>
            </button>
            <ul className="concepts" hidden={!open.has(layer.n)}>
              {layer.concepts.map((c) => {
                const cls = [
                  "concept",
                  ready.includes(c.id) ? "ready" : "",
                  done.has(c.id) ? "done" : "",
                  inCert(c.certs) ? "" : "dim",
                ].filter(Boolean).join(" ");
                return (
                  <li key={c.id}>
                    <a
                      className={cls}
                      href={`/concepts/${c.id}/`}
                      title={c.certs.join(" ")}
                      aria-current={c.id === current ? "page" : undefined}
                    >
                      <span className="dot" aria-hidden="true" />
                      <span>{c.title}</span>
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
