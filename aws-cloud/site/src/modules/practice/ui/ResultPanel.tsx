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
      <h2 id="pr-result" className="pr-visually-hidden">{t("result.heading")}</h2>
      <div className="pr-score">
        <span className="pr-score-big">{score.percent}%</span>
        {!review && <span className={`pr-badge ${score.passed ? "pass" : "fail"}`}>{score.passed ? t("result.passed") : t("result.failed")}</span>}
        {mock && <span className="pr-scaled">{t("mock.scaled", { score: Math.max(100, score.percent * 10), pass: cert.passingScore })}</span>}
      </div>
      <p className="pr-muted">
        {review
          ? t("review.summary", { correct: score.correct, total: score.total })
          : t("result.summary", { correct: score.correct, total: score.total, percent: Scoring.passPercent(cert), score: cert.passingScore })}
      </p>

      <div className="pr-domains">
        {[...domains].map(([name, d]) => (
          <div key={name} className={`pr-domain${name === weakest ? " weakest" : ""}`}>
            <span className="pr-domain-name">
              {name ? domainLabel(tr, name) : t("result.other")}
              {name === weakest && <span className="pr-weak-tag">{t("result.weakest")}</span>}
            </span>
            <span className="pr-domain-val">{d.right}/{d.total}</span>
            <span className="pr-meter" aria-hidden="true"><span style={{ width: `${(d.right / d.total) * 100}%` }} /></span>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="pr-suggest">
          <h3>{t("result.learnAgain")}</h3>
          <ol>
            {suggestions.map(({ link, misses }) => (
              <li key={link.url}>
                <a href={link.url}>{link.title[locale]}</a>
                {link.title[locale] !== link.lesson[locale] && <span className="pr-muted"> · {link.lesson[locale]}</span>}
                <span className="pr-suggest-n">{t("result.misses", { n: misses })}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="pr-actions">
        <button type="button" className="btn" disabled={saving} onClick={() => dispatch({ type: "exam/restart" })}>{review ? t("review.again") : mock ? t("mock.retake") : t("result.retake")}</button>
        {!review && wrong > 0 && <a className="btn" href={routes.review(cert.id)}>{t("review.cta", { n: wrong })}</a>}
        {review ? (
          <a className="btn primary" href={routes.catalog(cert.id)}>{t("exam.backToList")}</a>
        ) : topic ? (
          <a className="btn primary" href={routes.lesson(topic.id)}>{t("topic.backToLesson")}</a>
        ) : next ? (
          <a className="btn primary" href={routes.exam(cert.id, next.id)}>{t("result.nextExam", { n: next.number })}</a>
        ) : (
          <a className="btn primary" href={routes.catalog(cert.id)}>{t("exam.backToList")}</a>
        )}
      </div>

      <h3 className="pr-review-title">{t("result.review")}</h3>
      <ol className="pr-review">
        {exam.questions.map((q, i) => {
          const a = attempt.answers[q.id];
          return (
            <li key={q.id}>
              <button type="button" onClick={() => dispatch({ type: "exam/goTo", index: i })}>
                <span className="pr-review-n">{q.number}</span>
                <span className="pr-review-domain">{domainLabel(tr, q.domain)}</span>
                <span className={`pr-review-r ${a?.correct ? "ok" : "bad"}`}>{a?.correct ? t("result.correct") : t("result.incorrect")}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
