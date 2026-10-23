import { useEffect, useRef, useState } from "react";
import { useI18n } from "../app/i18n";
import { readDeck, today } from "../lib/flashcards";
import {
  DEFAULTS,
  MORE_BREAK,
  MORE_FOCUS,
  POMODORO_EVENT,
  POMODORO_KEYS,
  clock,
  dismiss,
  idle,
  isBreak,
  length,
  pause,
  prune,
  readLog,
  readSettings,
  readTimer,
  remaining,
  reset,
  restMore,
  select,
  settle,
  skip,
  skipBreak,
  start,
  status,
  studyMore,
  writeLog,
  writeSettings,
  writeTimer,
  type Mode,
  type PartRef,
  type Settings,
  type Timer,
} from "../lib/pomodoro";
import { getAllPartsRead, getLastPart } from "../lib/progress";

const MODES: Mode[] = ["focus", "short", "long"];

// Class lists for elements that appear more than once below.
/** Start / resume / pause: accent, edge-coloured in a break. */
const GO = "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-accent text-[0.875rem] font-bold text-on-accent in-data-[mode=break]:bg-edge in-data-[mode=break]:text-surface";
const ICON_BTN = "grid size-11 flex-none cursor-pointer place-items-center rounded-[14px] border border-line bg-bg text-ink enabled:hover:border-accent disabled:cursor-default disabled:opacity-45";
const OPTION = "flex min-h-[34px] cursor-pointer items-center justify-between gap-3";
const CHECKBOX = "size-4.5 flex-none accent-accent";
const END = "flex flex-col gap-4 p-6";
const END_TITLE = "m-0 text-[1.25rem]";
const END_TEXT = "m-0 text-[0.9rem] leading-[1.6] text-muted";
const END_FOOT = "flex flex-wrap items-center justify-between gap-2";
/** A choice at the end of a focus session; the flashcards one is highlighted. */
const CHOICE = "flex min-h-16 cursor-pointer items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left text-ink no-underline";
const CHOICE_ICON = "grid size-9 flex-none place-items-center rounded-[9px]";
const CHOICE_TEXT = "flex flex-col gap-0.5 [&_b]:text-[0.95rem] [&_small]:text-[0.8125rem] [&_small]:text-muted";
/** Flashcards offered during a break, and about how long they take. */
const BREAK_CARDS = 5;
/** "⏱ 18:42 · " or "☕ 3:10 · " in front of the page title. */
const TITLE_PREFIX = /^[⏱☕] \d+:\d\d · /;

function lastPart(): PartRef | undefined {
  const p = getLastPart();
  return p ? { key: `${p.lesson}/${p.slug}`, href: `/concepts/${p.lesson}/${p.slug}/`, title: p.title } : undefined;
}

// The chime needs an audio context the learner has unlocked with a press (Start).
let audio: AudioContext | undefined;
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    /* no Web Audio */
  }
}

function chime() {
  try {
    if (!audio) {
      if (!navigator.userActivation?.hasBeenActive) return;
      audio = new AudioContext();
    }
    const at = audio.currentTime;
    [880, 1318.5].forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.18, at + i * 0.22 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + i * 0.22 + 0.9);
      o.connect(g).connect(audio!.destination);
      o.start(at + i * 0.22);
      o.stop(at + i * 0.22 + 1);
    });
  } catch {
    /* audio blocked */
  }
}

function Ring({ size, stroke, frac, className }: { size: number; stroke: number; frac: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="stroke-accent transition-[stroke-dashoffset] duration-400 ease-linear in-data-[mode=break]:stroke-edge" />
    </svg>
  );
}

/**
 * Pomodoro timer in the top bar: a chip with the countdown, a panel to run it, and a dialog when a
 * session ends. The state lives in localStorage (lib/pomodoro), so every page and tab shows the same timer.
 */
