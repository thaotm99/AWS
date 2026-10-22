import { ApiClient, ApiError, type ApiRequest } from "./ApiClient";

export interface HttpApiClientOptions {
  baseUrl: string;
  /** Called per request, e.g. to attach a Cognito token once accounts exist. */
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
}

/** Talks to a JSON REST server. Used once progress moves to the backend. */
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
    if (!res.ok) throw new ApiError(res.status, `${req.method} ${req.path} returned ${res.status}`, req);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  protected url(req: ApiRequest): string {
    return `${this.options.baseUrl}${req.path}${ApiClient.queryString(req.query)}`;
  }
}
