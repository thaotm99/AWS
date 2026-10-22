// Practice test 1, question 5: IAM Roles for Service Accounts give each EKS Pod group its own least-privilege role.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222737,
  cols: 4.4,
  rows: 2.6,
  nodes: [
    { id: "ui", label: "UI Pods", kind: "actor", at: [0, 0.1] },
    { id: "data", label: "Data Pods", kind: "actor", at: [0, 1.5] },
    { id: "saUI", label: "Service account", sub: "ui", at: [1.15, 0.1] },
    { id: "saD", label: "Service account", sub: "data", at: [1.15, 1.5] },
    { id: "saAll", label: "Service account", sub: { vi: "dùng chung", en: "shared" }, at: [1.15, 0.8] },
    { id: "annot", label: "Pod annotation", sub: { vi: "gắn IAM policy?", en: "attach IAM policy?" }, kind: "ghost", at: [1.15, 0.8] },
    { id: "node", label: "Node instance profile", sub: "S3 + DynamoDB", at: [1.8, 0.8] },
    { id: "rUI", label: "IAM role", sub: { vi: "chỉ DynamoDB", en: "DynamoDB only" }, at: [2.3, 0.1] },
    { id: "rD", label: "IAM role", sub: { vi: "chỉ S3", en: "S3 only" }, at: [2.3, 1.5] },
    { id: "rAll", label: "IAM role", sub: "S3 + DynamoDB full", at: [2.3, 0.8] },
    { id: "ddb", label: "DynamoDB", kind: "data", at: [3.4, 0.1] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [3.4, 1.5] },
  ],
  zones: [{ id: "eks", label: "Amazon EKS", tone: "group", from: [0, 0.1], to: [1.15, 1.5], pad: 12 }],
  scenarios: [
    {
      option: "b",
      hide: ["saAll", "annot", "node", "rAll"],
      steps: [
        {
          flow: [["ui", "saUI", "rUI", "ddb"], ["data", "saD", "rD", "s3"]],
          caption: {
            vi: "Mỗi dịch vụ có Kubernetes service account riêng; IRSA ánh xạ mỗi service account tới một IAM role chỉ có quyền cần thiết, dựa trên OIDC identity provider mà EKS tích hợp.",
            en: "Each service has its own Kubernetes service account; IRSA maps each one to an IAM role with only the permissions it needs, through the OIDC identity provider EKS integrates with.",
          },
        },
        {
          stop: ["rUI", "s3"],
          badge: { vi: "không có quyền", en: "no permission" },
          caption: {
            vi: "UI Pod không truy cập được S3 và Data Pod không truy cập được DynamoDB: đặc quyền tối thiểu ở mức Pod, không dùng chung credential của EC2 node.",
            en: "UI Pods cannot reach S3 and data Pods cannot reach DynamoDB: least privilege at Pod level, without sharing the EC2 node's credentials.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Mỗi nhóm Pod một role tối thiểu.", en: "One least-privilege role per Pod group." } },
    },
    {
      option: "a",
      hide: ["saUI", "saD", "annot", "node", "rUI", "rD"],
      steps: [
        { flow: [["ui", "saAll", "rAll", "ddb"], ["data", "saAll", "rAll", "s3"]], tone: "warn", caption: { vi: "Mọi Pod dùng chung một service account gắn một IAM role có cả AmazonS3FullAccess và AmazonDynamoDBFullAccess.", en: "All Pods share one service account bound to a single IAM role with both AmazonS3FullAccess and AmazonDynamoDBFullAccess." } },
        {
          flow: ["ui", "saAll", "rAll", "s3"],
          tone: "bad",
          badge: { vi: "UI → S3", en: "UI → S3" },
          caption: {
            vi: "Không có ranh giới danh tính: UI Pod truy cập được S3 và Data Pod truy cập được DynamoDB, vi phạm yêu cầu.",
            en: "There is no identity boundary: UI Pods can reach S3 and data Pods can reach DynamoDB, which violates the requirement.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Quyền quá rộng cho mọi Pod.", en: "Too much access for every Pod." } },
    },
    {
      option: "c",
      hide: ["saUI", "saD", "saAll", "node", "rUI", "rD", "rAll"],
      steps: [
        {
          stop: ["ui", "annot"],
          caption: {
            vi: "Không thể gắn IAM policy trực tiếp vào Pod bằng annotation; ngoài IRSA, Pod chỉ thừa hưởng quyền từ IAM role của node.",
            en: "IAM policies cannot be attached to Pods through annotations; outside IRSA, Pods only inherit permissions from the node's IAM role.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không khả thi trên EKS.", en: "Not technically feasible in EKS." } },
    },
    {
      option: "d",
      hide: ["saUI", "saD", "saAll", "annot", "rUI", "rD", "rAll"],
      steps: [
        { flow: [["ui", "node", "ddb"], ["data", "node", "s3"]], tone: "warn", caption: { vi: "Cả hai policy được gắn vào instance profile của EKS node.", en: "Both policies are attached to the EKS nodes' instance profile." } },
        {
          flow: ["ui", "node", "s3"],
          tone: "bad",
          badge: { vi: "RBAC không chặn", en: "RBAC can't stop it" },
          caption: {
            vi: "Mọi Pod trên node thừa hưởng toàn bộ quyền; Kubernetes RBAC chỉ kiểm soát truy cập Kubernetes API, không kiểm soát truy cập S3 hay DynamoDB.",
            en: "Every Pod on the node inherits all permissions; Kubernetes RBAC controls access to the Kubernetes API, not to S3 or DynamoDB.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Quyền ở mức node, không ở mức Pod.", en: "Node-level, not Pod-level, permissions." } },
    },
  ],
};

export default spec;
