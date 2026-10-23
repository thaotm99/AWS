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
      <ul className="mx-0 mt-2 mb-6.5 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2 p-0" aria-label={t("catalog.certifications")}>
        {state.certifications.map((c) => (
          <li key={c.id} className="flex">
            <a className="grid flex-1 gap-0.5 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 py-3 text-ink no-underline hover:border-accent aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft" href={routes.catalog(c.id)} aria-current={c.id === cert?.id ? "page" : undefined}>
              <span className="font-mono text-[0.875rem] font-medium text-accent">{c.code}</span>
              <span className="leading-[1.3] font-semibold">{c.name}</span>
              <span className="text-step--1 text-muted">{c.examCount ? t("catalog.examCount", { n: c.examCount }) : t("catalog.noExams")}</span>
            </a>
          </li>
        ))}
      </ul>

      {!cert ? (
        <p className="pr-muted">{state.status === "ready" ? t("catalog.noCertifications") : t("catalog.loading")}</p>
      ) : (
        <section aria-labelledby="pr-cert-title">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="m-0 text-step-1" id="pr-cert-title">{cert.code} · {cert.name}</h2>
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
            <ul className="m-0 grid list-none gap-2 p-0">
              {cert.exams.map((e) => {
                const s = examStatus(t, e, state.latestAttempts[e.id], cert);
                return (
                  <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 max-sm:grid-cols-[minmax(0,1fr)]">
                    <a className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[14px] border border-line bg-surface px-4.5 py-3.5 text-ink no-underline hover:border-accent hover:shadow-soft max-sm:grid-cols-[minmax(0,1fr)_auto]" href={routes.exam(cert.id, e.id)}>
                      <span className="rounded-[10px] bg-accent-soft px-2 py-1 text-center font-mono text-[0.8125rem] font-medium text-accent max-sm:hidden">{t("catalog.examLabel", { n: e.number })}</span>
                      <span className="grid min-w-0">
                        <span className="font-semibold">{e.title}</span>
                        <span className="pr-muted">{t("catalog.examMeta", { questions: e.questionCount, multi: e.multiSelectCount })}</span>
                      </span>
                      <span className={`pr-badge ${s.cls}`}>{s.text}</span>
                    </a>
                    <a className="flex min-h-11 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-line px-3.5 text-[0.875rem] font-semibold whitespace-nowrap text-accent no-underline hover:border-solid hover:border-accent" href={routes.mock(cert.id, e.id)}>{t("mock.cta", { minutes: cert.minutes })}</a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="max-w-none rounded-[14px] border border-dashed border-line bg-surface p-6 text-muted">{t("catalog.noExamsFor", { code: cert.code })}</p>
          )}
          <a className="mt-4 flex items-center gap-3.5 rounded-[18px] border border-line bg-surface px-4.5 py-3.5 text-ink no-underline hover:border-accent" href={routes.skills(cert.id)}>
            <span className="grid flex-1 gap-0.5 text-[0.9rem]">
              <b>{t("skills.title")}</b>
              <span className="pr-muted">{t("skills.cardBody")}</span>
            </span>
            <span aria-hidden="true">→</span>
          </a>
          {state.reviewCount > 0 && (
            <a className="mt-4 flex items-center gap-3.5 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--edge)_45%,var(--line))] bg-edge-soft px-4.5 py-3.5 text-ink no-underline hover:border-edge" href={routes.review(cert.id)}>
              <span className="grid h-11 min-w-11 place-items-center rounded-[18px] bg-edge font-mono font-bold text-on-accent">{state.reviewCount}</span>
              <span className="grid flex-1 gap-0.5 text-[0.9rem]">
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
