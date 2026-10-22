// Practice test 6, question 27: two EC2 instances from the same AMI in two AZs behind an NLB with health checks.
// Captions follow the question's explanation. Additional sources:
// - A load balancer routes traffic only to healthy targets:
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
// - Auto Scaling replaces an unhealthy instance to maintain the group's capacity:
//   https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-health-checks.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168963,
  cols: 4.4,
  rows: 3.2,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.2] },
    { id: "nlb", label: "NLB", sub: "health checks", at: [1.3, 1.2] },
    { id: "alb", label: "ALB", sub: "health checks", at: [1.3, 1.2] },
    { id: "ec2a", label: "EC2", sub: { vi: "từ AMI", en: "from AMI" }, at: [2.6, 0.3] },
    { id: "ec2b", label: "EC2", sub: { vi: "từ AMI", en: "from AMI" }, at: [2.6, 2.1] },
    { id: "fargate", label: "Fargate task", sub: { vi: "cần container", en: "needs containers" }, kind: "ghost", at: [2.6, 0.3] },
    { id: "backup", label: "AWS Backup", sub: { vi: "mỗi giờ", en: "hourly" }, kind: "data", at: [3.7, 1.2] },
  ],
  zones: [
    { id: "aza", label: "AZ a", tone: "az", from: [2.6, 0.3], to: [2.6, 0.3], pad: 20 },
    { id: "azb", label: "AZ b", tone: "az", from: [2.6, 2.1], to: [2.6, 2.1], pad: 20 },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["alb", "fargate", "backup"],
      steps: [
        {
          flow: [["users", "nlb", "ec2a"], ["users", "nlb", "ec2b"]],
          times: 2,
          caption: {
            vi: "Hai EC2 instance chạy từ cùng một AMI của máy chủ cũ, mỗi instance ở một AZ; NLB phân phối lưu lượng tới cả hai.",
            en: "Two EC2 instances run from the same AMI of the legacy server, one per AZ; the NLB distributes traffic to both.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: "unhealthy",
          caption: {
            vi: "Instance ở AZ a (hoặc cả AZ a) gặp sự cố và không vượt qua health check.",
            en: "The instance in AZ a (or AZ a itself) fails and stops passing health checks.",
          },
        },
        {
          flow: ["users", "nlb", "ec2b"],
          times: 2,
          caption: {
            vi: "NLB tự động chỉ chuyển lưu lượng tới instance khoẻ mạnh ở AZ b; workload không cần sửa đổi.",
            en: "The NLB automatically sends traffic only to the healthy instance in AZ b; the workload runs unmodified.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tính sẵn sàng cao và khả năng chịu lỗi trên EC2 mà không thay đổi thiết kế.",
          en: "High availability and fault tolerance on EC2 without changing the design.",
        },
      },
    },
    {
      option: "a",
      hide: ["nlb", "ec2b", "fargate", "backup", "azb"],
      steps: [
        {
          flow: ["users", "alb", "ec2a"],
          times: 2,
          caption: {
            vi: "Auto Scaling group có min = max = 1: chỉ có đúng một instance phía sau ALB.",
            en: "The Auto Scaling group has min = max = 1: there is exactly one instance behind the ALB.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: { vi: "AZ hỏng", en: "AZ down" },
          caption: {
            vi: "Khi instance hoặc AZ của nó gặp sự cố, không có bản sao nào khác để nhận lưu lượng.",
            en: "When the instance or its AZ fails, there is no other copy to take the traffic.",
          },
        },
        {
          stop: ["alb", "ec2a"],
          caption: {
            vi: "Ứng dụng không khả dụng cho tới khi có instance thay thế: không có khả năng chịu lỗi đa AZ.",
            en: "The application is unavailable until a replacement instance is running: no multi-AZ fault tolerance.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Một instance duy nhất không chịu được sự cố AZ.",
          en: "A single instance does not survive an AZ failure.",
        },
      },
    },
    {
      option: "c",
      hide: ["nlb", "alb", "fargate"],
      steps: [
        {
          flow: ["ec2a", "backup"],
          badge: { vi: "mỗi giờ", en: "hourly" },
          caption: {
            vi: "AWS Backup sao lưu instance mỗi giờ, cho phép khôi phục về một thời điểm.",
            en: "AWS Backup backs up the instance every hour, giving point-in-time recovery.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: { vi: "hỏng", en: "failed" },
          caption: {
            vi: "Instance gặp sự cố; ứng dụng ngừng phục vụ.",
            en: "The instance fails; the application stops serving.",
          },
        },
        {
          flow: ["backup", "ec2b"],
          tone: "warn",
          badge: { vi: "khôi phục tay", en: "manual restore" },
          caption: {
            vi: "Khôi phục thủ công từ bản sao lưu mất thời gian và gây gián đoạn đáng kể.",
            en: "Restoring manually from backup is slow and causes significant downtime.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Có khả năng khôi phục, nhưng không có tính sẵn sàng cao hay chịu lỗi.",
          en: "Recovery, but no high availability or fault tolerance.",
        },
      },
    },
    {
      option: "d",
      hide: ["nlb", "ec2a", "ec2b", "backup", "azb"],
      steps: [
        {
          flow: ["users", "alb"],
          tone: "warn",
          caption: {
            vi: "Phương án này chạy workload thành các Fargate task sau ALB.",
            en: "This option runs the workloads as Fargate tasks behind an ALB.",
          },
        },
        {
          stop: ["alb", "fargate"],
          caption: {
            vi: "Fargate đòi hỏi ứng dụng được đóng gói thành container, nhưng các workload cũ không thể container hoá và phải chạy trên EC2.",
            en: "Fargate requires containerized applications, but the legacy workloads cannot be containerized and must run on EC2.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Vi phạm ràng buộc không được thay đổi thiết kế.",
          en: "It breaks the no-redesign constraint.",
        },
      },
    },
  ],
};

export default spec;
