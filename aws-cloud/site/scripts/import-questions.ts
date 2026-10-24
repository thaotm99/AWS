// Copies the practice tests from the repo (solution-architect-aws/ quiz HTML and translations) into
// Postgres, for every certification in PracticeCatalog's CERTIFICATIONS. Run from aws-cloud/site after
// `npm run db:migrate`, with a role allowed to write the question tables:
//   DATABASE_URL=postgres://… npm run db:import
// Idempotent: rows are upserted; a question removed from the repo is reported, not deleted (attempts
// keep pointing at it).
import { CERTIFICATIONS, PracticeCatalog, practiceCatalog } from "../src/modules/practice/content/PracticeCatalog";
import { learnLinks } from "../src/data/question-lessons";
import { closeDb, query, transaction } from "../src/server/db";

let total = 0;
try {
  for (const config of CERTIFICATIONS) {
    const cert = practiceCatalog.getCertification(config.id);
    const domains = config.domains ?? [];
    const topics = config.topics?.() ?? [];
    const examIdOf = new Map(cert.exams.map((e) => [e.number, e.id]));

    await transaction(async (db) => {
      await db.query(
        `insert into certifications (id, code, provider, name, level, minutes, question_count, passing_score)
         values ($1, $2, 'aws', $3, $4, $5, $6, $7)
         on conflict (id) do update set code = excluded.code, name = excluded.name, level = excluded.level,
           minutes = excluded.minutes, question_count = excluded.question_count, passing_score = excluded.passing_score`,
        [cert.id, cert.code, cert.name, cert.level, cert.minutes, cert.questionCount, cert.passingScore],
      );
      for (const [i, d] of domains.entries()) {
        await db.query(
          `insert into cert_domains (cert_id, id, position, name, weight) values ($1, $2, $3, $4, $5)
           on conflict (cert_id, id) do update set position = excluded.position, name = excluded.name, weight = excluded.weight`,
          [cert.id, String(i), i, d.name, d.weight],
        );
      }

      const seen = new Set<string>();
      for (const summary of cert.exams) {
        await db.query(
          `insert into practice_sets (cert_id, id, number, title, question_count, multi_select_count) values ($1, $2, $3, $4, $5, $6)
           on conflict (cert_id, id) do update set number = excluded.number, title = excluded.title,
             question_count = excluded.question_count, multi_select_count = excluded.multi_select_count`,
          [cert.id, summary.id, summary.number, summary.title, summary.questionCount, summary.multiSelectCount],
        );
        const en = practiceCatalog.getExam(cert.id, summary.id, "en");
        const vi = practiceCatalog.getExam(cert.id, summary.id, "vi");
        for (const [i, q] of en.questions.entries()) {
          const t = vi.questions[i];
          if (t?.id !== q.id) throw new Error(`${summary.id}: Vietnamese question ${i + 1} is not ${q.id}`);
          const domain = domains.findIndex((d) => d.name === q.domain);
          seen.add(q.id);
          await db.query(
            `insert into questions (id, cert_id, set_id, position, domain_id, select_count, content_en, content_vi, correct, explanation_en, explanation_vi, learn)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             on conflict (id) do update set cert_id = excluded.cert_id, set_id = excluded.set_id, position = excluded.position,
               domain_id = excluded.domain_id, select_count = excluded.select_count, content_en = excluded.content_en,
               content_vi = excluded.content_vi, correct = excluded.correct, explanation_en = excluded.explanation_en,
               explanation_vi = excluded.explanation_vi, learn = excluded.learn`,
            [
              q.id, cert.id, summary.id, q.number, domain >= 0 ? String(domain) : null, q.selectCount,
              JSON.stringify({ promptHtml: q.promptHtml, options: q.options }),
              t.translated ? JSON.stringify({ promptHtml: t.promptHtml, options: t.options }) : null,
              JSON.stringify(q.correct), q.explanationHtml, t.translated ? t.explanationHtml : null,
              JSON.stringify(learnLinks(q.id)),
            ],
          );
        }
      }
      total += seen.size;

      // Per-lesson question sets, in study-path order; rebuilt each time.
      await db.query(`delete from question_topics where cert_id = $1`, [cert.id]);
      await db.query(`delete from cert_topics where cert_id = $1`, [cert.id]);
      for (const [p, topic] of topics.entries()) {
        await db.query(`insert into cert_topics (cert_id, id, position, title_vi, title_en) values ($1, $2, $3, $4, $5)`, [
          cert.id, topic.id, p, topic.title, topic.titleEn ?? topic.title,
        ]);
        for (const [i, ref] of topic.refs.entries()) {
          const [, n, m] = /^exam(\d+)_q(\d+)$/.exec(ref) ?? [];
          const examId = examIdOf.get(Number(n));
          const q = examId ? practiceCatalog.getExam(cert.id, examId).questions[Number(m) - 1] : undefined;
          if (!q) throw new Error(`${topic.id}: ${ref} not found`);
          await db.query(`insert into question_topics (cert_id, topic_id, position, question_id) values ($1, $2, $3, $4)`, [cert.id, topic.id, i + 1, q.id]);
        }
      }

      const stale = await db.query<{ id: string }>(`select id from questions where cert_id = $1 and not (id = any($2))`, [cert.id, [...seen]]);
      for (const { id } of stale.rows) console.warn(`${cert.id}: question ${id} is no longer in the repo (kept)`);
    });
    console.log(`${cert.id}: ${cert.exams.length} practice tests, ${topics.length} lesson sets imported`);
  }
  const [{ n }] = await query<{ n: number }>(`select count(*)::int as n from questions`);
  console.log(`${total} questions imported; ${n} in the database (${PracticeCatalog.LOCALES.join(", ")})`);
} finally {
  await closeDb();
}
