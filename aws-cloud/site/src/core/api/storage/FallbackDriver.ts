import { StorageDriver } from "./StorageDriver";

/**
 * Uses the first driver of a chain until it fails, then moves down for the rest of the page
 * (IndexedDB → localStorage → memory), so a broken store degrades storage instead of the feature.
 */
export class FallbackDriver extends StorageDriver {
  private index = 0;

  constructor(private readonly drivers: StorageDriver[]) {
    super();
    if (!drivers.length) throw new Error("FallbackDriver needs at least one driver");
  }

  get name(): string {
    return this.current.name;
  }

  private get current(): StorageDriver {
    return this.drivers[this.index];
  }

  private async run<R>(op: (driver: StorageDriver) => Promise<R>): Promise<R> {
    for (;;) {
      const at = this.index;
      const driver = this.drivers[at];
      try {
        return await op(driver);
      } catch (e) {
        if (at >= this.drivers.length - 1) throw e;
        // Another request may already have moved on; never move back up.
        if (this.index === at) {
          this.index = at + 1;
          console.warn(`[storage] ${driver.name} failed, using ${this.current.name} instead`, e);
        }
      }
    }
  }

  get<T>(collection: string, key: string): Promise<T | undefined> {
    return this.run((d) => d.get<T>(collection, key));
  }

  put<T>(collection: string, key: string, value: T): Promise<void> {
    return this.run((d) => d.put(collection, key, value));
  }

  delete(collection: string, key: string): Promise<void> {
    return this.run((d) => d.delete(collection, key));
  }

  list<T>(collection: string): Promise<T[]> {
    return this.run((d) => d.list<T>(collection));
  }

  /**
   * Clears the collection in every driver of the chain, so records left behind by an earlier
   * fallback (e.g. localStorage while IndexedDB was blocked) go too. Fails only when the active
   * driver cannot clear.
   */
  async clear(collection: string): Promise<void> {
    const results = await Promise.allSettled(this.drivers.map((d) => d.clear(collection)));
    const active = results[this.index];
    if (active.status === "rejected") await this.run((d) => d.clear(collection));
  }
}
