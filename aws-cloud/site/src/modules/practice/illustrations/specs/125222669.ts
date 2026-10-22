// Practice test 1, question 11: API Gateway → Lambda validation → long-running backend on ECS with Fargate.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222669,
  cols: 4.3,
  rows: 1.5,
  nodes: [
    { id: "mobile", label: "Mobile clients", kind: "actor", at: [0, 0.3] },
    { id: "apigw", label: "API Gateway", sub: "REST API", at: [1.1, 0.3] },
    { id: "sqs", label: "Amazon SQS", at: [1.1, 0.3] },
    { id: "lam", label: "AWS Lambda", sub: { vi: "kiểm tra nhẹ", en: "light validation" }, at: [2.2, 0.3] },
    { id: "sfn", label: "Step Functions", sub: { vi: "kiểm tra", en: "validation" }, at: [2.2, 0.3] },
    { id: "eb", label: "EventBridge rules", sub: { vi: "dùng để kiểm tra?", en: "as validation?" }, kind: "ghost", at: [2.2, 0.3] },
    { id: "fg", label: "ECS on Fargate", sub: { vi: "chạy dài", en: "long-running" }, at: [3.3, 0.3] },
    { id: "eks", label: "EKS self-managed", sub: { vi: "scale thủ công", en: "manual scaling" }, at: [3.3, 0.3] },
    { id: "ls", label: "Amazon Lightsail", at: [3.3, 0.3] },
    { id: "eksa", label: "EKS Anywhere", sub: { vi: "máy chủ on-prem", en: "on-prem servers" }, kind: "onprem", at: [3.3, 0.3] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["sqs", "sfn", "eb", "eks", "ls", "eksa"],
      steps: [
        { flow: ["mobile", "apigw"], caption: { vi: "API Gateway cung cấp REST endpoint an toàn cho client di động.", en: "API Gateway exposes a secure REST endpoint for mobile clients." } },
        { flow: ["apigw", "lam"], badge: { vi: "kiểm tra", en: "validate" }, caption: { vi: "Lambda thực hiện bước kiểm tra nhẹ cho từng giao dịch.", en: "Lambda performs the lightweight validation of each transaction." } },
        {
          flow: ["lam", "fg"],
          badge: { vi: "không máy chủ", en: "no servers" },
          caption: {
            vi: "Giao dịch hợp lệ được chuyển tới ECS chạy trên Fargate; Fargate tự cấp compute và memory theo task definition, không phải quản lý cluster hay vá OS.",
            en: "Validated data goes to ECS on Fargate, which provisions compute and memory from the task definitions, with no cluster management or OS patching.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Được quản lý hoàn toàn, chạy được tác vụ dài.", en: "Fully managed, handles long-running work." } },
    },
    {
      option: "a",
      hide: ["sqs", "lam", "eb", "fg", "ls", "eksa"],
      steps: [
        { flow: ["mobile", "apigw", "sfn", "eks"], tone: "warn", caption: { vi: "Step Functions kiểm tra, Kubernetes Job trên EKS với node tự quản lý xử lý giao dịch.", en: "Step Functions validates and Kubernetes Jobs on EKS with self-managed nodes process the transactions." } },
        {
          mark: "eks",
          tone: "bad",
          badge: { vi: "node · bản vá", en: "nodes · patches" },
          caption: {
            vi: "Phải cấp phát và quản lý worker node, giám sát thành phần Kubernetes, vá bảo mật và scale thủ công — trái với yêu cầu không quản lý hạ tầng.",
            en: "Worker nodes must be provisioned and managed, Kubernetes components monitored, patches applied and the cluster scaled by hand — against the no-infrastructure requirement.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phải quản lý node.", en: "Nodes to manage." } },
    },
    {
      option: "b",
      hide: ["apigw", "lam", "sfn", "fg", "eks", "eksa"],
      steps: [
        { flow: ["mobile", "sqs", "eb", "ls"], tone: "warn", caption: { vi: "SQS nhận message, EventBridge rule xử lý payload, backend chạy trên Lightsail.", en: "SQS receives the messages, EventBridge rules handle the payload and the backend runs on Lightsail." } },
        {
          mark: "eb",
          tone: "bad",
          badge: { vi: "chỉ định tuyến", en: "routing only" },
          caption: {
            vi: "EventBridge là dịch vụ định tuyến, không chạy logic kiểm tra; Lightsail dành cho website và ứng dụng nhỏ, thiếu khả năng điều phối và mở rộng cho backend này.",
            en: "EventBridge is a routing service, not a logic engine for validation; Lightsail targets websites and small apps and lacks the orchestration and scale this backend needs.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai công cụ cho cả hai bước.", en: "Wrong tools for both steps." } },
    },
    {
      option: "d",
      hide: ["sqs", "sfn", "eb", "fg", "eks", "ls"],
      steps: [
        { flow: ["mobile", "apigw", "lam", "eksa"], tone: "warn", caption: { vi: "Phần đầu giống phương án tốt nhất, nhưng backend chạy trên EKS Anywhere ở trung tâm dữ liệu của công ty.", en: "The front half matches the best design, but the backend runs on EKS Anywhere in the company's data center." } },
        {
          mark: "eksa",
          tone: "bad",
          badge: { vi: "tự quản lý hạ tầng", en: "own infrastructure" },
          caption: {
            vi: "Phải quản lý toàn bộ phần cứng, mạng, bản vá OS, nâng cấp Kubernetes và scale worker node bằng script tự viết.",
            en: "Hardware, networking, OS patches, Kubernetes upgrades and worker-node scaling with custom scripts are all on the company.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Quay lại tự vận hành hạ tầng.", en: "Back to running infrastructure." } },
    },
  ],
};

export default spec;
