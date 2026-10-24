// Small HTTP helpers shared by the server routes: JSON responses, errors, cookies, request checks.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** API responses are never cached by the CDN or the browser: they hold learner data or practice tests. */
const NO_STORE = { "Cache-Control": "private, no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE, ...headers } });
}

export function noContent(headers: Record<string, string> = {}, cookies: string[] = []): Response {
  const h = new Headers({ ...NO_STORE, ...headers });
  for (const c of cookies) h.append("Set-Cookie", c);
  return new Response(null, { status: 204, headers: h });
}

export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, ...NO_STORE });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: { code: e.code, message: e.message } }, e.status, e.headers);
  console.error(e);
  return json({ error: { code: "internal", message: "Internal error" } }, 500);
}

export function parseCookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0) {
      try {
        out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim());
      } catch {
        /* skip a malformed cookie */
      }
    }
  }
  return out;
}

export interface CookieOptions {
  maxAge?: number;
  path?: string;
}

/** HttpOnly (unless `readable`), SameSite=Lax; Secure except on plain-http localhost (local runs and tests). */
export function cookie(request: Request, name: string, value: string, { maxAge, path = "/", readable = false }: CookieOptions & { readable?: boolean } = {}): string {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    readable ? "" : "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    maxAge !== undefined ? `Max-Age=${maxAge}` : "",
  ].filter(Boolean).join("; ");
}

export function clearCookie(request: Request, name: string, path = "/"): string {
  return cookie(request, name, "", { maxAge: 0, path });
}

/**
 * Writes must come from the site itself (CSRF): the Origin header, which browsers always send on
 * cross-site POST/PUT/DELETE, has to match the request's own origin.
 */
export function assertSameOrigin(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  const own = new URL(request.url).origin;
  if (origin !== own) throw new HttpError(403, "bad_origin", "Cross-site request refused");
}

export async function readJson<T>(request: Request, maxBytes = 512 * 1024): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "Request body too large");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "bad_json", "Request body is not valid JSON");
  }
}

/** A path on this site to return to after signing in; anything else falls back to "/". */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
