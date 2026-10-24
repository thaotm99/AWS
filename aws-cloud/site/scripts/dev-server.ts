// Local stand-in for Vercel: serves the built site (dist/), runs middleware.ts in front of every request
// and sends /api/* and /auth/* to the server router, as vercel.json's rewrites do. The static practice
// JSON still in dist/api is served as files first, like Vercel's filesystem-before-rewrites order.
// Usage: npm run build && DATABASE_URL=… SESSION_SECRET=… AUTH_DEV_LOGIN=1 npx tsx scripts/dev-server.ts [port]
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import middleware from "../middleware";
import { handle } from "../src/server/routes/index";

const root = new URL("../dist/", import.meta.url).pathname;
const port = Number(process.argv[2] ?? process.env.PORT ?? 4322);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".txt": "text/plain",
};

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v); else if (v) for (const x of v) headers.append(k, x);
  const body = chunks.length && req.method !== "GET" && req.method !== "HEAD" ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${req.headers.host ?? `localhost:${port}`}${req.url}`, { method: req.method, headers, body });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** dist file for a path, with Astro's directory pages (/x/ → /x/index.html) and trailingSlash redirects. */
async function staticFile(pathname: string): Promise<Response | null> {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidates = rel.endsWith("/") ? [join(rel, "index.html")] : [rel, join(rel, "index.html")];
  for (const c of candidates) {
    const file = join(root, c);
    if (!file.startsWith(root)) return null;
    const s = await stat(file).catch(() => null);
    if (!s?.isFile()) continue;
    if (!rel.endsWith("/") && c.endsWith("index.html") && c !== rel) return new Response(null, { status: 308, headers: { Location: `${pathname}/` } });
    return new Response(await readFile(file), { headers: { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" } });
  }
  return null;
}

createServer(async (req, res) => {
  try {
    const request = await toRequest(req);
    const gate = await middleware(request);
    // next() from @vercel/functions answers with an "x-middleware-next" header: carry on.
    if (!gate.headers.has("x-middleware-next")) return await send(res, gate);
    const { pathname } = new URL(request.url);
    const file = await staticFile(pathname);
    if (file) return await send(res, file);
    if (pathname.startsWith("/api/") || pathname === "/api" || pathname.startsWith("/auth/")) return await send(res, await handle(request));
    const notFound = await readFile(join(root, "404.html")).catch(() => "Not found");
    return await send(res, new Response(notFound, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }));
  } catch (e) {
    console.error(e);
    res.writeHead(500).end("Internal error");
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
