import { useEffect } from "react";
import PageBoundary from "./PageBoundary";
import { useStore } from "../../../core/state/useStore";
import { PracticeApp } from "../app/PracticeApp";
import { Scoring } from "../domain/Scoring";
import type { Attempt, Certification, ExamSummary } from "../domain/types";
import { errorText } from "./errorText";
import { routes } from "./routes";
import { useT, type PracticeT } from "./useT";

function examStatus(t: PracticeT, exam: ExamSummary, attempt: Attempt | undefined, cert: Certification) {
  // An attempt saved for a different version of the set is replaced when the exam is opened.
  if (!attempt || !Object.keys(attempt.answers).length || attempt.questionCount !== exam.questionCount) {
    return { cls: "", text: t("catalog.notStarted") };
  }
  const s = Scoring.score(attempt, cert, exam.questionCount);
  if (!Scoring.isFinished(attempt, exam.questionCount)) return { cls: "wip", text: t("catalog.inProgress", { done: s.answered, total: exam.questionCount }) };
  return s.passed
    ? { cls: "pass", text: t("catalog.passed", { percent: s.percent }) }
    : { cls: "fail", text: t("catalog.failed", { percent: s.percent }) };
}

function CatalogView({ certId }: { certId: string | null }) {
  const app = PracticeApp.get();
  const state = useStore(app.catalog.store);
  const { t } = useT();
  useEffect(() => {
    app.dispatch({ type: "catalog/open", certId });
  }, [certId]);

  if (state.status === "error" && state.error) return <p className="pr-error">{errorText(t, state.error)}</p>;
  const cert = state.selected;

  return (
    <>
      <ul className="pr-certs" aria-label={t("catalog.certifications")}>
        {state.certifications.map((c) => (
          <li key={c.id}>
            <a className="pr-cert" href={routes.catalog(c.id)} aria-current={c.id === cert?.id ? "page" : undefined}>
              <span className="pr-cert-code">{c.code}</span>
              <span className="pr-cert-name">{c.name}</span>
              <span className="pr-cert-count">{c.examCount ? t("catalog.examCount", { n: c.examCount }) : t("catalog.noExams")}</span>
            </a>
          </li>
        ))}
      </ul>

      {!cert ? (
        <p className="pr-muted">{state.status === "ready" ? t("catalog.noCertifications") : t("catalog.loading")}</p>
      ) : (
        <section aria-labelledby="pr-cert-title">
          <div className="pr-cert-head">
            <h2 id="pr-cert-title">{cert.code} · {cert.name}</h2>
            <p className="pr-muted">
              {t("catalog.realExam", {
                questions: cert.questionCount,
                minutes: cert.minutes,
                score: cert.passingScore,
                percent: Scoring.passPercent(cert),
              })}
            </p>
          </div>
          {cert.exams.length ? (
            <ul className="pr-exams">
              {cert.exams.map((e) => {
                const s = examStatus(t, e, state.latestAttempts[e.id], cert);
                return (
                  <li key={e.id}>
                    <a className="pr-exam" href={routes.exam(cert.id, e.id)}>
                      <span className="pr-exam-no">{t("catalog.examLabel", { n: e.number })}</span>
                      <span className="pr-exam-body">
                        <span className="pr-exam-title">{e.title}</span>
                        <span className="pr-muted">{t("catalog.examMeta", { questions: e.questionCount, multi: e.multiSelectCount })}</span>
                      </span>
                      <span className={`pr-badge ${s.cls}`}>{s.text}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pr-empty">{t("catalog.noExamsFor", { code: cert.code })}</p>
          )}
          {state.reviewCount > 0 && (
            <a className="pr-review-card" href={routes.review(cert.id)}>
              <span className="pr-review-card-n">{state.reviewCount}</span>
              <span>
                <b>{t("review.title")}</b>
                <span className="pr-muted">{t("review.cardBody", { n: state.reviewCount })}</span>
              </span>
              <span aria-hidden="true">→</span>
            </a>
          )}
        </section>
      )}
    </>
  );
}

/** Page entry: a rendering error shows a message with a way out instead of a blank page. */
export default function CatalogPage(props: { certId: string | null }) {
  return (
    <PageBoundary>
      <CatalogView {...props} />
    </PageBoundary>
  );
}
