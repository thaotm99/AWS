import type { I18n } from "../../../core/i18n/I18n";

/**
 * Full-screen view for diagrams. On a computer the diagram opens over the page at full size;
 * on a phone it opens landscape: the browser's orientation lock when it has one, otherwise the
 * view is rotated with CSS, so the whole diagram fits without sideways scrolling.
 *
 * Lesson simulations and the home map are Astro islands: the button goes in a bar just before the
 * island (outside React's tree) and the island itself is what opens. Other views (practice
 * illustrations) call open() with their own element. Pictures inside practice questions and
 * explanations (IMAGES) get a button too; they open as a copy of the picture.
 *
 * While open, everything outside the view is inert (Tab and screen readers stay inside it), and
 * on close focus goes back to where it was, or to the button that opened the view.
 */
const IMAGES = ".pr-html img";

export class DiagramZoom<M> {
  private current: HTMLElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private readonly bars: HTMLButtonElement[] = [];
  /** Copy of a picture shown full screen; removed on close. */
  private sheet: HTMLElement | null = null;
  /** Where focus was before opening; it goes back there on close. */
  private returnFocus: HTMLElement | null = null;
  /** Elements this view made inert, so close() restores exactly those. */
  private inerted: HTMLElement[] = [];
  /** The button that opens each zoomable element (or picture copy): the focus fallback on close. */
  private readonly buttons = new WeakMap<HTMLElement, HTMLButtonElement>();

  constructor(private readonly i18n: I18n<M>) {}

  /** Phones and small tablets: offer the landscape view instead of the enlarged one. */
  static get phone(): boolean {
    return matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 700;
  }

  start(): void {
    for (const island of document.querySelectorAll<HTMLElement>("main astro-island")) {
      if (!island.querySelector(".svg-wrap") || island.parentElement?.closest("astro-island")) continue;
      const bar = document.createElement("div");
      bar.className = "zoom-bar";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "zoom-btn";
      btn.addEventListener("click", () => this.open(island));
      bar.append(btn);
      island.before(bar);
      this.bars.push(btn);
      this.buttons.set(island, btn);
    }
    // Question text is rendered by React and replaced on every question: watch for new pictures.
    this.markImages();
    new MutationObserver(() => this.markImages()).observe(document.body, { childList: true, subtree: true });
    // Capture phase: the zoom is the top layer, so it takes Esc before the drawer or the page sees it.
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape" || !this.current) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      },
      true,
    );
    addEventListener("resize", () => this.fitRotation());
    document.addEventListener("fullscreenchange", () => !document.fullscreenElement && this.current && this.close());
    this.i18n.subscribe(() => this.label());
    this.label();
  }

  /** A "Phóng to" button under each picture large enough to be a diagram. */
  private markImages(): void {
    let added = false;
    for (const img of document.querySelectorAll<HTMLImageElement>(IMAGES)) {
      // A picture inside a button (an answer option, say) already has a click action of its own.
      if (img.dataset.zoom || img.closest("button")) continue;
      added = true;
      img.dataset.zoom = "1";
      const bar = document.createElement("span");
      bar.className = "zoom-bar zoom-bar-img";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "zoom-btn";
      const openThis = (e: Event) => {
        // Keep the click away from the question's own handlers around the picture.
        e.stopPropagation();
        this.openImage(img, btn);
      };
      img.addEventListener("click", openThis);
      btn.addEventListener("click", openThis);
      bar.append(btn);
      img.after(bar);
      this.bars.push(btn);
    }
    if (!added) return; // also keeps the observer from reacting to its own label changes
    this.bars.splice(0, this.bars.length, ...this.bars.filter((b) => b.isConnected));
    this.label();
  }

  openImage(img: HTMLImageElement, btn?: HTMLButtonElement): void {
    const back = this.current ? this.returnFocus : (document.activeElement as HTMLElement | null);
    this.close(false);
    const sheet = document.createElement("div");
    sheet.className = "zoom-image";
    const copy = document.createElement("img");
    copy.src = img.currentSrc || img.src;
    copy.alt = img.alt;
    sheet.append(copy);
    document.body.append(sheet);
    this.sheet = sheet;
    if (btn) this.buttons.set(sheet, btn);
    void this.open(sheet);
    // open() runs synchronously up to the close button; keep the focus noted on the page, not inside a previous view.
    this.returnFocus = back;
  }

  private lookup(key: string): string {
    return this.i18n.translator().lookup(key);
  }

  private label(): void {
    const phone = DiagramZoom.phone;
    const text = this.lookup(phone ? "shell.zoom.rotate" : "shell.zoom.open");
    for (const b of this.bars) {
      if (b.textContent !== text) b.textContent = text;
      b.dataset.icon = phone ? "rotate" : "expand";
    }
    if (this.closeBtn) {
      // Icon only: the name is for screen readers and the tooltip.
      const name = this.lookup("shell.zoom.close");
      this.closeBtn.setAttribute("aria-label", name);
      this.closeBtn.title = name;
    }
  }

  async open(el: HTMLElement): Promise<void> {
    if (this.current === el) return;
    if (this.current) this.close(false);
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.current = el;
    el.classList.add("zoomed");
    document.documentElement.classList.add("zoom-open");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "zoom-close";
    close.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    close.addEventListener("click", () => this.close());
    document.body.append(close);
    this.closeBtn = close;
    this.label();
    this.trap(el);
    close.focus();

    if (!DiagramZoom.phone) return;
    // Real landscape where the browser allows it (Android); CSS rotation everywhere else (iOS).
    try {
      await document.documentElement.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
    } catch {
      /* not supported: fall back to rotating the view */
    }
    this.fitRotation();
  }

  /**
   * Make everything outside the view inert: walk up from the zoomed element to <body> and mark
   * the siblings at each level, except the close button.
   */
  private trap(el: HTMLElement): void {
    for (let node: HTMLElement = el; node !== document.body && node.parentElement; node = node.parentElement) {
      for (const sib of node.parentElement.children) {
        if (sib === node || sib === this.closeBtn || !(sib instanceof HTMLElement) || sib.inert) continue;
        if (sib.tagName === "SCRIPT" || sib.tagName === "STYLE") continue;
        sib.inert = true;
        this.inerted.push(sib);
      }
    }
  }

  private release(): void {
    for (const el of this.inerted) el.inert = false;
    this.inerted = [];
  }

  /** @param restoreFocus false when another view opens straight after. */
  close(restoreFocus = true): void {
    if (!this.current) return;
    this.release();
    this.current.classList.remove("zoomed");
    document.documentElement.classList.remove("zoom-open", "zoom-rotate");
    this.closeBtn?.remove();
    this.closeBtn = null;
    const el = this.current;
    this.current = null;
    if (this.sheet) {
      this.sheet.remove();
      this.sheet = null;
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try {
      screen.orientation?.unlock?.();
    } catch {
      /* nothing to unlock */
    }
    if (el.isConnected) el.scrollIntoView({ block: "nearest" });
    const back = this.returnFocus;
    this.returnFocus = null;
    if (!restoreFocus) return;
    const fallback = this.buttons.get(el) ?? el.querySelector<HTMLElement>(".zoom-btn");
    const usable = back && back !== document.body && back.isConnected && !back.closest("[inert]");
    (usable ? back : fallback)?.focus({ preventScroll: true });
  }

  /** Rotate with CSS only while a phone is still held upright. */
  private fitRotation(): void {
    const rotate = Boolean(this.current) && DiagramZoom.phone && innerHeight > innerWidth;
    document.documentElement.classList.toggle("zoom-rotate", rotate);
  }
}
