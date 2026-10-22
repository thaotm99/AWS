// Practice test 6, question 56: a public Network Load Balancer in front of bastion hosts in an Auto Scaling group.
// Captions follow the question's explanation. Additional sources:
// - A Network Load Balancer routes to healthy targets only:
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
// - ALB listeners support HTTP and HTTPS:
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const blocked = (option: string, node: string, badge: string, why: Bilingual, verdict: Bilingual): ScenarioSpec => ({
  option,
  hide: ["nlb", "alb", "vpce", "eip"].filter((id) => id !== node),
  steps: [{ stop: ["admin", node], badge, caption: why }],
  verdict: { works: false, caption: verdict },
});

const spec: IllustrationSpec = {
  questionId: 130168955,
  cols: 4,
  rows: 3.1,
  nodes: [
    { id: "admin", label: { vi: "Quản trị viên", en: "Administrators" }, sub: "SSH", kind: "actor", at: [0, 1.15] },
    { id: "nlb", label: "Network LB", sub: "TCP :22", at: [1.4, 1.15] },
    { id: "alb", label: "Application LB", sub: "HTTP/HTTPS", at: [1.4, 1.15] },
    { id: "vpce", label: "VPC endpoint", kind: "ghost", at: [1.4, 1.15] },
    { id: "eip", label: "Elastic IP", at: [1.4, 1.15] },
    { id: "b1", label: "Bastion host", sub: "AZ a", at: [2.9, 0.3] },
    { id: "b2", label: "Bastion host", sub: "AZ b", at: [2.9, 2] },
  ],
  zones: [{ id: "asg", label: "Auto Scaling group", tone: "group", from: [2.9, 0.3], to: [2.9, 2], pad: 22 }],
  scenarios: [
    {
      option: "a",
      hide: ["alb", "vpce", "eip"],
      steps: [
        {
          flow: ["admin", "nlb"],
          badge: "TCP 22",
          caption: {
            vi: "SSH là giao thức dựa trên TCP, cổng 22. Network Load Balancer hoạt động ở Layer 4, nên nhận được kết nối SSH.",
            en: "SSH is a TCP protocol on port 22. A Network Load Balancer works at Layer 4, so it accepts SSH connections.",
          },
        },
        {
          flow: [["nlb", "b1"], ["nlb", "b2"]],
          caption: {
            vi: "NLB chuyển kết nối tới các bastion host do Auto Scaling group quản lý ở nhiều AZ.",
            en: "The NLB forwards connections to bastion hosts managed by an Auto Scaling group across AZs.",
          },
        },
        {
          mark: "b1",
          tone: "bad",
          badge: "unhealthy",
          caption: {
            vi: "Một bastion host gặp sự cố.",
            en: "One bastion host fails.",
          },
        },
        {
          flow: ["admin", "nlb", "b2"],
          caption: {
            vi: "NLB chỉ chuyển kết nối tới target khoẻ mạnh; quản trị viên vẫn vào được qua cùng một địa chỉ.",
            en: "The NLB sends connections only to healthy targets; administrators still get in through the same address.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Bastion có tính sẵn sàng cao, dùng TCP.",
          en: "Highly available bastions, over TCP.",
        },
      },
    },
    blocked(
      "b",
      "alb",
      "SSH",
      {
        vi: "ALB hoạt động ở Layer 7 cho lưu lượng HTTP/HTTPS, còn SSH là TCP ở Layer 4; ALB không chuyển tiếp được SSH.",
        en: "An ALB works at Layer 7 for HTTP/HTTPS, while SSH is TCP at Layer 4; the ALB cannot carry SSH.",
      },
      { vi: "ALB không hỗ trợ SSH.", en: "An ALB does not support SSH." },
    ),
    blocked(
      "c",
      "vpce",
      "SSH",
      {
        vi: "VPC endpoint dùng để truy cập riêng tư các dịch vụ AWS từ trong VPC, không đặt trước các EC2 instance để nhận kết nối.",
        en: "A VPC endpoint is for reaching AWS services privately from inside a VPC; it is not placed in front of EC2 instances to take connections.",
      },
      { vi: "Sai mục đích sử dụng.", en: "The wrong tool for the job." },
    ),
    {
      option: "d",
      hide: ["nlb", "alb", "vpce"],
      steps: [
        {
          flow: ["admin", "eip", "b1"],
          caption: {
            vi: "Elastic IP chỉ gắn được với một EC2 instance tại một thời điểm.",
            en: "An Elastic IP can be attached to only one EC2 instance at a time.",
          },
        },
        {
          stop: ["eip", "b2"],
          caption: {
            vi: "Không thể gán cùng một Elastic IP cho mọi bastion host, nên tự nó không tạo ra tính sẵn sàng cao.",
            en: "The same Elastic IP cannot be assigned to every bastion host, so on its own it does not provide high availability.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Một Elastic IP không phân phối tới nhiều instance.",
          en: "One Elastic IP does not spread across several instances.",
        },
      },
    },
  ],
};

export default spec;
