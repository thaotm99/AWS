import { StorageDriver } from "./StorageDriver";

/** Last resort when the browser blocks storage: progress lasts until the tab closes. */
export class MemoryDriver extends StorageDriver {
  readonly name = "memory";
  private readonly data = new Map<string, Map<string, unknown>>();

  private bucket(collection: string): Map<string, unknown> {
    let b = this.data.get(collection);
    if (!b) this.data.set(collection, (b = new Map()));
    return b;
  }

  async get<T>(collection: string, key: string): Promise<T | undefined> {
    return structuredClone(this.bucket(collection).get(key)) as T | undefined;
  }

  async put<T>(collection: string, key: string, value: T): Promise<void> {
    this.bucket(collection).set(key, structuredClone(value));
  }

  async delete(collection: string, key: string): Promise<void> {
    this.bucket(collection).delete(key);
  }

  async list<T>(collection: string): Promise<T[]> {
    return [...this.bucket(collection).values()].map((v) => structuredClone(v) as T);
  }
}
