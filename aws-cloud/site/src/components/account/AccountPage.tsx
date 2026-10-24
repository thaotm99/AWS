// /account/: profile, certifications with their exam dates, the documents stored on the account (with a
// JSON export of everything), sign-in sessions, and account deletion behind a typed-email confirmation.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n, type SiteMessageKey } from "../../app/i18n";
import { forgetCachedData, signOut } from "../../app/session";
import { userData } from "../../app/userData";
import { DOC_NAMES, type DocName } from "../../core/userdata/docs";
import type { Account, StoredDoc } from "../../core/userdata/UserDataStore";
import Avatar from "./Avatar";

const DOC_KEYS: Record<DocName, SiteMessageKey> = {
  done: "shell.account.data.docs.done",
  "parts-read": "shell.account.data.docs.partsRead",
  "last-part": "shell.account.data.docs.lastPart",
  flashcards: "shell.account.data.docs.flashcards",
  "known-terms": "shell.account.data.docs.knownTerms",
  notes: "shell.account.data.docs.notes",
  goals: "shell.account.data.docs.goals",
  activity: "shell.account.data.docs.activity",
  pomodoro: "shell.account.data.docs.pomodoro",
  "pomodoro-settings": "shell.account.data.docs.pomodoroSettings",
  "pomodoro-log": "shell.account.data.docs.pomodoroLog",
  labs: "shell.account.data.docs.labs",
  drills: "shell.account.data.docs.drills",
  city: "shell.account.data.docs.city",
};

const STATUS_KEYS: Record<string, SiteMessageKey> = {
  studying: "shell.account.certs.studying",
  paused: "shell.account.certs.paused",
  passed: "shell.account.certs.passed",
};

/** Full names of the certifications the site teaches; the id alone is shown for any other. */
const CERT_NAMES: Record<string, string> = { "saa-c03": "AWS Certified Solutions Architect – Associate" };

interface SessionRow {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

const CARD = "flex flex-col gap-4 rounded-[24px] border-2 border-line bg-surface p-6 max-sm:p-4";
const H2 = "m-0 font-display text-[1.375rem] font-bold max-sm:text-[1.2rem]";

function bytes(value: unknown, locale: string): string {
  const n = new TextEncoder().encode(JSON.stringify(value)).length;
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return n < 1024 ? `${fmt.format(n)} B` : `${fmt.format(n / 1024)} KB`;
}

function when(iso: string | undefined, locale: string, dateStyle: "short" | "medium" = "medium"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle: "short" }).format(new Date(iso));
}

function day(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(y, m - 1, d));
}

