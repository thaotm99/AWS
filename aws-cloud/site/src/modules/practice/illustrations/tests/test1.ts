import type { Loader } from "../registry";

// Practice test 1. Keyed by numeric question id; the comment names the question number in the test.
export const test1: Record<string, Loader> = {
  "125222689": () => import("../specs/125222689"), // Q1: DAX + CloudFront
  "125222657": () => import("../specs/125222657"), // Q2: ALB across AZs
  "125222685": () => import("../specs/125222685"), // Q4: S3 → Lambda → Comprehend → DynamoDB
  "125222737": () => import("../specs/125222737"), // Q5: IAM Roles for Service Accounts on EKS
  "125222729": () => import("../specs/125222729"), // Q6: AWS WAF geo match
  "125222745": () => import("../specs/125222745"), // Q7: Aurora Global Database + regional Aurora
  "125222717": () => import("../specs/125222717"), // Q9: cross-account EFS for Lambda
  "125222703": () => import("../specs/125222703"), // Q10: IAM Identity Center + AD Connector
  "125222669": () => import("../specs/125222669"), // Q11: API Gateway → Lambda → ECS on Fargate
  "125222641": () => import("../specs/125222641"), // Q12: EFS access with security groups and IAM
  "125222761": () => import("../specs/125222761"), // Q13: SQS FIFO
  "125222693": () => import("../specs/125222693"), // Q18: S3 Transfer Acceleration + multipart upload
  "125222765": () => import("../specs/125222765"), // Q22: SSE-KMS audit trail
  "125222647": () => import("../specs/125222647"), // Q32: Standby / suspend ReplaceUnhealthy
  "125222723": () => import("../specs/125222723"), // Q33: serverless sensor ingest
  "125222643": () => import("../specs/125222643"), // Q35: File Gateway (NFS) → S3 lifecycle
  "125222733": () => import("../specs/125222733"), // Q37: Direct Connect + VPN
  "125222677": () => import("../specs/125222677"), // Q38: Route 53 geolocation / CloudFront geo restriction
  "125222687": () => import("../specs/125222687"), // Q39: PrivateLink to a partner's RDS
  "125222753": () => import("../specs/125222753"), // Q41: AMI copy creates a snapshot in Region B
  "125222701": () => import("../specs/125222701"), // Q42: EFS over inter-Region VPC peering
  "125222755": () => import("../specs/125222755"), // Q47: Babelfish + SCT/DMS
  "125222757": () => import("../specs/125222757"), // Q48: ALB path-based routing
  "125222725": () => import("../specs/125222725"), // Q50: SNS → Lambda concurrency quota
  "125222665": () => import("../specs/125222665"), // Q51: S3 prefixes for request rate
  "125222739": () => import("../specs/125222739"), // Q54: ASG rebalancing vs unhealthy replacement
  "125222719": () => import("../specs/125222719"), // Q55: RDS Proxy + SQS workers
  "125222715": () => import("../specs/125222715"), // Q59: Global Accelerator failover
  "125222741": () => import("../specs/125222741"), // Q60: Kinesis Data Streams + Lambda
  "125222673": () => import("../specs/125222673"), // Q63: Route 53 Resolver outbound endpoint
  "125222695": () => import("../specs/125222695"), // Q64: multipart upload + S3 Transfer Acceleration
};
