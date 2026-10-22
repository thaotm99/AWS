import { next } from "@vercel/functions";

// Vercel Routing Middleware: runs before every request when the site is hosted on
// Vercel (never in `astro dev`/`astro preview`). Vercel's own Deployment Protection
// does not cover the production domain on the free Hobby plan, so this keeps the
// whole site, including /api/*.json, behind a password. Set SITE_USER and
// SITE_PASSWORD in the Vercel project.
//
// Fails closed: one of the two set without the other is a misconfiguration (500), and
// production with neither set is refused too (500) unless SITE_PUBLIC=1 says the site is
// meant to be public. Preview/development deployments with neither set stay public.

const REALM = 'Basic realm="AWS Thuc Chien", charset="UTF-8"';

/** Compares without stopping at the first different character. */
function same(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function credentials(request: Request): { user: string; password: string } | null {
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  try {
    // atob gives one char per byte; decode those bytes as UTF-8 so non-ASCII passwords match.
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
    const at = decoded.indexOf(":");
    return at < 0 ? null : { user: decoded.slice(0, at), password: decoded.slice(at + 1) };
  } catch {
    return null;
  }
}

function misconfigured(): Response {
  return new Response("Site auth misconfigured", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export default function middleware(request: Request): Response {
  const user = process.env.SITE_USER;
  const password = process.env.SITE_PASSWORD;
  if (!user !== !password) return misconfigured();
  if (!user || !password) {
    if (process.env.SITE_PUBLIC === "1" || process.env.VERCEL_ENV !== "production") return next();
    return misconfigured();
  }

  const given = credentials(request);
  if (given && same(given.user, user) && same(given.password, password)) return next();

  return new Response("Cần đăng nhập để xem AWS Thực Chiến.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM, "Content-Type": "text/plain; charset=utf-8" },
  });
}
