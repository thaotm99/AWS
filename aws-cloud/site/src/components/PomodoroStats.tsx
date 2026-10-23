import { useEffect, useState } from "react";
import { useI18n } from "../app/i18n";
import { DEFAULTS, LIMITS, POMODORO_EVENT, POMODORO_KEYS, dayOf, readLog, readSettings, stats, writeLog, writeSettings, type Session, type Settings } from "../lib/pomodoro";

const FIELDS = ["focus", "short", "long", "every"] as const;
const LABEL = { focus: "focusLen", short: "shortLen", long: "longLen", every: "every" } as const;

/** A stat tile and a content card share the same frame. */
const FRAME = "rounded-[20px] border-2 border-line bg-surface px-[18px] py-4 shadow-[0_4px_0] shadow-line";
const TILE = `${FRAME} flex flex-col gap-1 text-[0.8125rem] text-muted`;
const TILE_N = "font-mono text-[1.75rem] leading-[1.2] font-semibold text-ink";
const TILE_UNIT = "font-body text-[0.875rem] font-medium text-muted";
const CARD_H = "mx-0 mt-0 mb-3 text-[0.9375rem] font-semibold";

/** The /pomodoro/ page: focus sessions today and over 7 days, and the session lengths. */
export default function PomodoroStats() {
  const { t, locale } = useI18n();
  const [log, setLog] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [draft, setDraft] = useState<Record<(typeof FIELDS)[number], string>>({ focus: "25", short: "5", long: "15", every: "4" });
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const sync = () => {
      setLog(readLog());
      setSettings(readSettings());
      setNow(Date.now());
    };
    const onStorage = (e: StorageEvent) => (e.key === null || POMODORO_KEYS.includes(e.key)) && sync();
    sync();
    const s = readSettings();
    setDraft({ focus: String(s.focus), short: String(s.short), long: String(s.long), every: String(s.every) });
    addEventListener("storage", onStorage);
    addEventListener(POMODORO_EVENT, sync);
    return () => {
      removeEventListener("storage", onStorage);
      removeEventListener(POMODORO_EVENT, sync);
    };
  }, []);

  const st = stats(log, now || Date.now());
  const duration = (min: number) => (min >= 60 ? t("shell.pomodoro.hours", { h: Math.floor(min / 60), m: min % 60 }) : t("shell.pomodoro.mins", { m: min }));
  const max = Math.max(4, ...st.days.map((d) => d.sessions));
  const today = dayOf(now || Date.now());
  // Day numbers count from 1970-01-01, a Thursday.
  const dayName = (day: number) => (day === today ? t("shell.pomodoro.todayShort") : t(`shell.pomodoro.dayShort.d${(((day % 7) + 11) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6}`));
  const time = (ms: number) => new Date(ms).toLocaleTimeString(locale === "en" ? "en-GB" : "vi-VN", { hour: "2-digit", minute: "2-digit" });
  const valid = FIELDS.every((k) => {
    const n = Number(draft[k]);
    return Number.isInteger(n) && n >= LIMITS[k][0] && n <= LIMITS[k][1];
  });
  const perPart = st.week.parts ? (st.week.sessions / st.week.parts).toLocaleString(locale === "en" ? "en" : "vi", { maximumFractionDigits: 1 }) : "–";

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const next = { ...settings, focus: +draft.focus, short: +draft.short, long: +draft.long, every: +draft.every };
    setSettings(next);
    writeSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clear() {
    if (!confirm(t("shell.pomodoro.clearConfirm"))) return;
    writeLog([]);
    setLog([]);
  }

  return (
    <div className="mb-10 flex flex-col gap-5">
      <p className="lede m-0">{t("shell.pomodoro.lede", { focus: settings.focus, every: settings.every })}</p>

      <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
        <div className={TILE}>
          <span>{t("shell.pomodoro.today")}</span>
          <b className={TILE_N}>{st.today.sessions} <small className={TILE_UNIT}>{t("shell.pomodoro.unitSessions")}</small></b>
          <span>{t("shell.pomodoro.minutes", { time: duration(st.today.minutes) })}</span>
        </div>
        <div className={TILE}>
          <span>{t("shell.pomodoro.week")}</span>
          <b className={TILE_N}>{st.week.sessions} <small className={TILE_UNIT}>{t("shell.pomodoro.unitSessions")}</small></b>
          <span>{t("shell.pomodoro.weekDetail", { time: duration(st.week.minutes), days: st.week.days })}</span>
        </div>
        <div className={TILE}>
          <span>{t("shell.pomodoro.partsWeek")}</span>
          <b className={TILE_N}>{st.week.parts} <small className={TILE_UNIT}>{t("shell.pomodoro.unitParts")}</small></b>
          <span>{t("shell.pomodoro.perPart", { n: perPart })}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <figure className={`${FRAME} m-0 flex flex-col`} role="img"
          aria-label={t("shell.pomodoro.chartLabel", { list: st.days.map((d) => `${dayName(d.day)} ${d.sessions}`).join(", ") })}>
          <figcaption className={CARD_H}>{t("shell.pomodoro.perDay")}</figcaption>
          <div className="grid min-h-[180px] flex-1 grid-cols-7 gap-2" aria-hidden="true">
            {st.days.map((d) => (
              <div key={d.day} className="group flex min-w-0 flex-col items-center justify-end gap-1.5 text-[0.75rem] text-muted data-today:font-semibold data-today:text-ink" data-today={d.day === today || undefined}>
                <span>{d.sessions}</span>
                <i className="min-h-[3px] w-full max-w-[44px] rounded-t-[10px] rounded-b-[2px] bg-[color-mix(in_srgb,var(--color-accent)_55%,var(--color-line))] data-empty:h-[3px] data-empty:bg-line group-data-today:not-data-empty:bg-accent" style={{ height: d.sessions ? `${(d.sessions / max) * 100}%` : undefined }} data-empty={!d.sessions || undefined} />
                <span className="whitespace-nowrap">{dayName(d.day)}</span>
              </div>
            ))}
          </div>
        </figure>

        <section className={FRAME} aria-labelledby="ps-today">
          <h2 id="ps-today" className={CARD_H}>{t("shell.pomodoro.todayLog")}</h2>
          {st.todayLog.length ? (
            <ol className="flex flex-col gap-2.5 text-[0.875rem]">
              {st.todayLog.map((x) => (
                <li key={x.start} className="flex items-baseline gap-3">
                  <span className="w-[46px] flex-none font-mono text-[0.8125rem] text-muted">{time(x.start)}</span>
                  <span>
                    {x.part ? <a href={x.part.href}>{x.part.title[locale] || x.part.title.vi}</a> : t("shell.pomodoro.mode.focus")}
                    {x.part && (
                      <small className="text-muted data-done:text-ok" data-done={x.read.includes(x.part.key) || undefined}> · {x.read.includes(x.part.key) ? t("shell.pomodoro.done") : t("shell.pomodoro.reading2")}</small>
                    )}
                    {x.extra && <small className="text-muted"> · {t("shell.pomodoro.extra", { min: x.minutes })}</small>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-[0.875rem] text-muted">{t("shell.pomodoro.noneToday")}</p>
          )}
        </section>
      </div>

      <form className={FRAME} id="settings" onSubmit={save}>
        <h2 className={CARD_H}>{t("shell.pomodoro.settings")}</h2>
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
          {FIELDS.map((k) => (
            <label key={k} className="flex flex-col gap-1.5 text-[0.8125rem] text-muted">
              <span>{t(`shell.pomodoro.${LABEL[k]}`)}</span>
              <input className="min-h-10 rounded-sm border border-line bg-bg px-2.5 font-mono text-ink" type="number" inputMode="numeric" min={LIMITS[k][0]} max={LIMITS[k][1]} step={1} required value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn primary min-h-10" disabled={!valid}>{t("shell.pomodoro.save")}</button>
          <span role="status" className="text-[0.8125rem] text-ok">{saved ? t("shell.pomodoro.saved") : ""}</span>
          <button type="button" className="btn ml-auto min-h-10" onClick={clear} disabled={!log.length}>{t("shell.pomodoro.clear")}</button>
        </div>
      </form>
    </div>
  );
}
