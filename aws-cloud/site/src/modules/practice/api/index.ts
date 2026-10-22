import type { LocalResource } from "../../../core/api/local/LocalResource";
import type { StorageDriver } from "../../../core/api/storage/StorageDriver";
import { AttemptResource } from "./AttemptResource";

/** Requests the practice module answers in the browser until a backend exists. */
export const practiceLocalPaths = /^\/attempts(\/|$)/;

export function practiceLocalResources(storage: StorageDriver): LocalResource[] {
  return [new AttemptResource(storage)];
}
