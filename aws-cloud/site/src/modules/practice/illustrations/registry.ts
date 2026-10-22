// Which questions have an illustration, keyed by numeric question id. This file is part of the page
// bundle, so it stays tiny: each spec is its own chunk, fetched only after the question is answered.
import type { QuestionId } from "../domain/types";
import type { IllustrationSpec } from "./types";

type Loader = () => Promise<{ default: IllustrationSpec }>;

export class IllustrationRegistry {
  private readonly cache = new Map<QuestionId, Promise<IllustrationSpec>>();

  constructor(private readonly loaders: Readonly<Record<QuestionId, Loader>>) {}

  has(id: QuestionId): boolean {
    return Object.prototype.hasOwnProperty.call(this.loaders, id);
  }

  load(id: QuestionId): Promise<IllustrationSpec> {
    let spec = this.cache.get(id);
    if (!spec) {
      if (!this.has(id)) return Promise.reject(new Error(`No illustration for question ${id}`));
      spec = this.loaders[id]().then((m) => m.default);
      // A failed download may succeed next time.
      spec.catch(() => this.cache.delete(id));
      this.cache.set(id, spec);
    }
    return spec;
  }
}

// Practice test 1 of SAA-C03 (pilot). Comments name the question number in that test.
export const illustrations = new IllustrationRegistry({
  "125222689": () => import("./specs/125222689"), // Q1: DAX + CloudFront
  "125222657": () => import("./specs/125222657"), // Q2: ALB across AZs
  "125222729": () => import("./specs/125222729"), // Q6: AWS WAF geo match
  "125222761": () => import("./specs/125222761"), // Q13: SQS FIFO
  "125222723": () => import("./specs/125222723"), // Q33: serverless sensor ingest
  "125222687": () => import("./specs/125222687"), // Q39: PrivateLink to a partner's RDS
  "125222757": () => import("./specs/125222757"), // Q48: ALB path-based routing
  "125222715": () => import("./specs/125222715"), // Q59: Global Accelerator failover
  "125222741": () => import("./specs/125222741"), // Q60: Kinesis Data Streams + Lambda
  "125222673": () => import("./specs/125222673"), // Q63: Route 53 Resolver outbound endpoint
});
