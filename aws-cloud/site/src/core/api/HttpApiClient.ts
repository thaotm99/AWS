import { ApiClient, ApiError, type ApiRequest } from "./ApiClient";

export interface HttpApiClientOptions {
  baseUrl: string;
  /** Called per request, e.g. to attach a token. */
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
  /** End every path with "/", for a host that redirects to the trailing-slash URL (vercel.json trailingSlash). */
  trailingSlash?: boolean;
  /** Called on 401 before the request fails, e.g. to send the visitor to the sign-in page. */
  onUnauthorized?: () => void;
}

/** Talks to a JSON REST server. */
export class HttpApiClient extends ApiClient {
  constructor(private readonly options: HttpApiClientOptions) {
    super();
  }

  async request<T>(req: ApiRequest): Promise<T> {
    const extra = (await this.options.headers?.()) ?? {};
    const res = await fetch(this.url(req), {
      method: req.method,
      headers: { Accept: "application/json", ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}), ...extra },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
    if (res.status === 401) this.options.onUnauthorized?.();
    if (!res.ok) throw new ApiError(res.status, `${req.method} ${req.path} returned ${res.status}`, req);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  protected url(req: ApiRequest): string {
    const path = this.options.trailingSlash && !req.path.endsWith("/") ? `${req.path}/` : req.path;
    return `${this.options.baseUrl}${path}${ApiClient.queryString(req.query)}`;
  }
}
