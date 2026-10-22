// Practice test 3, question 45: fewer firewall IP addresses for many ALBs in several Regions with AWS Global
// Accelerator. Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 121079019,
  cols: 4.2,
  rows: 3,
  nodes: [
    { id: "fw", label: "Firewall", sub: { vi: "danh sách IP cho phép", en: "IP allow list" }, kind: "onprem", at: [0, 1] },
    { id: "ga", label: "Global Accelerator", sub: { vi: "2 static IP", en: "2 static IPs" }, at: [1.4, 1] },
    { id: "nlb", label: "Network LB", sub: "Elastic IP", at: [1.4, 1] },
    { id: "eip", label: "Elastic IP", sub: { vi: "cho mỗi ALB?", en: "per ALB?" }, kind: "ghost", at: [1.4, 1] },
    { id: "asg", label: "Auto Scaling group", sub: { vi: "gắn Elastic IP?", en: "with an Elastic IP?" }, kind: "ghost", at: [1.4, 1] },
    { id: "albA", label: "ALB", sub: "Region A", at: [3.1, 0.2] },
    { id: "albB", label: "ALB", sub: "Region B", at: [3.1, 1.8] },
  ],
  zones: [
    { id: "regA", label: "Region A", tone: "region", from: [3.1, 0.2], to: [3.1, 0.2], pad: 10 },
    { id: "regB", label: "Region B", tone: "region", from: [3.1, 1.8], to: [3.1, 1.8], pad: 10 },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["nlb", "eip", "asg"],
      steps: [
        {
          flow: ["fw", "ga"],
          badge: { vi: "2 IP", en: "2 IPs" },
          caption: {
            vi: "Global Accelerator cung cấp hai static IP toàn cầu hướng tới khách hàng; firewall chỉ cần cho phép hai địa chỉ này.",
            en: "Global Accelerator provides two global static customer-facing IPs; the firewall only needs to allow these two addresses.",
          },
        },
        {
          flow: [
            ["ga", "albA"],
            ["ga", "albB"],
          ],
          caption: {
            vi: "ALB của mỗi Region được đăng ký vào endpoint tương ứng; có thể thêm hoặc bớt origin mà không thay đổi gì phía người dùng.",
            en: "Each Region's ALBs are registered to the corresponding endpoints; origins can be added or removed without user-facing changes.",
          },
        },
        {
          mark: "albA",
          tone: "bad",
          badge: "unhealthy",
          caption: {
            vi: "Một endpoint gặp sự cố.",
            en: "One endpoint fails.",
          },
        },
        {
          flow: ["fw", "ga", "albB"],
          caption: {
            vi: "Global Accelerator tự động định tuyến lại lưu lượng tới endpoint khoẻ mạnh gần nhất; danh sách IP trên firewall không đổi.",
            en: "Global Accelerator automatically re-routes traffic to the nearest healthy endpoint; the firewall's IP list stays the same.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Hai IP tĩnh thay cho rất nhiều IP.", en: "Two static IPs instead of many." } },
    },
    {
      option: "a",
      hide: ["ga", "nlb", "asg"],
      steps: [
        { flow: ["fw", "eip"], tone: "warn", caption: { vi: "Firewall cho phép một Elastic IP cho mỗi ALB.", en: "The firewall allows one Elastic IP per ALB." } },
        {
          stop: ["eip", "albA"],
          caption: {
            vi: "Application Load Balancer không thể được gán Elastic IP (địa chỉ IP tĩnh).",
            en: "An Application Load Balancer cannot be assigned an Elastic IP address (static IP address).",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "ALB không nhận Elastic IP.", en: "ALBs take no Elastic IPs." } },
    },
    {
      option: "b",
      hide: ["ga", "eip", "asg"],
      steps: [
        {
          flow: ["fw", "nlb"],
          badge: "Elastic IP",
          caption: {
            vi: "Network Load Balancer có thể được cấu hình với một Elastic IP.",
            en: "A Network Load Balancer can be configured with an Elastic IP address.",
          },
        },
        {
          flow: [
            ["nlb", "albA"],
            ["nlb", "albB"],
          ],
          tone: "warn",
          caption: {
            vi: "IP private của các ALB được đăng ký làm target của NLB.",
            en: "The private IPs of the ALBs are registered as targets of the NLB.",
          },
        },
        {
          mark: "nlb",
          tone: "bad",
          caption: {
            vi: "Với hàng trăm Application Load Balancer và Network Load Balancer, giải pháp này vẫn cồng kềnh khi quản lý.",
            en: "With hundreds of Application Load Balancers and Network Load Balancers, this is equally cumbersome to manage.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Vẫn khó quản lý.", en: "Still cumbersome to manage." } },
    },
    {
      option: "d",
      hide: ["ga", "nlb", "eip"],
      steps: [
        {
          stop: ["fw", "asg"],
          caption: {
            vi: "Không thể gán Elastic IP cho Auto Scaling group, vì ASG chỉ quản lý một tập hợp EC2 instance.",
            en: "You cannot assign an Elastic IP address to an Auto Scaling group, since an ASG just manages a collection of EC2 instances.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "ASG không có Elastic IP.", en: "An ASG has no Elastic IP." } },
    },
  ],
};

export default spec;
