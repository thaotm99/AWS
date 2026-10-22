// Practice test 6, question 43: an internet-facing NLB in the public subnet terminates TLS; the Auto Scaling group
// stays in the private subnet. Captions follow the question's explanation and its reference:
//   https://aws.amazon.com/blogs/aws/new-tls-termination-for-network-load-balancers/
import type { IllustrationSpec, ScenarioSpec } from "../types";

const nlbPrivate = (option: string, asgZone: "pubR" | "privR"): ScenarioSpec => ({
  option,
  hide: ["pubL", asgZone === "pubR" ? "privR" : "pubR"],
  steps: [
    {
      stop: ["users", "nlb"],
      caption: {
        vi: "NLB là thành phần hướng ra internet của tầng web, nên phải nằm trong public subnet; đặt trong private subnet thì người dùng không tới được.",
        en: "The NLB is the internet-facing component of the web tier, so it belongs in the public subnet; in the private subnet users cannot reach it.",
      },
    },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Ứng dụng công khai không truy cập được.",
      en: "The public application is not reachable.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 130168995,
  cols: 4.2,
  rows: 3.1,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, sub: "HTTPS / TLS", kind: "actor", at: [0, 1.15] },
    { id: "nlb", label: "NLB", sub: { vi: "kết thúc TLS", en: "TLS termination" }, at: [1.5, 1.15] },
    { id: "ec2a", label: "EC2", sub: "Auto Scaling group", at: [3.1, 0.3] },
    { id: "ec2b", label: "EC2", sub: "Auto Scaling group", at: [3.1, 2] },
  ],
  zones: [
    { id: "pubL", label: "Public subnet", tone: "group", from: [1.5, 1.15], to: [1.5, 1.15], pad: 20 },
    { id: "privL", label: "Private subnet", tone: "group", from: [1.5, 1.15], to: [1.5, 1.15], pad: 20 },
    { id: "pubR", label: "Public subnet", tone: "group", from: [3.1, 0.3], to: [3.1, 2], pad: 20 },
    { id: "privR", label: "Private subnet", tone: "group", from: [3.1, 0.3], to: [3.1, 2], pad: 20 },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["privL", "pubR"],
      steps: [
        {
          flow: ["users", "nlb"],
          badge: "TLS",
          caption: {
            vi: "NLB trong public subnet là điểm tiếp nhận duy nhất cho mọi lưu lượng đến, và đảm nhận giải mã/mã hoá TLS thay cho các EC2 instance.",
            en: "The NLB in the public subnet is the single point of contact for all incoming traffic and offloads TLS decryption and encryption from the EC2 instances.",
          },
        },
        {
          flow: [["nlb", "ec2a"], ["nlb", "ec2b"]],
          times: 2,
          caption: {
            vi: "NLB chuyển lưu lượng tới các EC2 instance của Auto Scaling group trong private subnet, vẫn giữ IP nguồn của client.",
            en: "The NLB forwards traffic to the Auto Scaling group's EC2 instances in the private subnet, preserving the client's source IP.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Instance không bị truy cập trực tiếp từ internet: an toàn nhất.",
          en: "The instances cannot be reached directly from the internet: the most secure layout.",
        },
      },
    },
    {
      option: "a",
      hide: ["privL", "privR"],
      steps: [
        {
          flow: ["users", "nlb", "ec2a"],
          badge: "TLS",
          caption: {
            vi: "NLB trong public subnet kết thúc TLS và chuyển lưu lượng tới các instance.",
            en: "The NLB in the public subnet terminates TLS and forwards traffic to the instances.",
          },
        },
        {
          mark: ["ec2a", "ec2b"],
          tone: "bad",
          badge: "public",
          caption: {
            vi: "Nhưng các EC2 instance nằm trong public subnet, có thể bị truy cập qua internet, làm yếu tư thế bảo mật của ứng dụng.",
            en: "But the EC2 instances sit in the public subnet, open to access over the internet, which weakens the application's security posture.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Hoạt động nhưng không phải cách an toàn nhất.",
          en: "It works, but it is not the most secure way.",
        },
      },
    },
    nlbPrivate("c", "pubR"),
    nlbPrivate("d", "privR"),
  ],
};

export default spec;
