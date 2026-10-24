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

/** A count box (due today, then one per Leitner box). */
const box = "flex flex-col gap-1 rounded-[18px] border px-4 py-3.5 text-[0.8125rem] text-muted";
const boxNumber = "font-mono text-[1.75rem] leading-[1.2] text-ink";
/** Topic chip in the "topics in the book" list. */
const topicChip = "inline-flex min-h-[34px] items-center rounded-[17px] border border-line bg-surface px-3 text-[0.8125rem] text-ink no-underline";
const actionBtn = "min-h-[46px] px-4.5 py-0 no-underline";
const cardTitle = "mx-0 mt-0 mb-3 text-[0.95rem]";

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
      getApiClient().get<SkillMapData>(`/certifications/${certId}/skills`).catch(() => null),
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
    <div className="mb-10 flex flex-col gap-4.5">
      <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
        <div className={`${box} border-accent bg-accent-soft`}>
          <span>{t("plan.due")}</span>
          <b className={boxNumber}>{due}</b>
          <small>{due ? t("plan.minutes", { n: Math.max(1, Math.round(due * MINUTES_PER_QUESTION)) }) : t("plan.nothingDue")}</small>
        </div>
        {boxes.map((n, i) => (
          <div key={i} className={`${box} border-line bg-surface`}>
            <span>{t("plan.box", { n: i + 1, days: Review.BOX_DAYS[i] })}</span>
            <b className={boxNumber}>{n}</b>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {due > 0 && <a className={`btn primary ${actionBtn}`} href={routes.reviewSession(certId)}>{t("plan.startDue", { n: Math.min(due, Review.ROUND) })}</a>}
        <a className={`${due > 0 ? "btn" : "btn primary"} ${actionBtn}`} href={routes.reviewSession(certId, true)}>{t("plan.startAll", { n: Math.min(list.length, Review.ROUND) })}</a>
        <span className="pr-muted">{t("plan.graduated", { n: left30 })}</span>
      </div>

      <section className="rounded-[20px] border border-line bg-surface px-4.5 py-4" aria-labelledby="rp-week">
        <h2 className={cardTitle} id="rp-week">{t("plan.week")}</h2>
        <div className="grid h-[130px] grid-cols-7 items-end gap-2" role="img" aria-label={days.map((d) => `${weekday(d.day)}: ${d.n}`).join(", ")}>
          {days.map((d) => (
            <div key={d.day} className="group flex h-full flex-col items-center justify-end gap-1.5 text-[0.75rem] text-muted data-today:font-semibold data-today:text-ink" data-today={d.day === today || undefined} aria-hidden="true">
              <span>{d.n}</span>
              <i className="w-full max-w-12 rounded-t-[10px] rounded-b-[2px] bg-[color-mix(in_srgb,var(--accent)_50%,var(--line))] data-empty:h-[3px] data-empty:bg-line group-data-today:not-data-empty:bg-accent" style={{ height: d.n ? `${(d.n / max) * 100}%` : undefined }} data-empty={!d.n || undefined} />
              <span>{weekday(d.day)}</span>
            </div>
          ))}
        </div>
      </section>

      {topicList.length > 0 && (
        <section aria-labelledby="rp-topics">
          <h2 className={cardTitle} id="rp-topics">{t("plan.topics")}</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {topicList.slice(0, 6).map(([id, n]) => (
              <li key={id}><a className={topicChip} href={routes.lesson(id)}>{name(id)} · {n}</a></li>
            ))}
            {topicList.length > 6 && <li><span className={topicChip}>{t("plan.moreTopics", { n: topicList.length - 6 })}</span></li>}
          </ul>
        </section>
      )}
      <p className="pr-muted m-0 text-[0.8125rem]">{t("plan.how")}</p>
    </div>
  );
}
