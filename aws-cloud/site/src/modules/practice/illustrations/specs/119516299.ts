// Practice test 4, question 26: an ALB marks every instance unhealthy while the site works when browsed by IP.
// Captions follow the question's explanation (health checks, the load balancer must reach targets on the listener
// and health check ports, routing across unhealthy targets when all are unhealthy, EBS/runtime/EIP distractors).
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const byIp: StepSpec = {
  flow: ["dev", "ec2"],
  caption: {
    vi: "Khi developer nhập IP của instance vào trình duyệt, website vẫn hiển thị: bản thân ứng dụng đang chạy bình thường.",
    en: "When the developer enters the instance IP in a browser, the website loads: the application itself is running.",
  },
};

const allUnhealthy: Bilingual = {
  vi: "Mọi target bị đánh dấu unhealthy. Khi target group chỉ còn target unhealthy, các node của load balancer định tuyến request qua các target unhealthy đó.",
  en: "Every target is marked unhealthy. When a target group contains only unhealthy targets, the load balancer nodes route requests across those unhealthy targets.",
};

const spec: IllustrationSpec = {
  questionId: 119516299,
  cols: 3.8,
  rows: 2.4,
  nodes: [
    { id: "alb", label: "Application LB", sub: "health checks", at: [0, 0.4] },
    { id: "sg", label: "Security group", sub: { vi: "của instance", en: "instances" }, at: [1.3, 0.4] },
    { id: "ec2", label: "EC2 instances", sub: "target group", kind: "data", at: [2.7, 0.4] },
    { id: "dev", label: "Developer", sub: { vi: "trình duyệt · IP", en: "browser · IP" }, kind: "actor", at: [1.3, 1.7] },
    { id: "eip", label: "Elastic IP", kind: "ghost", at: [2.7, 1.7] },
  ],
  links: [["sg", "ec2"]],
  scenarios: [
    {
      option: "a",
      hide: ["eip"],
      steps: [
        byIp,
        {
          stop: ["alb", "sg"],
          badge: { vi: "thiếu rule", en: "no rule" },
          caption: {
            vi: "Security group của instance không cho phép lưu lượng từ security group của ALB, nên request health check bị chặn.",
            en: "The instances' security group does not allow traffic from the ALB's security group, so the health check requests are blocked.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: "unhealthy",
          caption: allUnhealthy,
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Load balancer phải kết nối được tới target trên cả listener port và health check port.",
          en: "The load balancer must reach its targets on both the listener port and the health check port.",
        },
      },
    },
    {
      option: "b",
      hide: ["sg", "eip"],
      steps: [
        byIp,
        {
          flow: ["alb", "ec2"],
          tone: "bad",
          badge: { vi: "sai route", en: "wrong route" },
          caption: {
            vi: "ALB định kỳ gửi request health check tới route được cấu hình trong target group; route này bị cấu hình sai nên health check thất bại.",
            en: "The ALB periodically sends health check requests to the route set in the target group; that route is misconfigured, so the checks fail.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: "unhealthy",
          caption: allUnhealthy,
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Route health check sai làm mọi target bị đánh dấu unhealthy.",
          en: "A misconfigured health check route marks every target unhealthy.",
        },
      },
    },
    {
      option: "c",
      hide: ["sg", "eip"],
      steps: [
        byIp,
        {
          mark: "ec2",
          tone: "ok",
          badge: "EBS ✓",
          caption: {
            vi: "Website truy cập được qua IP, nghĩa là EBS volume không có vấn đề.",
            en: "The website is reachable by IP, which means the EBS volumes are fine.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "EBS không phải nguyên nhân.", en: "EBS is not the cause." },
      },
    },
    {
      option: "d",
      hide: ["sg", "eip"],
      steps: [
        byIp,
        {
          mark: "alb",
          tone: "warn",
          badge: "runtime?",
          caption: {
            vi: "Runtime của web app không liên quan gì tới Application Load Balancer; đây là phương án gây nhiễu.",
            en: "A web app's runtime has no connection with the Application Load Balancer; this option is a distractor.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không liên quan tới ALB.", en: "Unrelated to the ALB." },
      },
    },
    {
      option: "e",
      hide: ["sg"],
      steps: [
        byIp,
        {
          mark: "eip",
          tone: "bad",
          badge: { vi: "không cần", en: "not needed" },
          caption: {
            vi: "Không cần gán Elastic IP cho EC2 instance khi dùng Application Load Balancer.",
            en: "EC2 instances do not need Elastic IP addresses when used behind an Application Load Balancer.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Elastic IP không liên quan.", en: "Elastic IPs are irrelevant." },
      },
    },
  ],
};

export default spec;
