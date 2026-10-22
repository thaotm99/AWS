import type { Dispatch } from "../app/events";
import type { Attempt, Exam } from "../domain/types";
import { useT } from "./useT";

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
    <div className="pr-map">
      <div className="pr-bar" aria-hidden="true">
        {exam.questions.map((q, i) => <span key={q.id} className={`${state(i)}${i === index ? " cur" : ""}`} />)}
      </div>
      <details>
        <summary>{t("exam.questionList", { done: answered, total: exam.questions.length })}</summary>
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
