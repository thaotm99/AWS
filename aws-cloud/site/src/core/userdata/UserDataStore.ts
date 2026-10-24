// Learner data for the page: a synchronous get/set over documents loaded once from GET /api/data.
// Writes update the page at once and reach the server through PUT /api/data/:name, a second or so
// later. The server is the only store: nothing is written to the browser, except on a deployment
// without accounts (no /api/data: `astro dev`, Basic auth), where the documents stay in localStorage
// under their old keys.
import { DOC_NAMES } from "./docs";
import { merge3 } from "./merge";

/**
 * loading: before load() settles. server: documents come from /api/data. local: no accounts on this
 * deployment, documents live in localStorage. offline: the server could not be reached; the page works
 * on empty documents and nothing is saved.
 */
export type Mode = "loading" | "server" | "local" | "offline";

export interface AccountUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface UserCert {
  certId: string;
  status: string;
  examDate: string | null;
}

export interface Account {
  user: AccountUser;
  certs: UserCert[];
}

export interface StoredDoc {
  value: unknown;
  version: number;
  updatedAt?: string;
}

export type Problem = "load" | "save" | "offline";

export interface StoreDeps {
  fetch: typeof fetch;
  /** localStorage, or null where there is none (build, tests). */
  storage: Storage | null;
  /**
   * false: this deployment has no accounts (or the visitor has not signed in), so the store keeps the
   * data in localStorage without asking the server. Left out: ask /api/data and decide from the answer.
   */
  accounts?: boolean;
  /** A save failed (the change was undone), the data could not be loaded, or a change was made offline. */
  onProblem?: (problem: Problem) => void;
  /** The session ended (401): send the visitor to the login page. */
  onSignedOut?: () => void;
  debounceMs?: number;
  /** Gives up on the first load after this long. */
  timeoutMs?: number;
  /** Other tabs of this browser, so a change shows everywhere at once. */
  channel?: Pick<BroadcastChannel, "postMessage"> & { onmessage: ((e: MessageEvent) => void) | null };
}

/** The exam date is not a document; listeners subscribe to it under this name. */
export const EXAM_DATE = "exam-date";

type Listener = () => void;
type TabMessage = { type: "set"; name: string; value: unknown } | { type: "saved"; name: string; value: unknown; version: number } | { type: "exam"; cert: string; date: string | null };

const MAX_CONFLICT_RETRIES = 3;

export class UserDataStore {
  mode: Mode = "loading";
  account: Account | null = null;
  readonly ready: Promise<void>;
  private resolveReady!: () => void;

  /** The server's copy of each document, as last seen (the base of the next write). */
  private base = new Map<string, StoredDoc>();
  /** What the page shows. */
  private values = new Map<string, unknown>();
  /** Fallback when localStorage refuses a write (blocked site data, quota): kept for this page. */
  private memory = new Map<string, string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private inflight = new Set<string>();
  private dirty = new Set<string>();
  private listeners = new Map<string, Set<Listener>>();
  private warnedOffline = false;

  constructor(private deps: StoreDeps) {
    this.ready = new Promise((r) => (this.resolveReady = r));
    if (deps.channel) deps.channel.onmessage = (e) => this.onTabMessage(e.data as TabMessage);
  }

  // ---------- loading ----------

