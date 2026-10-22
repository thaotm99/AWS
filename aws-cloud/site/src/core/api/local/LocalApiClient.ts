import { ApiClient, ApiError, type ApiRequest } from "../ApiClient";
import type { LocalResource, LocalRoute } from "./LocalResource";

interface CompiledRoute {
  route: LocalRoute;
  regex: RegExp;
  names: string[];
}

/**
 * An in-browser stand-in for the backend: routes REST requests to LocalResource
 * handlers. Swapping it for HttpApiClient moves storage to the server without
 * touching services or UI.
 */
export class LocalApiClient extends ApiClient {
  private readonly compiled: CompiledRoute[];

  constructor(resources: LocalResource[]) {
    super();
    this.compiled = resources.flatMap((r) => r.routes()).map(LocalApiClient.compile);
  }

  private static compile(route: LocalRoute): CompiledRoute {
    const names: string[] = [];
    const source = route.pattern.replace(/:([A-Za-z]+)/g, (_, name: string) => {
      names.push(name);
      return "([^/]+)";
    });
    return { route, regex: new RegExp(`^${source}/?$`), names };
  }

  async request<T>(req: ApiRequest): Promise<T> {
    for (const { route, regex, names } of this.compiled) {
      if (route.method !== req.method) continue;
      const m = regex.exec(req.path);
      if (!m) continue;
      const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const query = Object.fromEntries(
        Object.entries(req.query ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
      );
      try {
        // Clone so callers can't mutate stored objects, the same as JSON over the wire.
        return structuredClone(await route.handle({ params, query, body: structuredClone(req.body) })) as T;
      } catch (e) {
        if (e instanceof ApiError) throw new ApiError(e.status, e.message, req);
        throw new ApiError(500, e instanceof Error ? e.message : String(e), req);
      }
    }
    throw new ApiError(404, `No route for ${req.method} ${req.path}`, req);
  }
}
