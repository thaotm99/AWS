// Practice test 2, question 17: the ALB authenticates users with a Cognito user pool before requests reach EC2.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516097,
  cols: 4.2,
  rows: 2.3,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.2] },
    { id: "cf", label: "CloudFront", at: [1.05, 1.2] },
    { id: "edge", label: "Lambda@Edge", sub: { vi: "code tự viết", en: "custom code" }, at: [1.05, 0] },
    { id: "alb", label: "Application LB", sub: "authenticate action", at: [2.15, 1.2] },
    { id: "up", label: "Cognito user pool", at: [2.15, 0] },
    { id: "ip", label: "Cognito identity pool", sub: { vi: "credential AWS tạm thời", en: "temp AWS credentials" }, at: [2.15, 0] },
    { id: "ec2", label: "EC2 fleet", sub: { vi: "logic nghiệp vụ", en: "business logic" }, at: [3.2, 1.2] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["edge", "ip"],
      steps: [
        { flow: ["user", "cf", "alb"], caption: { vi: "Request đi qua CloudFront tới Application Load Balancer.", en: "Requests go through CloudFront to the Application Load Balancer." } },
        {
          flow: ["alb", "up"],
          badge: { vi: "đăng nhập", en: "sign-in" },
          caption: {
            vi: "Listener rule có authenticate action: ALB xác thực người dùng qua Cognito user pool, hỗ trợ IdP mạng xã hội như Amazon, Facebook, Google hoặc danh tính doanh nghiệp qua SAML, LDAP, Microsoft AD.",
            en: "A listener rule with an authenticate action makes the ALB authenticate users through a Cognito user pool, with social IdPs such as Amazon, Facebook or Google, or corporate identities through SAML, LDAP or Microsoft AD.",
          },
        },
        {
          flow: ["alb", "ec2"],
          caption: {
            vi: "Chỉ request đã xác thực mới tới EC2; việc xác thực được chuyển cho load balancer nên máy chủ ứng dụng chỉ lo logic nghiệp vụ.",
            en: "Only authenticated requests reach EC2; authentication is offloaded to the load balancer, so the application servers focus on business logic.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Xác thực tại ALB, gần như không phải viết code.", en: "Authentication at the ALB, almost no code." } },
    },
    {
      option: "b",
      hide: ["edge", "up"],
      steps: [
        { flow: ["user", "cf", "alb"], caption: { vi: "Request tới Application Load Balancer.", en: "Requests reach the Application Load Balancer." } },
        {
          stop: ["alb", "ip"],
          caption: {
            vi: "Không có cách xác thực người dùng ứng dụng qua Cognito identity pool; identity pool cấp credential AWS tạm thời cho khách và người dùng đã có token. Xác thực người dùng ứng dụng do user pool đảm nhiệm.",
            en: "There is no Cognito authentication via identity pools for application users; identity pools provide temporary AWS credentials to guests and users who already hold a token. User authentication comes from user pools.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Identity pool không xác thực người dùng.", en: "Identity pools do not authenticate users." } },
    },
    {
      option: "c",
      hide: ["ip"],
      steps: [
        { flow: ["user", "cf"], caption: { vi: "Request tới CloudFront distribution.", en: "Requests reach the CloudFront distribution." } },
        {
          flow: ["cf", "edge", "up"],
          tone: "warn",
          badge: { vi: "thêm code", en: "extra code" },
          caption: {
            vi: "Không thể tích hợp trực tiếp Cognito user pool với CloudFront; phải viết thêm Lambda@Edge function để xác thực, tức là tốn thêm công phát triển.",
            en: "A Cognito user pool cannot be integrated directly with CloudFront; a separate Lambda@Edge function is needed for authentication, which means extra development effort.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phải tự viết Lambda@Edge.", en: "Needs a custom Lambda@Edge function." } },
    },
    {
      option: "d",
      hide: ["edge", "up"],
      steps: [
        {
          stop: ["cf", "ip"],
          caption: {
            vi: "Cognito identity pool không dùng để quản lý xác thực người dùng, ở CloudFront cũng như ở bất kỳ đâu.",
            en: "Cognito identity pools cannot be used to manage user authentication, at CloudFront or anywhere else.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Identity pool không xác thực người dùng.", en: "Identity pools do not authenticate users." } },
    },
  ],
};

export default spec;
