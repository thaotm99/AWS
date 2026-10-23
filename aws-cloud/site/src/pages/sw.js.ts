import type { APIRoute } from "astro";

// GET /sw.js: the service worker for offline reading. Pages go to the network first, so an online
// reader always gets the current version. Saved pages and their files (hashed names) are kept across
// deploys, so lessons saved for offline reading survive an update; only cached JSON is dropped then.
const VERSION = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

const worker = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = "pages-v1";           // HTML: network first, the saved copy when offline
const ASSETS = "assets-v1";         // /_astro/* (hashed names), icons: cache first
const DATA = "data-" + VERSION;     // JSON and fonts: the saved copy at once, refreshed in the background
const OFFLINE = "/offline/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES)
      .then((c) => c.addAll([OFFLINE, "/"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("data-") && k !== DATA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) || (await cache.match(OFFLINE)) || Response.error();
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  // Module scripts are requested with an Origin header; a copy saved without one must still match.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(DATA);
  const hit = await cache.match(request, { ignoreVary: true });
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit || Response.error());
  if (hit) {
    event.waitUntil(fresh);
    return hit;
  }
  return fresh;
}

// "Save for offline reading": the page sends the lesson's URLs; each page is stored with every file it
// needs (scripts, styles, and the script chunks those import), and progress is reported back.
const ASSET_ATTR = /(?:src|href|component-url|renderer-url|before-hydration-url)="([/]_astro[/][^"]+)"/g;
const JS_IMPORT = /["']([.][/][A-Za-z0-9_.-]+[.]js)["']/g;

async function saveLesson(urls, port) {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const seen = new Set();
  const queue = [];
  let done = 0;
  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(url + " " + response.status);
    const html = await response.clone().text();
    await pages.put(url, response);
    for (const m of html.matchAll(ASSET_ATTR)) if (!seen.has(m[1])) seen.add(m[1]), queue.push(m[1]);
    port.postMessage({ type: "progress", done: ++done, total: urls.length });
  }
  while (queue.length) {
    const path = queue.shift();
    if (await assets.match(path, { ignoreVary: true })) continue;
    const response = await fetch(path);
    if (!response.ok) continue;
    if (path.endsWith(".js")) {
      const code = await response.clone().text();
      for (const m of code.matchAll(JS_IMPORT)) {
        const next = new URL(m[1], self.location.origin + path).pathname;
        if (!seen.has(next)) seen.add(next), queue.push(next);
      }
    }
    await assets.put(path, response);
  }
  port.postMessage({ type: "done", pages: urls.length, files: seen.size });
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "save-lesson" || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil(saveLesson(event.data.urls, port).catch((e) => port.postMessage({ type: "error", message: String(e) })));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !fonts) return;
  if (request.mode === "navigate") return event.respondWith(networkFirst(request));
  if (url.pathname.startsWith("/_astro/") || /[.](png|svg|webmanifest)$/.test(url.pathname)) return event.respondWith(cacheFirst(request, ASSETS));
  if (fonts || url.pathname.endsWith(".json")) return event.respondWith(staleWhileRevalidate(request, event));
});
`;

export const GET: APIRoute = () =>
  new Response(worker, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" } });