/** "Chrome", "Windows" and so on from a User-Agent string; enough to tell one's own devices apart. */
function device(ua: string | null): { browser: string; os: string } | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : null;
  return browser && os ? { browser, os } : null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 401) location.assign(`/login/?return=${encodeURIComponent(location.pathname)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Everything the account holds, fetched fresh, as one JSON file. */
async function exportAll(): Promise<void> {
  const [me, data] = await Promise.all([getJson<Account>("/api/me"), getJson<{ docs: Record<string, StoredDoc> }>("/api/data")]);
  const file = { exportedAt: new Date().toISOString(), site: location.origin, user: me.user, certifications: me.certs, data: data.docs };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `cloudlab-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Status({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "bad" | "ok" }) {
  const color = tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : "text-muted";
  return <p className={`m-0 text-[0.875rem] ${color}`} role="status">{children}</p>;
}

export default function AccountPage() {
  const { t, locale } = useI18n();
  const account = userData.mode === "server" ? userData.account : null;
  const [docs, setDocs] = useState(() => userData.documents());
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [sessionMsg, setSessionMsg] = useState<{ key: SiteMessageKey; tone: "ok" | "bad" | "muted" } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  useEffect(() => userData.subscribe(DOC_NAMES, () => setDocs(userData.documents())), []);
  useEffect(() => {
    if (!account) return;
    getJson<SessionRow[]>("/api/me/sessions")
      .then(setSessions)
      .catch(() => setSessionMsg({ key: "shell.account.sessions.failed", tone: "bad" }));
  }, []);

  if (!account) {
    return <p className="rounded-[18px] border-2 border-line bg-surface p-5 text-muted">{userData.mode === "offline" ? t("shell.account.loadFailed") : t("shell.account.unavailable")}</p>;
  }
  const { user, certs } = account;
  const name = user.name?.trim() || user.email;
  const stored = DOC_NAMES.filter((n) => docs[n]);

  const onExport = async () => {
    setExporting(true);
    setExportFailed(false);
    try {
      await userData.drain();
      await exportAll();
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };

  const revokeOthers = async () => {
    setSessionMsg(null);
    try {
      const res = await fetch("/api/me/sessions/revoke-others", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSessions((s) => s?.filter((x) => x.current) ?? null);
      setSessionMsg({ key: "shell.account.sessions.revoked", tone: "ok" });
    } catch {
      setSessionMsg({ key: "shell.account.sessions.failed", tone: "bad" });
    }
  };

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <div className="flex flex-col gap-7 max-sm:gap-5">
      {/* Profile */}
      <section className={`${CARD} flex-row! flex-wrap items-center gap-5!`} aria-labelledby="acc-profile">
        <Avatar user={user} className="h-18 w-18 text-[1.75rem] max-sm:h-14 max-sm:w-14 max-sm:text-[1.375rem]" />
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h2 id="acc-profile" className={`${H2} break-words`}>{name}</h2>
          <span className="text-[0.9375rem] break-all text-muted">{user.email}</span>
          <span className="text-[0.875rem] text-muted">{user.id.startsWith("dev:") ? t("shell.account.viaDev") : t("shell.account.viaGoogle")}</span>
        </div>
        <button type="button" className="btn min-h-11" onClick={() => void signOut()}>{t("shell.account.signOut")}</button>
      </section>

      {/* Certifications */}
      <section className={CARD} aria-labelledby="acc-certs">
        <h2 id="acc-certs" className={H2}>{t("shell.account.certs.title")}</h2>
        {certs.length === 0 ? (
          <p className="m-0 text-muted">{t("shell.account.certs.empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {certs.map((c) => (
              <li key={c.certId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[14px] bg-bg px-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <b className="font-display">{c.certId.toUpperCase()}</b>
                  {CERT_NAMES[c.certId] && <span className="text-[0.875rem] text-muted">{CERT_NAMES[c.certId]}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem]">
                  <span><span className="text-muted">{t("shell.account.certs.status")}: </span>{STATUS_KEYS[c.status] ? t(STATUS_KEYS[c.status]) : c.status}</span>
                  <span><span className="text-muted">{t("shell.account.certs.examDate")}: </span>{c.examDate ? day(c.examDate, locale) : t("shell.account.certs.noDate")}</span>
                  <a className="text-[0.875rem] font-semibold" href="/exam-guide/">{t("shell.account.certs.change")}</a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stored data and export */}
      <section className={CARD} aria-labelledby="acc-data" id="export">
        <h2 id="acc-data" className={H2}>{t("shell.account.data.title")}</h2>
        {stored.length === 0 ? (
          <p className="m-0 text-muted">{t("shell.account.data.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.9375rem] max-sm:text-[0.875rem]">
              <thead>
                <tr className="text-left text-[0.8125rem] tracking-[0.06em] text-muted uppercase max-sm:text-[0.75rem]">
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-bold max-sm:px-2">{t("shell.account.data.kind")}</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 text-right font-bold max-sm:px-2">{t("shell.account.data.size")}</th>
                  <th scope="col" className="border-b border-line px-3 py-2.5 font-bold max-sm:px-2">{t("shell.account.data.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {stored.map((n) => (
                  <tr key={n}>
                    <td className="border-b border-line/60 px-3 py-3 font-semibold max-sm:px-2">{t(DOC_KEYS[n])}</td>
                    <td className="border-b border-line/60 px-3 py-3 text-right font-mono text-[0.875rem] whitespace-nowrap max-sm:px-2 max-sm:text-[0.8125rem]">{bytes(docs[n].value, locale)}</td>
                    <td className="border-b border-line/60 px-3 py-3 text-muted max-sm:px-2">{when(docs[n].updatedAt, locale, "short")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn primary min-h-12 px-5" onClick={() => void onExport()} disabled={exporting}>
            {exporting ? t("shell.account.data.exporting") : t("shell.account.data.export")}
          </button>
          <span className="flex-[1_1_240px] text-[0.875rem] text-muted">{t("shell.account.data.exportHint")}</span>
        </div>
        {exportFailed && <Status tone="bad">{t("shell.account.data.exportFailed")}</Status>}
      </section>

      {/* Sessions */}
      <section className={CARD} aria-labelledby="acc-sessions">
        <h2 id="acc-sessions" className={H2}>{t("shell.account.sessions.title")}</h2>
        {sessions && (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {sessions.map((s) => {
              const d = device(s.userAgent);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[14px] bg-bg px-3.5 py-3">
                  <span>
                    <b>{d ? t("shell.account.sessions.device", d) : t("shell.account.sessions.unknown")}</b>
                    {s.current && <span className="text-muted"> · {t("shell.account.sessions.current")}</span>}
                  </span>
                  <span className="text-[0.875rem] text-muted">{t("shell.account.sessions.lastSeen", { when: when(s.lastSeenAt, locale) })}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn min-h-11" onClick={() => void revokeOthers()} disabled={!sessions || others === 0}>
            {t("shell.account.sessions.revokeOthers")}
          </button>
          {sessions && others === 0 && !sessionMsg && <span className="text-[0.875rem] text-muted">{t("shell.account.sessions.onlyThis")}</span>}
        </div>
        {sessionMsg && <Status tone={sessionMsg.tone}>{t(sessionMsg.key)}</Status>}
      </section>

      <DangerZone email={user.email} onExport={onExport} />
    </div>
  );
}

function DangerZone({ email, onExport }: { email: string; onExport: () => Promise<void> }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  const remove = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: typed.trim() }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      forgetCachedData();
      location.assign("/login/");
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <section className={`${CARD} flex-row! flex-wrap items-center gap-5! border-bad/45!`} aria-labelledby="acc-danger">
      <div className="flex flex-[1_1_380px] flex-col gap-1.5">
        <h2 id="acc-danger" className={`${H2} text-bad`}>{t("shell.account.danger.title")}</h2>
        <p className="m-0 leading-relaxed text-muted">{t("shell.account.danger.body")}</p>
      </div>
      <button type="button" className="btn min-h-12 border-bad! bg-bad! px-5 text-surface! shadow-[0_4px_0_color-mix(in_srgb,var(--color-bad)_70%,black)]!"
        onClick={() => { setTyped(""); setFailed(false); dialog.current?.showModal(); }}>
        {t("shell.account.danger.open")}
      </button>

      <dialog ref={dialog} aria-labelledby="del-title" aria-describedby="del-body" onClose={() => setTyped("")}
        className="m-auto w-[min(520px,calc(100vw-24px))] rounded-[24px] border-0 bg-surface p-0 text-ink shadow-[0_24px_60px_rgb(20_18_43/0.3)] backdrop:bg-black/50">
        <form method="dialog" className="flex flex-col gap-4.5 p-8 max-sm:p-5" onSubmit={(e) => { e.preventDefault(); if (matches && !busy) void remove(); }}>
          <span className="grid h-13 w-13 place-items-center rounded-[16px] bg-bad-soft text-bad" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
          </span>
          <h2 id="del-title" className="m-0 font-display text-[1.5rem] font-bold">{t("shell.account.danger.confirmTitle")}</h2>
          <p id="del-body" className="m-0 leading-relaxed text-muted">{t("shell.account.danger.confirmBody")}</p>
          <button type="button" className="cursor-pointer self-start border-0 bg-transparent p-0 text-left font-semibold text-accent underline-offset-3 hover:underline" onClick={() => void onExport()}>
            {t("shell.account.danger.exportFirst")}
          </button>
          <label className="flex flex-col gap-2 text-[0.875rem] font-semibold">
            {t("shell.account.danger.typeEmail")}
            <input type="email" autoComplete="off" spellCheck={false} placeholder={email} value={typed} onChange={(e) => setTyped(e.target.value)}
              className="min-h-12 rounded-[14px] border-2 border-line bg-bg px-3.5 text-[1rem] font-normal text-ink focus:border-accent focus:outline-none" />
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn min-h-12 px-5" onClick={() => dialog.current?.close()}>{t("shell.account.danger.cancel")}</button>
            <button type="submit" className="btn primary min-h-12 px-5 enabled:border-bad! enabled:bg-bad! enabled:text-surface! enabled:shadow-[0_4px_0_color-mix(in_srgb,var(--color-bad)_70%,black)]!" disabled={!matches || busy}>
              {busy ? t("shell.account.danger.deleting") : t("shell.account.danger.confirm")}
            </button>
          </div>
          {failed ? <Status tone="bad">{t("shell.account.danger.failed")}</Status> : <span className="text-[0.8125rem] text-muted">{t("shell.account.danger.hint")}</span>}
        </form>
      </dialog>
    </section>
  );
}
