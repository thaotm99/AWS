import { useEffect, useState } from "react";
import { useI18n } from "../../../app/i18n";
import { getApiClient } from "../../../app/api";
import { MIN_SCORE, MIN_TOPIC, WINDOW_DAYS, skills, type SkillMapData } from "../domain/Skills";
import type { Attempt } from "../domain/types";
import { domainLabel } from "./domainLabel";
import { routes } from "./routes";
import { useT } from "./useT";

/** Accuracy by exam domain over the last 90 days, a rough scaled score, and the weakest topics. */
export default function SkillMap({ certId, passingScore }: { certId: string; passingScore: number }) {
  const tr = useT();
  const { t } = tr;
  const { locale } = useI18n();
  const [data, setData] = useState<{ map: SkillMapData; attempts: Attempt[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/certifications/${certId}/skills.json`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      getApiClient().get<Attempt[]>("/attempts", { certId }),
    ])
      .then(([map, attempts]) => setData({ map, attempts }))
      .catch(() => setError(true));
  }, [certId]);

  if (error) return <p className="pr-muted">{t("skills.error")}</p>;
  if (!data) return <p className="pr-muted">{t("skills.loading")}</p>;

  const r = skills(data.attempts, data.map, Date.now());
  // The scaled score that matches the passing score, as a share of answers right (100 + 900 × share).
  const passShare = (passingScore - 100) / 900;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const title = (id: string) => {
    const tp = data.map.topics.find((x) => x.id === id);
    return tp ? tp.title[locale] || tp.title.vi : id;
  };

  if (!r.total) {
    return (
      <div className="sk-empty">
        <p>{t("skills.empty")}</p>
        <a className="btn primary" href={routes.catalog(certId)}>{t("skills.toTests")}</a>
      </div>
    );
  }

  return (
    <div className="sk">
      <div className="sk-top">
        <p className="pr-muted">{t("skills.basis", { n: r.total, days: WINDOW_DAYS })}</p>
        <div className="sk-score">
          <span>{t("skills.score")}</span>
          {r.score !== null ? (
            <>
              <b>{r.score} <small>/ 1000</small></b>
              <span data-pass={r.score >= passingScore || undefined}>{r.score >= passingScore ? t("skills.above", { n: passingScore }) : t("skills.below", { n: passingScore })}</span>
            </>
          ) : (
            <span>{t("skills.needMore", { n: MIN_SCORE - r.total })}</span>
          )}
        </div>
      </div>
      <p className="sk-caveat">{t("skills.caveat")}</p>

      <div className="sk-grid">
        <section className="sk-card" aria-labelledby="sk-domains">
          <h2 id="sk-domains">{t("skills.domains")}</h2>
          <ul className="sk-domains">
            {r.domains.map((d, i) => (
              <li key={d.name}>
                <div className="sk-line">
                  <span>{i + 1} · {domainLabel(tr, d.name)} <small>{t("skills.weight", { n: Math.round(d.weight * 100) })}</small></span>
                  <b>{d.accuracy === null ? "–" : pct(d.accuracy)}</b>
                </div>
                <div className="sk-bar" role="img" aria-label={d.accuracy === null ? t("skills.noData") : t("skills.barLabel", { pct: pct(d.accuracy), n: d.answered })}>
                  <i style={{ width: d.accuracy === null ? 0 : pct(d.accuracy) }} data-low={d.accuracy !== null && d.accuracy < passShare ? "" : undefined} />
                  <em style={{ left: pct(passShare) }} />
                </div>
                <small className="pr-muted">{t("skills.answered", { n: d.answered })}</small>
              </li>
            ))}
          </ul>
          <p className="sk-legend">{t("skills.legend", { pct: pct(passShare) })}</p>
        </section>

        <section className="sk-card" aria-labelledby="sk-weak">
          <h2 id="sk-weak">{t("skills.weakest")}</h2>
          {r.weakest.length ? (
            <ul className="sk-topics">
              {r.weakest.slice(0, 5).map((tp) => (
                <li key={tp.id}>
                  <span>
                    <b>{title(tp.id)}</b>
                    <small className="pr-muted">{t("skills.topicLine", { c: tp.correct, n: tp.answered })}</small>
                  </span>
                  <a className="btn" href={routes.lesson(tp.id)}>{t("skills.learn")}</a>
                  <a className="btn primary" href={routes.topic(tp.id)}>{t("skills.practice")}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pr-muted">{t("skills.fewTopics", { n: MIN_TOPIC })}</p>
          )}
        </section>
      </div>
    </div>
  );
}
