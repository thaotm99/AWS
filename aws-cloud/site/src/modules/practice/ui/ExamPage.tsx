import { useEffect } from "react";
import PageBoundary from "./PageBoundary";
import { PracticeApp } from "../app/PracticeApp";
import { Scoring } from "../domain/Scoring";
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
  /** …or every question about one service, opened from its lesson… */
  topic?: { id: string; title: { vi: string; en: string } };
  /** …or the questions whose latest answer was wrong. */
  review?: boolean;
}

function ExamView({ certId, examId, topic, review }: Props) {
  const app = PracticeApp.get();
  const store = app.exam.store;
  const state = useStore(store);
  const { cert, exam, attempt, index, view } = state;
  const { t, locale } = useT();
  const topicTitle = topic?.title[locale];

  const set = review
    ? { kind: "review" as const, id: "review", all: new URLSearchParams(location.search).has("all") }
    : topic
      ? { kind: "topic" as const, id: topic.id }
      : { kind: "exam" as const, id: examId! };
  useEffect(() => {
    app.dispatch({ type: "exam/open", certId, set, locale });
  }, [certId, set.kind, set.id, set.all]);
  // Switching VI/EN reloads only the question text; progress stays.
  useEffect(() => {
    app.dispatch({ type: "exam/language", locale });
  }, [locale]);

  // Keyboard: letters pick options, Enter submits or moves on.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || store.getState().view !== "question") return;
      // A full-screen diagram or the phone menu is on top: keys belong to it, not to the question.
      if (document.documentElement.matches(".zoom-open, .drawer-open")) return;
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
    if (!cert) return;
    if (review) document.title = t("review.pageTitle", { code: cert.code });
    else if (exam) document.title = topic ? t("topic.pageTitle", { title: topicTitle! }) : t("catalog.examPageTitle", { code: cert.code, n: exam.number });
  }, [cert, exam, t]);

  // Each new question or the result starts at the top of the page.
  // Block body on purpose: newer browsers return a Promise from scrollTo, and an effect may only
  // return a cleanup function (React calls anything else on the next run and the page crashes).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index, view]);

  if (state.status === "error" && state.error) {
    return (
      <p className="pr-error">
        {errorText(t, state.error)}{" "}
        {topic ? <a href={routes.lesson(topic.id)}>{t("topic.backToLesson")}</a> : <a href={routes.catalog(certId)}>{t("exam.backToList")}</a>}
      </p>
    );
  }
  const reviewCrumbs = cert && (
    <div className="crumbs">
      <a href={routes.catalog()}>{t("catalog.crumb")}</a><span aria-hidden="true">/</span>
      <a href={routes.catalog(cert.id)}>{cert.code}</a><span aria-hidden="true">/</span>
      <a href={routes.review(cert.id)}>{t("review.crumb")}</a><span aria-hidden="true">/</span>
      <b>{set.all ? t("review.allCrumb") : t("review.dueCrumb")}</b>
    </div>
  );
  if (review && state.empty && cert && state.status === "ready") {
    return (
      <>
        {reviewCrumbs}
        <h1>{t("review.title")}</h1>
        <div className="pr-empty-review">
          <p><b>{set.all ? t("review.emptyTitle") : t("review.noneDue")}</b></p>
          <p className="pr-muted">{set.all ? t("review.emptyBody") : t("review.noneDueBody")}</p>
          <a className="btn primary" href={set.all ? routes.catalog(cert.id) : routes.review(cert.id)}>{set.all ? t("review.toTests") : t("review.toPlan")}</a>
        </div>
      </>
    );
  }
  if (!cert || !exam || !attempt || state.status !== "ready") return <p className="pr-muted">{t("exam.loading")}</p>;
  const examLabel = t("catalog.examLabel", { n: exam.number });
  const heading = review ? t("review.title") : topic ? t("topic.title", { title: topicTitle! }) : `${cert.code} · ${examLabel}`;

  const question = exam.questions[index];
  const finished = Scoring.isFinished(attempt, exam.questions.map((q) => q.id));
  return (
    <>
      {review ? (
        reviewCrumbs
      ) : topic ? (
        <div className="crumbs">
          <a href={routes.lesson(topic.id)}>{topicTitle}</a><span aria-hidden="true">/</span>
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
        {view === "question" && finished && (
          <button type="button" className="btn" onClick={() => app.dispatch({ type: "exam/showResult" })}>{t("exam.showResults")}</button>
        )}
      </div>

      {view === "result" ? (
        <ResultPanel cert={cert} exam={exam} attempt={attempt} topic={topic} review={review} saving={state.saving} dispatch={app.dispatch} />
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

/** Page entry: a rendering error shows a message with a way out instead of a blank page. */
export default function ExamPage(props: Props) {
  return (
    <PageBoundary>
      <ExamView {...props} />
    </PageBoundary>
  );
}
