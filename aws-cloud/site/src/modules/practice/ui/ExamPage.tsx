import { useEffect } from "react";
import { PracticeApp } from "../app/PracticeApp";
import QuestionCard from "./QuestionCard";
import QuestionMap from "./QuestionMap";
import ResultPanel from "./ResultPanel";
import { errorText } from "./errorText";
import { routes } from "./routes";
import { useT } from "./useT";
import { useStore } from "../../../core/state/useStore";

interface Props {
  certId: string;
  /** A practice test… */
  examId?: string;
  /** …or every question about one service, opened from its lesson. */
  topic?: { id: string; title: string };
}

export default function ExamPage({ certId, examId, topic }: Props) {
  const app = PracticeApp.get();
  const store = app.exam.store;
  const state = useStore(store);
  const { cert, exam, attempt, index, view } = state;
  const { t, locale } = useT();

  const set = topic ? { kind: "topic" as const, id: topic.id } : { kind: "exam" as const, id: examId! };
  useEffect(() => app.dispatch({ type: "exam/open", certId, set, locale }), [certId, set.kind, set.id]);
  // Switching VI/EN reloads only the question text; progress stays.
  useEffect(() => app.dispatch({ type: "exam/language", locale }), [locale]);

  // Keyboard: letters pick options, Enter submits or moves on.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || store.getState().view !== "question") return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, button, a, summary")) return;
      const q = store.question;
      if (!q) return;
      const key = e.key.toLowerCase();
      if (q.options.some((o) => o.key === key)) app.dispatch({ type: "exam/toggleOption", key });
      else if (e.key === "Enter") app.dispatch({ type: store.getState().attempt?.answers[q.id] ? "exam/next" : "exam/submit" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The static <title> is in the default language; keep it in the chosen one.
  useEffect(() => {
    if (!cert || !exam) return;
    document.title = topic ? t("topic.pageTitle", { title: topic.title }) : t("catalog.examPageTitle", { code: cert.code, n: exam.number });
  }, [cert, exam, t]);

  // Each new question or the result starts at the top of the page.
  useEffect(() => window.scrollTo({ top: 0 }), [index, view]);

  if (state.status === "error" && state.error) {
    return (
      <p className="pr-error">
        {errorText(t, state.error)}{" "}
        {topic ? <a href={routes.lesson(topic.id)}>{t("topic.backToLesson")}</a> : <a href={routes.catalog(certId)}>{t("exam.backToList")}</a>}
      </p>
    );
  }
  if (!cert || !exam || !attempt || state.status !== "ready") return <p className="pr-muted">{t("exam.loading")}</p>;
  const examLabel = t("catalog.examLabel", { n: exam.number });
  const heading = topic ? t("topic.title", { title: topic.title }) : `${cert.code} · ${examLabel}`;

  const question = exam.questions[index];
  return (
    <>
      {topic ? (
        <div className="crumbs">
          <a href={routes.lesson(topic.id)}>{topic.title}</a><span aria-hidden="true">/</span>
          <b>{t("topic.crumb")}</b>
        </div>
      ) : (
        <div className="crumbs">
          <a href={routes.catalog()}>{t("catalog.crumb")}</a><span aria-hidden="true">/</span>
          <a href={routes.catalog(cert.id)}>{cert.code}</a><span aria-hidden="true">/</span>
          <b>{examLabel}</b>
        </div>
      )}
      <div className="pr-run-head">
        <h1>{heading}</h1>
        {view === "question" && attempt.finishedAt && (
          <button type="button" className="btn" onClick={() => app.dispatch({ type: "exam/showResult" })}>{t("exam.showResults")}</button>
        )}
      </div>

      {view === "result" ? (
        <ResultPanel cert={cert} exam={exam} attempt={attempt} topic={topic} saving={state.saving} dispatch={app.dispatch} />
      ) : (
        <>
          <QuestionMap exam={exam} attempt={attempt} index={index} frontier={store.frontier} dispatch={app.dispatch} />
          <QuestionCard
            key={question.id}
            question={question}
            original={state.original?.questions[index]}
            total={exam.questions.length}
            answer={attempt.answers[question.id]}
            selection={state.selection}
            saving={state.saving}
            error={state.error}
            isLast={index === exam.questions.length - 1}
            dispatch={app.dispatch}
          />
        </>
      )}
    </>
  );
}
