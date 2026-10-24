// Signing out from the browser: what is still waiting is saved, the session is revoked, the service
// worker drops its cached data, and the visitor lands on the login page.

/** Tells the service worker (pages/sw.js.ts) to drop its cached data. */
export function forgetCachedData(): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "sign-out" });
  } catch {
    /* no service worker */
  }
}

export async function signOut(): Promise<void> {
  const { userData } = await import("./userData");
  await userData.drain();
  await fetch("/auth/logout", { method: "POST" }).catch(() => null);
  forgetCachedData();
  location.assign("/login/");
}
