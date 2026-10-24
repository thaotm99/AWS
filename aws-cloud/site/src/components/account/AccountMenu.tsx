// The account button in the top bar: the learner's picture or initial, opening a menu with the name
// and email, the account page, study progress and sign-out. Shown only when the site runs with
// accounts (app/userData loaded /api/me); without them it renders nothing.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../app/i18n";
import { signOut } from "../../app/session";
import { userData } from "../../app/userData";
import Avatar from "./Avatar";

const ITEM = "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[12px] border-0 bg-transparent px-3 text-left text-[0.9375rem] text-ink no-underline hover:bg-bg hover:text-ink focus-visible:bg-bg";

export default function AccountMenu() {
  const { t } = useI18n();
  const account = userData.mode === "server" ? userData.account : null;
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];

  // Opening moves focus to the first item; Esc or a press outside closes the menu.
  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account) return null;
  const { user } = account;
  const name = user.name?.trim() || user.email;

  // Arrow keys, Home and End move between the items, as in any menu.
  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => list[(i + list.length) % list.length]?.focus();
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div className="relative flex-none" data-account>
      <button ref={button} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls="account-menu"
        aria-label={t("shell.account.open", { name })} title={name} onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-line bg-surface p-0 hover:border-accent aria-expanded:border-accent max-sm:h-8 max-sm:w-8">
        <Avatar user={user} className="h-full w-full text-[0.9375rem] max-sm:text-[0.875rem]" />
      </button>
      {open && (
        <div ref={menu} id="account-menu" role="menu" aria-label={t("shell.account.menu")} onKeyDown={onMenuKey}
          className="absolute top-[calc(100%+10px)] right-0 z-30 flex w-80 flex-col rounded-[20px] border-2 border-line bg-surface p-2 shadow-[0_16px_40px_rgb(20_18_43/0.14)]
            max-sm:fixed max-sm:top-[calc(env(safe-area-inset-top,0px)+60px)] max-sm:right-3 max-sm:left-3 max-sm:w-auto">
          <div className="flex min-w-0 items-center gap-3 p-3">
            <Avatar user={user} className="h-11 w-11 text-[1rem]" />
            <span className="flex min-w-0 flex-col">
              <b className="truncate text-[0.9375rem]">{name}</b>
              {user.name && <span className="truncate text-[0.8125rem] text-muted">{user.email}</span>}
            </span>
          </div>
          <a role="menuitem" className={ITEM} href="/account/" tabIndex={-1}>
            <svg className="flex-none text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            {t("shell.account.page")}
          </a>
          <a role="menuitem" className={ITEM} href="/progress/" tabIndex={-1}>
            <svg className="flex-none text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
            {t("shell.account.progress")}
          </a>
          <div className="mx-2 my-1.5 h-px bg-line" role="separator" />
          <button type="button" role="menuitem" tabIndex={-1} className={`${ITEM} text-bad hover:text-bad`} disabled={leaving}
            onClick={() => {
              setLeaving(true);
              void signOut();
            }}>
            <svg className="flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" /></svg>
            {leaving ? t("shell.account.signingOut") : t("shell.account.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
