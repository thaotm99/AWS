import type { Attempt, CertificationId } from "../../domain/types";
import { AttemptService } from "../../services/AttemptService";
import { Review } from "../../domain/Review";
import type { CatalogService } from "../../services/CatalogService";
import { Controller } from "../../../../core/state/Controller";
import type { EventBus } from "../../../../core/state/EventBus";
import type { PracticeEvent } from "../events";
import { CatalogStore, type CatalogState } from "../stores/CatalogStore";

/** Certification picker and exam list. */
export class CatalogController extends Controller<PracticeEvent, CatalogState, CatalogStore> {
  private request = 0;

  constructor(
    bus: EventBus<PracticeEvent>,
    private readonly catalog: CatalogService,
    private readonly attempts: AttemptService,
  ) {
    super(bus, new CatalogStore());
  }

  protected bind(): void {
    this.on("catalog/open", (e) => this.open(e.certId));
  }

  private async open(certId: CertificationId | null): Promise<void> {
    const request = ++this.request;
    this.store.loading();
    try {
      const certifications = await this.catalog.listCertifications();
      const id = certId ?? certifications[0]?.id;
      const [selected, attempts] = id
        ? await Promise.all([
            this.catalog.getCertification(id),
            // Progress badges are extras: unreadable storage must not hide the exam list.
            this.attempts.list(id).catch((e) => {
              console.warn("[practice] could not load attempts", e);
              return [] as Attempt[];
            }),
          ])
        : [null, [] as Attempt[]];
      if (request === this.request) this.store.loaded(certifications, selected, AttemptService.latestByExam(attempts), Review.bookIds(attempts).length);
    } catch (e) {
      if (request === this.request) this.store.failed({ code: "loadCatalog", detail: Controller.message(e) });
    }
  }
}
