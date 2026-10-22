import type { Loader } from "../registry";

// Practice test 5. Keyed by numeric question id; the comment names the question number in the test.
export const test5: Record<string, Loader> = {
  "119517481": () => import("../specs/119517481"), // Q1: ALB vs Auto Scaling health checks
  "119517575": () => import("../specs/119517575"), // Q3: Aurora reader endpoint + replica failover
  "119517571": () => import("../specs/119517571"), // Q6: Kinesis → OpenSearch → QuickSight
  "119517565": () => import("../specs/119517565"), // Q9: PrivateLink to a SaaS API
  "119517557": () => import("../specs/119517557"), // Q13: AWS WAF on CloudFront
  "119517555": () => import("../specs/119517555"), // Q14: Transit Gateway vs non-transitive peering
  "119517577": () => import("../specs/119517577"), // Q19: CloudWatch alarm reboot action
  "119517581": () => import("../specs/119517581"), // Q21: CloudFront + S3 Transfer Acceleration
  "119517585": () => import("../specs/119517585"), // Q23: S3 event → Lambda thumbnails
  "119517587": () => import("../specs/119517587"), // Q24: S3 gateway endpoint
  "119517589": () => import("../specs/119517589"), // Q25: RDS Multi-AZ CNAME failover
  "119517591": () => import("../specs/119517591"), // Q26: two SQS queues between two ASGs
  "119517597": () => import("../specs/119517597"), // Q29: DB security group inbound rule
  "119517603": () => import("../specs/119517603"), // Q32: API Gateway → SQS → Lambda → Comprehend
  "119517483": () => import("../specs/119517483"), // Q35: Kinesis Data Streams with two consumers
  "119517487": () => import("../specs/119517487"), // Q37: ElastiCache session store
  "119517489": () => import("../specs/119517489"), // Q38: Kinesis enhanced fan-out
  "119517501": () => import("../specs/119517501"), // Q44: SQS dead-letter queue
  "119517503": () => import("../specs/119517503"), // Q45: WAF geo match + IP set
  "119517509": () => import("../specs/119517509"), // Q48: DataSync then File Gateway
  "119517523": () => import("../specs/119517523"), // Q55: Global Accelerator failover
  "119517525": () => import("../specs/119517525"), // Q56: Route 53 failover to S3 error page
  "119517527": () => import("../specs/119517527"), // Q57: AWS WAF placement
  "119517539": () => import("../specs/119517539"), // Q63: internet gateway route + network ACL
};
