import type { ApiClient } from "../core/api/ApiClient";
import { CompositeApiClient } from "../core/api/CompositeApiClient";
import { HttpApiClient } from "../core/api/HttpApiClient";
import { LocalApiClient } from "../core/api/local/LocalApiClient";
import { createStorageDriver } from "../core/api/storage/createStorageDriver";
import { shellLocalPaths, shellLocalResources } from "../modules/shell/api";

let client: ApiClient | undefined;

/** Signed out (session expired or revoked): sign in again and come back to this page. */
function toLogin(): void {
  if (location.pathname.startsWith("/login")) return;
  location.assign(`/login/?return=${encodeURIComponent(location.pathname + location.search)}`);
}

/**
 * The one API client of the site. Practice tests, attempts and grading come from the server
 * (src/server, behind sign-in); the viewer's language and theme stay in the browser.
 */
export function getApiClient(): ApiClient {
  if (client) return client;
  const local = new LocalApiClient(shellLocalResources(createStorageDriver()));
  return (client = new CompositeApiClient(
    [{ match: shellLocalPaths, client: local }],
    new HttpApiClient({ baseUrl: "/api", trailingSlash: true, onUnauthorized: toLogin }),
  ));
}
