import type { ApiClient } from "../api/ApiClient";

/** Base of every service: owns the API client and builds resource paths. */
export abstract class ApiService {
  constructor(protected readonly api: ApiClient) {}

  protected static path(...segments: string[]): string {
    return "/" + segments.map(encodeURIComponent).join("/");
  }
}
