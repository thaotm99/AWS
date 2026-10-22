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
    this.sections = [...this.content.querySelectorAll<HTMLElement>("section.scene[id]")];
    if (!this.sections.length) {
      this.root.hidden = true;
      return;
    }
    this.renderList();
    const update = () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.update());
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    addEventListener("keydown", (e) => this.onKey(e));
    this.update();
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
    if (active === this.active) return;
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
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key !== "j" && key !== "k") return;
    const next = Math.min(this.sections.length - 1, Math.max(0, this.active + (key === "j" ? 1 : -1)));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.sections[next].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${this.sections[next].id}`);
  }
}
