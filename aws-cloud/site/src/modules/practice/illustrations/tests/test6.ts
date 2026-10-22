import type { Loader } from "../registry";

// Practice test 6. Keyed by numeric question id; the comment names the question number in the test.
export const test6: Record<string, Loader> = {
  "130168909": () => import("../specs/130168909"), // Q5: Aurora Replicas + CloudFront for read spikes
  "130168895": () => import("../specs/130168895"), // Q12: Transit Gateway hub with Direct Connect
  "130168891": () => import("../specs/130168891"), // Q13: one NAT gateway per AZ
  "130168881": () => import("../specs/130168881"), // Q19: same-Region Read Replica for analytics
  "130168887": () => import("../specs/130168887"), // Q22: AWS Budgets actions
  "130168889": () => import("../specs/130168889"), // Q23: Aurora global database DR
  "130168959": () => import("../specs/130168959"), // Q25: Site-to-Site VPN
  "130168963": () => import("../specs/130168963"), // Q27: two AZs behind an NLB
  "130168971": () => import("../specs/130168971"), // Q31: Kinesis Data Streams on-demand + Lambda
  "130168973": () => import("../specs/130168973"), // Q32: SQS priority queues
  "130168977": () => import("../specs/130168977"), // Q34: AWS VPN CloudHub
  "130168995": () => import("../specs/130168995"), // Q43: public NLB, private Auto Scaling group
  "130168919": () => import("../specs/130168919"), // Q48: Application Migration Service workflow
  "130168923": () => import("../specs/130168923"), // Q50: Cognito identity pool + S3 gateway endpoint
  "130168929": () => import("../specs/130168929"), // Q53: ALB + Multi-AZ RDS
  "130168931": () => import("../specs/130168931"), // Q54: CloudFront OAI to S3
  "130168955": () => import("../specs/130168955"), // Q56: NLB in front of bastion hosts
  "130168937": () => import("../specs/130168937"), // Q57: single-instance recovery with EIP
  "130168943": () => import("../specs/130168943"), // Q60: AWS WAF rate-based rule
  "130168947": () => import("../specs/130168947"), // Q62: CloudFront signed URLs and cookies
  "130168951": () => import("../specs/130168951"), // Q64: S3 gateway endpoint
  "130168953": () => import("../specs/130168953"), // Q65: S3 and DynamoDB gateway endpoints
};
