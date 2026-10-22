// Practice test 5, question 57: AWS WAF on CloudFront in front of EC2; WAF also runs on ALB and API Gateway, not on EC2.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const users = { vi: "Người dùng", en: "Users" };

const spec: IllustrationSpec = {
  questionId: 119517527,
  cols: 4.3,
  rows: 2.6,
  nodes: [
    { id: "user", label: users, kind: "actor", at: [0, 0.2] },
    { id: "attacker", label: { vi: "Kẻ tấn công", en: "Attackers" }, kind: "actor", at: [0, 1.9] },
    { id: "wafEdge", label: "AWS WAF", sub: "edge locations", at: [1.1, 1.05] },
    { id: "cf", label: "CloudFront", at: [2.1, 1.05] },
    { id: "wafAlb", label: "AWS WAF", sub: "Region", at: [2.1, 1.05] },
    { id: "alb", label: "Application LB", at: [2.1, 1.05] },
    { id: "albB", label: "Application LB", sub: { vi: "hỗ trợ AWS WAF", en: "supports AWS WAF" }, at: [3.3, 0.1] },
    { id: "wafEc2", label: "AWS WAF", sub: { vi: "trên EC2?", en: "on EC2?" }, kind: "ghost", at: [2.1, 1.05] },
    { id: "ec2", label: "EC2", sub: { vi: "dữ liệu cá nhân", en: "personal data" }, kind: "data", at: [3.3, 1.05] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["wafAlb", "alb", "albB", "wafEc2"],
      steps: [
        {
          flow: ["user", "wafEdge", "cf", "ec2"],
          caption: {
            vi: "Khi dùng AWS WAF với CloudFront, rule chạy ở mọi edge location của AWS gần người dùng, nên bảo mật không làm giảm hiệu năng; web server trên EC2 phía sau được bảo vệ.",
            en: "With AWS WAF on CloudFront, rules run in every AWS edge location close to users, so security does not cost performance; the web server on EC2 behind it is protected.",
          },
        },
        {
          stop: ["attacker", "wafEdge"],
          caption: {
            vi: "Request bị chặn dừng lại trước khi tới web server.",
            en: "Blocked requests are stopped before they reach the web servers.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "AWS WAF trên CloudFront bảo vệ ứng dụng chạy trên EC2.",
          en: "AWS WAF on CloudFront protects the application on EC2.",
        },
      },
    },
    {
      option: "b",
      hide: ["wafEdge", "wafAlb", "alb", "wafEc2"],
      steps: [
        {
          flow: ["user", "cf", "albB", "ec2"],
          tone: "warn",
          caption: {
            vi: "Phương án đặt CloudFront phía trước ALB với lý do AWS WAF không thể cấu hình trực tiếp trên ALB.",
            en: "The option puts CloudFront in front of an ALB, claiming AWS WAF cannot be configured directly on an ALB.",
          },
        },
        {
          mark: "albB",
          tone: "bad",
          badge: { vi: "nhận định sai", en: "false claim" },
          caption: {
            vi: "Nhận định đó sai: AWS WAF có thể cấu hình trên Application Load Balancer, và khi đó rule chạy trong Region.",
            en: "That claim is wrong: AWS WAF can be configured on an Application Load Balancer, where its rules run in the Region.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Dựa trên nhận định sai về ALB.", en: "Built on a false claim about ALB." },
      },
    },
    {
      option: "c",
      hide: ["wafEdge", "cf", "wafAlb", "alb", "albB"],
      steps: [
        {
          flow: ["attacker", "wafEc2", "ec2"],
          tone: "bad",
          caption: {
            vi: "AWS WAF triển khai được trên CloudFront, Application Load Balancer và API Gateway; nó không thể cấu hình trực tiếp trên EC2 instance.",
            en: "AWS WAF deploys on CloudFront, the Application Load Balancer and API Gateway; it cannot be configured directly on an EC2 instance.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "AWS WAF không chạy trên EC2.", en: "AWS WAF does not run on EC2." },
      },
    },
    {
      option: "d",
      hide: ["wafEdge", "cf", "alb", "albB", "wafEc2"],
      steps: [
        {
          flow: ["user", "wafAlb", "ec2"],
          tone: "warn",
          caption: {
            vi: "AWS WAF gắn với ALB hoặc API Gateway trước EC2 là một kiến trúc dùng được.",
            en: "AWS WAF on an ALB or API Gateway in front of EC2 is a workable architecture.",
          },
        },
        {
          mark: "wafAlb",
          tone: "bad",
          badge: { vi: "thiếu CloudFront", en: "CloudFront too" },
          caption: {
            vi: "Nhưng nhận định “chỉ” ALB hoặc API Gateway là chưa đúng hoàn toàn: AWS WAF cũng triển khai được trên CloudFront.",
            en: "But saying “only” an ALB or API Gateway is only partially correct: AWS WAF can also be deployed on CloudFront.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Nhận định “chỉ” là sai.", en: "The word “only” makes it wrong." },
      },
    },
  ],
};

export default spec;
