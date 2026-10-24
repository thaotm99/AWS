import { useEffect, useState } from "react";
import { useI18n } from "../../app/i18n";
import { EXAM_DATE_EVENT, daysUntil, phaseFor, readExamDate, writeExamDate } from "../../lib/exam-date";

/** Exam date picker: the days left and the study phase that applies, from the date kept in this browser. */
export default function ExamCountdown() {
  const { t } = useI18n();
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setDate(readExamDate());
    sync();
    addEventListener(EXAM_DATE_EVENT, sync);
    addEventListener("storage", sync);
    return () => {
      removeEventListener(EXAM_DATE_EVENT, sync);
      removeEventListener("storage", sync);
    };
  }, []);

  const days = date ? daysUntil(date) : null;
  const phase = days === null ? null : phaseFor(days);

  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-line bg-surface p-6 shadow-[0_6px_0] shadow-line">
      <label htmlFor="exam-date" className="text-[0.8125rem] font-bold tracking-[0.08em] text-muted uppercase">{t("shell.guide.date.label")}</label>
      <div className="flex gap-2">
        <input
          id="exam-date"
          type="date"
          value={date ?? ""}
          onChange={(e) => writeExamDate(e.target.value || null)}
          className="min-h-12 min-w-0 flex-1 rounded-[14px] border-2 border-line bg-bg px-3.5 text-[1.0625rem] text-ink"
        />
        {date && (
          <button type="button" className="btn" onClick={() => writeExamDate(null)} aria-label={t("shell.guide.date.clear")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
      {days === null ? (
        <p className="m-0 text-[0.9375rem] leading-[1.55] text-muted">{t("shell.guide.date.empty")}</p>
      ) : phase === "past" ? (
        <p className="m-0 text-[0.9375rem] leading-[1.55] text-muted">{t("shell.guide.date.past")}</p>
      ) : (
        <>
          <p className="m-0 flex items-baseline gap-2.5">
            {days > 0 && <span className="font-display text-[4rem] leading-none font-extrabold text-accent">{days}</span>}
            <span className="text-[1.125rem] font-semibold">{days > 0 ? t("shell.guide.date.left") : t("shell.guide.date.today")}</span>
          </p>
          <div className="flex flex-col gap-1 rounded-md bg-accent-soft px-4 py-3.5">
            <span className="text-[0.8125rem] font-bold text-accent-strong dark:text-ink">{t("shell.guide.date.current")}</span>
            {phase === "exam" || phase === null ? (
              <span className="text-[0.9375rem] leading-[1.55]">{t("shell.guide.plan.examHint")}</span>
            ) : (
              <span className="font-display text-[1.125rem] font-bold">{t(`shell.guide.plan.${phase}.title`)}</span>
            )}
          </div>
        </>
      )}
      <p className="m-0 text-[0.8125rem] text-muted">{t("shell.guide.date.saved")}</p>
    </div>
  );
}
