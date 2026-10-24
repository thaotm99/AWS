import { useState } from "react";
import type { AccountUser } from "../../core/userdata/UserDataStore";

/** The first letter of the name (or the email) in a circle, or the Google profile picture. */
export function initialOf(user: AccountUser): string {
  return (user.name?.trim() || user.email).charAt(0).toLocaleUpperCase();
}

export default function Avatar({ user, className = "" }: { user: AccountUser; className?: string }) {
  const [broken, setBroken] = useState(false);
  const base = `grid flex-none place-items-center overflow-hidden rounded-full bg-accent-soft font-display font-bold text-accent-strong dark:text-ink ${className}`;
  if (user.picture && !broken) {
    return (
      <span className={base} aria-hidden="true">
        <img className="h-full w-full object-cover" src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      </span>
    );
  }
  return <span className={base} aria-hidden="true">{initialOf(user)}</span>;
}
