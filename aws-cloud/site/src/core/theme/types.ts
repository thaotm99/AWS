export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
/** Most of our readers are developers, who mostly work in dark mode. */
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}
