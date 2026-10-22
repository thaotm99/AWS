import { useState } from "react";
import type { PracticeError } from "../app/errors";
import type { Dispatch } from "../app/events";
import type { AnswerRecord, Question } from "../domain/types";
import { domainLabel } from "./domainLabel";
import { errorText } from "./errorText";
import { useT } from "./useT";

interface Props {
  question: Question;
  /** English original of the same question, when `question` is a translation. */
  original?: Question;
  total: number;
  answer: AnswerRecord | undefined;
  selection: string[];
  saving: boolean;
  error: PracticeError | null;
  isLast: boolean;
  dispatch: Dispatch;
}

const label = (key: string) => key.toUpperCase();

export default function QuestionCard({ question: translated, original, total, answer, selection, saving, error, isLast, dispatch }: Props) {
  const tr = useT();
  const { t, lookup } = tr;
  const [showOriginal, setShowOriginal] = useState(false);
  // Same id, option keys and answers in both languages; only the text differs.
  const q = showOriginal && original ? original : translated;
  const multi = q.selectCount > 1;
  const count = lookup(`count.${q.selectCount}`);

  return (
    <section className="pr-card" aria-labelledby="pr-q">
      <div className="pr-q-meta">
        <span>{t("exam.questionOf", { n: q.number, total })}</span>
        {q.domain && <span>{domainLabel(tr, q.domain)}</span>}
        {multi && <span className="pr-multi">{t("exam.selectN", { n: count })}</span>}
      </div>
      {(original || !translated.translated) && (
        <div className="pr-lang">
          {!translated.translated && <span className="pr-muted">{t("exam.notTranslated")}</span>}
          {original && translated.translated && (
            <button type="button" className="pr-lang-btn" aria-pressed={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
              {showOriginal ? t("exam.showTranslation") : t("exam.showOriginal")}
            </button>
          )}
        </div>
      )}
      <div id="pr-q" className="pr-html pr-prompt" dangerouslySetInnerHTML={{ __html: q.promptHtml }} />

      <div className="pr-options" role={multi ? "group" : "radiogroup"} aria-labelledby="pr-q">
        {q.options.map((o) => {
          const picked = answer ? answer.chosen.includes(o.key) : selection.includes(o.key);
          const right = answer && q.correct.includes(o.key);
          const cls = ["pr-option", multi ? "multi" : "", answer ? (right ? "right" : picked ? "wrong" : "faded") : ""].join(" ");
          const tag = !answer ? "" : right ? (picked ? t("exam.tagCorrect") : t("exam.tagAnswer")) : picked ? t("exam.tagWrong") : "";
          return (
            <button
              key={o.key}
              type="button"
              className={cls}
              role={multi ? "checkbox" : "radio"}
              aria-checked={picked}
              disabled={Boolean(answer) || saving}
              onClick={() => dispatch({ type: "exam/toggleOption", key: o.key })}
            >
              <span className="pr-key">{label(o.key)}</span>
              <span className="pr-html" dangerouslySetInnerHTML={{ __html: o.html }} />
              <span className="pr-tag">{tag}</span>
            </button>
          );
        })}
      </div>

      {answer && (
        <div className={`pr-verdict ${answer.correct ? "ok" : "bad"}`} role="status">
          <b className="pr-verdict-head">{answer.correct ? t("exam.correct") : t("exam.incorrect")}</b>
          <p>
            {t(multi ? "exam.correctAnswers" : "exam.correctAnswer")} <b>{q.correct.map(label).join(", ")}</b>
            {!answer.correct && <> · {t("exam.yourAnswer", { keys: answer.chosen.map(label).join(", ") })}</>}
          </p>
          <details className="pr-explain" open>
            <summary>{t("exam.explanation")}</summary>
            <div className="pr-html" dangerouslySetInnerHTML={{ __html: q.explanationHtml }} />
          </details>
        </div>
      )}

      {error && <p className="pr-error" role="alert">{errorText(t, error)}</p>}

      <div className="pr-actions">
        {answer ? (
          <>
            <span className="pr-muted">{t("exam.pressEnter")}</span>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "exam/next" })}>
              {isLast ? t("exam.showResults") : t("exam.next")}
            </button>
          </>
        ) : (
          <>
            <span className="pr-muted">
              {multi ? t("exam.pickN", { n: q.selectCount, picked: selection.length }) : t("exam.pickOne")}
              {" · "}
              {t("exam.keys", { last: label(q.options.at(-1)!.key) })}
            </span>
            <button
              type="button"
              className="btn primary"
              disabled={saving || selection.length !== q.selectCount}
              onClick={() => dispatch({ type: "exam/submit" })}
            >
              {saving ? t("exam.saving") : t("exam.check")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
