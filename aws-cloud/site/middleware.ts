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
//
// SITE_PROTECT narrows the lock to some paths: a comma-separated list of globs such as
// "/practice/**, **/quiz/**" (`*` stays inside one path segment, `**` crosses them).
// Unset or empty locks the whole site. /api/** is always added, because the practice
// pages load their question data from there.

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

/** Turns one glob into an anchored regex over the path without its leading slash. */
function globToRegExp(glob: string): RegExp {
  const g = glob.trim().replace(/^\/+/, "");
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      const before = i === 0 || g[i - 1] === "/";
      const after = g[i + 2] === "/" || i + 2 === g.length;
      i++;
      if (before && g[i + 1] === "/") { re += "(?:.*/)?"; i++; }        // "**/" : any leading dirs, or none
      else if (before && after && re.endsWith("/")) re = re.slice(0, -1) + "(?:/.*)?"; // "/**" at the end: the dir itself too
      else re += ".*";
    } else if (c === "*") re += "[^/]*";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "i");
}

function protectedPaths(): RegExp[] | null {
  const list = (process.env.SITE_PROTECT ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return list.length ? [...list, "/api/**"].map(globToRegExp) : null;
}

/**
 * null rules = the whole site. Matches the decoded path, ignoring case and a trailing slash, so
 * /practice, /Practice/ and /%70ractice/ are all caught. A path that will not decode is locked.
 */
function isProtected(pathname: string, rules: RegExp[] | null): boolean {
  if (!rules) return true;
  let path: string;
  try {
    path = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return true;
  }
  const trimmed = path.replace(/\/+$/, "");
  return rules.some((r) => r.test(path) || r.test(trimmed) || r.test(trimmed + "/"));
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

  const rules = protectedPaths();
  if (!isProtected(new URL(request.url).pathname, rules)) return next();

  const given = credentials(request);
  if (given && same(given.user, user) && same(given.password, password)) return next();

  return new Response("Cần đăng nhập để xem AWS Thực Chiến.", {
    status: 401,
    headers: {
      "WWW-Authenticate": REALM,
      "Content-Type": "text/plain; charset=utf-8",
      // Says whether SITE_PROTECT reached this deployment, and from which commit it was built
      // (VERCEL_GIT_COMMIT_SHA is a Vercel system variable). No secrets: only the rule count.
      "X-Site-Auth": `${rules ? `paths(${rules.length - 1})` : "all"}; build=${(process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown").slice(0, 7)}`,
    },
  });
}
