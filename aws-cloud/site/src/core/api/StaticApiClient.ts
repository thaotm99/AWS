import { ApiError, type ApiRequest } from "./ApiClient";
import { HttpApiClient } from "./HttpApiClient";

/**
 * Read-only client for the JSON files Astro writes at build time
 * (src/pages/api/**). "/certifications/saa-c03" is served from
 * "/api/certifications/saa-c03.json", so the paths match the future server API.
 */
export class StaticApiClient extends HttpApiClient {
  constructor(baseUrl = "/api") {
    super({ baseUrl });
  }

  override request<T>(req: ApiRequest): Promise<T> {
    if (req.method !== "GET") {
      return Promise.reject(new ApiError(405, `Static data does not support ${req.method} ${req.path}`, req));
    }
    return super.request<T>(req);
  }

  protected override url(req: ApiRequest): string {
    return `${super.url({ ...req, query: undefined }).replace(/\/$/, "")}.json`;
  }
}