  /** Loads the documents and the account; resolves `ready` whatever happens. */
  async load(): Promise<void> {
    if (this.mode !== "loading") return this.ready;
    if (this.deps.accounts === false) {
      this.useLocal();
      this.resolveReady();
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), this.deps.timeoutMs ?? 15_000);
    try {
      const [data, me] = await Promise.all([
        this.deps.fetch("/api/data", { signal: abort.signal, headers: { Accept: "application/json" } }),
        this.deps.fetch("/api/me", { signal: abort.signal, headers: { Accept: "application/json" } }).catch(() => null),
      ]);
      if (data.status === 401) {
        this.mode = "offline";
        this.deps.onSignedOut?.();
      } else if (data.ok && (data.headers.get("content-type") ?? "").includes("json")) {
        const body = (await data.json()) as { docs: Record<string, StoredDoc> };
        for (const [name, doc] of Object.entries(body.docs ?? {})) {
          this.base.set(name, doc);
          this.values.set(name, doc.value);
        }
        if (me?.ok) this.account = (await me.json()) as Account;
        this.mode = "server";
        this.forgetBrowserCopies();
      } else if (data.status === 404 || data.status === 405 || data.ok) {
        // No account API on this deployment (astro dev/preview, Basic auth): the browser keeps the data.
        this.useLocal();
      } else {
        this.mode = "offline";
        this.deps.onProblem?.("load");
      }
    } catch {
      this.mode = "offline";
      this.deps.onProblem?.("load");
    } finally {
      clearTimeout(timer);
      this.resolveReady();
    }
  }

  private useLocal(): void {
    this.mode = "local";
    if (typeof window !== "undefined") {
      // Another tab changed localStorage: tell this page's listeners.
      window.addEventListener("storage", (e) => (e.key === null ? this.emitAll() : this.emit(e.key)));
    }
  }

  /** Re-reads the documents from the server (a page restored from the back/forward cache, a tab shown again). */
  async refresh(): Promise<void> {
    if (this.mode !== "server") return;
    try {
      const res = await this.deps.fetch("/api/data", { headers: { Accept: "application/json" } });
      if (res.status === 401) return this.deps.onSignedOut?.();
      if (!res.ok) return;
      const { docs } = (await res.json()) as { docs: Record<string, StoredDoc> };
      const names = new Set([...Object.keys(docs), ...this.base.keys()]);
      for (const name of names) {
        if (this.timers.has(name) || this.inflight.has(name)) continue;
        const doc = docs[name];
        if (doc?.version === this.base.get(name)?.version) continue;
        if (doc) {
          this.base.set(name, doc);
          this.values.set(name, doc.value);
        } else {
          this.base.delete(name);
          this.values.delete(name);
        }
        this.emit(name);
      }
    } catch {
      /* offline for now: keep what the page has */
    }
  }

  /** Old browser copies of learner data are not read any more once the server holds it. */
  private forgetBrowserCopies(): void {
    try {
      for (const name of [...DOC_NAMES, EXAM_DATE]) this.deps.storage?.removeItem(name);
    } catch {
      /* storage blocked: nothing to remove */
    }
  }

  // ---------- reading and writing ----------

  get<T = unknown>(name: string): T | undefined {
    if (this.mode === "local" || (this.mode === "loading" && !this.deps.storage)) return this.readLocal(name) as T | undefined;
    return this.values.get(name) as T | undefined;
  }

  /** Stores a document; `undefined` removes it. */
  set(name: string, value: unknown): void {
    if (this.mode === "local" || this.mode === "loading") {
      this.writeLocal(name, value);
      this.emit(name);
      return;
    }
    // A copy, so the caller changing its object later cannot change what is saved or the merge base.
    if (value === undefined) this.values.delete(name);
    else this.values.set(name, (value = JSON.parse(JSON.stringify(value))));
    this.emit(name);
    this.deps.channel?.postMessage({ type: "set", name, value } satisfies TabMessage);
    if (this.mode === "offline") {
      if (!this.warnedOffline) this.deps.onProblem?.("offline");
      this.warnedOffline = true;
      return;
    }
    clearTimeout(this.timers.get(name));
    this.timers.set(name, setTimeout(() => void this.save(name), this.deps.debounceMs ?? 800));
  }

  /** Calls `fn` when any of `names` changes, here or in another tab. Returns the unsubscribe function. */
  subscribe(names: string | readonly string[], fn: Listener): () => void {
    const list = typeof names === "string" ? [names] : names;
    for (const n of list) {
      if (!this.listeners.has(n)) this.listeners.set(n, new Set());
      this.listeners.get(n)!.add(fn);
    }
    return () => list.forEach((n) => this.listeners.get(n)?.delete(fn));
  }

  /** Every document as stored, with its version and last update (account page, export). */
  documents(): Record<string, StoredDoc> {
    if (this.mode === "local") {
      const out: Record<string, StoredDoc> = {};
      for (const n of DOC_NAMES) {
        const v = this.readLocal(n);
        if (v !== undefined) out[n] = { value: v, version: 0 };
      }
      return out;
    }
    return Object.fromEntries(this.base);
  }

  /** Sends every change still waiting for its delay now (the page is being left). */
  flush(keepalive = false): void {
    for (const [name, t] of this.timers) {
      clearTimeout(t);
      void this.save(name, keepalive);
    }
  }

  /** Sends what is waiting and resolves once nothing is left in flight (before signing out), or after `ms`. */
  async drain(ms = 3000): Promise<void> {
    this.flush();
    const until = Date.now() + ms;
    while (this.saving && Date.now() < until) await new Promise((r) => setTimeout(r, 50));
  }

  /** True while some change has not reached the server yet. */
  get saving(): boolean {
    return this.timers.size > 0 || this.inflight.size > 0;
  }

  // ---------- exam date (user_certs, not a document) ----------

  examDate(cert: string): string | null {
    if (this.mode === "local" || this.mode === "loading") {
      const v = this.readRaw(EXAM_DATE);
      return v ?? null;
    }
    return this.account?.certs.find((c) => c.certId === cert)?.examDate ?? null;
  }

  async setExamDate(cert: string, date: string | null): Promise<void> {
    if (this.mode === "local" || this.mode === "loading") {
      this.writeRaw(EXAM_DATE, date ?? undefined);
      this.emit(EXAM_DATE);
      return;
    }
    const before = this.examDate(cert);
    this.putExamDate(cert, date);
    this.deps.channel?.postMessage({ type: "exam", cert, date } satisfies TabMessage);
    if (this.mode !== "server") return;
    try {
      const res = await this.deps.fetch(`/api/me/certs/${encodeURIComponent(cert)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examDate: date }),
      });
      if (res.status === 401) return this.deps.onSignedOut?.();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      this.putExamDate(cert, before);
      this.deps.onProblem?.("save");
    }
  }

  private putExamDate(cert: string, date: string | null): void {
    if (this.account) {
      const certs = this.account.certs.filter((c) => c.certId !== cert);
      const old = this.account.certs.find((c) => c.certId === cert);
      this.account = { ...this.account, certs: [...certs, { ...(old ?? { certId: cert, status: "studying" }), examDate: date }] };
    }
    this.emit(EXAM_DATE);
  }

  // ---------- saving ----------

  private async save(name: string, keepalive = false, attempt = 0): Promise<void> {
    this.timers.delete(name);
    if (this.inflight.has(name)) {
      this.dirty.add(name);
      return;
    }
    this.inflight.add(name);
    const value = this.values.get(name);
    const base = this.base.get(name);
    try {
      const res =
        value === undefined
          ? await this.deps.fetch(`/api/data/${name}`, { method: "DELETE", keepalive })
          : await this.deps.fetch(`/api/data/${name}`, {
              method: "PUT",
              keepalive,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value, version: base?.version ?? 0 }),
            });
      if (res.status === 401) {
        this.deps.onSignedOut?.();
        return;
      }
      if (res.status === 409 && attempt < MAX_CONFLICT_RETRIES) {
        // Another device saved first: keep this page's changes on top of its copy, then try again.
        const { current } = (await res.json()) as { current: StoredDoc | null };
        const merged = merge3(base?.value, this.values.get(name), current?.value);
        if (current) this.base.set(name, current);
        else this.base.delete(name);
        this.setValue(name, merged);
        this.inflight.delete(name);
        return this.save(name, keepalive, attempt + 1);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (value === undefined) this.base.delete(name);
      else {
        const { version, updatedAt } = (await res.json()) as { version: number; updatedAt?: string };
        this.base.set(name, { value, version, updatedAt });
        this.deps.channel?.postMessage({ type: "saved", name, value, version } satisfies TabMessage);
      }
    } catch {
      // Not saved: show the server's copy again and say so.
      this.dirty.delete(name);
      this.setValue(name, base?.value);
      this.deps.onProblem?.("save");
    } finally {
      this.inflight.delete(name);
    }
    if (this.dirty.delete(name)) void this.save(name, keepalive);
  }

  private setValue(name: string, value: unknown): void {
    const before = JSON.stringify(this.values.get(name));
    if (value === undefined) this.values.delete(name);
    else this.values.set(name, value);
    if (JSON.stringify(value) !== before) {
      this.emit(name);
      this.deps.channel?.postMessage({ type: "set", name, value } satisfies TabMessage);
    }
  }

  private onTabMessage(m: TabMessage): void {
    if (this.mode !== "server" && this.mode !== "offline") return;
    if (m.type === "exam") return this.putExamDate(m.cert, m.date);
    if (m.type === "saved") {
      const mine = this.base.get(m.name);
      if (!mine || mine.version < m.version) this.base.set(m.name, { value: m.value, version: m.version });
      if (this.timers.has(m.name) || this.inflight.has(m.name)) return;
    }
    if (JSON.stringify(this.values.get(m.name)) === JSON.stringify(m.value)) return;
    if (m.value === undefined) this.values.delete(m.name);
    else this.values.set(m.name, m.value);
    this.emit(m.name);
  }

  // ---------- localStorage (deployments without accounts) ----------

  private readRaw(name: string): string | undefined {
    try {
      const v = this.deps.storage?.getItem(name);
      if (v !== null && v !== undefined) return v;
    } catch {
      /* blocked: fall through to memory */
    }
    return this.memory.get(name);
  }

  private writeRaw(name: string, text: string | undefined): void {
    if (text === undefined) this.memory.delete(name);
    else this.memory.set(name, text);
    try {
      if (text === undefined) this.deps.storage?.removeItem(name);
      else this.deps.storage?.setItem(name, text);
    } catch {
      /* blocked or full: kept in memory for this page */
    }
  }

  /** JSON when the stored text is JSON; older values that were plain text ("a,b,c") come back as text. */
  private readLocal(name: string): unknown {
    const text = this.readRaw(name);
    if (text === undefined) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private writeLocal(name: string, value: unknown): void {
    this.writeRaw(name, value === undefined ? undefined : JSON.stringify(value));
  }

  // ---------- events ----------

  private emit(name: string): void {
    for (const fn of this.listeners.get(name) ?? []) fn();
  }

  private emitAll(): void {
    for (const name of this.listeners.keys()) this.emit(name);
  }
}
