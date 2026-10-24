import { useI18n } from "../../app/i18n";
import { useState } from "react";

export interface QuizItem {
  q: string;
  opts: string[];
  a: number;
  why: string;
}

/** An answer option; once the question is answered, the correct option and a wrong choice are coloured. */
const OPTION =
  "cursor-pointer rounded-[14px] border-2 px-3.5 py-3 text-left text-step-0 leading-[1.45] enabled:hover:border-accent disabled:cursor-default";
const OPTION_STATE = {
  "": "border-line bg-surface shadow-[0_3px_0_var(--color-line)]",
  right: "border-ok bg-ok-soft shadow-[0_3px_0_var(--color-ok)]",
  wrong: "border-bad bg-bad-soft shadow-[0_3px_0_var(--color-bad)]",
};

function Question({ item, n }: { item: QuizItem; n: number }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;
  const correct = chosen === item.a;
  const { t } = useI18n();

  return (
    <div className="min-w-0 rounded-lg border-2 border-line bg-surface px-[22px] py-5 wrap-anywhere shadow-[0_4px_0_var(--color-line)]">
      <div className="mb-3.5 font-display text-step-1 leading-[1.4] font-semibold">{n}. {item.q}</div>
      <div className="grid gap-2.5">
        {item.opts.map((o, i) => {
          const state = !answered ? "" : i === item.a ? "right" : i === chosen ? "wrong" : "";
          return (
            <button key={i} className={`${OPTION} ${OPTION_STATE[state]}`} disabled={answered} onClick={() => setChosen(i)}>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-2.5 rounded-[4px] border-l-4 pl-3 text-[0.9375rem] ${correct ? "border-ok" : "border-bad"}`}>
          <b>{correct ? t("lesson.quiz.correct") : t("lesson.quiz.incorrect")}</b> {item.why}
        </div>
      )}
    </div>
  );
}

export default function Quiz({ items }: { items: QuizItem[] }) {
  return (
    <div className="mt-4 grid gap-3">
      {items.map((item, i) => <Question key={i} item={item} n={i + 1} />)}
    </div>
  );
}
