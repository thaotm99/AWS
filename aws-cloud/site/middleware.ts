import { next } from "@vercel/functions";

// Vercel Routing Middleware: runs before every request when the site is hosted on
// Vercel (never in `astro dev`/`astro preview`). Vercel's own Deployment Protection
// does not cover the production domain on the free Hobby plan, so this keeps the
// whole site, including /api/*.json, behind a password. Set SITE_USER and
// SITE_PASSWORD in the Vercel project; leave them unset to keep the site public.

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
    const decoded = atob(encoded);
    const at = decoded.indexOf(":");
    return at < 0 ? null : { user: decoded.slice(0, at), password: decoded.slice(at + 1) };
  } catch {
    return null;
  }
}

export default function middleware(request: Request): Response {
  const user = process.env.SITE_USER;
  const password = process.env.SITE_PASSWORD;
  if (!user || !password) return next();

  const given = credentials(request);
  if (given && same(given.user, user) && same(given.password, password)) return next();

  return new Response("Cần đăng nhập để xem AWS Thực Chiến.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM, "Content-Type": "text/plain; charset=utf-8" },
  });
}
