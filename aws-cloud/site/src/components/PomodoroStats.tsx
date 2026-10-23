import { useEffect, useState } from "react";
import { useI18n } from "../app/i18n";
import { DEFAULTS, LIMITS, POMODORO_EVENT, POMODORO_KEYS, dayOf, readLog, readSettings, stats, writeLog, writeSettings, type Session, type Settings } from "../lib/pomodoro";

const FIELDS = ["focus", "short", "long", "every"] as const;
const LABEL = { focus: "focusLen", short: "shortLen", long: "longLen", every: "every" } as const;

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
    <div className="pomo-stats">
      <p className="lede">{t("shell.pomodoro.lede", { focus: settings.focus, every: settings.every })}</p>

      <div className="ps-tiles">
        <div className="ps-tile">
          <span>{t("shell.pomodoro.today")}</span>
          <b>{st.today.sessions} <small>{t("shell.pomodoro.unitSessions")}</small></b>
          <span>{t("shell.pomodoro.minutes", { time: duration(st.today.minutes) })}</span>
        </div>
        <div className="ps-tile">
          <span>{t("shell.pomodoro.week")}</span>
          <b>{st.week.sessions} <small>{t("shell.pomodoro.unitSessions")}</small></b>
          <span>{t("shell.pomodoro.weekDetail", { time: duration(st.week.minutes), days: st.week.days })}</span>
        </div>
        <div className="ps-tile">
          <span>{t("shell.pomodoro.partsWeek")}</span>
          <b>{st.week.parts} <small>{t("shell.pomodoro.unitParts")}</small></b>
          <span>{t("shell.pomodoro.perPart", { n: perPart })}</span>
        </div>
      </div>

      <div className="ps-row">
        <figure className="ps-card ps-chart" role="img"
          aria-label={t("shell.pomodoro.chartLabel", { list: st.days.map((d) => `${dayName(d.day)} ${d.sessions}`).join(", ") })}>
          <figcaption>{t("shell.pomodoro.perDay")}</figcaption>
          <div className="ps-bars" aria-hidden="true">
            {st.days.map((d) => (
              <div key={d.day} className="ps-bar" data-today={d.day === today || undefined}>
                <span>{d.sessions}</span>
                <i style={{ height: d.sessions ? `${(d.sessions / max) * 100}%` : undefined }} data-empty={!d.sessions || undefined} />
                <span>{dayName(d.day)}</span>
              </div>
            ))}
          </div>
        </figure>

        <section className="ps-card" aria-labelledby="ps-today">
          <h2 id="ps-today">{t("shell.pomodoro.todayLog")}</h2>
          {st.todayLog.length ? (
            <ol className="ps-log">
              {st.todayLog.map((x) => (
                <li key={x.start}>
                  <span className="ps-time">{time(x.start)}</span>
                  <span>
                    {x.part ? <a href={x.part.href}>{x.part.title[locale] || x.part.title.vi}</a> : t("shell.pomodoro.mode.focus")}
                    {x.part && (
                      <small data-done={x.read.includes(x.part.key) || undefined}> · {x.read.includes(x.part.key) ? t("shell.pomodoro.done") : t("shell.pomodoro.reading2")}</small>
                    )}
                    {x.extra && <small> · {t("shell.pomodoro.extra", { min: x.minutes })}</small>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ps-empty">{t("shell.pomodoro.noneToday")}</p>
          )}
        </section>
      </div>

      <form className="ps-card ps-settings" id="settings" onSubmit={save}>
        <h2>{t("shell.pomodoro.settings")}</h2>
        <div className="ps-fields">
          {FIELDS.map((k) => (
            <label key={k}>
              <span>{t(`shell.pomodoro.${LABEL[k]}`)}</span>
              <input type="number" inputMode="numeric" min={LIMITS[k][0]} max={LIMITS[k][1]} step={1} required value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="ps-actions">
          <button type="submit" className="btn primary" disabled={!valid}>{t("shell.pomodoro.save")}</button>
          <span role="status" className="ps-saved">{saved ? t("shell.pomodoro.saved") : ""}</span>
          <button type="button" className="btn" onClick={clear} disabled={!log.length}>{t("shell.pomodoro.clear")}</button>
        </div>
      </form>
    </div>
  );
}
