/** Key-value records grouped into collections, the minimum the local backend needs. */
export abstract class StorageDriver {
  abstract readonly name: string;
  abstract get<T>(collection: string, key: string): Promise<T | undefined>;
  abstract put<T>(collection: string, key: string, value: T): Promise<void>;
  abstract delete(collection: string, key: string): Promise<void>;
  abstract list<T>(collection: string): Promise<T[]>;
}
