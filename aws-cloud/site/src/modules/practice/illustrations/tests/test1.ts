import type { Loader } from "../registry";

// Practice test 1. Keyed by numeric question id; the comment names the question number in the test.
export const test1: Record<string, Loader> = {
  "125222689": () => import("../specs/125222689"), // Q1: DAX + CloudFront
  "125222657": () => import("../specs/125222657"), // Q2: ALB across AZs
  "125222729": () => import("../specs/125222729"), // Q6: AWS WAF geo match
  "125222761": () => import("../specs/125222761"), // Q13: SQS FIFO
  "125222723": () => import("../specs/125222723"), // Q33: serverless sensor ingest
  "125222687": () => import("../specs/125222687"), // Q39: PrivateLink to a partner's RDS
  "125222757": () => import("../specs/125222757"), // Q48: ALB path-based routing
  "125222715": () => import("../specs/125222715"), // Q59: Global Accelerator failover
  "125222741": () => import("../specs/125222741"), // Q60: Kinesis Data Streams + Lambda
  "125222673": () => import("../specs/125222673"), // Q63: Route 53 Resolver outbound endpoint
};
