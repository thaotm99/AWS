// Practice test 5, question 13: AWS WAF on a CloudFront distribution against SQL injection and cross-site scripting.
// Captions follow the question's explanation. Additional source:
// - Block action: "By default, your protected AWS resource responds with an HTTP 403 (Forbidden) status code."
//   https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-action.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const attackReaches = (caption: Bilingual): StepSpec => ({
  flow: ["attacker", "cf", "origin"],
  tone: "bad",
  badge: "SQLi · XSS",
  caption,
});

const spec: IllustrationSpec = {
  questionId: 119517557,
  cols: 4.2,
  rows: 2.6,
  nodes: [
    { id: "user", label: { vi: "Người xem", en: "Viewers" }, kind: "actor", at: [0, 0.3] },
    { id: "attacker", label: { vi: "Kẻ tấn công", en: "Attackers" }, sub: "SQLi · XSS", kind: "actor", at: [0, 1.8] },
    { id: "waf", label: "AWS WAF", sub: "web ACL", at: [1.2, 1.05] },
    { id: "r53", label: "Route 53", sub: "DNS", at: [1.2, 0.05] },
    { id: "fm", label: "Firewall Manager", sub: { vi: "quản lý tập trung", en: "central management" }, at: [1.2, 0.05] },
    { id: "sh", label: "Security Hub", sub: { vi: "tổng hợp cảnh báo", en: "aggregates findings" }, at: [1.2, 0.05] },
    { id: "cf", label: "CloudFront", sub: "distribution", at: [2.2, 1.05] },
    { id: "origin", label: "ALB + EC2", sub: "custom origin", kind: "data", at: [3.2, 1.05] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["r53", "fm", "sh"],
      steps: [
        {
          flow: ["user", "waf", "cf", "origin"],
          caption: {
            vi: "Web ACL của AWS WAF được gắn với CloudFront distribution; WAF cho phép, chặn hoặc đếm từng web request theo các điều kiện trong web ACL.",
            en: "An AWS WAF web ACL is associated with the CloudFront distribution; WAF allows, blocks or counts each web request based on the conditions in the web ACL.",
          },
        },
        {
          stop: ["attacker", "waf"],
          badge: "403",
          caption: {
            vi: "Rule chặn các mẫu tấn công phổ biến như SQL injection và cross-site scripting; request bị chặn không tới được origin, và theo mặc định nhận HTTP 403.",
            en: "Rules block common attack patterns such as SQL injection and cross-site scripting; blocked requests never reach the origin and by default get HTTP 403.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "AWS WAF trên CloudFront ngăn SQL injection và cross-site scripting.",
          en: "AWS WAF on CloudFront prevents SQL injection and cross-site scripting.",
        },
      },
    },
    {
      option: "a",
      hide: ["waf", "fm", "sh"],
      steps: [
        {
          flow: ["user", "r53"],
          back: true,
          badge: "DNS",
          caption: {
            vi: "Amazon Route 53 là dịch vụ DNS: nó phân giải tên miền thành địa chỉ của CloudFront distribution.",
            en: "Amazon Route 53 is a DNS service: it resolves the domain name to the CloudFront distribution.",
          },
        },
        attackReaches({
          vi: "Route 53 không kiểm tra nội dung request, nên không ngăn được SQL injection và cross-site scripting.",
          en: "Route 53 does not inspect requests, so it cannot prevent SQL injection and cross-site scripting.",
        }),
      ],
      verdict: {
        works: false,
        caption: { vi: "DNS không chặn được tấn công web.", en: "DNS cannot block web attacks." },
      },
    },
    {
      option: "b",
      hide: ["waf", "r53", "sh"],
      steps: [
        {
          mark: "fm",
          tone: "warn",
          caption: {
            vi: "AWS Firewall Manager là dịch vụ quản lý bảo mật, dùng để cấu hình và quản lý tập trung các firewall rule trên nhiều tài khoản trong AWS Organization.",
            en: "AWS Firewall Manager is a security management service for centrally configuring and managing firewall rules across the accounts in an AWS Organization.",
          },
        },
        attackReaches({
          vi: "Bản thân Firewall Manager không dùng để ngăn SQL injection và cross-site scripting, nên request tấn công vẫn tới origin.",
          en: "Firewall Manager is not what prevents SQL injection and cross-site scripting, so the attack requests still reach the origin.",
        }),
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Firewall Manager là dịch vụ quản lý, không trực tiếp chặn tấn công.",
          en: "Firewall Manager is a management service, not the attack filter.",
        },
      },
    },
    {
      option: "c",
      hide: ["waf", "r53", "fm"],
      steps: [
        {
          mark: "sh",
          tone: "warn",
          caption: {
            vi: "AWS Security Hub tổng hợp, sắp xếp và ưu tiên các cảnh báo bảo mật (finding) từ nhiều dịch vụ AWS ở một nơi.",
            en: "AWS Security Hub aggregates, organizes and prioritizes security alerts (findings) from multiple AWS services in one place.",
          },
        },
        attackReaches({
          vi: "Security Hub không ngăn được SQL injection và cross-site scripting; request tấn công vẫn tới origin.",
          en: "Security Hub cannot prevent SQL injection and cross-site scripting; the attack requests still reach the origin.",
        }),
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Security Hub chỉ tổng hợp cảnh báo, không chặn request.",
          en: "Security Hub aggregates findings; it does not block requests.",
        },
      },
    },
  ],
};

export default spec;
