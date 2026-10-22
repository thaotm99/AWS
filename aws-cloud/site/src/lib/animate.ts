const NS = "http://www.w3.org/2000/svg";

export type Pt = [number, number];

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Move a dot along a polyline inside `layer`. Resolves when it arrives.
 *  With fewer than 2 points there is no path to follow, so it resolves at once. */
export function travel(layer: SVGGElement, pts: Pt[], dur: number, cls: string, r = 6): Promise<void> {
  if (pts.length < 2) return Promise.resolve();
  return new Promise((resolve) => {
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", String(r));
    dot.setAttribute("class", cls);
    dot.setAttribute("cx", String(pts[0][0]));
    dot.setAttribute("cy", String(pts[0][1]));
    layer.appendChild(dot);

    const segs: { a: Pt; b: Pt; len: number }[] = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push({ a: pts[i - 1], b: pts[i], len });
      total += len;
    }
    const duration = prefersReducedMotion() ? Math.min(dur, 200) : dur;
    const t0 = performance.now();

    function step(now: number) {
      const p = Math.min(1, (now - t0) / duration);
      let d = p * total;
      let i = 0;
      while (i < segs.length - 1 && d > segs[i].len) {
        d -= segs[i].len;
        i++;
      }
      const { a, b, len } = segs[i];
      const f = len ? Math.min(1, d / len) : 1;
      dot.setAttribute("cx", String(a[0] + (b[0] - a[0]) * f));
      dot.setAttribute("cy", String(a[1] + (b[1] - a[1]) * f));
      if (p < 1) requestAnimationFrame(step);
      else {
        dot.remove();
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

/** Show a short-lived text label inside `layer`. */
export function flashText(layer: SVGGElement, x: number, y: number, s: string, cls: string, ms = 500) {
  const t = document.createElementNS(NS, "text");
  t.setAttribute("x", String(x));
  t.setAttribute("y", String(y));
  t.setAttribute("class", cls);
  t.textContent = s;
  layer.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
