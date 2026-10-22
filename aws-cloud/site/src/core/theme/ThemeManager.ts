import { Choice } from "../preferences/Choice";
import type { Preference } from "../preferences/Preference";
import { DEFAULT_THEME, type Theme } from "./types";

/**
 * Light or dark. Writes `data-theme` on <html>; every color in the CSS comes
 * from tokens redefined under [data-theme="dark"], so components never check
 * the theme themselves.
 */
export class ThemeManager extends Choice<Theme> {
  /** Class that turns on color transitions only while switching, never on page load. */
  static readonly switchingClass = "theme-switching";
  private timer?: ReturnType<typeof setTimeout>;

  constructor(preference: Preference<Theme>) {
    super(preference);
  }

  get theme(): Theme {
    return this.value;
  }

  toggle(): void {
    this.set(this.value === "dark" ? "light" : "dark");
  }

  /** Puts the current theme on <html> (also called once at start-up). */
  apply(animate = false): void {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (animate) {
      html.classList.add(ThemeManager.switchingClass);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => html.classList.remove(ThemeManager.switchingClass), 300);
    }
    html.dataset.theme = this.value;
  }

  protected override onChange(): void {
    this.apply(true);
  }

  readonly getSnapshot = (): Theme => this.value;
  readonly getServerSnapshot = (): Theme => DEFAULT_THEME;
}
