import { FallbackDriver } from "./FallbackDriver";
import { IndexedDbDriver } from "./IndexedDbDriver";
import { LocalStorageDriver } from "./LocalStorageDriver";
import { MemoryDriver } from "./MemoryDriver";
import type { StorageDriver } from "./StorageDriver";

/**
 * IndexedDB first, then localStorage, then memory (private windows, blocked site data).
 * A driver that is present but fails at runtime hands over to the next one.
 */
export function createStorageDriver(): StorageDriver {
  const chain: StorageDriver[] = [];
  if (IndexedDbDriver.isAvailable()) chain.push(new IndexedDbDriver());
  if (LocalStorageDriver.isAvailable()) chain.push(new LocalStorageDriver());
  chain.push(new MemoryDriver());
  return new FallbackDriver(chain);
}
