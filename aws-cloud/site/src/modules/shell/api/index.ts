import type { LocalResource } from "../../../core/api/local/LocalResource";
import type { StorageDriver } from "../../../core/api/storage/StorageDriver";
import { PreferenceResource } from "./PreferenceResource";

/** Requests the shell module answers in the browser until a backend exists. */
export const shellLocalPaths = /^\/preferences(\/|$)/;

export function shellLocalResources(storage: StorageDriver): LocalResource[] {
  return [new PreferenceResource(storage)];
}
