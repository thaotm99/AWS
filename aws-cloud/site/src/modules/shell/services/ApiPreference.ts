import { BrowserPreference } from "../../../core/preferences/Preference";
import type { Preferences } from "../domain/types";
import type { PreferenceService } from "./PreferenceService";

type Field = keyof Preferences;
type Value<K extends Field> = NonNullable<Preferences[K]>;

/**
 * A viewer setting saved through the API (PATCH /preferences) like any other
 * data. The localStorage copy from BrowserPreference stays as a cache so the
 * first paint already uses it.
 */
export class ApiPreference<K extends Field> extends BrowserPreference<Value<K>> {
  constructor(
    private readonly field: K,
    private readonly service: PreferenceService,
    isValid: (value: unknown) => value is Value<K>,
    fallback: Value<K>,
  ) {
    super(field, isValid, fallback);
  }

  override write(value: Value<K>): void {
    super.write(value);
    this.service
      .update({ [this.field]: value } as Partial<Preferences>)
      .catch((e) => console.error(`[preferences] could not save ${this.field}`, e));
  }

  /** The stored value, e.g. one chosen on another device once a server exists. */
  async load(): Promise<Value<K> | undefined> {
    return (await this.service.get())[this.field] as Value<K> | undefined;
  }
}
