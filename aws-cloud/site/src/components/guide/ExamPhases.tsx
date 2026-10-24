import { useEffect, useState } from "react";
import { useI18n } from "../../app/i18n";
import { EXAM_DATE_EVENT, daysUntil, phaseFor, readExamDate, type Phase } from "../../lib/exam-date";

const PHASES = ["baseline", "gaps", "mocks", "eve"] as const;
const ITEMS = ["a", "b", "c"] as const;

/** The four study phases; the one that applies to the saved exam date is filled in. */
export default function ExamPhases() {
  const { t } = useI18n();
  const [current, setCurrent] = useState<Phase | null>(null);

  useEffect(() => {
    const sync = () => {
      const date = readExamDate();
      setCurrent(date ? phaseFor(daysUntil(date)) : null);
    };
    sync();
    addEventListener(EXAM_DATE_EVENT, sync);
    addEventListener("storage", sync);
    return () => {
      removeEventListener(EXAM_DATE_EVENT, sync);
      removeEventListener("storage", sync);
    };
  }, []);

  return (
    <ol className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {PHASES.map((p) => {
        const on = p === current;
        return (
          <li
            key={p}
            aria-current={on ? "step" : undefined}
            className="group flex flex-col gap-2.5 rounded-lg border-2 border-line bg-surface p-[22px] aria-[current=step]:border-accent aria-[current=step]:bg-accent aria-[current=step]:text-on-accent"
          >
            <span className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] font-bold tracking-[0.06em] text-edge uppercase group-aria-[current=step]:text-on-accent">
              {t(`shell.guide.plan.${p}.when`)}
              {on && <span className="rounded-full bg-on-accent px-2.5 py-0.5 tracking-normal whitespace-nowrap text-accent normal-case">{t("shell.guide.plan.now")}</span>}
            </span>
            <h3 className="m-0 text-[1.25rem]">{t(`shell.guide.plan.${p}.title`)}</h3>
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] leading-[1.55]">
              {ITEMS.map((i) => <li key={i}>{t(`shell.guide.plan.${p}.items.${i}`)}</li>)}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
