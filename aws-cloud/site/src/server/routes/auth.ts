// /auth/*: sign in with Google, sign in for local runs (dev login), sign out.
import { config } from "../config";
import { query } from "../db";
import { HttpError, clearCookie, cookie, json, noContent, parseCookies, readJson, redirect, safeReturnPath } from "../http";
import type { Route } from "../router";
import { authorizationUrl, finishSignIn, newOAuthStart, type GoogleProfile } from "../auth/google";
import { currentSession, endSessionCookies, revokeSession, startSession } from "../auth/session";
import { signToken, verifyToken } from "../auth/token";

/** Holds state, nonce, PKCE verifier and the return path between /auth/login and /auth/callback. */
const OAUTH_COOKIE = "cl_oauth";
const OAUTH_PATH = "/auth/";

function loginError(code: string, returnTo = "/"): Response {
  const q = new URLSearchParams({ error: code });
  if (returnTo !== "/") q.set("return", returnTo);
  return redirect(`/login/?${q}`);
}

/** Creates the user on first sign-in and refreshes name and picture afterwards. */
async function upsertUser(profile: GoogleProfile): Promise<void> {
  const taken = await query<{ id: string }>(`select id from users where email = $1 and id <> $2`, [profile.email, profile.sub]);
  if (taken.length) throw new HttpError(409, "email_in_use", "This email belongs to another account");
  const upsert = () =>
    query(
      `insert into users (id, email, name, picture) values ($1, $2, $3, $4)
       on conflict (id) do update set email = excluded.email, name = excluded.name, picture = excluded.picture, last_login_at = now()`,
      [profile.sub, profile.email, profile.name, profile.picture],
    );
  try {
    await upsert();
  } catch (e) {
    // Two first sign-ins of the same account at once (two tabs): the other insert won the email's
    // unique index; the row exists now, so the retry takes the update path.
    if ((e as { code?: string }).code !== "23505") throw e;
    await upsert();
  }
}

async function signIn(request: Request, profile: GoogleProfile, returnTo: string, extraCookies: string[] = []): Promise<Response> {
  await upsertUser(profile);
  const session = await startSession(request, profile.sub);
  await query(`insert into audit_log (user_id, action) values ($1, 'auth.login')`, [profile.sub]);
  return redirect(returnTo, [...extraCookies, ...session]);
}

export const authRoutes: Route[] = [
  {
    // Which sign-in methods this deployment offers; the login page shows only those.
    method: "GET",
    pattern: "/auth/methods",
    handler: async () => json({ google: Boolean(config.googleClientId() && config.googleClientSecret()), dev: config.devLogin() }),
  },
  {
    method: "GET",
    pattern: "/auth/login",
    handler: async ({ request, url }) => {
      const returnTo = safeReturnPath(url.searchParams.get("return"));
      const start = newOAuthStart();
      let location: string;
      try {
        location = await authorizationUrl(request, start);
      } catch (e) {
        if (e instanceof HttpError) return loginError(e.code, returnTo);
        throw e;
      }
      const token = await signToken(config.sessionSecret(), { ...start, returnTo }, "oauth", "10m");
      return redirect(location, [cookie(request, OAUTH_COOKIE, token, { maxAge: 600, path: OAUTH_PATH })]);
    },
  },
  {
    method: "GET",
    pattern: "/auth/callback",
    handler: async ({ request, url }) => {
      const saved = await verifyToken(config.sessionSecret(), parseCookies(request)[OAUTH_COOKIE]);
      const returnTo = safeReturnPath(typeof saved?.returnTo === "string" ? saved.returnTo : "/");
      const clear = clearCookie(request, OAUTH_COOKIE, OAUTH_PATH);
      if (url.searchParams.get("error")) return loginError("cancelled", returnTo);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!saved || !code || !state || state !== saved.state) return loginError("expired", returnTo);
      try {
        const profile = await finishSignIn(request, code, { state, nonce: String(saved.nonce), verifier: String(saved.verifier) });
        return await signIn(request, profile, returnTo, [clear]);
      } catch (e) {
        if (e instanceof HttpError) return loginError(e.code, returnTo);
        throw e;
      }
    },
  },
  {
    // Local runs, tests and previews only (AUTH_DEV_LOGIN=1, never in production).
    method: "POST",
    pattern: "/auth/dev-login",
    handler: async ({ request, url }) => {
      if (!config.devLogin()) throw new HttpError(404, "not_found", "Not found");
      const body = await readJson<{ email?: string; name?: string }>(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new HttpError(400, "bad_email", "Enter an email address");
      // fetch() follows redirects, so answer with JSON and let the page navigate.
      const profile = { sub: `dev:${email}`, email, name: body.name?.trim() || email.split("@")[0], picture: null };
      const response = await signIn(request, profile, "/");
      const res = json({ ok: true, return: safeReturnPath(url.searchParams.get("return")) });
      for (const c of response.headers.getSetCookie()) res.headers.append("Set-Cookie", c);
      return res;
    },
  },
  {
    method: "POST",
    pattern: "/auth/logout",
    handler: async ({ request }) => {
      const session = await currentSession(request);
      if (session) await revokeSession(session.sid);
      return noContent({}, endSessionCookies(request));
    },
  },
];
