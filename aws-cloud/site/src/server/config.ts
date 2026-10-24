// Server settings, read from the environment on first use (never at build time).

export interface OidcEndpoints {
  authUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuers: string[];
}

const GOOGLE: OidcEndpoints = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
  issuers: ["https://accounts.google.com", "accounts.google.com"],
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const config = {
  databaseUrl: () => env("DATABASE_URL"),
  sessionSecret: () => env("SESSION_SECRET"),
  googleClientId: () => env("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => env("GOOGLE_CLIENT_SECRET"),
  /** Production on Vercel; previews and local runs are not. */
  isProduction: () => process.env.VERCEL_ENV === "production",
  /**
   * Sign-in without Google, for local runs, tests and previews only: AUTH_DEV_LOGIN=1 outside production.
   * Production ignores it, so a stray variable can never open the site.
   */
  devLogin: () => env("AUTH_DEV_LOGIN") === "1" && process.env.VERCEL_ENV !== "production",
  /** Google by default; tests point these at a local stand-in (OIDC_AUTH_URL, OIDC_TOKEN_URL, OIDC_JWKS_URL, OIDC_ISSUER). */
  oidc: (): OidcEndpoints => ({
    authUrl: env("OIDC_AUTH_URL") ?? GOOGLE.authUrl,
    tokenUrl: env("OIDC_TOKEN_URL") ?? GOOGLE.tokenUrl,
    jwksUrl: env("OIDC_JWKS_URL") ?? GOOGLE.jwksUrl,
    issuers: env("OIDC_ISSUER") ? [env("OIDC_ISSUER")!] : GOOGLE.issuers,
  }),
};

/** Accounts are on when the database, the session secret and a way to sign in are all configured. */
export function accountsEnabled(): boolean {
  return Boolean(config.databaseUrl() && config.sessionSecret() && ((config.googleClientId() && config.googleClientSecret()) || config.devLogin()));
}
