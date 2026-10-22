// Practice test 2, question 55: security groups along client → ALB (443) → EC2 (80) → RDS PostgreSQL (5432).
// Captions follow the question's explanation.
import type { FlowStepSpec, IllustrationSpec } from "../types";

const toAlb: FlowStepSpec = {
  flow: ["client", "alb"],
  badge: ":443",
  caption: {
    vi: "Client gửi request HTTPS tới ALB trên cổng 443; ALB kết thúc HTTPS.",
    en: "The client sends an HTTPS request to the ALB on port 443; the ALB terminates HTTPS.",
  },
};
const toEc2: FlowStepSpec = {
  flow: ["alb", "ec2"],
  badge: ":80",
  caption: {
    vi: "ALB chuyển request HTTP tới một EC2 instance trên cổng 80.",
    en: "The ALB forwards the HTTP request to an EC2 instance on port 80.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516067,
  cols: 4.4,
  rows: 1.5,
  nodes: [
    { id: "client", label: "Client", kind: "actor", at: [0, 0.3] },
    { id: "alb", label: "ALB", sub: "SG · HTTPS termination", at: [1.15, 0.3] },
    { id: "ec2", label: "EC2 · ASG", sub: "SG · HTTP", at: [2.3, 0.3] },
    { id: "rds", label: "RDS PostgreSQL", sub: "SG · 5432", kind: "data", at: [3.4, 0.3] },
  ],
  scenarios: [
    {
      option: "c",
      steps: [
        {
          ...toAlb,
          caption: {
            vi: "Client gửi request HTTPS tới ALB trên cổng 443, nên security group của ALB cần inbound rule cho phép mọi nguồn trên cổng 443.",
            en: "The client sends HTTPS to the ALB on port 443, so the ALB's security group needs an inbound rule from anywhere on port 443.",
          },
        },
        { ...toEc2, caption: { vi: "Phía sau, request tiếp tục tới EC2 và RDS theo các rule còn lại.", en: "Behind it, the request continues to EC2 and RDS under the other rules." } },
      ],
      verdict: { works: true, caption: { vi: "ALB: inbound 443 từ mọi nơi.", en: "ALB: inbound 443 from anywhere." } },
    },
    {
      option: "b",
      steps: [
        toAlb,
        {
          ...toEc2,
          badge: { vi: ":80 từ SG ALB", en: ":80 from ALB SG" },
          caption: {
            vi: "ALB chuyển request tới EC2 trên cổng 80, nên security group của EC2 cần inbound rule từ security group của ALB trên cổng 80.",
            en: "The ALB forwards to EC2 on port 80, so the EC2 security group needs an inbound rule from the ALB's security group on port 80.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "EC2: inbound 80 từ SG của ALB.", en: "EC2: inbound 80 from the ALB SG." } },
    },
    {
      option: "a",
      steps: [
        toAlb,
        toEc2,
        {
          flow: ["ec2", "rds"],
          badge: { vi: ":5432 từ SG EC2", en: ":5432 from EC2 SG" },
          caption: {
            vi: "EC2 truy cập PostgreSQL trên cổng 5432, nên security group của RDS cần inbound rule từ security group của EC2 trên cổng 5432.",
            en: "EC2 reaches PostgreSQL on port 5432, so the RDS security group needs an inbound rule from the EC2 security group on port 5432.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "RDS: inbound 5432 từ SG của EC2.", en: "RDS: inbound 5432 from the EC2 SG." } },
    },
    {
      option: "d",
      steps: [
        {
          stop: ["client", "alb"],
          badge: ":80",
          caption: {
            vi: "Client gửi request HTTPS tới ALB trên cổng 443, không phải 80, nên rule cho cổng 80 không phải là rule cần có.",
            en: "The client sends HTTPS to the ALB on port 443, not 80, so a port 80 rule is not the one needed.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai cổng ở ALB.", en: "Wrong port at the ALB." } },
    },
    {
      option: "e",
      steps: [
        toAlb,
        {
          stop: ["rds", "ec2"],
          badge: { vi: "từ SG RDS?", en: "from RDS SG?" },
          caption: {
            vi: "Security group của EC2 cần inbound rule từ security group của ALB, không phải từ security group của RDS: lưu lượng tới EC2 xuất phát từ ALB.",
            en: "The EC2 security group needs an inbound rule from the ALB's security group, not the RDS one: traffic to EC2 comes from the ALB.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai nguồn cho EC2.", en: "Wrong source for EC2." } },
    },
    {
      option: "f",
      steps: [
        toAlb,
        toEc2,
        {
          stop: ["ec2", "rds"],
          badge: ":80",
          caption: {
            vi: "EC2 truy cập PostgreSQL trên cổng 5432, không phải 80, nên rule cổng 80 không mở được kết nối tới database.",
            en: "EC2 reaches PostgreSQL on port 5432, not 80, so a port 80 rule does not open the database connection.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai cổng ở RDS.", en: "Wrong port at RDS." } },
    },
  ],
};

export default spec;
