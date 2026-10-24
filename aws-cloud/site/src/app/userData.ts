// The page's one learner-data store (see core/userdata/UserDataStore). Importing this module waits
// for GET /api/data (top-level await), so an island or script that reads learner data renders with the
// learner's documents already in place. At build time and in unit tests it is an empty store.
import { UserDataStore, type Problem } from "../core/userdata/UserDataStore";

export { EXAM_DATE } from "../core/userdata/UserDataStore";
export { CURRENT_CERT } from "../core/userdata/docs";

const browser = typeof window !== "undefined";

function storage(): Storage | null {
  try {
    return browser ? window.localStorage : null;
  } catch {
    return null;
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** One line in the shell's toast (BaseLayout #toast), in the current language. */
async function toast(problem: Problem): Promise<void> {
  const el = document.getElementById("toast");
  if (!el) return;
  const { i18n } = await import("./i18n");
  const key = problem === "save" ? "shell.data.saveFailed" : problem === "load" ? "shell.data.loadFailed" : "shell.data.offline";
  el.textContent = i18n.translator().t(key);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 5000);
}

let leaving = false;

function toLogin(): void {
  if (leaving) return;
  leaving = true;
  location.assign(`/login/?error=expired&return=${encodeURIComponent(location.pathname + location.search)}`);
}

/**
 * The server sets the readable cookie cl_signed_in next to the session cookie (server/auth/session.ts).
 * Without it there are no accounts here (astro dev/preview, Basic auth): no request, localStorage.
 */
const signedIn = browser && /(?:^|;\s*)cl_signed_in=1(?:;|$)/.test(document.cookie);

export const userData = new UserDataStore({
  fetch: browser ? window.fetch.bind(window) : (() => Promise.reject(new Error("no fetch at build time"))) as typeof fetch,
  storage: storage(),
  accounts: signedIn,
  onProblem: (p) => void toast(p),
  onSignedOut: toLogin,
  channel: browser && "BroadcastChannel" in window ? new BroadcastChannel("cloudlab-userdata") : undefined,
});

if (browser) {
  void userData.load();
  // Changes still waiting for their delay go out before the page is left or hidden.
  addEventListener("pagehide", () => userData.flush(true));
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      userData.flush(true);
    } else if (Date.now() - hiddenAt > 60_000) void userData.refresh();
  });
  // A page restored from the back/forward cache may show data another page has changed since.
  addEventListener("pageshow", (e) => e.persisted && void userData.refresh());
  await userData.ready;
}
