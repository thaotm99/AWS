import type { Choice } from "../core/preferences/Choice";
import { FixedPreference, type Preference } from "../core/preferences/Preference";
import type { Preferences } from "../modules/shell/domain/types";
import { ApiPreference } from "../modules/shell/services/ApiPreference";
import { PreferenceService } from "../modules/shell/services/PreferenceService";
import { getApiClient } from "./api";

let service: PreferenceService | undefined;

/**
 * A viewer setting backed by PATCH /preferences in the browser, fixed to its
 * default at build time. `connect` brings the choice in line with the stored value.
 */
export function viewerPreference<K extends keyof Preferences>(
  field: K,
  isValid: (value: unknown) => value is NonNullable<Preferences[K]>,
  fallback: NonNullable<Preferences[K]>,
) {
  type V = NonNullable<Preferences[K]>;
  if (typeof window === "undefined") {
    return { preference: new FixedPreference<V>(fallback) as Preference<V>, connect: (_: Choice<V>) => {} };
  }
  const preference = new ApiPreference(field, (service ??= new PreferenceService(getApiClient())), isValid, fallback);
  return {
    preference: preference as Preference<V>,
    connect(choice: Choice<V>) {
      preference
        .load()
        .then((saved) => saved !== undefined && saved !== choice.value && choice.set(saved))
        .catch((e) => console.error(`[preferences] could not load ${field}`, e));
    },
  };
}
