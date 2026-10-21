export type Cert = "CLF" | "SAA" | "DVA" | "SOA";

export interface ConceptRef {
  id: string;
  title: string;
  certs: Cert[];
}

export interface Layer {
  n: number;
  name: string;
  concepts: ConceptRef[];
}

export const CERTS: Cert[] = ["CLF", "SAA", "DVA", "SOA"];

const c = (id: string, title: string, certs: string): ConceptRef => ({
  id,
  title,
  certs: certs.split(" ") as Cert[],
});

// Learning order: each layer builds on the ones before it.
// Cert tags follow the general scope of each exam guide; re-check against the
// official guides before treating them as authoritative.
export const CURRICULUM: Layer[] = [
  { n: 0, name: "Nền cloud", concepts: [
    c("api", "Console, CLI, SDK đều là API · ARN", "CLF SAA DVA SOA"),
    c("global-infra", "Global Infrastructure", "CLF SAA DVA SOA"),
    c("shared-resp", "Shared Responsibility Model", "CLF SAA"),
    c("pricing", "Pricing models", "CLF SAA SOA"),
    c("well-arch", "Well-Architected Framework", "CLF SAA"),
  ]},
  { n: 1, name: "Identity & Security", concepts: [
    c("iam-basics", "IAM: Root, User, Group, Role", "CLF SAA DVA SOA"),
    c("iam-policy", "IAM Policy & evaluation logic", "SAA DVA SOA"),
    c("sts", "STS, AssumeRole, cross-account", "SAA DVA"),
    c("orgs", "Organizations & SCP", "SAA SOA"),
    c("identity-center", "IAM Identity Center / Federation", "SAA"),
    c("cognito", "Cognito", "SAA DVA"),
    c("kms", "KMS & envelope encryption", "SAA DVA SOA"),
    c("secrets", "Secrets Manager vs Parameter Store", "SAA DVA SOA"),
  ]},
  { n: 2, name: "Networking", concepts: [
    c("cidr", "CIDR trong VPC", "SAA SOA"),
    c("vpc", "VPC, Subnet, Route Table, IGW", "SAA SOA"),
    c("nat", "NAT Gateway", "SAA SOA"),
    c("sg-nacl", "Security Group vs NACL", "CLF SAA DVA SOA"),
    c("endpoints", "VPC Endpoint & PrivateLink", "SAA DVA SOA"),
    c("peering-tgw", "VPC Peering vs Transit Gateway", "SAA SOA"),
    c("vpn-dx", "Site-to-Site VPN vs Direct Connect", "SAA SOA"),
    c("route53", "Route 53 & routing policies", "SAA DVA SOA"),
    c("cloudfront", "CloudFront", "SAA DVA SOA"),
  ]},
  { n: 3, name: "Compute", concepts: [
    c("ec2", "EC2: instance types, AMI, User Data", "CLF SAA DVA SOA"),
    c("ebs-store", "EBS vs Instance Store", "SAA SOA"),
    c("elb", "ELB: ALB / NLB / GWLB", "SAA DVA SOA"),
    c("asg", "Auto Scaling Group", "SAA SOA"),
    c("containers", "ECS / EKS / Fargate / ECR", "SAA DVA"),
    c("lambda", "Lambda", "SAA DVA"),
    c("beanstalk", "Elastic Beanstalk", "DVA"),
  ]},
  { n: 4, name: "Storage", concepts: [
    c("storage-types", "Block / File / Object", "CLF SAA"),
    c("ebs", "EBS volume types & Snapshot", "SAA SOA"),
    c("efs-fsx", "EFS vs FSx", "SAA SOA"),
    c("s3-basics", "S3 cơ bản", "CLF SAA DVA SOA"),
    c("s3-adv", "S3 nâng cao", "SAA DVA SOA"),
    c("hybrid-storage", "Storage Gateway, DataSync, Snow", "SAA"),
  ]},
  { n: 5, name: "Database", concepts: [
    c("rds", "RDS: Multi-AZ vs Read Replica", "SAA DVA SOA"),
    c("aurora", "Aurora & Global Database", "SAA"),
    c("dynamodb", "DynamoDB", "SAA DVA"),
    c("elasticache", "ElastiCache", "SAA DVA"),
    c("purpose-db", "Purpose-built databases", "CLF SAA"),
  ]},
  { n: 6, name: "Integration & Operations", concepts: [
    c("messaging", "SQS vs SNS vs EventBridge", "SAA DVA"),
    c("kinesis", "Kinesis", "SAA DVA"),
    c("apigw-sfn", "API Gateway & Step Functions", "SAA DVA"),
    c("cloudwatch", "CloudWatch", "CLF SAA DVA SOA"),
    c("trail-config", "CloudTrail vs AWS Config", "SAA SOA"),
    c("iac", "CloudFormation / SAM / CDK", "DVA SOA"),
    c("cicd", "CI/CD: CodeBuild, CodeDeploy, CodePipeline", "DVA"),
  ]},
];

export const ALL_CONCEPTS = CURRICULUM.flatMap((layer) =>
  layer.concepts.map((concept) => ({ ...concept, layer })),
);

export function findConcept(id: string) {
  return ALL_CONCEPTS.find((x) => x.id === id);
}
