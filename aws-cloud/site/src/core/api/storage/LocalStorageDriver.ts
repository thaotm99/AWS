import { StorageDriver } from "./StorageDriver";

/** One localStorage entry per record: "<prefix>:<collection>:<key>". */
export class LocalStorageDriver extends StorageDriver {
  readonly name = "localStorage";

  constructor(private readonly prefix = "practice") {
    super();
  }

  static isAvailable(): boolean {
    try {
      const probe = "__practice_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  private storageKey(collection: string, key: string): string {
    return `${this.prefix}:${collection}:${key}`;
  }

  /** A damaged entry (cut-off write, manual edit) reads as missing instead of failing the request. */
  private static parse<T>(raw: string | null): T | undefined {
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  private keys(collection: string): string[] {
    const start = this.storageKey(collection, "");
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(start)) out.push(k);
    }
    return out;
  }

  async get<T>(collection: string, key: string): Promise<T | undefined> {
    return LocalStorageDriver.parse<T>(localStorage.getItem(this.storageKey(collection, key)));
  }

  async put<T>(collection: string, key: string, value: T): Promise<void> {
    localStorage.setItem(this.storageKey(collection, key), JSON.stringify(value));
  }

  async delete(collection: string, key: string): Promise<void> {
    localStorage.removeItem(this.storageKey(collection, key));
  }

  async list<T>(collection: string): Promise<T[]> {
    const out: T[] = [];
    for (const k of this.keys(collection)) {
      const value = LocalStorageDriver.parse<T>(localStorage.getItem(k));
      if (value !== undefined) out.push(value);
    }
    return out;
  }

  async clear(collection: string): Promise<void> {
    for (const k of this.keys(collection)) localStorage.removeItem(k);
  }
}
