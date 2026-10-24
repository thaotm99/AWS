// Sessions: a signed JWT in an HttpOnly cookie ({ sub, sid, exp }) plus a row in `sessions`, so a
// session can be revoked (sign out, "sign out other devices", account deletion). The middleware only
// checks the signature and expiry; API routes also check the row.
import { config } from "../config";
import { one, query } from "../db";
import { HttpError, clearCookie, cookie, parseCookies } from "../http";
import { SESSION_COOKIE, SESSION_DAYS, signToken, verifySessionToken } from "./token";

export { SESSION_COOKIE };

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  currentCertId: string | null;
}

/** Creates the session row and returns the Set-Cookie header for it. */
export async function startSession(request: Request, userId: string): Promise<string> {
  const sid = crypto.randomUUID();
  await query(
    `insert into sessions (id, user_id, user_agent, expires_at) values ($1, $2, $3, now() + make_interval(days => $4))`,
    [sid, userId, (request.headers.get("user-agent") ?? "").slice(0, 300), SESSION_DAYS],
  );
  const token = await signToken(config.sessionSecret(), { sid }, userId, `${SESSION_DAYS}d`);
  return cookie(request, SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86_400 });
}

export function endSessionCookie(request: Request): string {
  return clearCookie(request, SESSION_COOKIE);
}

export interface CurrentSession {
  user: User;
  sid: string;
}

/** The signed-in user of this request, checked against the session row; null when signed out. */
export async function currentSession(request: Request): Promise<CurrentSession | null> {
  const claims = await verifySessionToken(config.sessionSecret(), parseCookies(request)[SESSION_COOKIE]);
  if (!claims) return null;
  const row = await one<{ id: string; email: string; name: string | null; picture: string | null; current_cert_id: string | null }>(
    `update sessions s set last_seen_at = now()
       from users u
      where s.id = $1 and s.user_id = $2 and u.id = s.user_id and s.revoked_at is null and s.expires_at > now()
     returning u.id, u.email, u.name, u.picture, u.current_cert_id`,
    [claims.sid, claims.sub],
  );
  if (!row) return null;
  return { sid: claims.sid, user: { id: row.id, email: row.email, name: row.name, picture: row.picture, currentCertId: row.current_cert_id } };
}

export async function requireSession(request: Request): Promise<CurrentSession> {
  const session = await currentSession(request);
  if (!session) throw new HttpError(401, "signed_out", "Sign in to continue");
  return session;
}

export async function revokeSession(sid: string): Promise<void> {
  await query(`update sessions set revoked_at = now() where id = $1 and revoked_at is null`, [sid]);
}
