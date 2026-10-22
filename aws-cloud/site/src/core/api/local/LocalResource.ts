import type { HttpMethod } from "../ApiClient";
import type { StorageDriver } from "../storage/StorageDriver";

export interface LocalRequest {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

export interface LocalRoute {
  method: HttpMethod;
  /** Express-style pattern, e.g. "/attempts/:id/answers/:questionId". */
  pattern: string;
  handle(req: LocalRequest): Promise<unknown>;
}

/**
 * One REST resource answered inside the browser. Each subclass mirrors a
 * controller of the future server and keeps its data in a StorageDriver.
 */
export abstract class LocalResource {
  constructor(protected readonly storage: StorageDriver) {}

  abstract routes(): LocalRoute[];
}
