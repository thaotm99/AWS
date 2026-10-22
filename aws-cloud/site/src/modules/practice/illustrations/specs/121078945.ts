// Practice test 3, question 7: reach Amazon SQS from a VPC without the public internet, through a VPC endpoint.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 121078945,
  cols: 4.3,
  rows: 3.1,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "App component" }, sub: "EC2 · VPC", kind: "actor", at: [0, 1.1] },
    { id: "vpce", label: "VPC endpoint", sub: "AWS PrivateLink", at: [1.6, 1.1] },
    { id: "nat", label: "NAT instance", at: [1, 0.2] },
    { id: "igw", label: "Internet gateway", at: [2.1, 0.2] },
    { id: "inet", label: "Internet", sub: { vi: "công cộng", en: "public" }, kind: "ghost", at: [3.3, 0.2] },
    { id: "sqs", label: "Amazon SQS", sub: "queue", at: [3.3, 1.1] },
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, kind: "onprem", at: [0, 2.3] },
    { id: "vpn", label: "Site-to-Site VPN", sub: "IPsec", at: [1.6, 2.3] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.2], to: [2.1, 1.1], pad: 12 }],
  scenarios: [
    {
      option: "a",
      hide: ["nat", "igw", "inet", "dc", "vpn"],
      steps: [
        {
          flow: ["app", "vpce"],
          badge: { vi: "không IP công khai", en: "no public IP" },
          caption: {
            vi: "Các thành phần trong VPC gửi request tới VPC endpoint của Amazon SQS mà không cần IP công khai; endpoint này được vận hành bởi AWS PrivateLink.",
            en: "Components in the VPC send requests to the Amazon SQS VPC endpoint without public IPs; the endpoint is powered by AWS PrivateLink.",
          },
        },
        {
          flow: ["vpce", "sqs"],
          caption: {
            vi: "Dữ liệu giữa VPC và hàng đợi SQS được truyền bên trong mạng Amazon, không cần internet gateway, NAT instance, VPN hay Direct Connect.",
            en: "Data between the VPC and the SQS queue stays within the Amazon network, with no internet gateway, NAT instance, VPN or Direct Connect needed.",
          },
        },
        {
          flow: ["sqs", "vpce", "app"],
          back: true,
          caption: {
            vi: "Phản hồi cũng quay về qua endpoint; các instance được bảo vệ khỏi lưu lượng internet.",
            en: "Responses come back through the endpoint as well; the instances are protected from internet traffic.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Truy cập SQS riêng tư, không đi qua internet công cộng.",
          en: "Private access to SQS that never crosses the public internet.",
        },
      },
    },
    {
      option: "b",
      hide: ["vpce", "nat", "dc", "vpn"],
      steps: [
        {
          flow: ["app", "igw", "inet", "sqs"],
          tone: "warn",
          caption: {
            vi: "Internet gateway cho phép giao tiếp giữa các instance trong VPC và internet; request tới SQS đi ra internet công cộng.",
            en: "An internet gateway allows communication between instances in the VPC and the internet; requests to SQS go out over the public internet.",
          },
        },
        {
          mark: "inet",
          tone: "bad",
          badge: { vi: "internet công cộng", en: "public internet" },
          caption: {
            vi: "Nhóm không muốn dùng internet công cộng để truy cập Amazon SQS, nên phương án này bị loại.",
            en: "The team does not want to use the public internet to reach Amazon SQS, so this option is ruled out.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Lưu lượng vẫn đi qua internet công cộng.", en: "Traffic still crosses the public internet." },
      },
    },
    {
      option: "c",
      hide: ["vpce", "dc", "vpn"],
      steps: [
        {
          flow: ["app", "nat", "igw", "inet", "sqs"],
          tone: "warn",
          caption: {
            vi: "NAT instance trong public subnet cho phép instance ở private subnet khởi tạo lưu lượng IPv4 ra Internet hoặc tới dịch vụ AWS khác.",
            en: "A NAT instance in a public subnet lets instances in a private subnet initiate outbound IPv4 traffic to the internet or other AWS services.",
          },
        },
        {
          mark: "nat",
          tone: "bad",
          caption: {
            vi: "NAT instance dùng để cấp quyền truy cập internet cho instance trong private subnet, không giữ lưu lượng tới SQS ngoài internet.",
            en: "NAT instances provide internet access to instances in a private subnet; they do not keep SQS traffic off the internet.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Đây là đường ra internet, không phải đường riêng tới SQS.", en: "This is a path to the internet, not a private path to SQS." },
      },
    },
    {
      option: "d",
      hide: ["vpce", "nat", "igw", "inet"],
      steps: [
        {
          flow: ["dc", "vpn", "app"],
          tone: "warn",
          badge: "IPsec",
          caption: {
            vi: "Site-to-Site VPN kết nối an toàn mạng on-premises hoặc chi nhánh tới Amazon VPC, dùng IPsec qua Internet.",
            en: "Site-to-Site VPN securely connects an on-premises network or branch office to the Amazon VPC, using IPsec over the internet.",
          },
        },
        {
          mark: "vpn",
          tone: "bad",
          caption: {
            vi: "Hạ tầng hiện có đã nằm trong AWS Cloud nên không cần kết nối VPN; VPN cũng không tạo đường riêng từ VPC tới SQS.",
            en: "The existing infrastructure is already in the AWS Cloud, so a VPN connection is not required; it also gives no private path from the VPC to SQS.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "VPN giải quyết bài toán khác.", en: "A VPN solves a different problem." },
      },
    },
  ],
};

export default spec;
