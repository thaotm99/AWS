import { useEffect, useState } from "react";
import { useI18n } from "../../../app/i18n";
import { getApiClient } from "../../../app/api";
import { Review, dayOf } from "../domain/Review";
import type { SkillMapData } from "../domain/Skills";
import type { Attempt } from "../domain/types";
import { routes } from "./routes";
import { useT } from "./useT";

/** About how long one review question takes, for the estimate next to the due count. */
const MINUTES_PER_QUESTION = 1.5;

/**
 * The wrong-answer book: what is due today, how many questions sit in each box, what comes due over
 * the next 7 days, and which topics the book holds. Nothing new is stored: the book is replayed from
 * the answers (domain/Review.ts).
 */
export default function ReviewPlan({ certId }: { certId: string }) {
  const { t } = useT();
  const { locale } = useI18n();
  const [data, setData] = useState<{ attempts: Attempt[]; map: SkillMapData | null } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      getApiClient().get<Attempt[]>("/attempts", { certId }),
      // Topic names are a nicety: the page works without them.
      fetch(`/api/certifications/${certId}/skills.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([attempts, map]) => setData({ attempts, map }))
      .catch(() => setError(true));
  }, [certId]);

  if (error) return <p className="pr-muted">{t("skills.error")}</p>;
  if (!data) return <p className="pr-muted">{t("skills.loading")}</p>;

  const today = dayOf(new Date().toISOString());
  const { entries, graduated } = Review.book(data.attempts);
  const list = [...entries.values()];
  if (!list.length) {
    return (
      <div className="pr-empty-review">
        <p><b>{t("review.emptyTitle")}</b></p>
        <p className="pr-muted">{t("review.emptyBody")}</p>
        <a className="btn primary" href={routes.catalog(certId)}>{t("review.toTests")}</a>
      </div>
    );
  }
  const due = list.filter((e) => e.due <= today).length;
  const boxes = Review.BOX_DAYS.map((_, i) => list.filter((e) => e.box === i + 1).length);
  // Overdue questions count on today.
  const days = Array.from({ length: 7 }, (_, i) => ({ day: today + i, n: list.filter((e) => (i === 0 ? e.due <= today : e.due === today + i)).length }));
  const max = Math.max(1, ...days.map((d) => d.n));
  const left30 = graduated.filter((g) => g.at && dayOf(g.at) > today - 30).length;
  const weekday = (day: number) =>
    day === today ? t("plan.today") : new Date((day + 0.5) * 86_400_000).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN", { weekday: "short" });
  const topics = new Map<string, number>();
  for (const e of list) {
    const topic = data.map?.questions[e.id]?.[1];
    if (topic) topics.set(topic, (topics.get(topic) ?? 0) + 1);
  }
  const topicList = [...topics].sort((a, b) => b[1] - a[1]);
  const name = (id: string) => {
    const tp = data.map?.topics.find((x) => x.id === id);
    return tp ? tp.title[locale] || tp.title.vi : id;
  };

  return (
    <div className="rp">
      <div className="rp-boxes">
        <div className="rp-box due">
          <span>{t("plan.due")}</span>
          <b>{due}</b>
          <small>{due ? t("plan.minutes", { n: Math.max(1, Math.round(due * MINUTES_PER_QUESTION)) }) : t("plan.nothingDue")}</small>
        </div>
        {boxes.map((n, i) => (
          <div key={i} className="rp-box">
            <span>{t("plan.box", { n: i + 1, days: Review.BOX_DAYS[i] })}</span>
            <b>{n}</b>
          </div>
        ))}
      </div>

      <div className="rp-actions">
        {due > 0 && <a className="btn primary" href={routes.reviewSession(certId)}>{t("plan.startDue", { n: Math.min(due, Review.ROUND) })}</a>}
        <a className={due > 0 ? "btn" : "btn primary"} href={routes.reviewSession(certId, true)}>{t("plan.startAll", { n: Math.min(list.length, Review.ROUND) })}</a>
        <span className="pr-muted">{t("plan.graduated", { n: left30 })}</span>
      </div>

      <section className="rp-card" aria-labelledby="rp-week">
        <h2 id="rp-week">{t("plan.week")}</h2>
        <div className="rp-bars" role="img" aria-label={days.map((d) => `${weekday(d.day)}: ${d.n}`).join(", ")}>
          {days.map((d) => (
            <div key={d.day} className="rp-bar" data-today={d.day === today || undefined} aria-hidden="true">
              <span>{d.n}</span>
              <i style={{ height: d.n ? `${(d.n / max) * 100}%` : undefined }} data-empty={!d.n || undefined} />
              <span>{weekday(d.day)}</span>
            </div>
          ))}
        </div>
      </section>

      {topicList.length > 0 && (
        <section className="rp-topics" aria-labelledby="rp-topics">
          <h2 id="rp-topics">{t("plan.topics")}</h2>
          <ul>
            {topicList.slice(0, 6).map(([id, n]) => (
              <li key={id}><a href={routes.lesson(id)}>{name(id)} · {n}</a></li>
            ))}
            {topicList.length > 6 && <li><span>{t("plan.moreTopics", { n: topicList.length - 6 })}</span></li>}
          </ul>
        </section>
      )}
      <p className="pr-muted rp-how">{t("plan.how")}</p>
    </div>
  );
}
