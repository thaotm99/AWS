import { StorageDriver } from "./StorageDriver";

interface Row {
  collection: string;
  key: string;
  value: unknown;
}

const STORE = "records";
/** An open that never answers (some private modes) counts as a failure, so the next driver takes over. */
const OPEN_TIMEOUT_MS = 8000;

/** All collections share one object store keyed by [collection, key], indexed by collection. */
export class IndexedDbDriver extends StorageDriver {
  readonly name = "indexedDB";
  private db?: Promise<IDBDatabase>;

  constructor(private readonly dbName = "aws-tu-nen-practice") {
    super();
  }

  static isAvailable(): boolean {
    try {
      return typeof indexedDB !== "undefined" && indexedDB !== null;
    } catch {
      return false;
    }
  }

  /** Forgets the connection so the next request opens a fresh one. */
  private reset(db?: IDBDatabase): void {
    try {
      db?.close();
    } catch {
      /* already closed */
    }
    this.db = undefined;
  }

  private open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("IndexedDB open timed out")), OPEN_TIMEOUT_MS);
      const fail = (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      };
      let req: IDBOpenDBRequest;
      try {
        req = indexedDB.open(this.dbName, 1);
      } catch (e) {
        return fail(e);
      }
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: ["collection", "key"] });
        store.createIndex("collection", "collection");
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        const db = req.result;
        // Another tab deletes or upgrades the database: let go at once so it is not blocked.
        db.onversionchange = () => this.drop(opening, db);
        db.onclose = () => this.drop(opening);
        db.onerror = () => this.drop(opening, db);
        resolve(db);
      };
      req.onerror = () => fail(req.error ?? new Error("IndexedDB open failed"));
      // An older connection in another tab holds the database; don't wait behind it.
      req.onblocked = () => fail(new Error("IndexedDB open blocked by another tab"));
    });
    // A failed open is not cached: the next request tries again (or the caller falls back).
    opening.catch(() => this.drop(opening));
    return (this.db = opening);
  }

  /** Drops the cached connection, unless a newer one has already replaced it. */
  private drop(which: Promise<IDBDatabase>, db?: IDBDatabase): void {
    if (this.db === which) this.reset(db);
    else db?.close();
  }

  private static transact<R>(db: IDBDatabase, mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  }

  /**
   * A failed open is reported as is (the caller falls back). A failed transaction is retried once
   * on a fresh connection, which covers a database closed under us (version change, eviction).
   */
  private async run<R>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const db = await this.open();
    try {
      return await IndexedDbDriver.transact(db, mode, op);
    } catch {
      this.reset(db);
      return IndexedDbDriver.transact(await this.open(), mode, op);
    }
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
    return rows.map((r) => r?.value as T);
  }

  async clear(collection: string): Promise<void> {
    await this.run("readwrite", (s) => s.delete(IDBKeyRange.bound([collection, ""], [collection, []])));
  }
}
