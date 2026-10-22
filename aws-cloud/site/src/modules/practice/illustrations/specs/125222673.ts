// Practice test 1, question 63: resolve on-premises DNS names from a VPC with a Route 53 Resolver outbound endpoint.
// Captions follow the question's explanation. Additional source:
// - Forwarding rules send matching queries to an outbound endpoint, which forwards them to the on-premises
//   resolver; inbound endpoints serve queries from on-premises: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222673,
  cols: 5,
  rows: 2.3,
  nodes: [
    { id: "app", label: "Web portal", sub: { vi: "ứng dụng nội bộ", en: "internal app" }, kind: "actor", at: [0, 0.9] },
    { id: "resolver", label: "Route 53 Resolver", sub: "VPC", at: [1, 0.9] },
    { id: "out", label: "Outbound endpoint", sub: "forwarding rule", at: [2, 0.9] },
    { id: "inb", label: "Inbound endpoint", kind: "ghost", at: [2, 0.9] },
    { id: "hcg", label: "hybrid connectivity gw", sub: { vi: "không tồn tại", en: "does not exist" }, kind: "ghost", at: [2, 0.9] },
    { id: "phz", label: "Private hosted zone", sub: "Route 53", kind: "data", at: [2, 0.9] },
    { id: "vpn", label: "Site-to-Site VPN", at: [3, 0.9] },
    { id: "dns", label: "DNS server", sub: "on-premises", kind: "onprem", at: [4, 0.9] },
  ],
  zones: [
    { id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.9], to: [2, 0.9], pad: 10 },
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [4, 0.9], to: [4, 0.9], pad: 10 },
  ],
  links: [["vpn", "dns"]],
  scenarios: [
    {
      option: "a",
      hide: ["inb", "hcg", "phz"],
      steps: [
        {
          flow: ["app", "resolver"],
          caption: {
            vi: "Ứng dụng truy vấn tên miền của một hệ thống on-premises; truy vấn tới Route 53 Resolver của VPC.",
            en: "The application looks up the name of an on-premises system; the query goes to the VPC's Route 53 Resolver.",
          },
        },
        {
          flow: ["resolver", "out"],
          badge: "rule",
          caption: {
            vi: "Forwarding rule liên kết với VPC xác định các tên miền on-premises cần chuyển tiếp; truy vấn khớp rule được gửi tới outbound endpoint.",
            en: "A forwarding rule associated with the VPC lists the on-premises domains to forward; a matching query is sent to the outbound endpoint.",
          },
        },
        {
          flow: ["out", "vpn", "dns"],
          caption: {
            vi: "Outbound endpoint chuyển tiếp truy vấn qua Site-to-Site VPN tới DNS server on-premises.",
            en: "The outbound endpoint forwards the query across the Site-to-Site VPN to the on-premises DNS server.",
          },
        },
        {
          flow: ["dns", "vpn", "out", "resolver", "app"],
          back: true,
          caption: {
            vi: "Câu trả lời trở về ứng dụng: bản ghi DNS riêng của hệ thống on-premises được phân giải từ bên trong VPC.",
            en: "The answer returns to the application: private DNS records of the on-premises systems resolve from inside the VPC.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Outbound endpoint cùng forwarding rule là cơ chế chuẩn cho phân giải DNS hybrid theo chiều từ AWS ra on-premises.",
          en: "An outbound endpoint with a forwarding rule is the standard mechanism for hybrid DNS from AWS to on-premises.",
        },
      },
    },
    {
      option: "b",
      hide: ["out", "hcg", "phz"],
      steps: [
        {
          flow: ["dns", "vpn", "inb"],
          tone: "warn",
          badge: "inbound",
          caption: {
            vi: "Inbound endpoint cho phép truy vấn DNS từ mạng on-premises phân giải các tên miền riêng trên AWS, tức là chiều ngược lại với yêu cầu.",
            en: "An inbound endpoint lets DNS queries from the on-premises network resolve private domains hosted on AWS: the opposite direction.",
          },
        },
        {
          flow: ["app", "resolver"],
          caption: {
            vi: "Ứng dụng trong VPC cần phân giải tên miền on-premises.",
            en: "The application in the VPC needs to resolve on-premises names.",
          },
        },
        {
          stop: ["resolver", "inb"],
          caption: {
            vi: "Chiều từ VPC ra on-premises cần outbound endpoint; ngoài ra, VPC không có cấu hình nào tên là “recursive DNS resolution”.",
            en: "Queries from the VPC to on-premises need an outbound endpoint; also, there is no VPC setting called “recursive DNS resolution”.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Dùng sai chiều của Resolver endpoint.",
          en: "It uses the Resolver endpoint for the wrong direction.",
        },
      },
    },
    {
      option: "c",
      hide: ["out", "inb", "phz"],
      steps: [
        {
          flow: ["app", "resolver"],
          caption: {
            vi: "Ứng dụng gửi truy vấn tới Route 53 Resolver của VPC.",
            en: "The application sends its query to the VPC's Route 53 Resolver.",
          },
        },
        {
          stop: ["resolver", "hcg"],
          caption: {
            vi: "AWS không có thành phần nào tên là “hybrid connectivity gateway”, và Route 53 không hỗ trợ gắn DNS server on-premises làm nguồn authoritative.",
            en: "AWS has no construct called a “hybrid connectivity gateway”, and Route 53 does not support attaching on-premises DNS servers as authoritative sources.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Dựa vào thành phần không tồn tại.",
          en: "It relies on something that does not exist.",
        },
      },
    },
    {
      option: "d",
      hide: ["out", "inb", "hcg"],
      steps: [
        {
          flow: ["app", "resolver", "phz"],
          tone: "warn",
          caption: {
            vi: "Private hosted zone liên kết với VPC chỉ trả lời bằng các bản ghi được tạo trong Route 53; truy vấn không được chuyển tới DNS server on-premises.",
            en: "A private hosted zone associated with the VPC answers only with records created in Route 53; queries do not reach the on-premises DNS server.",
          },
        },
        {
          mark: "phz",
          tone: "bad",
          badge: { vi: "sao chép thủ công", en: "manual copies" },
          caption: {
            vi: "Muốn phân giải được, phải sao chép thủ công các bản ghi on-premises vào Route 53, gây chi phí vận hành và nguy cơ thiếu nhất quán.",
            en: "To resolve anything, the on-premises records would have to be copied into Route 53 by hand, adding operational overhead and risking inconsistency.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phân giải được bản ghi thực của hệ thống on-premises.",
          en: "It does not resolve the actual on-premises records.",
        },
      },
    },
  ],
};

export default spec;
