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
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-line" />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 32 32)" className="stroke-accent transition-[stroke-dashoffset] duration-400 ease-[ease] in-data-done:stroke-ok" />
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
    <section className="mt-2 mb-8 flex flex-col gap-4 rounded-lg border-2 border-line bg-surface p-5 shadow-soft max-md:p-4" aria-labelledby="dg-title">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-[1_1_260px]">
          <h2 id="dg-title" className="m-0 text-[1.25rem]">{t("shell.goals.title")}</h2>
          <p className="m-0 mt-1 text-[0.875rem] text-muted">{status}</p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-[18px] border border-edge bg-edge-soft px-3 text-[0.8125rem]" title={t("shell.goals.streakHint")}>
          <b className="font-mono">{s.current}</b> {t("shell.goals.streak")}
        </span>
        <button type="button" className="btn" aria-expanded={editing} onClick={() => { setDraft(goals); setEditing(!editing); }}>{t("shell.goals.edit")}</button>
      </div>

      {editing && (
        <form className="flex flex-wrap items-end gap-3 rounded-[18px] bg-bg p-3" onSubmit={(e) => { e.preventDefault(); writeGoals(draft); setEditing(false); }}>
          {KEYS.map((k) => (
            <label key={k} className="flex flex-col gap-1 text-[0.8125rem] text-muted">
              <span>{t(`shell.goals.field.${k}`)}</span>
              <input className="box-border min-h-10 w-[120px] rounded-sm border border-line bg-surface px-2.5 font-mono text-ink" type="number" min={0} max={GOAL_LIMITS[k]} step={1} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Math.max(0, Math.min(GOAL_LIMITS[k], Math.round(Number(e.target.value) || 0))) })} />
            </label>
          ))}
          <button type="submit" className="btn primary">{t("shell.goals.save")}</button>
          <small className="basis-full text-muted">{t("shell.goals.zero")}</small>
        </form>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {KEYS.filter((k) => goals[k] > 0).map((k) => {
          const done = todayCount[k] >= goals[k];
          const l = link(k);
          return (
            <a key={k} className="flex items-center gap-3.5 rounded-[18px] border-2 border-line bg-bg p-3.5 text-ink no-underline shadow-[0_4px_0] shadow-line hover:border-accent data-done:border-ok data-done:bg-ok-soft data-done:hover:border-accent" href={l.href} data-done={done || undefined}>
              <span className="relative size-16 flex-none">
                <Ring value={todayCount[k]} goal={goals[k]} />
                <b className="absolute inset-0 grid place-items-center font-mono text-[0.875rem]">{done ? "✓" : `${todayCount[k]}/${goals[k]}`}</b>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <b>{t(`shell.goals.goal.${k}`, { n: goals[k] })}</b>
                <small className="overflow-hidden text-[0.8125rem] text-ellipsis text-muted">{done ? t("shell.goals.done") : l.text}</small>
              </span>
            </a>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4 max-md:grid-cols-[minmax(0,1fr)]">
        <div className="grid grid-cols-7 gap-[5px]" role="img" aria-label={t("shell.goals.calendarLabel", { n: counted.size })}>
          {["d1", "d2", "d3", "d4", "d5", "d6", "d0"].map((d) => <span key={d} className="text-center text-[0.6875rem] text-muted" aria-hidden="true">{t(`shell.pomodoro.dayShort.${d as "d0"}`)}</span>)}
          {cells.map((c) => <i className="h-[22px] rounded-[5px] border border-line bg-bg data-[level=-1]:border-dashed data-[level=-1]:bg-transparent data-[level=1]:border-transparent data-[level=1]:bg-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-bg))] data-[level=2]:border-transparent data-[level=2]:bg-accent data-today:outline-2 data-today:outline-offset-1 data-today:outline-edge" key={c.d} data-level={c.level} data-today={c.d === day || undefined} title={c.level >= 0 ? dateLabel(c.d) : undefined} aria-hidden="true" />)}
        </div>
        <dl className="m-0 flex flex-col gap-1.5 text-[0.875rem]">
          {[
            [t("shell.goals.current"), t("shell.goals.days", { n: s.current })],
            [t("shell.goals.longest"), t("shell.goals.days", { n: s.longest })],
            [t("shell.goals.rest"), s.restLeft],
          ].map(([term, value]) => (
            <div key={term} className="flex justify-between gap-2.5"><dt className="text-muted">{term}</dt><dd className="m-0 font-mono font-semibold">{value}</dd></div>
          ))}
        </dl>
        <p className="col-2 m-0 -mt-2 text-[0.75rem] leading-[1.5] text-muted max-md:col-1 max-md:mt-0">{t("shell.goals.rule")}</p>
      </div>
    </section>
  );
}
