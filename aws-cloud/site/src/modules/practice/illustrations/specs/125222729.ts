// Practice test 1, question 6: block two countries in front of an ALB with an AWS WAF geo match rule.
// Captions follow the question's explanation. Additional sources:
// - Security group rule sources are CIDR ranges, security groups or prefix lists (no geography):
//   https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
// - Geo match statement matches the request's country of origin:
//   https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-geo-match.html
// - Block action: "By default, your protected AWS resource responds with an HTTP 403 (Forbidden) status code."
//   https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-action.html
import type { IllustrationSpec } from "../types";

const home = { vi: "nước sở tại", en: "home country" };
const other = { vi: "2 quốc gia cần chặn", en: "2 blocked countries" };
const users = { vi: "Người dùng", en: "Users" };

const spec: IllustrationSpec = {
  questionId: 125222729,
  cols: 4.2,
  rows: 2.6,
  nodes: [
    { id: "home", label: users, sub: home, kind: "actor", at: [0, 0.3] },
    { id: "other", label: users, sub: other, kind: "actor", at: [0, 1.8] },
    { id: "waf", label: "AWS WAF", sub: "web ACL · geo match", at: [1.2, 1.05] },
    { id: "cf", label: "CloudFront", sub: "Geo Restriction", kind: "ghost", at: [1.2, 1.05] },
    { id: "alb", label: "ALB", sub: "Application Load Balancer", at: [2.2, 1.05] },
    { id: "ec2", label: "EC2", sub: "instances", kind: "data", at: [3.2, 1.05] },
  ],
  zones: [
    { id: "vpc", label: "VPC", tone: "vpc", from: [2.2, 1.05], to: [3.2, 1.05], pad: 8 },
    { id: "vpcWide", label: "VPC", tone: "vpc", from: [1.2, 1.05], to: [3.2, 1.05], pad: 8 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["waf", "cf", "vpcWide"],
      steps: [
        {
          flow: ["home", "alb", "ec2"],
          caption: {
            vi: "Request từ nước sở tại đi qua ALB tới các EC2 instance.",
            en: "Requests from the home country pass through the ALB to the EC2 instances.",
          },
        },
        {
          flow: ["other", "alb"],
          tone: "bad",
          badge: "SG",
          caption: {
            vi: "Rule của security group trên ALB chỉ xác định nguồn theo dải địa chỉ IP (CIDR), security group hoặc prefix list; không có điều kiện theo vị trí địa lý.",
            en: "Security group rules on the ALB define sources as IP ranges (CIDR), security groups or prefix lists; there is no condition on geographic location.",
          },
        },
        {
          flow: ["alb", "ec2"],
          tone: "bad",
          caption: {
            vi: "Request từ hai quốc gia cần chặn vẫn tới được ứng dụng: Security Group không thể giới hạn truy cập dựa trên vị trí địa lý của người dùng.",
            en: "Requests from the two countries still reach the application: security groups cannot restrict access based on the user's geographic location.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Security group không chặn được theo quốc gia.",
          en: "A security group cannot block by country.",
        },
      },
    },
    {
      option: "b",
      hide: ["cf", "vpcWide"],
      steps: [
        {
          flow: ["home", "waf"],
          badge: "ALLOW",
          caption: {
            vi: "AWS WAF gắn với ALB đánh giá mỗi request theo các rule trong web ACL. Geo match statement so khớp quốc gia gốc của request; nước sở tại nằm trong danh sách được phép.",
            en: "AWS WAF on the ALB evaluates each request against the rules in its web ACL. A geo match statement matches the request's country of origin; the home country is allowed.",
          },
        },
        {
          flow: ["waf", "alb", "ec2"],
          caption: {
            vi: "Request được phép đi tiếp tới ALB và các EC2 instance.",
            en: "Allowed requests continue to the ALB and the EC2 instances.",
          },
        },
        {
          stop: ["other", "waf"],
          badge: "403",
          caption: {
            vi: "Request từ hai quốc gia còn lại bị AWS WAF chặn trước khi tới ALB; theo mặc định, tài nguyên được bảo vệ trả về HTTP 403 (Forbidden).",
            en: "Requests from the other two countries are blocked by AWS WAF before they reach the ALB; by default the protected resource responds with HTTP 403 (Forbidden).",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Geo match condition của AWS WAF chỉ cho phép truy cập từ nước sở tại.",
          en: "An AWS WAF geo match condition allows access only from the home country.",
        },
      },
    },
    {
      option: "c",
      hide: ["waf", "vpc"],
      steps: [
        {
          mark: "cf",
          tone: "bad",
          badge: { vi: "không thuộc VPC", en: "not in a VPC" },
          caption: {
            vi: "Geo Restriction của CloudFront giới hạn được lưu lượng theo vị trí địa lý, nhưng CloudFront hoạt động từ các edge location và không thuộc về một VPC.",
            en: "CloudFront Geo Restriction can restrict traffic by the user's location, but CloudFront works from edge locations and does not belong to a VPC.",
          },
        },
        {
          flow: [["home", "alb", "ec2"], ["other", "alb"]],
          tone: "warn",
          caption: {
            vi: "Cấu hình “CloudFront trong một VPC” như phương án mô tả không tồn tại, nên không có thành phần nào chặn lưu lượng theo quốc gia trước ALB.",
            en: "“CloudFront in a VPC” as the option describes it does not exist, so nothing in front of the ALB filters traffic by country.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "CloudFront không được triển khai bên trong VPC.",
          en: "CloudFront is not deployed inside a VPC.",
        },
      },
    },
    {
      option: "d",
      hide: ["waf", "cf", "vpcWide"],
      steps: [
        {
          flow: ["home", "alb", "ec2"],
          caption: {
            vi: "Request từ nước sở tại đi qua ALB tới các EC2 instance.",
            en: "Requests from the home country pass through the ALB to the EC2 instances.",
          },
        },
        {
          flow: ["other", "alb", "ec2"],
          tone: "bad",
          badge: "SG",
          caption: {
            vi: "Security group của EC2 instance chỉ xét nguồn theo dải địa chỉ IP, security group hoặc prefix list; request từ hai quốc gia cần chặn vẫn tới được instance.",
            en: "The EC2 instances' security group only matches sources by IP range, security group or prefix list; requests from the two countries still reach the instances.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Security group không chặn được theo quốc gia.",
          en: "A security group cannot block by country.",
        },
      },
    },
  ],
};

export default spec;
