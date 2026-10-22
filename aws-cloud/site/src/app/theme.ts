import { ThemeManager } from "../core/theme/ThemeManager";
import { DEFAULT_THEME, isTheme } from "../core/theme/types";
import { useTheme as useThemeOf } from "../core/theme/useTheme";
import { viewerPreference } from "./preferences";

const { preference, connect } = viewerPreference("theme", isTheme, DEFAULT_THEME);

export const theme = new ThemeManager(preference);
connect(theme);

export function useTheme() {
  return useThemeOf(theme);
}
