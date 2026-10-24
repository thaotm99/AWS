// /api/me: the signed-in learner, the certifications they study, their sessions, account deletion.
import { one, query, transaction } from "../db";
import { HttpError, json, noContent, readJson } from "../http";
import type { Route } from "../router";
import { endSessionCookies, requireSession } from "../auth/session";

interface UserCertRow {
  cert_id: string;
  status: string;
  exam_date: string | null;
  target_score: number | null;
  started_at: Date;
  passed_at: Date | null;
}

const STATUSES = ["studying", "paused", "passed"];

function userCert(r: UserCertRow) {
  return { certId: r.cert_id, status: r.status, examDate: r.exam_date, targetScore: r.target_score, startedAt: r.started_at, passedAt: r.passed_at };
}

async function certExists(certId: string): Promise<void> {
  if (!(await one(`select 1 from certifications where id = $1`, [certId]))) throw new HttpError(404, "unknown_cert", "Unknown certification");
}

export const meRoutes: Route[] = [
  {
    method: "GET",
    pattern: "/api/me",
    handler: async ({ request }) => {
      const { user } = await requireSession(request);
      const certs = await query<UserCertRow>(
        `select cert_id, status, to_char(exam_date, 'YYYY-MM-DD') as exam_date, target_score, started_at, passed_at
           from user_certs where user_id = $1 order by started_at`,
        [user.id],
      );
      return json({ user, certs: certs.map(userCert) });
    },
  },
  {
    // The certification the site shows; starts studying it if the learner had not yet.
    method: "PUT",
    pattern: "/api/me/current-cert",
    handler: async ({ request }) => {
      const { user } = await requireSession(request);
      const { certId } = await readJson<{ certId?: string }>(request);
      if (typeof certId !== "string") throw new HttpError(400, "bad_cert", "certId is required");
      await certExists(certId);
      await transaction(async (db) => {
        await db.query(`update users set current_cert_id = $2 where id = $1`, [user.id, certId]);
        await db.query(`insert into user_certs (user_id, cert_id) values ($1, $2) on conflict do nothing`, [user.id, certId]);
      });
      return noContent();
    },
  },
  {
    method: "PUT",
    pattern: "/api/me/certs/:cert",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const body = await readJson<{ status?: string; examDate?: string | null; targetScore?: number | null }>(request);
      await certExists(params.cert);
      if (body.status !== undefined && !STATUSES.includes(body.status)) throw new HttpError(400, "bad_status", "Unknown status");
      if (body.examDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(body.examDate)) throw new HttpError(400, "bad_date", "examDate must be YYYY-MM-DD");
      if (body.targetScore != null && !(Number.isInteger(body.targetScore) && body.targetScore >= 100 && body.targetScore <= 1000)) {
        throw new HttpError(400, "bad_score", "targetScore must be 100–1000");
      }
      const row = await one<UserCertRow>(
        `insert into user_certs (user_id, cert_id, status, exam_date, target_score, passed_at)
         values ($1, $2, coalesce($3, 'studying'), $4::date, $5, case when $3 = 'passed' then now() end)
         on conflict (user_id, cert_id) do update set
           status = coalesce($3, user_certs.status),
           exam_date = case when $6 then $4::date else user_certs.exam_date end,
           target_score = case when $7 then $5 else user_certs.target_score end,
           passed_at = case when $3 = 'passed' then coalesce(user_certs.passed_at, now()) when $3 is not null then null else user_certs.passed_at end
         returning cert_id, status, to_char(exam_date, 'YYYY-MM-DD') as exam_date, target_score, started_at, passed_at`,
        [user.id, params.cert, body.status ?? null, body.examDate ?? null, body.targetScore ?? null, "examDate" in body, "targetScore" in body],
      );
      return json(userCert(row!));
    },
  },
  {
    method: "GET",
    pattern: "/api/me/sessions",
    handler: async ({ request }) => {
      const { user, sid } = await requireSession(request);
      const rows = await query<{ id: string; user_agent: string | null; created_at: Date; last_seen_at: Date }>(
        `select id, user_agent, created_at, last_seen_at from sessions
          where user_id = $1 and revoked_at is null and expires_at > now() order by last_seen_at desc`,
        [user.id],
      );
      return json(rows.map((r) => ({ id: r.id, userAgent: r.user_agent, createdAt: r.created_at, lastSeenAt: r.last_seen_at, current: r.id === sid })));
    },
  },
  {
    method: "POST",
    pattern: "/api/me/sessions/revoke-others",
    handler: async ({ request }) => {
      const { user, sid } = await requireSession(request);
      await query(`update sessions set revoked_at = now() where user_id = $1 and id <> $2 and revoked_at is null`, [user.id, sid]);
      return noContent();
    },
  },
  {
    // Deletes the account and everything stored for it; the body must repeat the account's email.
    method: "DELETE",
    pattern: "/api/me",
    handler: async ({ request }) => {
      const { user } = await requireSession(request);
      const { email } = await readJson<{ email?: string }>(request);
      if (String(email ?? "").trim().toLowerCase() !== user.email) throw new HttpError(400, "email_mismatch", "Type the account's email to confirm");
      await transaction(async (db) => {
        await db.query(`delete from users where id = $1`, [user.id]);
        await db.query(`insert into audit_log (user_id, action) values ($1, 'account.delete')`, [user.id]);
      });
      return noContent({}, endSessionCookies(request));
    },
  },
];
