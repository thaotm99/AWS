export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
/** The bright light theme is the default look; dark stays one click away (top bar). */
export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}
