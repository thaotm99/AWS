// Practice test 6, question 60: AWS WAF on the ALB with a rate-based rule against clients flooding the application.
// Captions follow the question's explanation. Additional source:
// - A rate-based rule counts incoming requests and rate limits them when they come too fast:
//   https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168943,
  cols: 4.2,
  rows: 2.5,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, sub: "~5 req/s", kind: "actor", at: [0, 0.3] },
    { id: "attacker", label: { vi: "Kẻ tấn công", en: "Attackers" }, sub: "> 100 req/s", kind: "actor", at: [0, 1.7] },
    { id: "waf", label: "AWS WAF", sub: "rate-based rule", at: [1.3, 1] },
    { id: "shield", label: "Shield Advanced", sub: "DDoS", at: [1.3, 1] },
    { id: "nacl", label: "Network ACL", sub: { vi: "trên ALB?", en: "on the ALB?" }, kind: "ghost", at: [1.15, 0.15] },
    { id: "alb", label: "ALB", at: [2.3, 1] },
    { id: "ec2", label: "EC2", sub: { vi: "ứng dụng", en: "application" }, at: [3.3, 1] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["shield", "nacl"],
      steps: [
        {
          flow: ["users", "waf", "alb", "ec2"],
          times: 2,
          caption: {
            vi: "AWS WAF được tích hợp với ALB; request của người dùng bình thường đi qua tới ứng dụng.",
            en: "AWS WAF is integrated with the ALB; normal users' requests pass through to the application.",
          },
        },
        {
          flow: ["attacker", "waf"],
          times: 5,
          tone: "warn",
          caption: {
            vi: "Rate-based rule đếm các request đến, gom theo tiêu chí như địa chỉ IP...",
            en: "The rate-based rule counts incoming requests, aggregated by criteria such as IP address...",
          },
        },
        {
          stop: ["attacker", "waf"],
          badge: { vi: "giới hạn", en: "rate limited" },
          caption: {
            vi: "...và giới hạn request khi chúng đến quá nhanh, nên kẻ tấn công không làm quá tải được ứng dụng.",
            en: "...and rate limits requests that come in too fast, so attackers cannot overwhelm the application.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chặn client gửi quá nhiều request, người dùng bình thường không bị ảnh hưởng.",
          en: "Clients sending too many requests are blocked; normal users are unaffected.",
        },
      },
    },
    {
      option: "b",
      hide: ["waf", "nacl"],
      steps: [
        {
          flow: ["attacker", "shield", "alb", "ec2"],
          times: 5,
          tone: "bad",
          caption: {
            vi: "Shield Advanced cung cấp bảo vệ DDoS tổng thể, nhưng không thể thiết lập rate-based rule trong Shield.",
            en: "Shield Advanced gives overall DDoS protection, but you cannot set up rate-based rules in Shield.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Rate-based rule là tính năng của AWS WAF.",
          en: "Rate-based rules are an AWS WAF feature.",
        },
      },
    },
    {
      option: "c",
      hide: ["waf", "shield"],
      steps: [
        {
          stop: ["attacker", "nacl"],
          caption: {
            vi: "Network ACL được định nghĩa ở mức subnet, không gắn vào ALB, và chỉ chặn theo IP cụ thể chứ không theo tốc độ request.",
            en: "A network ACL is defined at the subnet level, not on an ALB, and only blocks specific IPs, not request rates.",
          },
        },
        {
          flow: ["attacker", "alb", "ec2"],
          times: 5,
          tone: "bad",
          caption: {
            vi: "Lưu lượng tấn công vẫn tới ứng dụng.",
            en: "The attack traffic still reaches the application.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không có cơ chế giới hạn tốc độ request.",
          en: "No way to limit request rates.",
        },
      },
    },
    {
      option: "d",
      hide: ["waf", "shield", "nacl"],
      steps: [
        {
          flow: ["attacker", "alb", "ec2"],
          times: 5,
          tone: "bad",
          badge: "sticky",
          caption: {
            vi: "Sticky session chỉ định tuyến các request của cùng một client tới cùng một target; nó không chặn ai cả.",
            en: "Sticky sessions only route requests from the same client to the same target; they block no one.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không giúp chống tấn công.",
          en: "It does nothing against the attack.",
        },
      },
    },
  ],
};

export default spec;
