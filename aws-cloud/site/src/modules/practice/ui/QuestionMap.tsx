import type { Dispatch } from "../app/events";
import type { Attempt, Exam } from "../domain/types";
import { useT } from "./useT";

/** Color of a question in the progress bar: answered right, wrong, or not yet. */
const barColor = { r: "bg-ok", w: "bg-bad", "": "bg-line" };

interface Props {
  exam: Exam;
  attempt: Attempt;
  index: number;
  frontier: number;
  dispatch: Dispatch;
}

/** Thin progress bar plus a numbered grid to jump back to answered questions. */
export default function QuestionMap({ exam, attempt, index, frontier, dispatch }: Props) {
  const { t } = useT();
  const answered = Object.keys(attempt.answers).length;
  const state = (i: number) => {
    const a = attempt.answers[exam.questions[i].id];
    return a ? (a.correct ? "r" : "w") : "";
  };

  return (
    <div className="mt-1 mb-4.5">
      <div className="flex h-1.5 gap-0.5" aria-hidden="true">
        {exam.questions.map((q, i) => <span key={q.id} className={`flex-1 rounded-[2px] ${i === index ? "bg-accent" : barColor[state(i)]}`} />)}
      </div>
      <details>
        <summary className="mt-2 w-fit cursor-pointer text-step--1 text-muted">{t("exam.questionList", { done: answered, total: exam.questions.length })}</summary>
        <div className="pr-grid">
          {exam.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              className={`${state(i)}${i === index ? " cur" : ""}`}
              disabled={i > frontier}
              aria-current={i === index ? "step" : undefined}
              onClick={() => dispatch({ type: "exam/goTo", index: i })}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
