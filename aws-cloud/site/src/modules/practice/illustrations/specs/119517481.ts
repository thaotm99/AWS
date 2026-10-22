// Practice test 5, question 1: the ALB drops an unhealthy instance but the Auto Scaling group does not replace it.
// Captions follow the question's explanation. Additional sources:
// - "By default, Amazon EC2 Auto Scaling only replaces instances that are unhealthy or unreachable based on Amazon EC2
//   health checks." / turning on Elastic Load Balancing health checks lets it replace instances the load balancer
//   reports as unhealthy: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-add-elb-healthcheck.html
// - EC2 health checks use the instance status checks and system status checks:
//   https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html
// - "Each load balancer node routes requests only to the healthy targets":
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const albNoEc2: StepSpec = {
  mark: "albEc2",
  tone: "bad",
  badge: { vi: "không tồn tại", en: "not available" },
  caption: {
    vi: "Application Load Balancer không thể dùng health check kiểu EC2; nó kiểm tra target bằng health check của chính ALB.",
    en: "An Application Load Balancer cannot use EC2-based health checks; it checks its targets with its own ALB health check.",
  },
};
const noEc2Verdict = {
  works: false,
  caption: {
    vi: "ALB không dùng được health check kiểu EC2, nên cấu hình này không tồn tại.",
    en: "An ALB cannot use EC2-based health checks, so this setup does not exist.",
  } as Bilingual,
};

const spec: IllustrationSpec = {
  questionId: 119517481,
  cols: 4.4,
  rows: 3.2,
  nodes: [
    { id: "user", label: { vi: "Người xem", en: "Viewers" }, sub: "video streaming", kind: "actor", at: [0, 1.3] },
    { id: "alb", label: "Application LB", sub: "ALB health check", at: [1.2, 1.3] },
    { id: "albEc2", label: "Application LB", sub: { vi: "health check EC2?", en: "EC2 health check?" }, kind: "ghost", at: [1.2, 1.3] },
    { id: "ec2a", label: "EC2", sub: "instance", at: [2.4, 0.6] },
    { id: "ec2b", label: "EC2", sub: "instance", at: [2.4, 2] },
    { id: "asgEc2", label: "Auto Scaling", sub: { vi: "health check: EC2", en: "health check: EC2" }, at: [3.6, 1.3] },
    { id: "asgElb", label: "Auto Scaling", sub: { vi: "health check: ELB", en: "health check: ELB" }, at: [3.6, 1.3] },
  ],
  zones: [{ id: "group", label: "Auto Scaling group", tone: "group", from: [2.4, 0.6], to: [2.4, 2], pad: 24 }],
  links: [
    ["ec2a", "asgEc2"],
    ["ec2b", "asgEc2"],
    ["ec2a", "asgElb"],
    ["ec2b", "asgElb"],
  ],
  scenarios: [
    {
      option: "a",
      hide: ["albEc2", "asgElb"],
      steps: [
        {
          flow: [["user", "alb", "ec2a"], ["user", "alb", "ec2b"]],
          caption: {
            vi: "ALB phân phối request tới các EC2 instance và dùng health check có sẵn của nó để gửi ping kiểm tra từng instance.",
            en: "The ALB spreads requests across the EC2 instances and uses its built-in health check to ping each instance.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: { vi: "ALB: unhealthy", en: "ALB: unhealthy" },
          caption: {
            vi: "Ping health check của ALB không nhận được phản hồi từ một instance, nên ALB đánh dấu instance đó không khoẻ mạnh.",
            en: "The ALB's health check pings get no response from one instance, so the ALB marks it unhealthy.",
          },
        },
        {
          flow: ["alb", "ec2b"],
          times: 2,
          caption: {
            vi: "ALB loại instance đó khỏi nhóm instance khoẻ mạnh và chỉ định tuyến request tới target còn khoẻ mạnh.",
            en: "The ALB removes the instance from its pool and routes requests only to the healthy target.",
          },
        },
        {
          mark: "asgEc2",
          tone: "warn",
          badge: { vi: "EC2: OK", en: "EC2: OK" },
          caption: {
            vi: "Auto Scaling group dùng health check kiểu EC2, dựa trên status check của instance. Kết quả vẫn trả về thành công.",
            en: "The Auto Scaling group uses the EC2 health check, based on the instance's status checks. It still comes back successful.",
          },
        },
        {
          mark: "asgEc2",
          tone: "bad",
          badge: { vi: "không thay thế", en: "no replacement" },
          caption: {
            vi: "Theo mặc định, Auto Scaling chỉ thay các instance không khoẻ mạnh theo health check EC2. Vì vậy ALB đã loại instance nhưng Auto Scaling group không tạo instance thay thế.",
            en: "By default, Auto Scaling only replaces instances that fail the EC2 health checks. So the ALB has dropped the instance, but the Auto Scaling group provides no replacement.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Hai bên dùng hai loại health check khác nhau, đúng với hiện tượng trong đề bài.",
          en: "The two use different health checks, which matches the anomaly in the question.",
        },
      },
    },
    {
      option: "b",
      hide: ["alb", "asgEc2"],
      steps: [albNoEc2],
      verdict: noEc2Verdict,
    },
    {
      option: "c",
      hide: ["albEc2", "asgEc2"],
      steps: [
        {
          flow: [["user", "alb", "ec2a"], ["user", "alb", "ec2b"]],
          caption: {
            vi: "ALB phân phối request và kiểm tra các instance bằng health check của ALB.",
            en: "The ALB spreads requests and checks the instances with its ALB health check.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: { vi: "ALB: unhealthy", en: "ALB: unhealthy" },
          caption: {
            vi: "Một instance không phản hồi health check của ALB và bị loại khỏi nhóm instance khoẻ mạnh.",
            en: "One instance fails the ALB health check and is removed from the healthy pool.",
          },
        },
        {
          mark: "asgElb",
          tone: "ok",
          badge: { vi: "thay thế", en: "replace" },
          caption: {
            vi: "Auto Scaling group cũng dùng health check của ELB, nên nó thay instance mà load balancer báo là không khoẻ mạnh.",
            en: "The Auto Scaling group also uses the ELB health check, so it replaces the instance the load balancer reports as unhealthy.",
          },
        },
        {
          mark: "ec2a",
          tone: "ok",
          badge: { vi: "mới", en: "new" },
          caption: {
            vi: "Đây là cấu hình được khuyến nghị: nó tránh được tình huống trong đề bài, nên không giải thích được hiện tượng đó.",
            en: "This is the recommended setup: it avoids the situation in the question, so it cannot explain the anomaly.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Cùng dùng health check của ALB thì instance được thay thế; không có hiện tượng như đề bài.",
          en: "With ALB health checks on both, the instance is replaced; the anomaly does not occur.",
        },
      },
    },
    {
      option: "d",
      hide: ["alb", "asgElb"],
      steps: [albNoEc2],
      verdict: noEc2Verdict,
    },
  ],
};

export default spec;
