import type { Loader } from "../registry";

// Practice test 4. Keyed by numeric question id; the comment names the question number in the test.
export const test4: Record<string, Loader> = {
  "119516209": () => import("../specs/119516209"), // Q3: Route 53 TTL still in effect
  "119516213": () => import("../specs/119516213"), // Q5: AMI copied to every Region for DR
  "119516289": () => import("../specs/119516289"), // Q13: RDS read replicas
  "119516217": () => import("../specs/119516217"), // Q16: default termination policy
  "119516285": () => import("../specs/119516285"), // Q18: Transit Gateway ECMP over VPN tunnels
  "119516201": () => import("../specs/119516201"), // Q19: RDS for SQL Server Multi-AZ
  "119516279": () => import("../specs/119516279"), // Q22: Kinesis Data Streams → Data Analytics → Firehose
  "119516271": () => import("../specs/119516271"), // Q23: gateway endpoints (S3, DynamoDB)
  "119516225": () => import("../specs/119516225"), // Q24: EFS mount target per AZ
  "119516299": () => import("../specs/119516299"), // Q26: ALB health checks fail
  "119516273": () => import("../specs/119516273"), // Q28: Transit Gateway hub
  "119516303": () => import("../specs/119516303"), // Q32: ElastiCache Multi-AZ automatic failover
  "119516223": () => import("../specs/119516223"), // Q37: Storage Gateway cached volumes
  "119516255": () => import("../specs/119516255"), // Q38: ping an EC2 instance (route table, security group)
  "119516291": () => import("../specs/119516291"), // Q39: IAM database authentication from Lambda
  "119516215": () => import("../specs/119516215"), // Q40: ALB with SNI certificates
  "119516297": () => import("../specs/119516297"), // Q44: API Gateway caching
  "119516257": () => import("../specs/119516257"), // Q45: VPC peering
  "119516249": () => import("../specs/119516249"), // Q46: SQS + EC2 Spot workers
  "119516247": () => import("../specs/119516247"), // Q48: Direct Connect primary, VPN backup
  "119516243": () => import("../specs/119516243"), // Q50: ElastiCache for Redis geospatial cache
  "119516235": () => import("../specs/119516235"), // Q52: security group referencing the ALB
  "119516221": () => import("../specs/119516221"), // Q54: DynamoDB DAX for a hot partition
  "119516253": () => import("../specs/119516253"), // Q56: Kubernetes Cluster Autoscaler on EKS
  "119516203": () => import("../specs/119516203"), // Q58: Global Accelerator static IPs
  "119516211": () => import("../specs/119516211"), // Q59: NLB without cross-zone load balancing
  "119516321": () => import("../specs/119516321"), // Q63: CloudFront origins, failover, field-level encryption
};
