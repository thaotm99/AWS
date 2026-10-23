import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../app/i18n";
import {
  BUILDINGS,
  LEVELS,
  SLOTS,
  START,
  available,
  baseDemand,
  build,
  cityLevel,
  demolish,
  freeSlot,
  nextEvent,
  playDay,
  readCity,
  simulate,
  unlocked,
  writeCity,
  type BuildingId,
  type CityEvent,
  type CityState,
  type Choice,
  type DayResult,
  type Slot,
  type Text,
} from "../../lib/city";
import { getAllPartsRead, getDone } from "../../lib/progress";

interface Props {
  /** Lesson ids of each curriculum layer, in order. */
  layers: string[][];
  /** Lesson titles, for "study X to unlock". */
  titles: Record<string, Text>;
}

const ORDER: BuildingId[] = ["factory", "bank", "router", "warehouse", "gate", "wall", "crew", "temp", "standby", "cafe", "post", "tower"];

/** Lessons the learner has started: any part read, or the lesson marked done. */
function studiedLessons(): Set<string> {
  const s = new Set(getDone());
  for (const k of getAllPartsRead()) s.add(k.split("/")[0]);
  return s;
}

/**
 * Cloud City: MFTECH as a city of AWS buildings. Build between days; each day brings an event
 * with a choice, played out on the city's numbers. Buildings unlock with the lessons.
 */
