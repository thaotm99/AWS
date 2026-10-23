import { useState } from "react";
import { useI18n } from "../../app/i18n";
import { drillById, saveDrill, score, type ItemState, type Metric, type Text, type Verdict } from "../../lib/drills";

/** Panel and timeline headings, and their lists. */
const BOX_H = "mb-2 font-mono text-[0.75rem] font-medium text-muted";
const BOX_LIST = "flex flex-col gap-2 text-[0.8125rem]";

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
    <div className="mb-10 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6 max-lg:grid-cols-1">
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3" aria-live="polite">
          {drill.metrics.map((m) => (
            <div key={m.id} className="group flex flex-col gap-0.5 rounded-[18px] border-2 border-line bg-surface p-3.5 data-bad:border-edge" data-bad={bad(m, values[m.id]) || undefined}>
              <span className="text-[0.75rem] text-muted">{L(m.label)}</span>
              <b className="font-mono text-[1.6rem] font-semibold transition-[color] duration-400 group-data-bad:text-edge">{fmt(m, values[m.id])}</b>
              <small className="text-[0.75rem] text-muted">{L(m.normal)}</small>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {drill.panels.map((p, i) => (
            <section key={i} className="rounded-[18px] border border-dashed border-line bg-bg px-3.5 py-3" aria-label={L(p.title)}>
              <h2 className={BOX_H}>{L(p.title)}</h2>
              <ul className={BOX_LIST}>
                {p.items.map((it) => (
                  <li key={it.id} className="group flex items-center gap-2 rounded-sm bg-surface px-2.5 py-2" data-state={items[it.id]}>
                    <span className="size-[9px] flex-none rounded-full bg-ok group-data-[state=busy]:bg-accent group-data-[state=down]:bg-bad group-data-[state=hot]:bg-edge" aria-hidden="true" />
                    <span>{L(texts[it.id] ?? it.text)}</span>
                    <span className="sr-only">{t(`shell.drill.state.${items[it.id]}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <section className="rounded-[18px] border border-line bg-surface px-3.5 py-3" aria-labelledby="drill-log-h">
          <h2 id="drill-log-h" className={BOX_H}>{t("shell.drill.timeline")}</h2>
          <ol className={BOX_LIST}>
            {[...drill.start, ...log].map((e, i) => (
              <li key={i}><b className="mr-1.5 font-mono font-semibold">{L(e.at)}</b> {L(e.text)}</li>
            ))}
          </ol>
        </section>
      </div>

      <div className="sticky top-[76px] flex flex-col gap-3 rounded-[20px] border-2 border-line bg-surface p-[18px] max-lg:static max-lg:-order-1">
        {finished ? (
          <div>
            <h2 className="mb-1.5 text-[1.25rem]">{t("shell.drill.doneTitle")}</h2>
            <p className="mx-0 mt-0 mb-2.5 font-mono leading-[1.6] font-semibold text-accent">{t("shell.drill.score", { n: score(first), total: drill.steps.length })}</p>
            <p className="mx-0 mt-0 mb-2.5 leading-[1.6]">{L(drill.summary)}</p>
            <div className="flex flex-wrap gap-2">
              <a className="btn primary min-h-11 no-underline" href={learn.href}>{t("shell.drill.read", { part: L(learn) })}</a>
              <button type="button" className="btn min-h-11" onClick={restart}>{t("shell.drill.again")}</button>
              <a className="btn min-h-11 no-underline" href="/lab/">{t("shell.lab.back")}</a>
            </div>
          </div>
        ) : (
          <>
            <p className="m-0 text-[0.8125rem] text-muted">
              <span className="mr-1.5 font-mono font-semibold text-edge">{L(current.at)}</span> {t("shell.drill.step", { n: step + 1, total: drill.steps.length })}
            </p>
            <p className="m-0 text-[0.9375rem] leading-[1.6]">{L(current.situation)}</p>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2.5 p-0 text-[1rem] font-bold">{L(current.question)}</legend>
              {current.options.map((o, i) => (
                <button key={i} type="button" className="min-h-[52px] cursor-pointer rounded-[14px] border-2 border-line bg-bg px-3.5 py-2.5 text-left text-[0.875rem] leading-[1.45] text-ink shadow-[0_4px_0] shadow-line enabled:hover:border-accent disabled:cursor-default disabled:opacity-60 aria-pressed:opacity-100 data-[verdict=bad]:border-edge data-[verdict=bad]:line-through data-[verdict=bad]:decoration-edge data-[verdict=good]:border-ok data-[verdict=good]:bg-ok-soft data-[verdict=partial]:border-edge" data-verdict={tried.includes(i) ? o.verdict : undefined}
                  aria-pressed={chosen === i} disabled={(tried.includes(i) && chosen !== i) || option?.verdict === "good"} onClick={() => choose(i)}>
                  {L(o.text)}
                </button>
              ))}
            </fieldset>
            <div aria-live="polite">
              {option && (
                <div className="flex flex-col items-start gap-1.5 rounded-[14px] border border-edge bg-edge-soft px-3.5 py-3 data-[verdict=good]:border-ok data-[verdict=good]:bg-ok-soft" data-verdict={option.verdict}>
                  <b>{verdictText(option.verdict)}</b>
                  <p className="m-0 text-[0.875rem] leading-[1.6]">{L(option.feedback)}</p>
                  {option.verdict === "good" ? (
                    <button type="button" className="btn primary mt-1 min-h-11 px-[18px] py-0" onClick={next}>
                      {step + 1 < drill.steps.length ? t("shell.drill.next") : t("shell.drill.finish")}
                    </button>
                  ) : (
                    <p className="m-0 text-[0.875rem] leading-[1.6] text-muted">{t("shell.drill.retry")}</p>
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
