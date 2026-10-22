import { StorageDriver } from "./StorageDriver";

interface Row {
  collection: string;
  key: string;
  value: unknown;
}

const STORE = "records";

/** All collections share one object store keyed by [collection, key], indexed by collection. */
export class IndexedDbDriver extends StorageDriver {
  readonly name = "indexedDB";
  private db?: Promise<IDBDatabase>;

  constructor(private readonly dbName = "aws-tu-nen-practice") {
    super();
  }

  static isAvailable(): boolean {
    try {
      return typeof indexedDB !== "undefined";
    } catch {
      return false;
    }
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: ["collection", "key"] });
        store.createIndex("collection", "collection");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  private async run<R>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = op(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(collection: string, key: string): Promise<T | undefined> {
    const row = await this.run<Row | undefined>("readonly", (s) => s.get([collection, key]));
    return row?.value as T | undefined;
  }

  async put<T>(collection: string, key: string, value: T): Promise<void> {
    await this.run("readwrite", (s) => s.put({ collection, key, value } satisfies Row));
  }

  async delete(collection: string, key: string): Promise<void> {
    await this.run("readwrite", (s) => s.delete([collection, key]));
  }

  async list<T>(collection: string): Promise<T[]> {
    const rows = await this.run<Row[]>("readonly", (s) => s.index("collection").getAll(collection));
    return rows.map((r) => r.value as T);
  }
}
