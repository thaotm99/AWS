import { ApiClient, type ApiRequest } from "./ApiClient";

export interface ApiRoute {
  /** Matched against the request path, e.g. /^\/attempts(\/|$)/. */
  match: RegExp;
  client: ApiClient;
}

/** Sends each request to the first client whose route matches, else to the fallback. */
export class CompositeApiClient extends ApiClient {
  constructor(
    private readonly routes: ApiRoute[],
    private readonly fallback: ApiClient,
  ) {
    super();
  }

  request<T>(req: ApiRequest): Promise<T> {
    const route = this.routes.find((r) => r.match.test(req.path));
    return (route?.client ?? this.fallback).request<T>(req);
  }
}
