// Practice test 1, question 39: private access to a partner's RDS for MySQL through an NLB and AWS PrivateLink.
// Captions follow the question's explanation. Additional sources:
// - Endpoint services use a Network Load Balancer as the service front end:
//   https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
// - A public NAT gateway routes traffic to the VPC's internet gateway:
//   https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222687,
  cols: 5,
  rows: 3.25,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng phân tích", en: "Analytics app" }, sub: "private subnet", at: [0, 1.1] },
    { id: "vpce", label: "Interface endpoint", sub: "VPC endpoint", at: [1, 1.1] },
    { id: "nat", label: "NAT gateway", kind: "ghost", at: [1, 0.1] },
    { id: "inet", label: "Internet", kind: "ghost", at: [2.5, 0.1] },
    { id: "peer", label: "VPC peering", at: [2, 1.1] },
    { id: "tgw", label: "Transit Gateway", sub: { vi: "tài khoản đối tác", en: "partner account" }, at: [2.5, 2.25] },
    { id: "laptop", label: { vi: "Máy nghiên cứu viên", en: "Researchers' PCs" }, kind: "actor", at: [0, 2.25] },
    { id: "cvpn", label: "Client VPN", sub: "endpoint", at: [1, 2.25] },
    { id: "dxgw", label: "Direct Connect gateway", kind: "ghost", at: [2, 2.25] },
    { id: "nlb", label: "NLB", sub: "endpoint service", at: [3, 1.1] },
    { id: "rds", label: "RDS for MySQL", kind: "data", at: [4, 1.1] },
  ],
  zones: [
    { id: "own", label: { vi: "VPC công ty · không có internet", en: "Company VPC · no internet" }, tone: "vpc", from: [0, 0.1], to: [1, 1.1], pad: 10 },
    { id: "partner", label: { vi: "VPC đối tác", en: "Partner VPC" }, tone: "account", from: [3, 0.1], to: [4, 1.1], pad: 10 },
  ],
  links: [
    ["nat", "inet"],
    ["inet", "rds"],
  ],
  scenarios: [
    {
      option: "d",
      hide: ["nat", "inet", "peer", "tgw", "laptop", "cvpn", "dxgw"],
      steps: [
        {
          flow: ["app", "vpce"],
          caption: {
            vi: "Ứng dụng kết nối tới interface VPC endpoint nằm trong chính VPC của công ty.",
            en: "The application connects to an interface VPC endpoint inside the company's own VPC.",
          },
        },
        {
          flow: ["vpce", "nlb"],
          badge: "PrivateLink",
          caption: {
            vi: "Đối tác đặt một Network Load Balancer phía trước cơ sở dữ liệu và chia sẻ nó dưới dạng endpoint service qua AWS PrivateLink; lưu lượng đi trong mạng AWS.",
            en: "The partner puts a Network Load Balancer in front of the database and shares it as an endpoint service through AWS PrivateLink; traffic stays on the AWS network.",
          },
        },
        {
          flow: ["nlb", "rds"],
          caption: {
            vi: "NLB chuyển kết nối tới RDS for MySQL. Không cần internet gateway, VPN hay Direct Connect.",
            en: "The NLB forwards the connection to RDS for MySQL. No internet gateway, VPN or Direct Connect is needed.",
          },
        },
        {
          flow: ["rds", "nlb", "vpce", "app"],
          back: true,
          caption: {
            vi: "Kết quả truy vấn trở về ứng dụng theo cùng đường kết nối riêng tư.",
            en: "Query results return to the application over the same private path.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Kết nối riêng tư từ VPC của công ty tới cơ sở dữ liệu của đối tác, với độ phức tạp thấp.",
          en: "Private connectivity from the company VPC to the partner's database, with little complexity.",
        },
      },
    },
    {
      option: "a",
      hide: ["vpce", "nlb", "peer", "tgw", "laptop", "cvpn", "dxgw"],
      steps: [
        {
          stop: ["app", "nat"],
          caption: {
            vi: "VPC của công ty không có truy cập internet. NAT gateway không thể hoạt động trong subnet không có internet gateway, nên đường đi qua internet không tồn tại.",
            en: "The company VPC has no internet access. A NAT gateway cannot work in a subnet without an internet gateway, so there is no path over the internet.",
          },
        },
        {
          mark: "rds",
          tone: "bad",
          badge: "public access",
          caption: {
            vi: "Bật public access cho RDS và truy cập qua internet còn gây lo ngại nghiêm trọng về bảo mật và tuân thủ.",
            en: "Making RDS publicly accessible and reaching it over the internet also raises serious security and compliance concerns.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Vi phạm yêu cầu không có truy cập internet và yêu cầu bảo mật dữ liệu.",
          en: "It breaks the no-internet constraint and the data security requirement.",
        },
      },
    },
    {
      option: "b",
      hide: ["vpce", "nlb", "nat", "inet", "laptop", "cvpn", "dxgw"],
      steps: [
        {
          flow: [["app", "peer", "rds"], ["app", "tgw", "rds"]],
          tone: "warn",
          caption: {
            vi: "Lưu lượng giữa hai VPC đi qua VPC peering hoặc qua Transit Gateway; dựng cả hai cho cùng một cặp VPC là mâu thuẫn về kiến trúc.",
            en: "Traffic between two VPCs goes through either VPC peering or a Transit Gateway; building both for the same pair of VPCs is an architectural contradiction.",
          },
        },
        {
          mark: ["peer", "tgw"],
          tone: "bad",
          badge: { vi: "phức tạp", en: "complex" },
          caption: {
            vi: "Định tuyến lưu lượng RDS qua Transit Gateway và sửa route table của subnet RDS làm cấu hình phức tạp hơn mức cần thiết, trái với yêu cầu giảm thiểu độ phức tạp.",
            en: "Routing RDS traffic through a Transit Gateway and editing the RDS subnet route tables adds configuration the scenario does not need, against the requirement to minimise complexity.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phải giải pháp ít phức tạp nhất.",
          en: "Not the least complex solution.",
        },
      },
    },
    {
      option: "c",
      hide: ["vpce", "nlb", "nat", "inet", "peer", "tgw"],
      steps: [
        {
          flow: ["laptop", "cvpn"],
          tone: "warn",
          caption: {
            vi: "Client VPN phục vụ truy cập của từng người dùng từ máy cá nhân, không phải kết nối từ VPC tới VPC; ứng dụng trong VPC không dùng được kết nối này.",
            en: "Client VPN is for individual users on their own machines, not VPC-to-VPC connectivity; the application in the VPC cannot use it.",
          },
        },
        {
          stop: ["cvpn", "dxgw"],
          caption: {
            vi: "Công ty không có Direct Connect, nên không thể định tuyến lưu lượng RDS qua Direct Connect gateway.",
            en: "The company has no Direct Connect, so RDS traffic cannot be routed through a Direct Connect gateway.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Dựa vào kết nối không tồn tại và không kết nối từ chính VPC.",
          en: "It relies on a connection that does not exist and does not connect from the VPC itself.",
        },
      },
    },
  ],
};

export default spec;
