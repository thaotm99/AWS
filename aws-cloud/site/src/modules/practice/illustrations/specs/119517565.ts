// Practice test 5, question 9: private, consumer-initiated access to a SaaS API with AWS PrivateLink.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119517565,
  cols: 4.35,
  rows: 2.5,
  nodes: [
    { id: "svc", label: { vi: "Dịch vụ nội bộ", en: "Internal services" }, sub: "EC2", at: [0, 1.3] },
    { id: "vpce", label: "Interface endpoint", sub: "ENI · private IP", at: [1.3, 1.3] },
    { id: "peer", label: "VPC peering", at: [1.9, 1.3] },
    { id: "vpn", label: "Site-to-Site VPN", sub: "IPsec", at: [1.3, 1.3] },
    { id: "cf", label: "CloudFront", sub: "edge location", at: [1.9, 1.3] },
    { id: "inet", label: "Internet", kind: "ghost", at: [1.9, 0.2] },
    { id: "saas", label: "SaaS API", sub: { vi: "VPC nhà cung cấp", en: "provider's VPC" }, kind: "data", at: [3.2, 1.3] },
  ],
  zones: [
    { id: "own", label: { vi: "VPC công ty", en: "Company VPC" }, tone: "vpc", from: [0, 1.3], to: [1.3, 1.3], pad: 10 },
    { id: "ownSmall", label: { vi: "VPC công ty", en: "Company VPC" }, tone: "vpc", from: [0, 1.3], to: [0, 1.3], pad: 10 },
    { id: "provider", label: "SaaS provider", tone: "account", from: [3.2, 1.3], to: [3.2, 1.3], pad: 26 },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["peer", "vpn", "cf", "inet", "ownSmall"],
      steps: [
        {
          flow: ["svc", "vpce"],
          caption: {
            vi: "Interface VPC endpoint của dịch vụ SaaS xuất hiện như một elastic network interface trong VPC của công ty; các dịch vụ nội bộ gọi API bằng địa chỉ IP private.",
            en: "The interface VPC endpoint for the SaaS service appears as an elastic network interface in the company's VPC; internal services call the API using private IP addresses.",
          },
        },
        {
          flow: ["vpce", "saas"],
          badge: "PrivateLink",
          caption: {
            vi: "Lưu lượng đi qua AWS PrivateLink và không rời khỏi mạng Amazon, giảm rủi ro dữ liệu bị lộ hoặc bị chặn bắt.",
            en: "Traffic goes over AWS PrivateLink and never leaves the Amazon network, reducing the risk of exposure or interception.",
          },
        },
        {
          stop: ["saas", "vpce"],
          caption: {
            vi: "PrivateLink chỉ theo một chiều, từ bên sử dụng dịch vụ tới bên cung cấp; nhà cung cấp SaaS không thể khởi tạo kết nối tới dịch vụ của công ty.",
            en: "PrivateLink is one-way, from the service consumer to the provider; the SaaS provider cannot initiate connections to the company's services.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Truy cập private, không có lưu lượng đến ngoài ý muốn.",
          en: "Private access with no unsolicited inbound traffic.",
        },
      },
    },
    {
      option: "a",
      hide: ["vpce", "peer", "cf", "ownSmall"],
      steps: [
        {
          flow: ["svc", "vpn", "inet", "saas"],
          tone: "warn",
          caption: {
            vi: "Site-to-Site VPN tạo được đường hầm an toàn, nhưng cần thiết bị hỗ trợ IPsec và tuỳ cách nhà cung cấp SaaS thiết lập, lưu lượng có thể đi qua internet.",
            en: "Site-to-Site VPN can build a secure tunnel, but it needs IPsec-compatible devices and, depending on the SaaS provider's setup, traffic may cross the internet.",
          },
        },
        {
          mark: "vpn",
          tone: "bad",
          badge: { vi: "phức tạp hơn", en: "more complex" },
          caption: {
            vi: "Giải pháp này cũng phức tạp hơn khi vận hành và có độ trễ cao hơn so với kết nối private gốc của AWS.",
            en: "It also adds operational complexity and latency compared with AWS-native private connectivity.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Phức tạp hơn và có thể đi qua internet.",
          en: "More complex, and traffic may cross the internet.",
        },
      },
    },
    {
      option: "c",
      hide: ["vpce", "vpn", "cf", "inet", "own"],
      steps: [
        {
          flow: ["svc", "peer", "saas"],
          caption: {
            vi: "VPC peering tạo kết nối mạng trực tiếp giữa hai VPC.",
            en: "VPC peering gives direct network connectivity between the two VPCs.",
          },
        },
        {
          flow: ["saas", "peer", "svc"],
          tone: "bad",
          caption: {
            vi: "Peering mở quyền truy cập ở cấp mạng rộng hơn và thiếu kiểm soát chi tiết như PrivateLink, nên có thể cho phép lưu lượng đến ngoài ý muốn từ nhà cung cấp SaaS.",
            en: "Peering opens broader network-level access without PrivateLink's granular controls, so it can permit unsolicited inbound traffic from the SaaS provider.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không ngăn được lưu lượng đến từ phía nhà cung cấp.",
          en: "It does not stop inbound traffic from the provider.",
        },
      },
    },
    {
      option: "d",
      hide: ["vpce", "vpn", "peer", "own"],
      steps: [
        {
          flow: ["svc", "inet", "cf", "saas"],
          tone: "bad",
          caption: {
            vi: "CloudFront được thiết kế để phân phối và cache nội dung tại edge location; nó không tạo kết nối backend private, và lưu lượng vẫn đi qua internet công cộng.",
            en: "CloudFront is built for content distribution and caching at edge locations; it does not create private backend connectivity, and traffic still crosses the public internet.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Lưu lượng vẫn đi qua internet công cộng.",
          en: "Traffic still crosses the public internet.",
        },
      },
    },
  ],
};

export default spec;
