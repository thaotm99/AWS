import type { ApiClient } from "../core/api/ApiClient";
import { CompositeApiClient } from "../core/api/CompositeApiClient";
import { LocalApiClient } from "../core/api/local/LocalApiClient";
import { StaticApiClient } from "../core/api/StaticApiClient";
import { createStorageDriver } from "../core/api/storage/createStorageDriver";
import { practiceLocalPaths, practiceLocalResources } from "../modules/practice/api";
import { shellLocalPaths, shellLocalResources } from "../modules/shell/api";

let client: ApiClient | undefined;

/**
 * The one API client of the site. Phase 1: content comes from static JSON
 * built with the site, learner data is answered in the browser by each
 * module's local resources. Once a backend exists, return
 * `new HttpApiClient({ baseUrl: "https://api.example.com" })` here instead.
 */
export function getApiClient(): ApiClient {
  if (client) return client;
  const storage = createStorageDriver();
  const local = new LocalApiClient([...shellLocalResources(storage), ...practiceLocalResources(storage)]);
  return (client = new CompositeApiClient(
    [shellLocalPaths, practiceLocalPaths].map((match) => ({ match, client: local })),
    new StaticApiClient("/api"),
  ));
}
