import type { ApiClient } from "./ApiClient";
import { CompositeApiClient } from "./CompositeApiClient";
import { AttemptResource } from "./local/AttemptResource";
import { LocalApiClient } from "./local/LocalApiClient";
import { StaticApiClient } from "./StaticApiClient";
import { createStorageDriver } from "./storage/createStorageDriver";

/**
 * Phase 1: exam content comes from static JSON built with the site, attempts
 * live in the browser. Once a backend exists, return
 * `new HttpApiClient({ baseUrl: "https://api.example.com" })` here instead.
 */
export function createApiClient(): ApiClient {
  const local = new LocalApiClient([new AttemptResource(createStorageDriver())]);
  return new CompositeApiClient([{ match: /^\/attempts(\/|$)/, client: local }], new StaticApiClient("/api"));
}
