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
      getApiClient().get<SkillMapData>(`/certifications/${certId}/skills`),
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
      <div className="flex flex-col items-start gap-3">
        <p>{t("skills.empty")}</p>
        <a className="btn primary min-h-11 no-underline" href={routes.catalog(certId)}>{t("skills.toTests")}</a>
      </div>
    );
  }

  return (
    <div className="mb-10 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="pr-muted max-w-[60ch]">{t("skills.basis", { n: r.total, days: WINDOW_DAYS })}</p>
        <div className="flex flex-col gap-0.5 rounded-[18px] border border-line bg-surface px-4 py-3 text-right text-[0.8125rem] text-muted">
          <span>{t("skills.score")}</span>
          {r.score !== null ? (
            <>
              <b className="font-mono text-[1.6rem] text-ink">{r.score} <small className="text-[0.875rem] text-muted">/ 1000</small></b>
              <span className="text-edge data-pass:text-ok" data-pass={r.score >= passingScore || undefined}>{r.score >= passingScore ? t("skills.above", { n: passingScore }) : t("skills.below", { n: passingScore })}</span>
            </>
          ) : (
            <span className="text-edge">{t("skills.needMore", { n: MIN_SCORE - r.total })}</span>
          )}
        </div>
      </div>
      <p className="m-0 text-[0.75rem] text-muted">{t("skills.caveat")}</p>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <section className="rounded-[20px] border border-line bg-surface p-4.5" aria-labelledby="sk-domains">
          <h2 className="mx-0 mt-0 mb-3.5 text-[1rem]" id="sk-domains">{t("skills.domains")}</h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {r.domains.map((d, i) => (
              <li key={d.name}>
                <div className="flex justify-between gap-3 text-[0.9rem]">
                  <span>{i + 1} · {domainLabel(tr, d.name)} <small className="text-muted">{t("skills.weight", { n: Math.round(d.weight * 100) })}</small></span>
                  <b className="font-mono">{d.accuracy === null ? "–" : pct(d.accuracy)}</b>
                </div>
                <div className="relative mx-0 mt-2 mb-1 h-2.5 rounded-[5px] bg-line" role="img" aria-label={d.accuracy === null ? t("skills.noData") : t("skills.barLabel", { pct: pct(d.accuracy), n: d.answered })}>
                  <i className="block h-full rounded-[5px] bg-accent data-low:bg-edge" style={{ width: d.accuracy === null ? 0 : pct(d.accuracy) }} data-low={d.accuracy !== null && d.accuracy < passShare ? "" : undefined} />
                  <em className="absolute -top-1 h-[18px] w-0.5 bg-ink" style={{ left: pct(passShare) }} />
                </div>
                <small className="pr-muted text-[0.75rem]">{t("skills.answered", { n: d.answered })}</small>
              </li>
            ))}
          </ul>
          <p className="mx-0 mt-3.5 mb-0 text-[0.75rem] text-muted">{t("skills.legend", { pct: pct(passShare) })}</p>
        </section>

        <section className="rounded-[20px] border border-line bg-surface p-4.5" aria-labelledby="sk-weak">
          <h2 className="mx-0 mt-0 mb-3.5 text-[1rem]" id="sk-weak">{t("skills.weakest")}</h2>
          {r.weakest.length ? (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {r.weakest.slice(0, 5).map((tp) => (
                <li key={tp.id} className="flex flex-wrap items-center gap-2 rounded-[14px] bg-bg p-3">
                  <span className="flex flex-[1_1_180px] flex-col gap-0.5">
                    <b>{title(tp.id)}</b>
                    <small className="pr-muted">{t("skills.topicLine", { c: tp.correct, n: tp.answered })}</small>
                  </span>
                  <a className="btn min-h-10 no-underline" href={routes.lesson(tp.id)}>{t("skills.learn")}</a>
                  <a className="btn primary min-h-10 no-underline" href={routes.topic(tp.id)}>{t("skills.practice")}</a>
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
