import type { Dispatch } from "../app/events";
import { Scoring } from "../domain/Scoring";
import type { Attempt, CertificationDetail, Exam } from "../domain/types";
import { domainLabel } from "./domainLabel";
import { routes } from "./routes";
import { useT } from "./useT";

interface Props {
  cert: CertificationDetail;
  exam: Exam;
  attempt: Attempt;
  saving: boolean;
  dispatch: Dispatch;
}

export default function ResultPanel({ cert, exam, attempt, saving, dispatch }: Props) {
  const tr = useT();
  const { t } = tr;
  const score = Scoring.score(attempt, cert);
  const next = cert.exams[cert.exams.findIndex((e) => e.id === exam.id) + 1];

  const domains = new Map<string, { right: number; total: number }>();
  for (const q of exam.questions) {
    const d = domains.get(q.domain) ?? { right: 0, total: 0 };
    d.total++;
    if (attempt.answers[q.id]?.correct) d.right++;
    domains.set(q.domain, d);
  }

  return (
    <section aria-labelledby="pr-result">
      <h2 id="pr-result" className="pr-visually-hidden">{t("result.heading")}</h2>
      <div className="pr-score">
        <span className="pr-score-big">{score.percent}%</span>
        <span className={`pr-badge ${score.passed ? "pass" : "fail"}`}>{score.passed ? t("result.passed") : t("result.failed")}</span>
      </div>
      <p className="pr-muted">
        {t("result.summary", { correct: score.correct, total: score.total, percent: Scoring.passPercent(cert), score: cert.passingScore })}
      </p>

      <div className="pr-domains">
        {[...domains].map(([name, d]) => (
          <div key={name} className="pr-domain">
            <span className="pr-domain-name">{name ? domainLabel(tr, name) : t("result.other")}</span>
            <span className="pr-domain-val">{d.right}/{d.total}</span>
            <span className="pr-meter" aria-hidden="true"><span style={{ width: `${(d.right / d.total) * 100}%` }} /></span>
          </div>
        ))}
      </div>

      <div className="pr-actions">
        <button type="button" className="btn" disabled={saving} onClick={() => dispatch({ type: "exam/restart" })}>{t("result.retake")}</button>
        {next ? (
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
