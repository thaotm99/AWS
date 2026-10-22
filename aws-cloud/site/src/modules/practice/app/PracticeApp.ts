import type { ApiClient } from "../../../core/api/ApiClient";
import { getApiClient } from "../../../app/api";
import { AttemptService } from "../services/AttemptService";
import { CatalogService } from "../services/CatalogService";
import { CatalogController } from "./controllers/CatalogController";
import { ExamController } from "./controllers/ExamController";
import { EventBus } from "../../../core/state/EventBus";
import type { Dispatch, PracticeEvent } from "./events";

/** Composition root: wires API client → services → controllers once per page. */
export class PracticeApp {
  private static instance?: PracticeApp;

  readonly bus = new EventBus<PracticeEvent>();
  readonly catalog: CatalogController;
  readonly exam: ExamController;
  private readonly attempts: AttemptService;

  constructor(api: ApiClient) {
    const catalog = new CatalogService(api);
    const attempts = (this.attempts = new AttemptService(api));
    this.catalog = new CatalogController(this.bus, catalog, attempts).attach();
    this.exam = new ExamController(this.bus, catalog, attempts).attach();
  }

  /**
   * Deletes all saved progress through the API (DELETE /attempts), so it reaches whichever
   * storage currently holds it. Used by the crash screen, where the page is reloaded afterwards.
   */
  resetProgress(): Promise<void> {
    return this.attempts.clear();
  }

  static get(): PracticeApp {
    return (PracticeApp.instance ??= new PracticeApp(getApiClient()));
  }

  readonly dispatch: Dispatch = (event) => this.bus.emit(event);
}
