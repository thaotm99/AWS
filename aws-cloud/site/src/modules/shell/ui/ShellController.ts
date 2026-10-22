import type { I18n } from "../../../core/i18n/I18n";
import { DomTranslator } from "../../../core/i18n/DomTranslator";
import { isLocale } from "../../../core/i18n/types";
import type { ThemeManager } from "../../../core/theme/ThemeManager";

/** Browser side of the static page shell: language and theme switches, mobile study-path button, "coming soon" toast. */
export class ShellController<M> {
  private readonly dom = new DomTranslator();
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly i18n: I18n<M>,
    private readonly theme: ThemeManager,
  ) {}

  start(): void {
    this.theme.apply();
    this.bindLanguageSwitch();
    document.getElementById("themeToggle")?.addEventListener("click", () => this.theme.toggle());
    this.bindMenu();
    this.bindSoonLinks();
    this.i18n.subscribe(() => this.render());
    this.theme.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    this.dom.apply(this.i18n.translator());
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-locale]")) {
      b.setAttribute("aria-pressed", String(b.dataset.locale === this.i18n.locale));
    }
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      const label = this.i18n.translator().lookup(this.theme.theme === "dark" ? "shell.theme.toLight" : "shell.theme.toDark");
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }
  }

  private bindLanguageSwitch(): void {
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-locale]")) {
      b.addEventListener("click", () => isLocale(b.dataset.locale) && this.i18n.setLocale(b.dataset.locale));
    }
  }

  private bindMenu(): void {
    const btn = document.getElementById("menuBtn");
    btn?.addEventListener("click", () => {
      const open = document.getElementById("sidebar")!.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  private bindSoonLinks(): void {
    for (const a of document.querySelectorAll<HTMLAnchorElement>("[data-soon]")) {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const { lookup } = this.i18n.translator();
        this.toast(lookup("shell.nav.soon", { page: lookup(a.dataset.soon!) }));
      });
    }
  }

  private toast(text: string): void {
    const t = document.getElementById("toast")!;
    t.textContent = text;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (t.hidden = true), 2400);
  }
}
