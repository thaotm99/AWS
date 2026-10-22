// Practice test 4, question 58: allow-list ALBs in several Regions in an on-premises firewall with AWS Global Accelerator.
// Captions follow the question's explanation (two static anycast IP addresses as a fixed entry point, NLBs are
// Region-bound, ALB IP addresses keep changing).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516203,
  cols: 4.3,
  rows: 2.5,
  nodes: [
    { id: "fw", label: "On-prem firewall", sub: "allow-list", kind: "onprem", at: [0, 1] },
    { id: "ga", label: "Global Accelerator", sub: "2 static IPs", at: [1.5, 1] },
    { id: "nlbOne", label: "NLB", sub: "Region 1 · EIP", at: [1.5, 1] },
    { id: "lambda", label: "Lambda script", sub: { vi: "tra IP của ALB", en: "looks up ALB IPs" }, at: [1.5, 1] },
    { id: "alb1", label: "ALB", sub: "Region 1", at: [3, 0.2] },
    { id: "alb2", label: "ALB", sub: "Region 2", at: [3, 1.8] },
    { id: "nlb1", label: "NLB", sub: "Region 1 · EIP", at: [3, 0.2] },
    { id: "nlb2", label: "NLB", sub: "Region 2 · EIP", at: [3, 1.8] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["nlbOne", "lambda", "nlb1", "nlb2"],
      steps: [
        {
          mark: "fw",
          tone: "ok",
          badge: "2 IPs",
          caption: {
            vi: "Firewall on-premises chỉ cần cho phép hai static IP address của Global Accelerator, thay đổi cấu hình một lần.",
            en: "The on-premises firewall only needs to allow the accelerator's two static IP addresses, a one-time change.",
          },
        },
        {
          flow: [["fw", "ga", "alb1"], ["fw", "ga", "alb2"]],
          times: 2,
          caption: {
            vi: "Các static IP được anycast từ edge location và là điểm vào cố định; Global Accelerator chuyển lưu lượng tới các ALB đã đăng ký ở từng Region.",
            en: "The static IPs are anycast from edge locations and act as a fixed entry point; Global Accelerator forwards traffic to the ALBs registered in each Region.",
          },
        },
        {
          mark: ["alb1", "alb2"],
          tone: "ok",
          caption: {
            vi: "Địa chỉ IP riêng của từng ALB có thay đổi cũng không ảnh hưởng tới rule firewall.",
            en: "Changes to the individual ALBs' IP addresses no longer affect the firewall rules.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Khả năng mở rộng tốt nhất với ít thay đổi cấu hình nhất.",
          en: "The most scalable option with minimal configuration changes.",
        },
      },
    },
    {
      option: "a",
      hide: ["ga", "nlbOne", "lambda", "alb1", "alb2"],
      steps: [
        {
          flow: [["fw", "nlb1"], ["fw", "nlb2"]],
          tone: "warn",
          caption: {
            vi: "Chuyển mọi ALB sang Network Load Balancer có Elastic IP là có thể làm được.",
            en: "Migrating every ALB to a Network Load Balancer with Elastic IPs is possible.",
          },
        },
        {
          mark: "fw",
          tone: "bad",
          badge: { vi: "nhiều EIP", en: "many EIPs" },
          caption: {
            vi: "Nhưng phải đổi rule firewall theo Elastic IP của tất cả NLB, kém tối ưu hơn quản lý hai static IP của Global Accelerator.",
            en: "But the firewall rules must track the Elastic IPs of every NLB, less optimal than managing the accelerator's two static IPs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Nhiều thay đổi cấu hình.", en: "Many configuration changes." },
      },
    },
    {
      option: "b",
      hide: ["ga", "lambda", "nlb1", "nlb2"],
      steps: [
        {
          flow: ["fw", "nlbOne", "alb1"],
          caption: {
            vi: "Một NLB trong Region 1 có thể chuyển lưu lượng tới ALB cùng Region.",
            en: "One NLB in Region 1 can reach the ALB in the same Region.",
          },
        },
        {
          stop: ["nlbOne", "alb2"],
          caption: {
            vi: "Network Load Balancer bị giới hạn trong một Region; không thể dùng một NLB duy nhất cho ALB ở nhiều Region.",
            en: "A Network Load Balancer is Region-bound; a single NLB cannot serve ALBs across Regions.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "NLB không vượt qua Region.", en: "An NLB cannot span Regions." },
      },
    },
    {
      option: "c",
      hide: ["ga", "nlbOne", "nlb1", "nlb2"],
      steps: [
        {
          flow: [["lambda", "alb1"], ["lambda", "alb2"]],
          tone: "warn",
          caption: {
            vi: "Lambda script lấy địa chỉ IP hiện tại của các ALB.",
            en: "A Lambda script looks up the current IP addresses of the ALBs.",
          },
        },
        {
          flow: ["lambda", "fw"],
          tone: "bad",
          badge: { vi: "đổi liên tục", en: "keeps changing" },
          caption: {
            vi: "IP của ALB liên tục thay đổi, nên rule firewall on-premises phải được sửa liên tục.",
            en: "The ALBs' IP addresses keep changing, so the on-premises firewall rules need ongoing changes.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Phải sửa firewall liên tục.", en: "The firewall needs ongoing changes." },
      },
    },
  ],
};

export default spec;
