import type { Loader } from "../registry";

// Practice test 3. Keyed by numeric question id; the comment names the question number in the test.
export const test3: Record<string, Loader> = {
  "121078945": () => import("../specs/121078945"), // Q7: SQS through a VPC endpoint
  "121078923": () => import("../specs/121078923"), // Q9: internet gateway performs NAT
  "121078937": () => import("../specs/121078937"), // Q13: NLB routes to the primary private IP
  "121078981": () => import("../specs/121078981"), // Q14: cross-zone load balancing shares
  "121078941": () => import("../specs/121078941"), // Q16: Transit Gateway + transit VIF
  "121079001": () => import("../specs/121079001"), // Q18: VGW and customer gateway
  "121078993": () => import("../specs/121078993"), // Q23: instance profile for DynamoDB
  "121079003": () => import("../specs/121079003"), // Q31: Volume Gateway cached volumes
  "121078951": () => import("../specs/121078951"), // Q35: Route 53 Resolver inbound + outbound
  "121078999": () => import("../specs/121078999"), // Q37: S3 Transfer Acceleration
  "121078929": () => import("../specs/121078929"), // Q40: S3 + Lambda + DynamoDB + CloudFront
  "121079047": () => import("../specs/121079047"), // Q41: reports on a read replica
  "121078969": () => import("../specs/121078969"), // Q42: CloudFront + S3 static assets
  "121079005": () => import("../specs/121079005"), // Q44: NAT gateway for patches
  "121079019": () => import("../specs/121079019"), // Q45: Global Accelerator static IPs
  "121078985": () => import("../specs/121078985"), // Q47: S3 gateway endpoint
  "121079043": () => import("../specs/121079043"), // Q48: CloudFront to cut S3 transfer cost
  "121078957": () => import("../specs/121078957"), // Q50: Aurora Replicas for low lag
  "121079035": () => import("../specs/121079035"), // Q52: HTTP API JWT authorizer
  "121078991": () => import("../specs/121078991"), // Q53: API Gateway usage plans
  "121078925": () => import("../specs/121078925"), // Q60: OAI + AWS WAF on CloudFront
  "121078961": () => import("../specs/121078961"), // Q62: NAT gateway per AZ
  "121078953": () => import("../specs/121078953"), // Q63: RDS Multi-AZ synchronous replication
};
