import type { Attempt } from "./types";

/** Which exam domain and which lesson topic each question belongs to: GET /certifications/:cert/skills. */
export interface SkillMapData {
  /** Exam domains (English names, as in the practice tests) with their share of the exam (0–1). */
  domains: { name: string; weight: number }[];
  /** Question id → [domain index, topic id or null]. */
  questions: Record<string, [number, string | null]>;
  topics: { id: string; title: { vi: string; en: string } }[];
}

export interface DomainSkill {
  name: string;
  weight: number;
  /** Weighted share answered correctly (0–1), or null with no answers yet. */
  accuracy: number | null;
  answered: number;
}

export interface TopicSkill {
  id: string;
  correct: number;
  answered: number;
}

/** Answers lose half their weight every 30 days, so recent practice counts most. */
export const HALF_LIFE_DAYS = 30;
/** Answers older than this are left out. */
export const WINDOW_DAYS = 90;
/** A topic needs this many answered questions before it is ranked. */
export const MIN_TOPIC = 8;
/** An estimated score needs at least this many answers. */
export const MIN_SCORE = 40;

const DAY = 86_400_000;

/**
 * Accuracy per exam domain and per topic from every answer in the last 90 days. A topic counts each
 * question once (its latest answer); a domain counts every answer, weighted by age.
 */
export function skills(attempts: readonly Attempt[], map: SkillMapData, now: number) {
  const sums = map.domains.map(() => ({ w: 0, ok: 0, n: 0 }));
  const latest = new Map<string, { at: string; correct: boolean }>();
  for (const a of attempts) {
    for (const [id, ans] of Object.entries(a.answers)) {
      const q = map.questions[id];
      if (!q || !ans.chosen?.length) continue;
      const at = Date.parse(ans.answeredAt ?? a.updatedAt);
      const age = (now - (Number.isFinite(at) ? at : now)) / DAY;
      if (age > WINDOW_DAYS) continue;
      const w = 0.5 ** (Math.max(0, age) / HALF_LIFE_DAYS);
      const s = sums[q[0]];
      s.w += w;
      s.ok += ans.correct ? w : 0;
      s.n++;
      const seen = latest.get(id);
      if (!seen || (ans.answeredAt ?? "") > seen.at) latest.set(id, { at: ans.answeredAt ?? "", correct: ans.correct });
    }
  }
  const domains: DomainSkill[] = map.domains.map((d, i) => ({ ...d, accuracy: sums[i].w ? sums[i].ok / sums[i].w : null, answered: sums[i].n }));

  const byTopic = new Map<string, TopicSkill>();
  for (const [id, r] of latest) {
    const topic = map.questions[id][1];
    if (!topic) continue;
    const t = byTopic.get(topic) ?? { id: topic, correct: 0, answered: 0 };
    t.answered++;
    t.correct += r.correct ? 1 : 0;
    byTopic.set(topic, t);
  }
  const weakest = [...byTopic.values()]
    .filter((t) => t.answered >= MIN_TOPIC)
    .sort((a, b) => a.correct / a.answered - b.correct / b.answered || b.answered - a.answered);

  // A rough scaled score: domain accuracies weighted by their share of the exam, on 100–1000.
  const known = domains.filter((d) => d.accuracy !== null);
  const total = known.reduce((s, d) => s + d.answered, 0);
  const share = known.reduce((s, d) => s + d.weight, 0);
  const score = total >= MIN_SCORE && share > 0 ? Math.round(100 + 900 * known.reduce((s, d) => s + d.weight * d.accuracy!, 0) / share) : null;
  return { domains, weakest, score, total };
}
