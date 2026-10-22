/**
 * Marks every horizontally scrollable diagram frame (.svg-wrap) with data-scroll="start|middle|end"
 * so the stylesheet can fade the clipped edge. Frames that fit are left unmarked.
 */
export class ScrollCue {
  private readonly seen = new WeakSet<HTMLElement>();
  private scheduled = false;

  start(): void {
    this.scan();
    // Islands render their own frames after hydration; rescan (once per frame) when the DOM grows.
    new MutationObserver(() => this.schedule()).observe(document.body, { childList: true, subtree: true });
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.scan();
    });
  }

  private scan(): void {
    document.querySelectorAll<HTMLElement>(".svg-wrap").forEach((frame) => {
      if (this.seen.has(frame)) return;
      this.seen.add(frame);
      const update = () => this.mark(frame);
      frame.addEventListener("scroll", update, { passive: true });
      new ResizeObserver(update).observe(frame);
      update();
    });
  }

  private mark(frame: HTMLElement): void {
    const max = frame.scrollWidth - frame.clientWidth;
    if (max <= 2) {
      frame.removeAttribute("data-scroll");
      return;
    }
    const x = frame.scrollLeft;
    frame.dataset.scroll = x <= 2 ? "start" : x >= max - 2 ? "end" : "middle";
  }
}
