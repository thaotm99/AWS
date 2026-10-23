import { lazy, Suspense, useState } from "react";
import type { PracticeError } from "../app/errors";
import type { Dispatch } from "../app/events";
import type { AnswerRecord, Question } from "../domain/types";
import { illustrations } from "../illustrations/registry";
import { domainLabel } from "./domainLabel";
import OptionalBoundary from "./OptionalBoundary";
import { errorText } from "./errorText";
import { useT } from "./useT";
import { ANSWER_NOTES } from "../domain/answerNotes";

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
  /** Mock exam: no verdict while answering; move freely and flag questions to come back to. */
  mock?: { flagged: boolean; onFlag: () => void; canPrev: boolean };
}

const label = (key: string) => key.toUpperCase();

// The diagram engine and each question's data download only after an illustrated question is answered.
const IllustrationPanel = lazy(() => import("../illustrations/IllustrationPanel"));

export default function QuestionCard({ question: translated, original, total, answer, selection, saving, error, isLast, dispatch, mock }: Props) {
  const tr = useT();
  const { t, lookup, locale } = tr;
  const [showOriginal, setShowOriginal] = useState(false);
  // Same id, option keys and answers in both languages; only the text differs.
  const q = showOriginal && original ? original : translated;
  // Lesson parts that teach this question; the links follow the site language, not the question's.
  const learn = translated.learn ?? original?.learn ?? [];
  const multi = q.selectCount > 1;
  const count = lookup(`count.${q.selectCount}`);
  // Tolerates answers saved without `chosen` (damaged or older records).
  const chosen = answer?.chosen ?? [];
  const lastKey = q.options[q.options.length - 1]?.key ?? "";

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
          const picked = answer ? chosen.includes(o.key) : selection.includes(o.key);
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
            {!answer.correct && <> · {t("exam.yourAnswer", { keys: chosen.map(label).join(", ") })}</>}
          </p>
          {illustrations.has(q.id) && (
            <OptionalBoundary name="illustration">
              <Suspense fallback={null}>
                <IllustrationPanel questionId={q.id} correct={q.correct} chosen={chosen} />
              </Suspense>
            </OptionalBoundary>
          )}
          <details className="pr-explain" open>
            <summary>{t("exam.explanation")}</summary>
            <div className="pr-html" dangerouslySetInnerHTML={{ __html: q.explanationHtml }} />
          </details>
          {ANSWER_NOTES[q.id] && (
            <aside className="pr-note" role="note">
              <b>{t("exam.noteTitle")}</b> {ANSWER_NOTES[q.id].text[locale]}{" "}
              {ANSWER_NOTES[q.id].sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
              ))}
            </aside>
          )}
          {learn.length > 0 && (
            <nav className="pr-learn" aria-label={t("exam.learnAgain")}>
              <b>{t("exam.learnAgain")}</b>
              <ul>
                {learn.map((l) => (
                  <li key={l.url}>
                    <a href={l.url}>{l.title[locale]}</a>
                    {l.title[locale] !== l.lesson[locale] && <span className="pr-muted"> · {l.lesson[locale]}</span>}
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      )}

      {error && <p className="pr-error" role="alert">{errorText(t, error)}</p>}

      <div className="pr-actions">
        {mock && !answer ? (
          <>
            <button type="button" className="btn" disabled={!mock.canPrev} onClick={() => dispatch({ type: "exam/goTo", index: q.number - 2 })}>
              {t("mock.prev")}
            </button>
            <button type="button" className="btn pr-flag" aria-pressed={mock.flagged} onClick={mock.onFlag}>
              {mock.flagged ? t("mock.unflag") : t("mock.flag")}
            </button>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "exam/next" })}>
              {isLast ? t("mock.overview") : t("mock.next")}
            </button>
          </>
        ) : answer ? (
          <>
            <span className="pr-muted pr-keys-hint">{t("exam.pressEnter")}</span>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "exam/next" })}>
              {isLast ? t("exam.showResults") : t("exam.next")}
            </button>
          </>
        ) : (
          <>
            <span className="pr-muted">
              {multi ? t("exam.pickN", { n: q.selectCount, picked: selection.length }) : t("exam.pickOne")}
              <span className="pr-keys-hint">
                {" · "}
                {t("exam.keys", { last: label(lastKey) })}
              </span>
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
