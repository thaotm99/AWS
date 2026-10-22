import { IndexedDbDriver } from "./IndexedDbDriver";
import { LocalStorageDriver } from "./LocalStorageDriver";
import { MemoryDriver } from "./MemoryDriver";
import type { StorageDriver } from "./StorageDriver";

/** IndexedDB first, then localStorage, then memory (private windows, blocked site data). */
export function createStorageDriver(): StorageDriver {
  if (IndexedDbDriver.isAvailable()) return new IndexedDbDriver();
  if (LocalStorageDriver.isAvailable()) return new LocalStorageDriver();
  return new MemoryDriver();
}
