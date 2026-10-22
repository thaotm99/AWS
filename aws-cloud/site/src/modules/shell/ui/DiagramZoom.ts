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
 */
const IMAGES = ".pr-html img";

export class DiagramZoom<M> {
  private current: HTMLElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private readonly bars: HTMLButtonElement[] = [];
  /** Copy of a picture shown full screen; removed on close. */
  private sheet: HTMLElement | null = null;

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
    // Question text is rendered by React and replaced on every question: watch for new pictures.
    this.markImages();
    new MutationObserver(() => this.markImages()).observe(document.body, { childList: true, subtree: true });
    addEventListener("keydown", (e) => e.key === "Escape" && this.close());
    addEventListener("resize", () => this.fitRotation());
    document.addEventListener("fullscreenchange", () => !document.fullscreenElement && this.current && this.close());
    this.i18n.subscribe(() => this.label());
    this.label();
  }

  /** A "Phóng to" button under each picture large enough to be a diagram. */
  private markImages(): void {
    let added = false;
    for (const img of document.querySelectorAll<HTMLImageElement>(IMAGES)) {
      if (img.dataset.zoom) continue;
      added = true;
      img.dataset.zoom = "1";
      img.addEventListener("click", () => this.openImage(img));
      const bar = document.createElement("span");
      bar.className = "zoom-bar zoom-bar-img";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "zoom-btn";
      btn.addEventListener("click", () => this.openImage(img));
      bar.append(btn);
      img.after(bar);
      this.bars.push(btn);
    }
    if (!added) return; // also keeps the observer from reacting to its own label changes
    this.bars.splice(0, this.bars.length, ...this.bars.filter((b) => b.isConnected));
    this.label();
  }

  openImage(img: HTMLImageElement): void {
    this.close();
    const sheet = document.createElement("div");
    sheet.className = "zoom-image";
    const copy = document.createElement("img");
    copy.src = img.currentSrc || img.src;
    copy.alt = img.alt;
    sheet.append(copy);
    document.body.append(sheet);
    this.sheet = sheet;
    void this.open(sheet);
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
    if (this.current && this.current !== el) this.close();
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
  }

  /** Rotate with CSS only while a phone is still held upright. */
  private fitRotation(): void {
    const rotate = Boolean(this.current) && DiagramZoom.phone && innerHeight > innerWidth;
    document.documentElement.classList.toggle("zoom-rotate", rotate);
  }
}
