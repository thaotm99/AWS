// Sign-in and sessions against a real Postgres and a local stand-in for Google's OpenID endpoints.
// Needs DATABASE_URL (a disposable database with db/migrations applied); skipped without it.
// Run: DATABASE_URL=postgres://… npx tsx src/server/auth.test.ts
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

if (!process.env.DATABASE_URL) {
  console.log("auth.test: skipped (no DATABASE_URL)");
  process.exit(0);
}

const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256", use: "sig" };
const ISSUER = "https://issuer.test";
let nextClaims: Record<string, unknown> = {};
let lastAuthQuery: URLSearchParams | undefined;

// Stand-in for Google: /certs serves the public key, /token returns an ID token for nextClaims.
const idp = createServer(async (req, res) => {
  if (req.url === "/certs") return res.end(JSON.stringify({ keys: [jwk] }));
  if (req.url === "/token") {
    let body = "";
    for await (const c of req) body += c;
    const form = new URLSearchParams(body);
    assert.equal(form.get("code"), "good-code");
    assert.ok(form.get("code_verifier"), "PKCE verifier is sent");
    const token = await new SignJWT({ email_verified: true, ...nextClaims, nonce: lastAuthQuery?.get("nonce") })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(ISSUER)
      .setAudience("client-1")
      .setSubject(String(nextClaims.sub ?? "g-1"))
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ id_token: token }));
  }
  res.writeHead(404).end();
}).listen(0);
const idpUrl = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`;

Object.assign(process.env, {
  SESSION_SECRET: "test-secret-test-secret-test-secret!",
  GOOGLE_CLIENT_ID: "client-1",
  GOOGLE_CLIENT_SECRET: "secret-1",
  OIDC_AUTH_URL: `${idpUrl}/auth`,
  OIDC_TOKEN_URL: `${idpUrl}/token`,
  OIDC_JWKS_URL: `${idpUrl}/certs`,
  OIDC_ISSUER: ISSUER,
});
const { handle } = await import("./routes/index");
const { closeDb, query } = await import("./db");

const SITE = "http://site.test";
const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

async function signIn(claims: Record<string, unknown>, returnTo = "/practice/"): Promise<Response> {
  nextClaims = claims;
  const start = await handle(new Request(`${SITE}/auth/login?return=${encodeURIComponent(returnTo)}`));
  assert.equal(start.status, 302);
  const to = new URL(start.headers.get("location")!);
  lastAuthQuery = to.searchParams;
  assert.equal(to.searchParams.get("code_challenge_method"), "S256");
  assert.equal(to.searchParams.get("redirect_uri"), `${SITE}/auth/callback`);
  return handle(
    new Request(`${SITE}/auth/callback?code=good-code&state=${to.searchParams.get("state")}`, { headers: { cookie: cookiesOf(start) } }),
  );
}

try {
  await query(`delete from users where id like 'test-%'`);

  // A verified Google account signs in, lands on the page it asked for, and /api/me knows it.
  const ok = await signIn({ sub: "test-1", email: "Ada@Example.com", name: "Ada" });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get("location"), "/practice/");
  const session = ok.headers.getSetCookie().find((c) => c.startsWith("cl_session="))!;
  assert.match(session, /HttpOnly/);
  assert.match(session, /SameSite=Lax/);
  const me = await handle(new Request(`${SITE}/api/me`, { headers: { cookie: cookiesOf(ok) } }));
  assert.equal(me.status, 200);
  assert.equal(me.headers.get("cache-control"), "private, no-store");
  assert.equal(((await me.json()) as { user: { email: string } }).user.email, "ada@example.com");

  // Unverified email: refused, no session.
  const unverified = await signIn({ sub: "test-2", email: "bob@example.com", email_verified: false });
  assert.equal(unverified.headers.get("location"), "/login/?error=email_unverified&return=%2Fpractice%2F");
  assert.ok(!unverified.headers.getSetCookie().some((c) => c.startsWith("cl_session=") && !c.includes("Max-Age=0")));

  // A callback whose state does not match the login cookie is refused.
  const start = await handle(new Request(`${SITE}/auth/login`));
  const forged = await handle(new Request(`${SITE}/auth/callback?code=good-code&state=other`, { headers: { cookie: cookiesOf(start) } }));
  assert.equal(forged.headers.get("location"), "/login/?error=expired");

  // An open redirect in ?return= falls back to "/".
  const evil = await signIn({ sub: "test-1", email: "ada@example.com" }, "//evil.example/");
  assert.equal(evil.headers.get("location"), "/");

  // Signing out revokes the session: the old cookie no longer works.
  const cookie = cookiesOf(ok);
  const out = await handle(new Request(`${SITE}/auth/logout`, { method: "POST", headers: { cookie, origin: SITE } }));
  assert.equal(out.status, 204);
  const after = await handle(new Request(`${SITE}/api/me`, { headers: { cookie } }));
  assert.equal(after.status, 401);

  // Account deletion needs the email typed again and removes the user.
  const again = await signIn({ sub: "test-1", email: "ada@example.com" });
  const c2 = cookiesOf(again);
  const wrong = await handle(new Request(`${SITE}/api/me`, { method: "DELETE", headers: { cookie: c2, origin: SITE }, body: JSON.stringify({ email: "x@y.z" }) }));
  assert.equal(wrong.status, 400);
  const del = await handle(new Request(`${SITE}/api/me`, { method: "DELETE", headers: { cookie: c2, origin: SITE }, body: JSON.stringify({ email: "ADA@example.com" }) }));
  assert.equal(del.status, 204);
  assert.equal((await query(`select 1 from users where id = 'test-1'`)).length, 0);

  console.log("auth.test: ok");
} finally {
  await query(`delete from users where id like 'test-%'`);
  await closeDb();
  idp.close();
}
