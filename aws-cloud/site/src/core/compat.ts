/**
 * Small stand-ins for browser APIs that are missing on plain HTTP (no secure context)
 * or in older Safari. Each uses the native API when it exists.
 */
export class Compat {
  /** RFC 4122 version 4 id. `crypto.randomUUID` exists only in secure contexts and Safari 15.4+. */
  static randomId(): string {
    const c = typeof crypto !== "undefined" ? crypto : undefined;
    if (typeof c?.randomUUID === "function") return c.randomUUID();
    const bytes = new Uint8Array(16);
    if (typeof c?.getRandomValues === "function") c.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Deep copy of plain JSON-like data. `structuredClone` is Safari 15.4+; the fallback goes
   * through JSON, which is enough for API payloads (no Dates, Maps or cycles).
   */
  static clone<T>(value: T): T {
    if (typeof structuredClone === "function") return structuredClone(value);
    return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
  }

  /** Last element; `Array.prototype.at` is Safari 15.4+. */
  static last<T>(items: readonly T[]): T | undefined {
    return items[items.length - 1];
  }
}
