// Loaded on demand (React.lazy) by QuestionCard once a question with an illustration is answered.
import { useEffect, useRef, useState } from "react";
import type { OptionKey, QuestionId } from "../domain/types";
import { useT } from "../ui/useT";
import { Illustration, text } from "./Illustration";
import { illustrations } from "./registry";
import { ScenarioPlayer } from "./ScenarioPlayer";

interface Props {
  questionId: QuestionId;
  correct: OptionKey[];
  chosen: OptionKey[];
}

const label = (key: string) => key.toUpperCase();

export default function IllustrationPanel({ questionId, correct, chosen }: Props) {
  const { t, locale } = useT();
  const [illustration, setIllustration] = useState<Illustration | null>(null);
  const [tab, setTab] = useState<OptionKey | null>(null);
  const [current, setCurrent] = useState(0);
  const [applied, setApplied] = useState(0);
  const [playing, setPlaying] = useState(false);
  const layer = useRef<SVGGElement>(null);
  const player = useRef<ScenarioPlayer | null>(null);

  useEffect(() => {
    let live = true;
    illustrations.load(questionId).then(
      (spec) => {
        if (!live) return;
        const il = new Illustration(spec);
        setIllustration(il);
        setTab(il.initialTab(correct, chosen));
      },
      // Without its illustration the question still works; the explanation is right above.
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [questionId]);

  const scenario = illustration && tab ? illustration.scenario(tab) : undefined;

  function play() {
    if (!illustration || !scenario || !layer.current) return;
    player.current?.stop();
    const p = new ScenarioPlayer(layer.current, illustration, locale);
    player.current = p;
    setPlaying(true);
    p.play(scenario, (c, a) => {
      setCurrent(c);
      setApplied(a);
    }).then((finished) => {
      if (finished) setPlaying(false);
    });
  }

  // Each tab plays as soon as it is opened.
  useEffect(() => {
    play();
    return () => player.current?.stop();
  }, [scenario, locale]);

  if (!illustration || !scenario || !tab) return null;

  const n = scenario.steps.length;
  const scene = scenario.sceneAfter(applied);
  const done = !playing && applied === n;
  const step = scenario.steps[Math.min(current, n - 1)];
  const links = illustration.links(scenario);
  const ids = illustration.visibleNodes(scenario);
  const tabs = illustration.tabs(correct);

  function select(k: OptionKey) {
    if (k === tab) return;
    player.current?.stop();
    setCurrent(0);
    setApplied(0);
    setPlaying(true);
    setTab(k);
  }

  function show(i: number) {
    player.current?.stop();
    setPlaying(false);
    setCurrent(i);
    setApplied(i + 1);
  }

  return (
    <section className="pr-illus" aria-label={t("illus.title")} data-illus={questionId} data-option={tab} data-done={done || undefined}>
      <div className="pr-illus-head">
        <b className="pr-illus-title">{t("illus.title")}</b>
        <div className="pr-illus-tabs" role="tablist" aria-label={t("illus.options")}>
          {tabs.map((k) => {
            const right = correct.includes(k);
            const mine = chosen.includes(k);
            return (
              <button
                key={k}
                type="button"
                role="tab"
                id={`pr-illus-tab-${k}`}
                aria-selected={k === tab}
                aria-controls="pr-illus-panel"
                className={`pr-illus-tab ${right ? "right" : mine ? "wrong" : ""}`}
                onClick={() => select(k)}
              >
                {t("illus.option", { key: label(k) })}
                {right && <span className="pr-illus-tag">{t("illus.tagCorrect")}</span>}
                {mine && !right && <span className="pr-illus-tag">{t("illus.tagChosen")}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div id="pr-illus-panel" role="tabpanel" aria-labelledby={`pr-illus-tab-${tab}`}>
        <div className="pr-illus-frame">
          <svg
            viewBox={`0 0 ${illustration.width} ${illustration.height}`}
            style={{ minWidth: Math.round(illustration.width * 0.68) }}
            role="img"
            aria-label={t("illus.diagram", { key: label(tab) })}
          >
            {illustration.visibleZones(scenario).map((z) => {
              const p = illustration.placeZone(z);
              return (
                <g key={z.id} className={`pr-illus-zone t-${z.tone}`}>
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={10} />
                  <text x={p.x + 8} y={p.y + 13}>{text(z.label, locale)}</text>
                </g>
              );
            })}
            {links.map(([a, b]) => {
              const [p, q] = illustration.segment(a, b, locale);
              const k = a < b ? `${a}|${b}` : `${b}|${a}`;
              return <line key={k} className={`pr-illus-link ${scene.links[k] ?? ""}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;
            })}
            {ids.map((id) => {
              const nd = illustration.place(id, locale);
              const sub = nd.spec.sub ? text(nd.spec.sub, locale) : "";
              return (
                <g key={id} className={`pr-illus-node k-${nd.spec.kind ?? "service"} ${scene.nodes[id] ?? ""}`}>
                  <rect x={nd.x - nd.w / 2} y={nd.y - nd.h / 2} width={nd.w} height={nd.h} rx={8} />
                  <text className="nt" x={nd.x} y={sub ? nd.y - 3 : nd.y + 4} textAnchor="middle">{text(nd.spec.label, locale)}</text>
                  {sub && <text className="ns" x={nd.x} y={nd.y + 13} textAnchor="middle">{sub}</text>}
                </g>
              );
            })}
            {scene.stops.filter((id) => ids.includes(id)).map((id) => {
              const nd = illustration.place(id, locale);
              const cx = nd.x + nd.w / 2 - 2;
              const cy = nd.y - nd.h / 2 + 2;
              return (
                <g key={`stop-${id}`} className="pr-illus-stop">
                  <circle cx={cx} cy={cy} r={9} />
                  <path d={`M${cx - 4} ${cy - 4}L${cx + 4} ${cy + 4}M${cx + 4} ${cy - 4}L${cx - 4} ${cy + 4}`} />
                </g>
              );
            })}
            {Object.entries(scene.badges).filter(([id]) => ids.includes(id)).map(([id, b]) => {
              const nd = illustration.place(id, locale);
              const s = text(b.text, locale);
              const w = s.length * 6.4 + 14;
              const y = nd.y - nd.h / 2 - 12;
              return (
                <g key={`badge-${id}`} className={`pr-illus-badge ${b.tone}`}>
                  <rect x={nd.x - w / 2} y={y - 9} width={w} height={17} rx={8.5} />
                  <text x={nd.x} y={y + 3.5} textAnchor="middle">{s}</text>
                </g>
              );
            })}
            <g ref={layer} />
          </svg>
        </div>

        <div className="pr-illus-bar">
          <button type="button" className="btn" onClick={play} disabled={playing}>
            {playing ? t("illus.playing") : applied === 0 ? t("illus.play") : t("illus.replay")}
          </button>
          <ol className="pr-illus-steps">
            {scenario.steps.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-label={t("illus.step", { n: i + 1 })}
                  aria-current={i === current ? "step" : undefined}
                  className={i < applied ? "seen" : ""}
                  onClick={() => show(i)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <p className="pr-illus-caption" aria-live="polite">{step.caption[locale]}</p>
        {done && (
          <p className={`pr-illus-verdict ${scenario.verdict.works ? "ok" : "bad"}`}>
            <b>{scenario.verdict.works ? t("illus.works") : t("illus.fails")}</b> {scenario.verdict.caption[locale]}
          </p>
        )}
      </div>
    </section>
  );
}
