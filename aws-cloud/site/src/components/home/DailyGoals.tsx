import { useEffect, useState } from "react";
import { useI18n } from "../../app/i18n";
import { today } from "../../lib/flashcards";
import { DEFAULT_GOALS, GOALS_EVENT, GOAL_LIMITS, dayCounts, metGoals, readGoals, streaks, weekOf, writeGoals, type DayCount, type Goals } from "../../lib/goals";
import { POMODORO_EVENT } from "../../lib/pomodoro";
import { PROGRESS_EVENT, getAllPartsRead, getLastPart } from "../../lib/progress";

const KEYS = ["parts", "cards", "pomodoros"] as const;
const WEEKS = 5;

function Ring({ value, goal }: { value: number; goal: number }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  const frac = goal ? Math.min(1, value / goal) : 0;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="dg-ring">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="dg-ring-track" />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 32 32)" className="dg-ring-fill" />
    </svg>
  );
}

/** Today's goals (parts read, flashcards, Pomodoro sessions), the study streak and the last five weeks. */
export default function DailyGoals() {
  const { t, locale } = useI18n();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [days, setDays] = useState<Map<number, DayCount>>(new Map());
  const [now, setNow] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Goals>(DEFAULT_GOALS);

  useEffect(() => {
    const sync = () => {
      setGoals(readGoals());
      setDays(dayCounts());
      setNow(today());
    };
    sync();
    const events = [GOALS_EVENT, POMODORO_EVENT, PROGRESS_EVENT, "storage", "pageshow"];
    for (const e of events) addEventListener(e, sync);
    return () => events.forEach((e) => removeEventListener(e, sync));
  }, []);

  const day = now || 0;
  const todayCount = days.get(day) ?? { parts: 0, cards: 0, pomodoros: 0 };
  const counted = new Set([...days].filter(([, c]) => metGoals(c, goals).met > 0).map(([d]) => d));
  const s = streaks(counted, day);
  const left = KEYS.filter((k) => goals[k] > 0 && todayCount[k] < goals[k]);
  const last = now ? getLastPart() : null;
  const next = last && (getAllPartsRead().includes(`${last.lesson}/${last.slug}`) ? last.next : { href: `/concepts/${last.lesson}/${last.slug}/`, title: last.title });

  // Five Monday-based weeks ending with this one.
  const start = (weekOf(day) - (WEEKS - 1)) * 7 - 3;
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = start + i;
    const m = metGoals(days.get(d), goals);
    return { d, level: d > day ? -1 : m.met === 0 ? 0 : m.met < m.of ? 1 : 2 };
  });
  const dateLabel = (d: number) => new Date((d + 0.5) * 86_400_000).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN", { day: "numeric", month: "numeric" });

  const status =
    counted.has(day) ? (left.length ? t("shell.goals.keptMore") : t("shell.goals.allDone")) : s.current > 0 ? t("shell.goals.keep", { n: s.current }) : t("shell.goals.start");

  const link = (k: (typeof KEYS)[number]) =>
    k === "parts" ? (next ? { href: next.href, text: t("shell.goals.nextPart", { title: next.title[locale] || next.title.vi }) } : { href: "/concepts/aws-map/", text: t("shell.goals.firstPart") })
    : k === "cards" ? { href: "/flashcards/", text: t("shell.goals.toCards") }
    : { href: "/pomodoro/", text: t("shell.goals.toPomodoro") };

  return (
    <section className="dg" aria-labelledby="dg-title">
      <div className="dg-head">
        <div>
          <h2 id="dg-title">{t("shell.goals.title")}</h2>
          <p>{status}</p>
        </div>
        <span className="dg-streak" title={t("shell.goals.streakHint")}>
          <b>{s.current}</b> {t("shell.goals.streak")}
        </span>
        <button type="button" className="btn" aria-expanded={editing} onClick={() => { setDraft(goals); setEditing(!editing); }}>{t("shell.goals.edit")}</button>
      </div>

      {editing && (
        <form className="dg-form" onSubmit={(e) => { e.preventDefault(); writeGoals(draft); setEditing(false); }}>
          {KEYS.map((k) => (
            <label key={k}>
              <span>{t(`shell.goals.field.${k}`)}</span>
              <input type="number" min={0} max={GOAL_LIMITS[k]} step={1} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Math.max(0, Math.min(GOAL_LIMITS[k], Math.round(Number(e.target.value) || 0))) })} />
            </label>
          ))}
          <button type="submit" className="btn primary">{t("shell.goals.save")}</button>
          <small>{t("shell.goals.zero")}</small>
        </form>
      )}

      <div className="dg-goals">
        {KEYS.filter((k) => goals[k] > 0).map((k) => {
          const done = todayCount[k] >= goals[k];
          const l = link(k);
          return (
            <a key={k} className="dg-goal" href={l.href} data-done={done || undefined}>
              <span className="dg-ring-wrap">
                <Ring value={todayCount[k]} goal={goals[k]} />
                <b>{done ? "✓" : `${todayCount[k]}/${goals[k]}`}</b>
              </span>
              <span>
                <b>{t(`shell.goals.goal.${k}`, { n: goals[k] })}</b>
                <small>{done ? t("shell.goals.done") : l.text}</small>
              </span>
            </a>
          );
        })}
      </div>

      <div className="dg-bottom">
        <div className="dg-cal" role="img" aria-label={t("shell.goals.calendarLabel", { n: counted.size })}>
          {["d1", "d2", "d3", "d4", "d5", "d6", "d0"].map((d) => <span key={d} className="dg-dow" aria-hidden="true">{t(`shell.pomodoro.dayShort.${d as "d0"}`)}</span>)}
          {cells.map((c) => <i key={c.d} data-level={c.level} data-today={c.d === day || undefined} title={c.level >= 0 ? dateLabel(c.d) : undefined} aria-hidden="true" />)}
        </div>
        <dl className="dg-stats">
          <div><dt>{t("shell.goals.current")}</dt><dd>{t("shell.goals.days", { n: s.current })}</dd></div>
          <div><dt>{t("shell.goals.longest")}</dt><dd>{t("shell.goals.days", { n: s.longest })}</dd></div>
          <div><dt>{t("shell.goals.rest")}</dt><dd>{s.restLeft}</dd></div>
        </dl>
        <p className="dg-rule">{t("shell.goals.rule")}</p>
      </div>
    </section>
  );
}
