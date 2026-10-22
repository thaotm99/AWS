import { ApiError } from "../../../core/api/ApiClient";
import { LocalResource, type LocalRoute } from "../../../core/api/local/LocalResource";
import { isLocale } from "../../../core/i18n/types";
import type { Preferences } from "../domain/types";

const COLLECTION = "preferences";
const KEY = "me";

/**
 * GET   /preferences   the viewer's settings
 * PATCH /preferences   change some of them
 */
export class PreferenceResource extends LocalResource {
  routes(): LocalRoute[] {
    return [
      { method: "GET", pattern: "/preferences", handle: () => this.read() },
      { method: "PATCH", pattern: "/preferences", handle: (r) => this.patch(r.body) },
    ];
  }

  private async read(): Promise<Preferences> {
    return (await this.storage.get<Preferences>(COLLECTION, KEY)) ?? {};
  }

  private async patch(body: unknown): Promise<Preferences> {
    const input = body as Partial<Preferences>;
    if (input?.locale !== undefined && !isLocale(input.locale)) throw new ApiError(400, "Unsupported locale");
    const next = { ...(await this.read()), ...input };
    await this.storage.put(COLLECTION, KEY, next);
    return next;
  }
}
