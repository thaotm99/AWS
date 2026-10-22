import { useSyncExternalStore } from "react";
import type { Store } from "./Store";

/** Re-renders the component whenever the store changes. */
export function useStore<S>(store: Store<S>): S {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
