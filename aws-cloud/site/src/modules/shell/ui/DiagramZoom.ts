import type { I18n } from "../../../core/i18n/I18n";

/**
 * Full-screen view for diagrams. On a computer the diagram opens over the page at full size;
 * on a phone it opens landscape: the browser's orientation lock when it has one, otherwise the
 * view is rotated with CSS, so the whole diagram fits without sideways scrolling.
 *
 * Lesson simulations and the home map are Astro islands: the button goes in a bar just before the
 * island (outside React's tree) and the island itself is what opens. Other views (practice
 * illustrations) call open() with their own element.
 */
export class DiagramZoom<M> {
  private current: HTMLElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private readonly bars: HTMLButtonElement[] = [];

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
    }
    addEventListener("keydown", (e) => e.key === "Escape" && this.close());
    addEventListener("resize", () => this.fitRotation());
    document.addEventListener("fullscreenchange", () => !document.fullscreenElement && this.current && this.close());
    this.i18n.subscribe(() => this.label());
    this.label();
  }

  private lookup(key: string): string {
    return this.i18n.translator().lookup(key);
  }

  private label(): void {
    const phone = DiagramZoom.phone;
    for (const b of this.bars) {
      b.textContent = this.lookup(phone ? "shell.zoom.rotate" : "shell.zoom.open");
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
    if (this.current) this.close();
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

  close(): void {
    if (!this.current) return;
    this.current.classList.remove("zoomed");
    document.documentElement.classList.remove("zoom-open", "zoom-rotate");
    this.closeBtn?.remove();
    this.closeBtn = null;
    const el = this.current;
    this.current = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try {
      screen.orientation?.unlock?.();
    } catch {
      /* nothing to unlock */
    }
    el.scrollIntoView({ block: "nearest" });
  }

  /** Rotate with CSS only while a phone is still held upright. */
  private fitRotation(): void {
    const rotate = Boolean(this.current) && DiagramZoom.phone && innerHeight > innerWidth;
    document.documentElement.classList.toggle("zoom-rotate", rotate);
  }
}
