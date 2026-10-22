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

  /** ☰ on phones: the sidebar becomes a drawer with a scrim; closes on scrim, Esc, a link, or widening the window. */
  private bindMenu(): void {
    const btn = document.getElementById("menuBtn");
    const drawer = document.getElementById("drawer");
    if (!btn || !drawer) return;
    const html = document.documentElement;
    const set = (open: boolean) => {
      html.classList.toggle("drawer-open", open);
      btn.setAttribute("aria-expanded", String(open));
      const key = open ? "shell.nav.closeMenu" : "shell.nav.openMenu";
      btn.setAttribute("data-i18n-attr", `aria-label:${key}`);
      btn.setAttribute("aria-label", this.i18n.translator().lookup(key));
      if (open) drawer.querySelector<HTMLElement>("a[href]")?.focus();
    };
    btn.addEventListener("click", () => set(!html.classList.contains("drawer-open")));
    document.getElementById("scrim")?.addEventListener("click", () => set(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && html.classList.contains("drawer-open")) {
        set(false);
        btn.focus();
      }
    });
    drawer.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a[href]:not([data-soon])")) set(false);
    });
    matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && set(false));
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
