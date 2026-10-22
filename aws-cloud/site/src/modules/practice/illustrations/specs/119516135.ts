// Practice test 2, question 1: Kubernetes app with AMQP messaging moved to EKS on Fargate and Amazon MQ.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516135,
  cols: 3.4,
  rows: 1.5,
  nodes: [
    { id: "app", label: "Microservices", sub: { vi: "Kubernetes · AMQP", en: "Kubernetes · AMQP" }, kind: "onprem", at: [0, 0.3] },
    { id: "eks", label: "Amazon EKS", sub: "AWS Fargate", at: [1.15, 0.3] },
    { id: "ecs", label: "Amazon ECS", sub: "EC2 launch type", at: [1.15, 0.3] },
    { id: "asg", label: "EC2 Auto Scaling", sub: { vi: "tự quản lý", en: "self-managed" }, at: [1.15, 0.3] },
    { id: "mq", label: "Amazon MQ", sub: { vi: "broker hỗ trợ AMQP", en: "AMQP broker" }, at: [2.4, 0.3] },
    { id: "sqs", label: "Amazon SQS", sub: { vi: "không hỗ trợ AMQP", en: "no AMQP" }, at: [2.4, 0.3] },
    { id: "sns", label: "Amazon SNS", sub: "pub/sub", at: [2.4, 0.3] },
    { id: "rabbit", label: "RabbitMQ on EC2", sub: { vi: "tự vận hành", en: "self-hosted" }, kind: "ghost", at: [2.4, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["ecs", "asg", "sqs", "sns", "rabbit"],
      steps: [
        {
          flow: ["app", "eks"],
          badge: "Kubernetes",
          caption: {
            vi: "Amazon EKS tương thích Kubernetes, nên công ty dùng lại được manifest, Helm chart và cấu hình service hiện có.",
            en: "Amazon EKS is Kubernetes-compatible, so the company reuses its existing manifests, Helm charts and service configurations.",
          },
        },
        {
          mark: "eks",
          tone: "ok",
          badge: { vi: "không có node EC2", en: "no EC2 nodes" },
          caption: {
            vi: "Chạy workload bằng AWS Fargate nên không phải cấp phát và quản lý EC2 worker node, giảm gánh nặng hạ tầng mà vẫn mở rộng được.",
            en: "Running the workloads on AWS Fargate avoids provisioning and managing EC2 worker nodes, cutting infrastructure overhead while keeping scalability.",
          },
        },
        {
          flow: ["eks", "mq"],
          badge: "AMQP",
          caption: {
            vi: "Khi kết hợp với Amazon MQ, phần nhắn tin tiếp tục dùng AMQP như trước.",
            en: "Combined with Amazon MQ, messaging keeps using AMQP as before.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Dùng lại cấu hình Kubernetes, không quản lý node.", en: "Kubernetes configuration reused, no nodes to manage." },
      },
    },
    {
      option: "c",
      hide: ["ecs", "asg", "sqs", "sns", "rabbit"],
      steps: [
        {
          flow: ["app", "eks", "mq"],
          badge: "AMQP",
          caption: {
            vi: "Amazon MQ là message broker được quản lý hoàn toàn, hỗ trợ AMQP (cùng MQTT, STOMP, JMS); ứng dụng giữ nguyên code nhắn tin và cấu hình AMQP.",
            en: "Amazon MQ is a fully managed message broker that supports AMQP (as well as MQTT, STOMP and JMS); the application keeps its messaging code and AMQP configuration.",
          },
        },
        {
          mark: "mq",
          tone: "ok",
          badge: { vi: "được quản lý", en: "managed" },
          caption: {
            vi: "Amazon MQ lo tính sẵn sàng, độ bền và vá lỗi, giảm đáng kể gánh nặng vận hành.",
            en: "Amazon MQ handles availability, durability and patching, which significantly reduces the operational burden.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Giữ AMQP, không phải vận hành broker.", en: "AMQP kept, no broker to operate." },
      },
    },
    {
      option: "b",
      hide: ["ecs", "asg", "mq", "sns", "rabbit"],
      steps: [
        {
          stop: ["eks", "sqs"],
          badge: { vi: "không AMQP", en: "no AMQP" },
          caption: {
            vi: "Amazon SQS không hỗ trợ AMQP, nên ứng dụng không thể giao tiếp với SQS như với broker hiện tại.",
            en: "Amazon SQS does not support AMQP, so the application cannot communicate with it as it does with its current broker.",
          },
        },
        {
          mark: "app",
          tone: "bad",
          badge: { vi: "viết lại", en: "rewrite" },
          caption: {
            vi: "Phải viết lại logic nhắn tin theo mô hình polling và SDK của SQS — trái với yêu cầu thay đổi code tối thiểu.",
            en: "The messaging logic would have to be rewritten for SQS's polling model and SDKs, which goes against the minimal-code-change requirement.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Mất AMQP, phải sửa nhiều code.", en: "AMQP lost, major code changes." } },
    },
    {
      option: "d",
      hide: ["eks", "asg", "mq", "sqs", "rabbit"],
      steps: [
        {
          flow: ["app", "ecs"],
          tone: "warn",
          badge: { vi: "vá · mở rộng", en: "patch · scale" },
          caption: {
            vi: "ECS với EC2 launch type kéo theo trách nhiệm quản lý hạ tầng: vá lỗi, mở rộng, giám sát.",
            en: "ECS on the EC2 launch type brings infrastructure duties: patching, scaling and monitoring.",
          },
        },
        {
          stop: ["ecs", "sns"],
          caption: {
            vi: "Amazon SNS không hỗ trợ AMQP và dành cho pub/sub, không phải nhắn tin point-to-point.",
            en: "Amazon SNS does not support AMQP and is meant for pub/sub, not point-to-point messaging.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai giao thức, thêm việc vận hành.", en: "Wrong protocol, more operations." } },
    },
    {
      option: "e",
      hide: ["eks", "ecs", "mq", "sqs", "sns"],
      steps: [
        {
          flow: ["app", "asg", "rabbit"],
          tone: "warn",
          badge: "AMQP",
          caption: {
            vi: "RabbitMQ tự cài trên EC2 giữ được AMQP.",
            en: "A self-hosted RabbitMQ on EC2 preserves AMQP compatibility.",
          },
        },
        {
          mark: "rabbit",
          tone: "bad",
          badge: { vi: "vá · failover", en: "patch · failover" },
          caption: {
            vi: "Nhưng công ty phải tự quản lý broker: vá lỗi, mở rộng, giám sát và failover — trái với yêu cầu giảm vận hành khi đã có Amazon MQ.",
            en: "But the company must manage the broker itself: patching, scaling, monitoring and failover — against the low-overhead requirement when Amazon MQ exists.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Broker và máy chủ phải tự vận hành.", en: "Broker and servers to operate." } },
    },
  ],
};

export default spec;
