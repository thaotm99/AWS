import type { Loader } from "../registry";

// Practice test 2. Keyed by numeric question id; the comment names the question number in the test.
export const test2: Record<string, Loader> = {
  "119516135": () => import("../specs/119516135"), // Q1: EKS on Fargate + Amazon MQ (AMQP)
  "119516073": () => import("../specs/119516073"), // Q3: IAM role for EC2 instead of stored keys
  "119516157": () => import("../specs/119516157"), // Q4: Transfer Family SFTP into S3
  "119516175": () => import("../specs/119516175"), // Q5: Aurora Global Database
  "119516123": () => import("../specs/119516123"), // Q6: Route 53 latency routing + Aurora cross-Region replica
  "119516147": () => import("../specs/119516147"), // Q10: SSE-C
  "119516179": () => import("../specs/119516179"), // Q11: DataSync over Direct Connect to an EFS interface endpoint
  "119516079": () => import("../specs/119516079"), // Q13: Aurora reader endpoint
  "119516111": () => import("../specs/119516111"), // Q14: S3 → SQS → Lambda image processing
  "119516057": () => import("../specs/119516057"), // Q16: cross-account Lambda → S3
  "119516097": () => import("../specs/119516097"), // Q17: ALB authentication with a Cognito user pool
  "119516093": () => import("../specs/119516093"), // Q21: shared services VPC behind Transit Gateway
  "119516087": () => import("../specs/119516087"), // Q22: blue/green with Global Accelerator
  "119516137": () => import("../specs/119516137"), // Q24: S3 access points per prefix
  "119516109": () => import("../specs/119516109"), // Q25: RDS Multi-AZ engine upgrade downtime
  "119516105": () => import("../specs/119516105"), // Q26: Textract → Comprehend
  "119516059": () => import("../specs/119516059"), // Q27: EventBridge Scheduler → ECS Fargate
  "119516065": () => import("../specs/119516065"), // Q28: security groups, web 443 → MSSQL 1433
  "119516081": () => import("../specs/119516081"), // Q29: per-instance EBS → S3 or EFS
  "119516167": () => import("../specs/119516167"), // Q30: WAF IP match on CloudFront
  "119516061": () => import("../specs/119516061"), // Q31: 3 AZs × 2 instances
  "119516143": () => import("../specs/119516143"), // Q36: VPC sharing with AWS RAM
  "119516117": () => import("../specs/119516117"), // Q45: encrypt RDS via snapshot copy
  "119516071": () => import("../specs/119516071"), // Q46: S3 replication with a KMS multi-Region key
  "119516119": () => import("../specs/119516119"), // Q47: SQS buffer for sensor bursts
  "119516127": () => import("../specs/119516127"), // Q52: Aurora replicas, dev DB from backups
  "119516075": () => import("../specs/119516075"), // Q53: ALB + ASG + Aurora Serverless v2
  "119516067": () => import("../specs/119516067"), // Q55: security groups ALB → EC2 → RDS
  "119516181": () => import("../specs/119516181"), // Q57: share an encrypted snapshot and KMS key
  "119516101": () => import("../specs/119516101"), // Q58: API Gateway resource policy IP allow list
  "119516125": () => import("../specs/119516125"), // Q59: Route 53 failover to a warm AWS environment
};
