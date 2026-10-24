// Google sign-in: OAuth 2.0 authorization code flow with PKCE, then the ID token is verified against
// Google's keys (issuer, audience, expiry, nonce, verified email). Endpoints come from config.oidc()
// so tests can use a local stand-in.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { config } from "../config";
import { HttpError } from "../http";

export interface OAuthStart {
  state: string;
  nonce: string;
  verifier: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function challenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export function newOAuthStart(): OAuthStart {
  return { state: randomToken(), nonce: randomToken(), verifier: randomToken(48) };
}

export function redirectUri(request: Request): string {
  return new URL("/auth/callback", request.url).toString();
}

export async function authorizationUrl(request: Request, start: OAuthStart): Promise<string> {
  const clientId = config.googleClientId();
  if (!clientId) throw new HttpError(503, "auth_not_configured", "Google sign-in is not configured");
  const url = new URL(config.oidc().authUrl);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state: start.state,
    nonce: start.nonce,
    code_challenge: await challenge(start.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

let jwks: { url: string; get: JWTVerifyGetKey } | undefined;

function keys(): JWTVerifyGetKey {
  const url = config.oidc().jwksUrl;
  if (jwks?.url !== url) jwks = { url, get: createRemoteJWKSet(new URL(url)) };
  return jwks.get;
}

/** Exchanges the authorization code and returns the verified profile. */
export async function finishSignIn(request: Request, code: string, start: OAuthStart): Promise<GoogleProfile> {
  const clientId = config.googleClientId();
  const clientSecret = config.googleClientSecret();
  if (!clientId || !clientSecret) throw new HttpError(503, "auth_not_configured", "Google sign-in is not configured");
  const res = await fetch(config.oidc().tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
      code_verifier: start.verifier,
    }),
  });
  if (!res.ok) throw new HttpError(401, "token_exchange_failed", `Token endpoint returned ${res.status}`);
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new HttpError(401, "no_id_token", "No ID token in the token response");

  const { payload } = await jwtVerify(idToken, keys(), { issuer: config.oidc().issuers, audience: clientId }).catch(() => {
    throw new HttpError(401, "bad_id_token", "ID token could not be verified");
  });
  if (payload.nonce !== start.nonce) throw new HttpError(401, "bad_nonce", "Sign-in response does not match this request");
  if (payload.email_verified !== true || typeof payload.email !== "string") throw new HttpError(403, "email_unverified", "The Google account's email is not verified");
  if (typeof payload.sub !== "string") throw new HttpError(401, "bad_id_token", "ID token has no subject");
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
