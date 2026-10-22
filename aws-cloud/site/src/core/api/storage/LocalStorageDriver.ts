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

  async get<T>(collection: string, key: string): Promise<T | undefined> {
    const raw = localStorage.getItem(this.storageKey(collection, key));
    return raw === null ? undefined : (JSON.parse(raw) as T);
  }

  async put<T>(collection: string, key: string, value: T): Promise<void> {
    localStorage.setItem(this.storageKey(collection, key), JSON.stringify(value));
  }

  async delete(collection: string, key: string): Promise<void> {
    localStorage.removeItem(this.storageKey(collection, key));
  }

  async list<T>(collection: string): Promise<T[]> {
    const start = this.storageKey(collection, "");
    const out: T[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(start)) out.push(JSON.parse(localStorage.getItem(k)!) as T);
    }
    return out;
  }
}
