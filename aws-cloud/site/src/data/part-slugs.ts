/**
 * URL slug of every part (Scene) of every lesson: /concepts/<lesson>/<slug>/.
 * Keyed by the Vietnamese scene id; the English scene "en-<id>" shares the slug.
 * Slugs are part of public URLs: rename one only together with a redirect.
 */
export const PART_SLUGS: Record<string, Record<string, string>> = {
  "aws-map": { s1: "who-runs-what", s2: "order-journey", s3: "service-groups", s4: "how-to-study" },
  "global-infra": {
    s1: "region-scope", s2: "resource-scope", s3: "az-failure", s4: "edge-locations", s5: "global-accelerator",
    bluegreen: "global-blue-green", s6: "data-transfer-charges", confuse: "common-mistakes", challenge: "exercise", deep: "outposts",
  },
  vpc: {
    addr: "addressing-routing", s1: "internet-access", s2: "security-group-chain", s3: "nat-gateway", s4: "vpc-endpoints",
    s5: "multi-vpc", s6: "on-premises", hub: "network-hub", confuse: "common-mistakes", compare: "quick-comparison", challenge: "exercise",
  },
  route53: { s1: "alias-cname", s2: "ttl", s3: "routing-policies", s4: "hybrid-dns", confuse: "common-mistakes", challenge: "exercise" },
  cloudfront: {
    s1: "s3-origin-access", s2: "origin-types", s3: "request-flow", s4: "edge-acceleration", s5: "regional-edge-caches",
    s6: "quick-comparison", challenge: "exercise",
  },
  iam: {
    s1: "policy-permissions", s2: "permission-layers", s3: "iam-roles", s4: "organizations", s5: "workforce-access",
    confuse: "account-protection", s6: "quick-comparison", challenge: "exercise",
  },
  cognito: { s1: "customer-auth", s2: "employee-auth", s3: "quick-comparison", challenge: "exercise" },
  kms: { s1: "s3-encryption", s2: "share-encrypted-snapshot", s3: "at-rest-in-transit", s4: "quick-comparison", challenge: "exercise" },
  security: { s1: "aws-waf", s2: "security-incidents", s3: "quick-comparison", challenge: "exercise" },
  ec2: {
    s1: "cost-availability", s2: "launch-time", s3: "instance-networking", s4: "instance-failures", s5: "placement-groups",
    s6: "instance-lifecycle", challenge: "exercise",
  },
  elb: {
    s1: "alb-or-nlb", s2: "traffic-share", s3: "one-alb-many-services", s4: "unhealthy-targets", s5: "https-multi-domain",
    s6: "gateway-load-balancer", s7: "quick-comparison", challenge: "exercise",
  },
  asg: {
    setup: "configure-asg", s1: "scaling-policies", dynamic: "dynamic-scaling", s2: "az-failure-capacity", s3: "scale-in",
    s4: "instance-maintenance", health: "instance-replacement", challenge: "exercise",
  },
  lambda: { s1: "event-driven", s2: "production", sizing: "resources-packaging", s3: "apis", challenge: "exercise" },
  containers: { s1: "ec2-or-fargate", s2: "container-tasks", s3: "two-layer-scaling", s4: "on-premises-kubernetes", s5: "quick-comparison", challenge: "exercise" },
  s3: {
    s1: "storage-classes", s2: "versioning-object-lock", s3: "bucket-access", s4: "encryption-keys", s5: "upload-performance",
    s6: "static-website", s7: "quick-comparison", challenge: "exercise",
  },
  storage: { s1: "shared-storage", s2: "ebs-volumes", s3: "efs-configuration", s4: "fsx-file-systems", s5: "s3-file-interface", challenge: "exercise" },
  "storage-migration": { s1: "storage-gateway", s2: "data-transfer", s3: "server-database-migration", s4: "transfer-family", challenge: "exercise" },
  "backup-dr": { s1: "dr-strategies", s2: "database-resilience", s3: "aws-backup", s4: "ec2-recovery", s5: "quick-comparison", challenge: "exercise" },
  rds: {
    s1: "multi-az-read-replicas", s2: "operational-incidents", s3: "aurora", s4: "encrypt-running-database", s5: "reporting-dr-copies",
    s6: "quick-comparison", challenge: "exercise",
  },
  dynamodb: { s1: "key-access", s2: "capacity-dax", s3: "data-flows", s4: "recovery", s5: "multi-region", challenge: "exercise" },
  analytics: {
    s1: "database-cache", s2: "redis-memcached", s5: "cache-failure", s3: "data-tools", s4: "data-lake-cost",
    s6: "quick-comparison", challenge: "exercise",
  },
  messaging: { s1: "queues", s2: "message-lifecycle", s3: "fifo-queues", s4: "fan-out-workflows", s5: "quick-comparison", challenge: "exercise" },
  kinesis: { s1: "queues-and-streams", s2: "stream-throughput", s3: "stream-destinations", s4: "quick-comparison", challenge: "exercise" },
  monitoring: {
    s1: "alarm-delay", s2: "alarm-actions", s3: "log-retention", s4: "audit-compliance", s5: "patching",
    s6: "quick-comparison", challenge: "exercise",
  },
  iac: { s1: "templates", s2: "multi-account-region", s3: "elastic-beanstalk", s4: "service-catalog", challenge: "exercise" },
  others: { s1: "cost-control", s2: "commitments", s3: "ai-services", s4: "batch-hybrid", s5: "quick-comparison", challenge: "exercise" },
};
