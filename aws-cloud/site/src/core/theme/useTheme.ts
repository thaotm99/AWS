import { useSyncExternalStore } from "react";
import type { ThemeManager } from "./ThemeManager";
import type { Theme } from "./types";

/** Current theme; re-renders when it changes. Only for parts that cannot use CSS tokens (e.g. canvas). */
export function useTheme(manager: ThemeManager): Theme {
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getServerSnapshot);
}
