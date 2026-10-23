import { useState } from "react";
import { useI18n } from "../../app/i18n";
import { drillById, saveDrill, score, type ItemState, type Metric, type Text, type Verdict } from "../../lib/drills";

interface Link {
  href: string;
  vi: string;
  en: string;
}

/**
 * One incident drill: the situation and live metrics, then a decision per step. A choice is judged and
 * explained; a good one plays out on the metrics and moves the drill on, others can be retried.
 */
export default function IncidentDrill({ id, learn }: { id: string; learn: Link }) {
  const { t, locale } = useI18n();
  const drill = drillById(id)!;
  const initial = () => Object.fromEntries(drill.metrics.map((m) => [m.id, m.value]));
  const initialItems = () => Object.fromEntries(drill.panels.flatMap((p) => p.items.map((i) => [i.id, i.state])));
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const [first, setFirst] = useState<(Verdict | undefined)[]>([]);
  const [values, setValues] = useState<Record<string, number>>(initial);
  const [items, setItems] = useState<Record<string, ItemState>>(initialItems);
  const [texts, setTexts] = useState<Record<string, Text>>({});
  const [log, setLog] = useState<{ at: Text; text: Text }[]>([]);
  const [finished, setFinished] = useState(false);

  const L = (x: Text) => x[locale] || x.vi;
  const num = (n: number, digits = 0) => n.toLocaleString(locale === "en" ? "en" : "vi", { maximumFractionDigits: digits });
  const fmt = (m: Metric, v: number) =>
    m.unit === "$" ? `$${num(v)}` : m.unit === "ms" && v >= 1000 ? `${num(v / 1000, 1)} s` : `${num(v, v < 10 ? 1 : 0)}${m.unit ? (m.unit === "%" ? "%" : ` ${m.unit}`) : ""}`;
  const bad = (m: Metric, v: number) => (m.worse === "up" ? v >= m.alert : v <= m.alert);

  const current = drill.steps[step];
  const option = chosen === null ? null : current.options[chosen];

  function choose(i: number) {
    const o = current.options[i];
    setChosen(i);
    setTried((x) => [...x, i]);
    if (first[step] === undefined) setFirst((f) => Object.assign([...f], { [step]: o.verdict }));
    if (o.verdict === "good") {
      if (o.metrics) setValues((v) => ({ ...v, ...o.metrics }));
      if (o.items) setItems((v) => ({ ...v, ...o.items }));
      if (o.itemText) setTexts((v) => ({ ...v, ...o.itemText }));
      if (o.log) setLog((l) => [...l, { at: current.at, text: o.log! }]);
    }
  }

  function next() {
    if (step + 1 < drill.steps.length) {
      setStep(step + 1);
      setChosen(null);
      setTried([]);
    } else {
      setFinished(true);
      saveDrill(drill.id, score(first), drill.steps.length);
    }
  }

  function restart() {
    setStep(0);
    setChosen(null);
    setTried([]);
    setFirst([]);
    setValues(initial());
    setItems(initialItems());
    setTexts({});
    setLog([]);
    setFinished(false);
  }

  const verdictText = (v: Verdict) => t(`shell.drill.verdict.${v}`);

  return (
    <div className="drill">
      <div className="drill-state">
        <div className="drill-metrics" aria-live="polite">
          {drill.metrics.map((m) => (
            <div key={m.id} className="drill-metric" data-bad={bad(m, values[m.id]) || undefined}>
              <span>{L(m.label)}</span>
              <b>{fmt(m, values[m.id])}</b>
              <small>{L(m.normal)}</small>
            </div>
          ))}
        </div>
        <div className="drill-panels">
          {drill.panels.map((p, i) => (
            <section key={i} className="drill-panel" aria-label={L(p.title)}>
              <h3>{L(p.title)}</h3>
              <ul>
                {p.items.map((it) => (
                  <li key={it.id} data-state={items[it.id]}>
                    <span className="drill-dot" aria-hidden="true" />
                    <span>{L(texts[it.id] ?? it.text)}</span>
                    <span className="sr-only">{t(`shell.drill.state.${items[it.id]}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <section className="drill-log" aria-labelledby="drill-log-h">
          <h3 id="drill-log-h">{t("shell.drill.timeline")}</h3>
          <ol>
            {[...drill.start, ...log].map((e, i) => (
              <li key={i}><b>{L(e.at)}</b> {L(e.text)}</li>
            ))}
          </ol>
        </section>
      </div>

      <div className="drill-play">
        {finished ? (
          <div className="drill-end">
            <h2>{t("shell.drill.doneTitle")}</h2>
            <p className="drill-score">{t("shell.drill.score", { n: score(first), total: drill.steps.length })}</p>
            <p>{L(drill.summary)}</p>
            <div className="drill-actions">
              <a className="btn primary" href={learn.href}>{t("shell.drill.read", { part: L(learn) })}</a>
              <button type="button" className="btn" onClick={restart}>{t("shell.drill.again")}</button>
              <a className="btn" href="/lab/">{t("shell.lab.back")}</a>
            </div>
          </div>
        ) : (
          <>
            <p className="drill-step">
              <span className="drill-at">{L(current.at)}</span> {t("shell.drill.step", { n: step + 1, total: drill.steps.length })}
            </p>
            <p className="drill-situation">{L(current.situation)}</p>
            <fieldset className="drill-options">
              <legend>{L(current.question)}</legend>
              {current.options.map((o, i) => (
                <button key={i} type="button" className="drill-option" data-verdict={tried.includes(i) ? o.verdict : undefined}
                  aria-pressed={chosen === i} disabled={(tried.includes(i) && chosen !== i) || option?.verdict === "good"} onClick={() => choose(i)}>
                  {L(o.text)}
                </button>
              ))}
            </fieldset>
            <div aria-live="polite">
              {option && (
                <div className="drill-feedback" data-verdict={option.verdict}>
                  <b>{verdictText(option.verdict)}</b>
                  <p>{L(option.feedback)}</p>
                  {option.verdict === "good" ? (
                    <button type="button" className="btn primary" onClick={next}>
                      {step + 1 < drill.steps.length ? t("shell.drill.next") : t("shell.drill.finish")}
                    </button>
                  ) : (
                    <p className="drill-retry">{t("shell.drill.retry")}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
