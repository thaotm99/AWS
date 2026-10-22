// Practice test 4, question 56: scale EKS worker nodes with the Kubernetes Cluster Autoscaler and the EC2 Auto Scaling group.
// Captions follow the question's explanation (unschedulable pods, desired capacity of the Auto Scaling group, nodes
// registering with the cluster, scale-in of underutilised nodes; CloudWatch EC2 metrics, a polling Lambda function
// and Fargate as the alternatives).
import type { IllustrationSpec, StepSpec } from "../types";

const burst: StepSpec = {
  flow: ["hpa", "pods"],
  badge: "+ pods",
  caption: {
    vi: "Khi lưu lượng tăng, Horizontal Pod Autoscaler thêm pod theo CPU, nhưng các worker node đã dùng hết tài nguyên.",
    en: "As traffic bursts, the Horizontal Pod Autoscaler adds pods based on CPU, but the worker nodes are already at maximum utilisation.",
  },
};

const full: StepSpec = {
  mark: "nodes",
  tone: "warn",
  badge: "100%",
  caption: {
    vi: "Pod mới không thể được lập lịch lên node nào (unschedulable), trong khi số node vẫn giữ nguyên.",
    en: "The new pods cannot be scheduled on any node (unschedulable), while the node count stays the same.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516253,
  cols: 5,
  rows: 2.4,
  nodes: [
    { id: "hpa", label: "HPA", sub: { vi: "scale pod theo CPU", en: "pods by CPU" }, at: [0, 0.2] },
    { id: "pods", label: "Pending pods", sub: "unschedulable", kind: "actor", at: [0, 1.5] },
    { id: "nodes", label: "Worker nodes", sub: "EC2", kind: "data", at: [2.8, 0.2] },
    { id: "ca", label: "Cluster Autoscaler", at: [1.4, 1.5] },
    { id: "cw", label: "CloudWatch alarm", sub: "CPU · memory", at: [1.4, 1.5] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "mỗi 10 phút", en: "every 10 min" }, at: [1.4, 1.5] },
    { id: "asg", label: "EC2 Auto Scaling", sub: "node group", at: [2.8, 1.5] },
    { id: "fargate", label: "AWS Fargate", sub: "serverless pods", at: [2.8, 1.5] },
    { id: "node", label: { vi: "Node mới", en: "New node" }, sub: "EC2", kind: "data", at: [4, 1.5] },
  ],
  links: [["hpa", "nodes"]],
  scenarios: [
    {
      option: "d",
      hide: ["cw", "lambda", "fargate"],
      steps: [
        burst,
        full,
        {
          flow: ["pods", "ca"],
          caption: {
            vi: "Cluster Autoscaler làm việc cùng Kubernetes scheduler và liên tục theo dõi các pod unschedulable.",
            en: "The Cluster Autoscaler works with the Kubernetes scheduler and continuously watches for unschedulable pods.",
          },
        },
        {
          flow: ["ca", "asg"],
          badge: "desired + 1",
          caption: {
            vi: "Nó tìm Auto Scaling group đáp ứng được yêu cầu tài nguyên của pod và tăng desired capacity của group đó.",
            en: "It finds an Auto Scaling group that can satisfy the pods' resource requests and increases its desired capacity.",
          },
        },
        {
          flow: ["asg", "node"],
          caption: {
            vi: "EC2 node mới khởi chạy, đăng ký vào cluster và nhận các pod đang chờ. Khi tải giảm, node dư thừa được drain rồi terminate.",
            en: "New EC2 nodes launch, register with the cluster and host the pending pods. When load drops, underutilised nodes are drained and terminated.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Node tự mở rộng theo nhu cầu pod, chi phí vận hành thấp.",
          en: "Nodes scale with pod demand, with little administrative overhead.",
        },
      },
    },
    {
      option: "a",
      hide: ["ca", "lambda", "fargate"],
      steps: [
        burst,
        full,
        {
          flow: ["nodes", "cw"],
          tone: "warn",
          badge: "CPU %",
          caption: {
            vi: "CloudWatch alarm chỉ theo dõi metric ở cấp EC2 như CPU hay memory của cả cluster.",
            en: "The CloudWatch alarm watches EC2-level metrics such as cluster-wide CPU or memory.",
          },
        },
        {
          mark: "cw",
          tone: "bad",
          caption: {
            vi: "Các metric này không phản ánh ràng buộc lập lịch pod, nên không phát hiện được pod đang chờ do phân mảnh tài nguyên; quyết định scale tách rời khỏi Kubernetes.",
            en: "These metrics do not reflect pod scheduling, so pods pending from fragmentation go undetected; scaling decisions are decoupled from Kubernetes.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không thấy được pod đang chờ.", en: "Blind to pending pods." },
      },
    },
    {
      option: "b",
      hide: ["ca", "cw", "fargate"],
      steps: [
        burst,
        full,
        {
          flow: [["lambda", "pods"], ["lambda", "asg"]],
          tone: "warn",
          badge: { vi: "10 phút", en: "10 min" },
          caption: {
            vi: "Lambda function chạy 10 phút một lần để kiểm tra pod, rồi gọi eksctl hoặc AWS SDK để scale node.",
            en: "A Lambda function runs every 10 minutes to check the pods, then scales nodes through eksctl or the AWS SDK.",
          },
        },
        {
          mark: "lambda",
          tone: "bad",
          caption: {
            vi: "Cơ chế polling tự viết và script cần bảo trì làm tăng chi phí vận hành, khó xử lý sự cố hơn Cluster Autoscaler.",
            en: "Custom polling and scripts to maintain add operational overhead and are harder to troubleshoot than the Cluster Autoscaler.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Chi phí vận hành cao.", en: "High operational overhead." },
      },
    },
    {
      option: "c",
      hide: ["ca", "cw", "lambda", "asg", "node"],
      steps: [
        burst,
        {
          flow: ["pods", "fargate"],
          tone: "warn",
          caption: {
            vi: "Fargate chạy pod theo mô hình serverless, không cần quản lý EC2.",
            en: "Fargate runs pods serverlessly, without EC2 to manage.",
          },
        },
        {
          mark: "fargate",
          tone: "bad",
          caption: {
            vi: "Nhưng không phải workload Kubernetes nào cũng tương thích Fargate (DaemonSet, GPU…); chuyển đổi đòi hỏi thiết kế lại ứng dụng.",
            en: "But not every Kubernetes workload is Fargate-compatible (DaemonSets, GPUs…); migrating requires redesigning the application.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Cần thiết kế lại.", en: "It needs a redesign." },
      },
    },
  ],
};

export default spec;
