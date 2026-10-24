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
  // Sent by the server once the question is answered (see Reveal).
  const correct = q.correct ?? [];

  return (
    <section className="rounded-[18px] border-2 border-line bg-surface p-5.5 shadow-soft max-sm:p-4" aria-labelledby="pr-q">
      <div className="mb-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">
        <span>{t("exam.questionOf", { n: q.number, total })}</span>
        {q.domain && <span>{domainLabel(tr, q.domain)}</span>}
        {multi && <span className="text-edge">{t("exam.selectN", { n: count })}</span>}
      </div>
      {(original || !translated.translated) && (
        <div className="mx-0 mt-1.5 mb-3 flex flex-wrap items-center gap-2.5">
          {!translated.translated && <span className="pr-muted">{t("exam.notTranslated")}</span>}
          {original && translated.translated && (
            <button type="button" className="cursor-pointer rounded-full border border-line bg-bg px-2.5 py-0.5 text-step--1 text-muted hover:border-accent hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg" aria-pressed={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
              {showOriginal ? t("exam.showTranslation") : t("exam.showOriginal")}
            </button>
          )}
        </div>
      )}
      <div id="pr-q" className="pr-html mb-4.5 text-[1.0625rem] [&_p]:max-w-[75ch]" dangerouslySetInnerHTML={{ __html: q.promptHtml }} />

      <div className="grid gap-2.5" role={multi ? "group" : "radiogroup"} aria-labelledby="pr-q">
        {q.options.map((o) => {
          const picked = answer ? chosen.includes(o.key) : selection.includes(o.key);
          const right = answer && correct.includes(o.key);
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
        <div className={`mt-4.5 rounded-[14px] border px-4 py-3.5 ${answer.correct ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft"}`} role="status">
          <b className={`mb-0.5 block text-step-1 ${answer.correct ? "text-ok" : "text-bad"}`}>{answer.correct ? t("exam.correct") : t("exam.incorrect")}</b>
          <p className="mx-0 mt-0 mb-2">
            {t(multi ? "exam.correctAnswers" : "exam.correctAnswer")} <b>{correct.map(label).join(", ")}</b>
            {!answer.correct && <> · {t("exam.yourAnswer", { keys: chosen.map(label).join(", ") })}</>}
          </p>
          {illustrations.has(q.id) && (
            <OptionalBoundary name="illustration">
              <Suspense fallback={null}>
                <IllustrationPanel questionId={q.id} correct={correct} chosen={chosen} />
              </Suspense>
            </OptionalBoundary>
          )}
          <details className="rounded-sm bg-surface px-3.5 py-2.5 text-[0.9375rem]" open>
            <summary className="mb-1.5 cursor-pointer font-semibold">{t("exam.explanation")}</summary>
            <div className="pr-html [&_p:not(:last-child)]:mb-2" dangerouslySetInnerHTML={{ __html: q.explanationHtml ?? "" }} />
          </details>
          {ANSWER_NOTES[q.id] && (
            <aside className="mt-2.5 rounded-r-sm border-l-3 border-edge bg-edge-soft px-3 py-2.5 text-[0.875rem]" role="note">
              <b>{t("exam.noteTitle")}</b> {ANSWER_NOTES[q.id].text[locale]}{" "}
              {ANSWER_NOTES[q.id].sources.map((s) => (
                <a key={s.url} className="ml-1" href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
              ))}
            </aside>
          )}
          {learn.length > 0 && (
            <nav className="mt-3 rounded-[14px] bg-accent-soft px-3 py-2.5 text-[0.875rem]" aria-label={t("exam.learnAgain")}>
              <b className="mb-1 block text-accent">{t("exam.learnAgain")}</b>
              <ul className="grid gap-1">
                {learn.map((l) => (
                  <li key={l.url}>
                    <a className="font-semibold" href={l.url}>{l.title[locale]}</a>
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
            <button type="button" className="btn aria-pressed:border-edge aria-pressed:text-edge" aria-pressed={mock.flagged} onClick={mock.onFlag}>
              {mock.flagged ? t("mock.unflag") : t("mock.flag")}
            </button>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "exam/next" })}>
              {isLast ? t("mock.overview") : t("mock.next")}
            </button>
          </>
        ) : answer ? (
          <>
            <span className="pr-muted [@media(hover:none)]:hidden">{t("exam.pressEnter")}</span>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "exam/next" })}>
              {isLast ? t("exam.showResults") : t("exam.next")}
            </button>
          </>
        ) : (
          <>
            <span className="pr-muted">
              {multi ? t("exam.pickN", { n: q.selectCount, picked: selection.length }) : t("exam.pickOne")}
              <span className="[@media(hover:none)]:hidden">
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
