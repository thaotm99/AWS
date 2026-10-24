// One router for every /api and /auth request, so the site needs a single Vercel Function
// (api/index.ts). Vercel rewrites /api/* and /auth/* to that function with the original path in
// `__route`; the local dev server calls handle() directly.
import { assertSameOrigin, errorResponse, HttpError } from "./http";

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Context {
  request: Request;
  url: URL;
  /** Named path segments, e.g. { cert: "saa-c03" } for /api/me/certs/:cert. */
  params: Record<string, string>;
}

export type Handler = (ctx: Context) => Promise<Response>;

export interface Route {
  method: Method;
  pattern: string;
  handler: Handler;
}

interface Compiled extends Route {
  re: RegExp;
  names: string[];
}

function compile(route: Route): Compiled {
  const names: string[] = [];
  const re = route.pattern
    .split("/")
    .map((seg) => {
      // ":name" is one segment; ":name.json" keeps the literal suffix the static API used.
      const m = /^:(\w+)(.*)$/.exec(seg);
      if (!m) return seg.replace(/[.+?^${}()|[\]\\*]/g, "\\$&");
      names.push(m[1]);
      return `([^/]+?)${m[2].replace(/[.+?^${}()|[\]\\*]/g, "\\$&")}`;
    })
    .join("/");
  return { ...route, re: new RegExp(`^${re}$`), names };
}

/** The path the visitor asked for: `__route` after a Vercel rewrite, else the URL's own path. */
export function routePath(url: URL): string {
  const path = url.searchParams.get("__route") ?? url.pathname;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function createRouter(routes: Route[]): (request: Request) => Promise<Response> {
  const compiled = routes.map(compile);
  return async (request) => {
    const url = new URL(request.url);
    const path = routePath(url);
    url.searchParams.delete("__route");
    let pathMatched = false;
    try {
      for (const r of compiled) {
        const m = r.re.exec(path);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== request.method && !(r.method === "GET" && request.method === "HEAD")) continue;
        assertSameOrigin(request);
        const params: Record<string, string> = {};
        r.names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])));
        return await r.handler({ request, url, params });
      }
      throw pathMatched ? new HttpError(405, "method_not_allowed", "Method not allowed") : new HttpError(404, "not_found", "Not found");
    } catch (e) {
      return errorResponse(e);
    }
  };
}