export default function Pomodoro() {
  const { t, locale } = useI18n();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [timer, setTimer] = useState<Timer>(() => idle("focus", DEFAULTS));
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const commit = (next: Timer) => {
    setTimer(next);
    writeTimer(next);
  };

  // Load, and follow changes from other tabs, other islands (flashcards) and the back/forward cache.
  useEffect(() => {
    const sync = () => {
      const s = readSettings();
      setSettings(s);
      const tm = readTimer(s);
      // New lengths apply to a session not started yet.
      setTimer(status(tm) === "idle" && tm.total !== length(tm.mode, s) ? { ...tm, total: length(tm.mode, s) } : tm);
      setNow(Date.now());
    };
    const onStorage = (e: StorageEvent) => (e.key === null || POMODORO_KEYS.includes(e.key)) && sync();
    sync();
    addEventListener("storage", onStorage);
    addEventListener(POMODORO_EVENT, sync);
    addEventListener("pageshow", sync);
    return () => {
      removeEventListener("storage", onStorage);
      removeEventListener(POMODORO_EVENT, sync);
      removeEventListener("pageshow", sync);
    };
  }, []);

  // Tick once a second while running; a tab coming back into view catches up at once.
  const running = timer.endsAt !== undefined;
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  // A session ran out: settle it once (another tab may have done it already), then alert.
  useEffect(() => {
    if (timer.endsAt === undefined || now < timer.endsAt) return;
    const s = readSettings();
    const fresh = readTimer(s);
    if (fresh.endsAt !== timer.endsAt) {
      setTimer(fresh);
      return;
    }
    const at = Date.now();
    const { timer: next, sessions } = settle(fresh, s, at, getAllPartsRead(), lastPart());
    if (sessions.length) writeLog(prune([...readLog(), ...sessions], at));
    commit(next);
    // Alert only for a session that just ended, not one that ended while the site was closed.
    if (next.ended && at - next.ended.at < 60_000) {
      if (s.sound) chime();
      if (s.notify && document.hidden && "Notification" in window && Notification.permission === "granted") {
        const e = next.ended;
        const title = e.kind === "focus" ? t("shell.pomodoro.focusDone", { n: Math.min(e.round, s.every), every: s.every }) : t("shell.pomodoro.breakDone");
        const body = e.kind === "focus" ? t("shell.pomodoro.notifyFocus", { min: s[e.breakMode] }) : t("shell.pomodoro.notifyBreak");
        try {
          new Notification(title, { body, icon: "/icon-192.png", tag: "pomodoro" });
        } catch {
          /* notifications from a page are not allowed on this platform */
        }
      }
    }
  }, [now, timer.endsAt]);

  // The end-of-session dialog, in every tab, until the learner answers it.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (timer.ended && !d.open) {
      setOpen(false);
      d.showModal();
    } else if (!timer.ended && d.open) d.close();
  }, [timer.ended]);

  // The countdown in the tab title.
  const left = remaining(timer, now || Date.now());
  const state = status(timer);
  useEffect(() => {
    const base = document.title.replace(TITLE_PREFIX, "");
    const show = settings.title && state !== "idle" && now > 0;
    document.title = show ? `${isBreak(timer.mode) ? "☕" : "⏱"} ${clock(left)} · ${base}` : base;
  });

  // The panel closes on Esc, and on a press outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        setOpen(false);
        chip.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node;
      if (!panel.current?.contains(el) && !chip.current?.contains(el)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    panel.current?.querySelector<HTMLElement>("[aria-selected='true']")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const saveSettings = (s: Settings) => {
    setSettings(s);
    writeSettings(s);
  };

  async function toggleNotify(on: boolean) {
    setDenied(false);
    if (!on) return saveSettings({ ...settings, notify: false });
    if (!("Notification" in window)) return setDenied(true);
    const p = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (p === "granted") saveSettings({ ...settings, notify: true });
    else setDenied(true);
  }

  const L = (x: { vi: string; en: string }) => x[locale] || x.vi;
  const modeName = (m: Mode) => t(`shell.pomodoro.mode.${m}`);
  const time = clock(left);
  const brk = isBreak(timer.mode);
  const frac = timer.total ? left / timer.total : 1;
  const every = settings.every;
  const sessionNo = Math.min(timer.mode === "focus" ? timer.round + 1 : Math.max(timer.round, 1), every);
  const chipLabel =
    state === "idle" ? t("shell.pomodoro.chipIdle") : t(state === "running" ? "shell.pomodoro.chipRunning" : "shell.pomodoro.chipPaused", { mode: modeName(timer.mode), time });
  const nextMode: Mode = timer.mode === "focus" ? ((timer.round + 1) % every === 0 ? "long" : "short") : "focus";
  const reading = now > 0 ? lastPart() : undefined;

  // End-of-session dialog content.
  const ended = timer.ended;
  const deck = now > 0 && ended ? readDeck() : {};
  const due = Object.values(deck).filter((c) => c.due <= today()).length;
  const cards = due > 0 ? Math.min(BREAK_CARDS, due) : BREAK_CARDS;
  const parts = now > 0 && ended?.kind === "break" ? getAllPartsRead() : [];
  const last = now > 0 && ended?.kind === "break" ? getLastPart() : null;
  const next = last && (parts.includes(`${last.lesson}/${last.slug}`) ? last.next : { href: `/concepts/${last.lesson}/${last.slug}/`, title: last.title });
  const at = () => Date.now();

  return (
    <div className="relative flex-none">
      <button ref={chip} type="button" data-mode={brk ? "break" : "focus"} data-state={state}
        aria-expanded={open} aria-controls="pomodoro-panel" aria-label={chipLabel} title={chipLabel} onClick={() => setOpen((o) => !o)}
        className="group inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-[24px] border border-line bg-surface px-[7px] text-muted hover:border-accent hover:text-ink
          not-data-[state=idle]:border-accent not-data-[state=idle]:bg-accent-soft not-data-[state=idle]:pr-2.5 not-data-[state=idle]:pl-2 not-data-[state=idle]:text-ink
          data-[mode=break]:not-data-[state=idle]:border-edge data-[mode=break]:not-data-[state=idle]:bg-edge-soft
          max-sm:min-w-[30px] max-sm:px-1.5 max-sm:not-data-[state=idle]:px-2">
        {state === "idle" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" />
          </svg>
        ) : (
          <>
            <Ring size={18} stroke={4} frac={frac} className="max-sm:hidden" />
            <span className="font-mono text-[0.8125rem] font-semibold tabular-nums group-data-[state=paused]:opacity-70">{time}</span>
          </>
        )}
      </button>

      {open && <div className="hidden max-sm:fixed max-sm:inset-0 max-sm:z-29 max-sm:block max-sm:bg-black/50" aria-hidden="true" onClick={() => setOpen(false)} />}
      {open && (
        <section ref={panel} id="pomodoro-panel" data-mode={brk ? "break" : "focus"} aria-label={t("shell.pomodoro.panel")}
          className="absolute top-[calc(100%+10px)] -right-15 z-30 flex w-85 flex-col gap-4 rounded-lg border border-line bg-surface p-4.5 text-ink shadow-[0_18px_50px] shadow-black/28
            max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[88dvh] max-sm:w-auto max-sm:overflow-y-auto max-sm:rounded-t-[20px] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0
            max-sm:pt-2.5 max-sm:pb-[calc(22px+env(safe-area-inset-bottom,0px))]">
          <span className="hidden h-1 w-10 self-center rounded-[2px] bg-line max-sm:block" aria-hidden="true" />
          <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-bg p-1" role="tablist" aria-label={t("shell.pomodoro.modes")}>
            {MODES.map((m) => (
              <button key={m} type="button" role="tab"
                className="min-h-9 cursor-pointer rounded-[7px] border-0 bg-transparent text-[0.8125rem] text-muted hover:text-ink aria-selected:bg-accent-soft aria-selected:font-semibold aria-selected:text-ink aria-selected:data-[mode=break]:bg-edge-soft max-sm:min-h-10"
                aria-selected={timer.mode === m} data-mode={isBreak(m) ? "break" : "focus"}
                onClick={() => timer.mode !== m && commit(select(timer, settings, m))}>
                {modeName(m)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4.5 max-sm:flex-col max-sm:gap-2.5">
            <div className="relative size-33 flex-none">
              <Ring size={132} stroke={8} frac={frac} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <b className="font-mono text-[1.85rem] leading-[1.1] font-semibold tabular-nums">{time}</b>
                <small className="text-[0.75rem] text-muted">{t("shell.pomodoro.of", { time: clock(timer.total) })}</small>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 text-[0.8125rem] leading-[1.45] text-muted max-sm:items-center max-sm:text-center">
              <b className="text-[0.875rem] text-ink">{t("shell.pomodoro.round", { n: sessionNo, every })}</b>
              <span className="flex gap-[5px]" role="img" aria-label={t("shell.pomodoro.roundDots", { done: Math.min(timer.round, every), every })}>
                {Array.from({ length: every }, (_, i) => (
                  <i key={i} className="h-1.5 w-4 rounded-[3px] bg-line data-[on=done]:bg-accent data-[on=now]:bg-[color-mix(in_srgb,var(--accent)_45%,var(--line))]" data-on={i < timer.round ? "done" : i === timer.round && timer.mode === "focus" ? "now" : undefined} />
                ))}
              </span>
              {reading && (
                <span>
                  {t("shell.pomodoro.reading")} <a className="font-semibold text-ink" href={reading.href}>{L(reading.title)}</a>
                </span>
              )}
              <span>{t("shell.pomodoro.after", { mode: modeName(nextMode).toLowerCase(), min: settings[nextMode] })}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {state === "running" ? (
              <button type="button" className={GO} onClick={() => commit(pause(timer, at()))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
                {t("shell.pomodoro.pause")}
              </button>
            ) : (
              <button type="button" className={GO} onClick={() => { unlockAudio(); commit(start(timer, at(), getAllPartsRead())); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" /></svg>
                {t(state === "paused" ? "shell.pomodoro.resume" : "shell.pomodoro.start")}
              </button>
            )}
            <button type="button" className={ICON_BTN} aria-label={t("shell.pomodoro.skip")} title={t("shell.pomodoro.skip")} onClick={() => commit(skip(timer, settings))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="m5 5 10 7-10 7z" /><path d="M19 5v14" /></svg>
            </button>
            <button type="button" className={ICON_BTN} aria-label={t("shell.pomodoro.reset")} title={t("shell.pomodoro.reset")} disabled={state === "idle"} onClick={() => commit(reset(timer, settings))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v5h5" /></svg>
            </button>
          </div>

          <div className="flex flex-col gap-1 border-t border-line pt-3 text-[0.8125rem]">
            <label className={OPTION}><span>{t("shell.pomodoro.sound")}</span><input type="checkbox" className={CHECKBOX} checked={settings.sound} onChange={(e) => saveSettings({ ...settings, sound: e.target.checked })} /></label>
            <label className={OPTION}><span>{t("shell.pomodoro.notify")}</span><input type="checkbox" className={CHECKBOX} checked={settings.notify} onChange={(e) => void toggleNotify(e.target.checked)} /></label>
            {denied && <p className="m-0 text-[0.75rem] text-bad" role="status">{t("shell.pomodoro.notifyDenied")}</p>}
            <label className={OPTION}><span>{t("shell.pomodoro.title")}</span><input type="checkbox" className={CHECKBOX} checked={settings.title} onChange={(e) => saveSettings({ ...settings, title: e.target.checked })} /></label>
            <div className="flex justify-between gap-3 pt-1.5">
              <a className="py-1" href="/pomodoro/#settings">{t("shell.pomodoro.lengths", { focus: settings.focus, short: settings.short, long: settings.long })}</a>
              <a className="py-1" href="/pomodoro/">{t("shell.pomodoro.stats")} →</a>
            </div>
          </div>
        </section>
      )}

      <dialog ref={dialog} className="m-auto w-[min(440px,calc(100vw-24px))] rounded-[18px] border border-line bg-surface p-0 text-ink shadow-[0_30px_80px] shadow-black/45 backdrop:bg-black/55" aria-labelledby="pomo-dialog-title" onClose={() => timer.ended && commit(dismiss(readTimer(readSettings())))}>
        {ended?.kind === "focus" && (
          <div className={END}>
            <h2 className={END_TITLE} id="pomo-dialog-title">{t("shell.pomodoro.focusDone", { n: Math.min(ended.round, every) || every, every })}</h2>
            <p className={END_TEXT}>
              {ended.partDone && ended.part && ended.read <= 1
                ? t("shell.pomodoro.focusBodyPart", { part: L(ended.part.title), min: settings[ended.breakMode] })
                : ended.read > 0
                  ? t("shell.pomodoro.focusBodyParts", { n: ended.read, min: settings[ended.breakMode] })
                  : t("shell.pomodoro.focusBody", { min: settings[ended.breakMode] })}
            </p>
            <div className="flex flex-col gap-2">
              <a className={`${CHOICE} border-edge bg-edge-soft`} href={`/flashcards/?limit=${cards}`} onClick={() => commit(dismiss(timer))}>
                <span className={`${CHOICE_ICON} bg-edge text-surface`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="6" width="14" height="14" rx="2" /><path d="M7 3h12a2 2 0 0 1 2 2v12" /></svg>
                </span>
                <span className={CHOICE_TEXT}><b>{t("shell.pomodoro.cards", { n: cards })}</b><small>{due > 0 ? t("shell.pomodoro.cardsDue", { n: due, min: 2 }) : t("shell.pomodoro.cardsNew", { min: 2 })}</small></span>
              </a>
              <button type="button" className={`${CHOICE} border-line bg-bg hover:border-accent`} onClick={() => commit(dismiss(timer))}>
                <span className={`${CHOICE_ICON} bg-line text-ink`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 3v3M12 3v3" /></svg>
                </span>
                <span className={CHOICE_TEXT}><b>{t("shell.pomodoro.rest")}</b><small>{t("shell.pomodoro.restHint")}</small></span>
              </button>
            </div>
            <div className={END_FOOT}>
              <button type="button" className="btn min-h-11" onClick={() => commit(studyMore(timer, at()))}>{t("shell.pomodoro.studyMore", { min: MORE_FOCUS })}</button>
              <button type="button" className="min-h-11 cursor-pointer border-0 bg-transparent px-2 text-[0.8125rem] text-muted underline underline-offset-3 hover:text-ink" onClick={() => commit(skipBreak(timer, settings, at(), getAllPartsRead()))}>{t("shell.pomodoro.skipBreak")}</button>
            </div>
          </div>
        )}
        {ended?.kind === "break" && (
          <div className={END}>
            <h2 className={END_TITLE} id="pomo-dialog-title">{t("shell.pomodoro.breakDone")}</h2>
            <p className={END_TEXT}>
              {ended.cards && ended.cards.good + ended.cards.again > 0
                ? t("shell.pomodoro.breakCards", { n: ended.cards.good + ended.cards.again, good: ended.cards.good, again: ended.cards.again, next: timer.round + 1, every })
                : t("shell.pomodoro.breakBody", { next: timer.round + 1, every })}
            </p>
            {next && (
              <a className="flex flex-col gap-1 rounded-[18px] border border-accent bg-accent-soft px-4 py-3.5 text-ink no-underline" href={next.href} onClick={() => { unlockAudio(); commit(start(dismiss(timer), at(), getAllPartsRead())); }}>
                <small className="text-[0.75rem] text-muted">{t("shell.pomodoro.continue")}</small>
                <b className="text-[1rem]">{L(next.title)}</b>
              </a>
            )}
            <div className={END_FOOT}>
              <button type="button" className="btn primary min-h-11 flex-1" onClick={() => { unlockAudio(); commit(start(dismiss(timer), at(), getAllPartsRead())); }}>
                {t("shell.pomodoro.startNext", { n: timer.round + 1 })}
              </button>
              <button type="button" className="btn min-h-11" onClick={() => commit(restMore(timer, at()))}>{t("shell.pomodoro.restMore", { min: MORE_BREAK })}</button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
