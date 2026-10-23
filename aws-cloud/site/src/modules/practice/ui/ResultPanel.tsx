import type { Dispatch } from "../app/events";
import { Scoring } from "../domain/Scoring";
import type { Attempt, CertificationDetail, Exam, LearnLink } from "../domain/types";
import { domainLabel } from "./domainLabel";
import { routes } from "./routes";
import { useT } from "./useT";

interface Props {
  cert: CertificationDetail;
  exam: Exam;
  attempt: Attempt;
  /** Set when the questions are a service's set rather than a practice test. */
  topic?: { id: string; title: string };
  /** Set when the questions are the wrong-answer review. */
  review?: boolean;
  /** Set for a mock exam: show the scaled score; retaking starts a new timed test. */
  mock?: boolean;
  saving: boolean;
  dispatch: Dispatch;
}

export default function ResultPanel({ cert, exam, attempt, topic, review, mock, saving, dispatch }: Props) {
  const tr = useT();
  const { t, locale } = tr;
  const score = Scoring.score(attempt, cert, exam.questions.map((q) => q.id));
  const wrong = exam.questions.filter((q) => attempt.answers[q.id] && !attempt.answers[q.id].correct).length;
  const next = topic || review || mock ? undefined : cert.exams[cert.exams.findIndex((e) => e.id === exam.id) + 1];

  const domains = new Map<string, { right: number; total: number }>();
  for (const q of exam.questions) {
    const d = domains.get(q.domain) ?? { right: 0, total: 0 };
    d.total++;
    if (attempt.answers[q.id]?.correct) d.right++;
    domains.set(q.domain, d);
  }

  // Weakest domain: the lowest share of right answers among domains with at least two questions.
  const weakest = [...domains]
    .filter(([, d]) => d.total >= 2 && d.right < d.total)
    .sort(([, a], [, b]) => a.right / a.total - b.right / b.total)[0]?.[0];

  // Lesson parts to learn again: those teaching the questions answered wrong, most missed first.
  const toLearn = new Map<string, { link: LearnLink; misses: number }>();
  for (const q of exam.questions) {
    const a = attempt.answers[q.id];
    if (!a || a.correct) continue;
    for (const link of q.learn ?? []) {
      const entry = toLearn.get(link.url) ?? { link, misses: 0 };
      entry.misses++;
      toLearn.set(link.url, entry);
    }
  }
  const suggestions = [...toLearn.values()].sort((a, b) => b.misses - a.misses).slice(0, 5);

  return (
    <section aria-labelledby="pr-result">
      <h2 id="pr-result" className="sr-only">{t("result.heading")}</h2>
      <div className="mx-0 mt-1.5 mb-1 flex flex-wrap items-baseline gap-3.5">
        <span className="text-[3rem] leading-none font-bold tracking-[-0.03em] tabular-nums">{score.percent}%</span>
        {!review && <span className={`pr-badge ${score.passed ? "pass" : "fail"}`}>{score.passed ? t("result.passed") : t("result.failed")}</span>}
        {mock && <span className="font-mono text-[0.95rem] text-muted">{t("mock.scaled", { score: Math.max(100, score.percent * 10), pass: cert.passingScore })}</span>}
      </div>
      <p className="pr-muted">
        {review
          ? t("review.summary", { correct: score.correct, total: score.total })
          : t("result.summary", { correct: score.correct, total: score.total, percent: Scoring.passPercent(cert), score: cert.passingScore })}
      </p>

      <div className="mx-0 mt-5 mb-1 grid max-w-[560px] gap-2.5">
        {[...domains].map(([name, d]) => (
          <div key={name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[0.9375rem]">
            <span className={name === weakest ? "font-bold" : undefined}>
              {name ? domainLabel(tr, name) : t("result.other")}
              {name === weakest && <span className="ml-2 rounded-full bg-bad-soft px-[7px] py-px text-[0.75rem] font-semibold text-bad">{t("result.weakest")}</span>}
            </span>
            <span className="font-mono text-[0.875rem] tabular-nums">{d.right}/{d.total}</span>
            <span className="col-span-full h-1.5 overflow-hidden rounded-[3px] bg-line" aria-hidden="true"><span className="block h-full bg-accent" style={{ width: `${(d.right / d.total) * 100}%` }} /></span>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mx-0 mt-4.5 mb-1.5 rounded-[18px] bg-accent-soft px-4 py-3.5">
          <h3 className="mx-0 mt-0 mb-2 text-[1rem] text-accent">{t("result.learnAgain")}</h3>
          <ol className="list-decimal m-0 grid gap-1.5 pl-5 text-[0.9rem]">
            {suggestions.map(({ link, misses }) => (
              <li key={link.url}>
                <a className="font-semibold" href={link.url}>{link.title[locale]}</a>
                {link.title[locale] !== link.lesson[locale] && <span className="pr-muted"> · {link.lesson[locale]}</span>}
                <span className="ml-2 font-mono text-[0.75rem] text-muted">{t("result.misses", { n: misses })}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="pr-actions">
        <button type="button" className="btn" disabled={saving} onClick={() => dispatch({ type: "exam/restart" })}>{review ? t("review.again") : mock ? t("mock.retake") : t("result.retake")}</button>
        {!review && wrong > 0 && <a className="btn" href={routes.reviewSession(cert.id, true)}>{t("review.cta", { n: wrong })}</a>}
        {review ? (
          <a className="btn primary" href={routes.review(cert.id)}>{t("review.toPlan")}</a>
        ) : topic ? (
          <a className="btn primary" href={routes.lesson(topic.id)}>{t("topic.backToLesson")}</a>
        ) : next ? (
          <a className="btn primary" href={routes.exam(cert.id, next.id)}>{t("result.nextExam", { n: next.number })}</a>
        ) : (
          <a className="btn primary" href={routes.catalog(cert.id)}>{t("exam.backToList")}</a>
        )}
      </div>

      <h3 className="mx-0 mt-7 mb-2">{t("result.review")}</h3>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-1.5 p-0">
        {exam.questions.map((q, i) => {
          const a = attempt.answers[q.id];
          return (
            <li key={q.id}>
              <button
                type="button"
                className="grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-2 rounded-sm border border-line bg-surface px-2.5 py-[7px] text-left text-step--1 hover:border-accent"
                onClick={() => dispatch({ type: "exam/goTo", index: i })}
              >
                <span className="font-mono text-muted">{q.number}</span>
                <span className="truncate text-muted">{domainLabel(tr, q.domain)}</span>
                <span className={`font-bold ${a?.correct ? "text-ok" : "text-bad"}`}>{a?.correct ? t("result.correct") : t("result.incorrect")}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
