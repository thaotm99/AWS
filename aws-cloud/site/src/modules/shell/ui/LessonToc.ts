/**
 * "In this lesson" panel of a lesson page: lists the lesson's scenes, highlights the one being read,
 * shows how far the page has been read, and jumps between scenes with J / K.
 */
export class LessonToc {
  private sections: HTMLElement[] = [];
  private links: HTMLAnchorElement[] = [];
  private active = -1;
  private frame = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly content: HTMLElement,
  ) {}

  start(): void {
    this.collect();
    if (!this.sections.length) {
      this.root.hidden = true;
      return;
    }
    this.renderList();
    this.root.querySelector("ol")!.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest("a");
      const i = a ? this.links.indexOf(a as HTMLAnchorElement) : -1;
      if (i < 0) return;
      e.preventDefault();
      this.jump(i);
    });
    const update = () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.update());
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    addEventListener("keydown", (e) => this.onKey(e));
    this.update();
    this.syncTitle();
  }

  /** Rebuild for the language now on screen (each language has its own copy of the lesson). */
  refresh(): void {
    this.collect();
    this.links = [];
    this.root.querySelector("ol")!.replaceChildren();
    this.active = -1;
    this.renderList();
    this.update();
    this.syncTitle();
  }

  /** The page <title> is static Vietnamese; follow the lesson title shown in the panel. */
  private syncTitle(): void {
    // Chosen by <html lang>, not by layout: the panel itself is hidden at 1280px and below.
    const lang = document.documentElement.lang;
    const shown = this.root.querySelector<HTMLElement>(`.toc-lesson [data-lang="${CSS.escape(lang)}"]`);
    const title = (shown ?? this.root.querySelector(".toc-lesson"))?.textContent?.trim();
    if (title) document.title = `${title} · AWS Thực Chiến`;
  }

  /** Scenes of the visible language only: a hidden copy has no layout box. */
  private collect(): void {
    this.sections = [...this.content.querySelectorAll<HTMLElement>("section.scene[id]")].filter((s) => s.getClientRects().length > 0);
  }

  private jump(i: number): void {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.sections[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${this.sections[i].id}`);
  }

  private renderList(): void {
    const list = this.root.querySelector("ol")!;
    for (const s of this.sections) {
      const a = document.createElement("a");
      a.href = `#${s.id}`;
      const label = s.querySelector(".scene-no")?.textContent?.trim();
      if (label) {
        const small = document.createElement("small");
        small.textContent = label;
        a.append(small);
      }
      const title = document.createElement("span");
      title.textContent = s.querySelector(".scene-head h2")?.textContent?.trim() ?? s.id;
      a.append(title);
      const li = document.createElement("li");
      li.append(a);
      list.append(li);
      this.links.push(a);
    }
  }

  private update(): void {
    const max = document.documentElement.scrollHeight - innerHeight;
    const percent = max > 0 ? Math.round(Math.min(1, Math.max(0, scrollY / max)) * 100) : 100;
    document.documentElement.style.setProperty("--read", `${percent}%`);
    for (const el of document.querySelectorAll("[data-read-percent]")) el.textContent = `${percent}%`;

    // The scene being read is the last one whose top has passed a line 30% down the viewport.
    const line = innerHeight * 0.3;
    let active = 0;
    this.sections.forEach((s, i) => s.getBoundingClientRect().top <= line && (active = i));
    if (max > 0 && scrollY >= max - 2) active = this.sections.length - 1;
    if (active === this.active || !this.links[active]) return;
    this.active = active;
    this.links.forEach((a, i) => (i === active ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    const list = this.root.querySelector("ol")!;
    const link = this.links[active];
    if (list.scrollHeight > list.clientHeight) {
      list.scrollTo({ top: link.offsetTop - list.clientHeight / 2, behavior: "smooth" });
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    // A zoom view or the drawer covers the lesson: the keys must not scroll the page behind it.
    const html = document.documentElement.classList;
    if (html.contains("zoom-open") || html.contains("drawer-open")) return;
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key !== "j" && key !== "k") return;
    this.jump(Math.min(this.sections.length - 1, Math.max(0, this.active + (key === "j" ? 1 : -1))));
  }
}
