import { ApiService } from "../../../core/api/ApiService";
import type { Preferences } from "../domain/types";

export class PreferenceService extends ApiService {
  get(): Promise<Preferences> {
    return this.api.get<Preferences>("/preferences");
  }

  update(patch: Partial<Preferences>): Promise<Preferences> {
    return this.api.patch<Preferences>("/preferences", patch);
  }
}