export default function CityGame({ layers, titles }: Props) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<CityState>(START);
  const [studied, setStudied] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<BuildingId | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [event, setEvent] = useState<CityEvent | null>(null);
  const [outcome, setOutcome] = useState<{ choice: Choice; before: DayResult; result: DayResult; money: number } | null>(null);
  const [fresh, setFresh] = useState<BuildingId | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setState(readCity());
    setStudied(studiedLessons());
    setReady(true);
  }, []);

  const L = (x: Text) => x[locale] || x.vi;
  const level = cityLevel(layers, studied);
  const save = (s: CityState) => {
    setState(s);
    writeCity(s);
  };

  // A building unlocked since the last visit is announced once.
  useEffect(() => {
    if (!ready) return;
    const news = ORDER.filter((b) => BUILDINGS[b].lesson && unlocked(b, studied) && !state.known.includes(b));
    if (news.length && !fresh) setFresh(news[0]);
  }, [ready, studied, state.known, fresh]);
  useEffect(() => {
    const d = dialog.current;
    if (fresh && d && !d.open) d.showModal();
  }, [fresh]);
  const ack = () => {
    if (fresh) save({ ...state, known: [...state.known, fresh] });
    dialog.current?.close();
    setFresh(null);
  };

  const today = useMemo(() => simulate(state.placed, { demand: baseDemand(level) }), [state.placed, level]);
  const shown = outcome?.result ?? today;
  const uptime = state.history.length ? 1 - state.history.reduce((s, h) => s + h.errors, 0) / state.history.length : 1;
  const down = event && !outcome ? event.conditions(0).down : undefined;
  const pct = (x: number) => `${(x * 100).toLocaleString(locale === "en" ? "en" : "vi", { maximumFractionDigits: 2 })}%`;
  const num = (x: number) => x.toLocaleString(locale === "en" ? "en" : "vi");
  const money = (x: number) => `${x < 0 ? "-" : ""}$${num(Math.abs(x))}`;

  function clickSlot(slot: Slot) {
    const b = state.placed[slot.id];
    if (picked) {
      const next = build(state, slot.id, picked);
      if (next) {
        save(next);
        setPicked(null);
      }
      return;
    }
    setSelected(b ? slot.id : null);
  }

  function start() {
    setOutcome(null);
    setEvent(nextEvent(state, level));
    setPicked(null);
    setSelected(null);
  }

  function choose(c: Choice) {
    if (!event) return;
    const before = state.money;
    const r = playDay(state, event, c, level);
    save(r.state);
    setOutcome({ choice: c, before: r.before, result: r.result, money: r.state.money - before });
  }

  function reason(c: Choice): string | null {
    if (available(c, state, studied)) return null;
    if (c.needs && !Object.values(state.placed).includes(c.needs)) return t("shell.city.needs", { name: L(BUILDINGS[c.needs].name) });
    if (c.build && !unlocked(c.build, studied)) return t("shell.city.locked", { lesson: L(titles[BUILDINGS[c.build].lesson!] ?? { vi: "", en: "" }) });
    if (c.build && !freeSlot(state.placed, c.build)) return t("shell.city.noRoom");
    return t("shell.city.noMoney");
  }

  const slotView = (slot: Slot) => {
    const b = state.placed[slot.id];
    const fits = picked && !b && BUILDINGS[picked].slots.includes(slot.kind);
    const emptyText = slot.kind === "zone" || slot.kind === "city" ? t("shell.city.empty") : t(`shell.city.plot.${slot.kind}`);
    const label = b ? `${L(BUILDINGS[b].name)} · ${BUILDINGS[b].aws}` : fits ? t("shell.city.placeHere") : emptyText;
    return (
      <button key={slot.id} type="button" className="cc-slot" data-kind={slot.kind} data-filled={b ? "" : undefined} data-fits={fits ? "" : undefined}
        data-building={b} aria-pressed={selected === slot.id} aria-label={label} title={label}
        disabled={!!picked && !fits && !b} onClick={() => clickSlot(slot)}>
        {b ? (
          <>
            <b>{L(BUILDINGS[b].name)}</b>
            <small>{BUILDINGS[b].aws}</small>
          </>
        ) : (
          <small>{fits ? t("shell.city.placeHere") : emptyText}</small>
        )}
      </button>
    );
  };
  const slot = (id: string) => slotView(SLOTS.find((s) => s.id === id)!);
  const forecast = state.placed && Object.values(state.placed).includes("tower") && !event ? nextEvent(state, level) : null;

  return (
    <div className="cc">
      <div className="cc-hud" aria-live="polite">
        <div className="cc-hud-name">
          <b>{t("shell.city.cityName")}</b>
          <span>{t("shell.city.level", { n: level, name: L(LEVELS[level - 1]) })} · {t("shell.city.day", { n: state.day })}</span>
        </div>
        <div className="cc-stat"><span>{t("shell.city.residents")}</span><b>{num(shown.demand)}</b></div>
        <div className="cc-stat" data-bad={shown.latency > 400 || undefined}><span>{t("shell.city.mood")}</span><b>{num(shown.latency)} ms</b></div>
        <div className="cc-stat" data-bad={uptime < 0.99 || undefined}><span>{t("shell.city.power")}</span><b>{pct(uptime)}</b></div>
        <div className="cc-stat" data-bad={state.money < 0 || undefined}><span>{t("shell.city.budget")}</span><b>{money(state.money)}</b></div>
      </div>

      <div className="cc-body">
        <div className={`cc-map${down ? " storm" : ""}`} aria-label={t("shell.city.map")} role="group">
          <div className="cc-wallrow">{slot("wall")}</div>
          <div className="cc-flow">
            <div className="cc-people" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2 20c.5-4 3-6 6-6s5.5 2 6 6M14 19c.4-3 2-4.5 4-4.5s3.5 1.5 4 4.5" /></svg>
              <small>{t("shell.city.customers")}</small>
            </div>
            <div className="cc-road" aria-hidden="true"><i /><i /><i /></div>
            {slot("gate")}
            <div className="cc-road" aria-hidden="true"><i /><i /></div>
            {slot("router")}
            <div className="cc-zones">
              {(["a", "b"] as const).map((z) => (
                <section key={z} className="cc-zone" data-down={down === z || undefined} aria-label={t(`shell.city.zone.${z}`)}>
                  <span>{t(`shell.city.zone.${z}`)}{down === z ? ` · ${t("shell.city.outage")}` : ""}</span>
                  <div>{[1, 2, 3].map((n) => slot(`${z}${n}`))}</div>
                </section>
              ))}
            </div>
          </div>
          <div className="cc-cityrow">
            <span>{t("shell.city.citywide")}</span>
            <div>{[1, 2, 3, 4].map((n) => slot(`c${n}`))}</div>
          </div>
          {selected && state.placed[selected] && (
            <div className="cc-info">
              <b>{L(BUILDINGS[state.placed[selected]!].name)} · {BUILDINGS[state.placed[selected]!].aws}</b>
              <p>{L(BUILDINGS[state.placed[selected]!].role)}</p>
              <div>
                <span>{t("shell.city.upkeep", { n: BUILDINGS[state.placed[selected]!].upkeep })}</span>
                <button type="button" className="btn" onClick={() => { save(demolish(state, selected)); setSelected(null); }}>
                  {t("shell.city.demolish", { n: Math.round(BUILDINGS[state.placed[selected]!].price / 2) })}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="cc-side">
          <section className="cc-day" aria-labelledby="cc-day-h">
            {!event ? (
              <>
                <h2 id="cc-day-h">{t("shell.city.day", { n: state.day })}</h2>
                <p>{t("shell.city.dayIntro")}</p>
                {forecast && <p className="cc-forecast">{t("shell.city.forecast", { title: L(forecast.title) })}</p>}
                <button type="button" className="btn primary" onClick={start}>{t("shell.city.startDay", { n: state.day })}</button>
              </>
            ) : !outcome ? (
              <>
                <span className="cc-tag">{t("shell.city.event")}</span>
                <h2 id="cc-day-h">{L(event.title)}</h2>
                <p>{L(event.story)}</p>
                <b className="cc-ask">{t("shell.city.ask")}</b>
                {event.choices.map((c, i) => {
                  const why = reason(c);
                  const cost = (c.cost ?? 0) + (c.build ? BUILDINGS[c.build].price : 0);
                  if (c.needs && why) return null;
                  return (
                    <button key={i} type="button" className="cc-choice" disabled={!!why} onClick={() => choose(c)}>
                      <span>{L(c.text)}{why && <small>{why}</small>}</span>
                      <b>{money(cost)}</b>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <span className="cc-tag" data-verdict={outcome.choice.verdict}>{t(`shell.city.verdict.${outcome.choice.verdict}`)}</span>
                <h2 id="cc-day-h">{L(event.title)}</h2>
                <p>{L(outcome.choice.outcome)}</p>
                <dl className="cc-compare">
                  <div><dt>{t("shell.city.latency")}</dt><dd>{num(outcome.before.latency)} → <b>{num(outcome.result.latency)} ms</b></dd></div>
                  <div><dt>{t("shell.city.errors")}</dt><dd>{pct(outcome.before.errors)} → <b>{pct(outcome.result.errors)}</b></dd></div>
                  <div><dt>{t("shell.city.moneyDay")}</dt><dd><b>{outcome.money > 0 ? "+" : ""}{money(outcome.money)}</b></dd></div>
                </dl>
                <a href={`/concepts/${event.learn.lesson}/${event.learn.part}/`}>{t("shell.city.read", { lesson: L(titles[event.learn.lesson] ?? { vi: "", en: "" }) })}</a>
                <button type="button" className="btn primary" onClick={() => { setEvent(null); setOutcome(null); }}>{t("shell.city.next")}</button>
              </>
            )}
          </section>

          <section className="cc-build" aria-labelledby="cc-build-h">
            <h2 id="cc-build-h">{t("shell.city.build")}</h2>
            <p className="cc-tip" aria-live="polite">{picked ? t("shell.city.pickSlot", { name: L(BUILDINGS[picked].name) }) : t("shell.city.buildTip")}</p>
            <ul>
              {ORDER.map((b) =>
                unlocked(b, studied) ? (
                  <li key={b}>
                    <button type="button" className="cc-card" aria-pressed={picked === b} disabled={state.money < BUILDINGS[b].price || !!event && !outcome}
                      onClick={() => { setPicked(picked === b ? null : b); setSelected(null); }}>
                      <span><b>{L(BUILDINGS[b].name)}</b><small>{BUILDINGS[b].aws} · {L(BUILDINGS[b].role)}</small></span>
                      <span className="cc-price"><b>{money(BUILDINGS[b].price)}</b><small>{t("shell.city.perDay", { n: BUILDINGS[b].upkeep })}</small></span>
                    </button>
                  </li>
                ) : (
                  <li key={b} className="cc-locked">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                    <span>
                      <b>{L(BUILDINGS[b].name)}</b>
                      <small>
                        {BUILDINGS[b].aws} · <a href={`/concepts/${BUILDINGS[b].lesson}/`}>{t("shell.city.studyToUnlock", { lesson: L(titles[BUILDINGS[b].lesson!] ?? { vi: "", en: "" }) })}</a>
                      </small>
                    </span>
                  </li>
                ),
              )}
            </ul>
          </section>
        </aside>
      </div>

      <section className="cc-levels" aria-labelledby="cc-levels-h">
        <h2 id="cc-levels-h">{t("shell.city.levelsTitle")}</h2>
        <ol>
          {LEVELS.map((name, i) => (
            <li key={i} data-state={i + 1 === level ? "now" : i + 1 < level ? "done" : undefined}>
              <b>{t("shell.city.levelShort", { n: i + 1 })} · {L(name)}</b>
              <small>{t(`shell.city.layer.l${i as 0}`)}</small>
            </li>
          ))}
        </ol>
        <p className="cc-tip">{t("shell.city.levelsHint")}</p>
        <button type="button" className="btn" onClick={() => { if (confirm(t("shell.city.resetConfirm"))) { save({ ...START, known: state.known }); setEvent(null); setOutcome(null); } }}>{t("shell.city.reset")}</button>
      </section>

      <dialog ref={dialog} className="cc-unlock" aria-labelledby="cc-unlock-h" onClose={() => fresh && ack()}>
        {fresh && (
          <div>
            <span className="cc-tag" data-verdict="good">{t("shell.city.unlockTag", { lesson: L(titles[BUILDINGS[fresh].lesson!] ?? { vi: "", en: "" }) })}</span>
            <small>{t("shell.city.newBuilding")}</small>
            <h2 id="cc-unlock-h">{L(BUILDINGS[fresh].name)}</h2>
            <span className="cc-aws">{BUILDINGS[fresh].aws}</span>
            <p>{L(BUILDINGS[fresh].role)}</p>
            <div className="cc-unlock-stats">
              <span>{t("shell.city.price")}<b>{money(BUILDINGS[fresh].price)}</b></span>
              <span>{t("shell.city.upkeepShort")}<b>{t("shell.city.perDay", { n: BUILDINGS[fresh].upkeep })}</b></span>
            </div>
            <button type="button" className="btn primary" onClick={() => { const b = fresh; ack(); setPicked(b); }}>{t("shell.city.placeNow")}</button>
            <button type="button" className="btn" onClick={ack}>{t("shell.city.later")}</button>
          </div>
        )}
      </dialog>
    </div>
  );
}
