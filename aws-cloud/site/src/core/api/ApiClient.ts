export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type Query = Record<string, string | number | undefined>;

export interface ApiRequest {
  method: HttpMethod;
  /** Resource path without base URL, e.g. "/certifications/saa-c03". */
  path: string;
  query?: Query;
  body?: unknown;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly request?: ApiRequest,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/**
 * Every data access in the practice feature goes through this contract, so the
 * services never know whether a request is answered by static files, browser
 * storage or a real server.
 */
export abstract class ApiClient {
  abstract request<T>(req: ApiRequest): Promise<T>;

  get<T>(path: string, query?: Query): Promise<T> {
    return this.request<T>({ method: "GET", path, query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", path, body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PUT", path, body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PATCH", path, body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>({ method: "DELETE", path });
  }

  protected static queryString(query?: Query): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) params.set(k, String(v));
    const s = params.toString();
    return s ? `?${s}` : "";
  }
}
