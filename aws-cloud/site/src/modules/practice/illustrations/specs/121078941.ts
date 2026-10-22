// Practice test 3, question 16: 25 VPCs and an on-premises data center joined through a transit gateway and a
// transit VIF on the existing Direct Connect connection. Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const VPCS = ["vpc1", "vpc2", "vpc25"];

const spec: IllustrationSpec = {
  questionId: 121078941,
  cols: 4.5,
  rows: 3.3,
  nodes: [
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, kind: "onprem", at: [0, 1.1] },
    { id: "dx", label: "Direct Connect", at: [1.1, 1.1] },
    { id: "vpn", label: "Site-to-Site VPN", sub: { vi: "×25 kết nối", en: "×25 connections" }, at: [1.1, 1.1] },
    { id: "tgw", label: "Transit Gateway", sub: "route propagation", at: [2.2, 1.1] },
    { id: "pl", label: "AWS PrivateLink", sub: "endpoint service", at: [2.2, 1.1] },
    { id: "dxgw", label: "Direct Connect gw", sub: { vi: "+ VGW mỗi VPC", en: "+ VGW per VPC" }, at: [2.2, 1.1] },
    { id: "vpc1", label: "VPC 1", at: [3.3, 0.2] },
    { id: "vpc2", label: "VPC 2", at: [3.3, 1.1] },
    { id: "vpc25", label: "VPC 25", at: [3.3, 2.0] },
  ],
  zones: [{ id: "region", label: "Region", tone: "region", from: [2.2, 0.2], to: [3.3, 2.0], pad: 14 }],
  scenarios: [
    {
      option: "a",
      hide: ["vpn", "pl", "dxgw"],
      steps: [
        {
          flow: VPCS.map((v) => ["tgw", v]),
          badge: "attach ×25",
          caption: {
            vi: "Gắn cả 25 VPC vào một Transit Gateway: định tuyến được tập trung và cho phép giao tiếp bắc cầu giữa các VPC.",
            en: "All 25 VPCs attach to one transit gateway: routing is centralised and transitive communication between the VPCs is possible.",
          },
        },
        {
          flow: ["vpc1", "tgw", "vpc25"],
          caption: {
            vi: "Route propagation cho mỗi attachment loại bỏ việc cập nhật thủ công route table của từng VPC; kết nối full-mesh mở rộng được với ít công vận hành.",
            en: "Route propagation on each attachment removes manual route table updates in every VPC; full-mesh connectivity scales with little operational burden.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Phần hub giữa các VPC; kết hợp với transit VIF để nối on-premises.",
          en: "The VPC hub; combined with a transit VIF to reach on-premises.",
        },
      },
    },
    {
      option: "b",
      hide: ["vpn", "pl", "dxgw"],
      steps: [
        {
          flow: ["dc", "dx", "tgw"],
          badge: "transit VIF",
          caption: {
            vi: "Một transit VIF trên kết nối Direct Connect liên kết với Transit Gateway, tạo một đường tập trung duy nhất từ on-premises.",
            en: "A transit VIF on the Direct Connect connection is associated with the transit gateway, giving one centralised path from on-premises.",
          },
        },
        {
          flow: VPCS.map((v) => ["tgw", v]),
          caption: {
            vi: "Từ Transit Gateway, lưu lượng tới mọi VPC đã gắn; không còn phải duy trì nhiều private VIF, việc quản lý BGP và gộp route đơn giản hơn.",
            en: "From the transit gateway, traffic reaches every attached VPC; there are no longer many private VIFs to maintain, and BGP management and route aggregation are simpler.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Cùng với Transit Gateway tạo thành kiến trúc hub-and-spoke.",
          en: "Together with the transit gateway it forms a hub-and-spoke design.",
        },
      },
    },
    {
      option: "c",
      hide: ["dx", "tgw", "pl", "dxgw"],
      steps: [
        {
          flow: VPCS.map((v) => ["dc", "vpn", v]),
          tone: "warn",
          caption: {
            vi: "Mỗi VPC một kết nối Site-to-Site VPN, mỗi tunnel phải cấu hình BGP route propagation.",
            en: "One Site-to-Site VPN connection per VPC, with BGP route propagation set up on every tunnel.",
          },
        },
        {
          mark: "vpn",
          tone: "bad",
          caption: {
            vi: "25 kết nối VPN làm tăng đáng kể độ phức tạp vận hành, thêm độ trễ và không tận dụng kết nối Direct Connect thông lượng cao đang có.",
            en: "25 VPN connections add significant operational complexity, add latency and do not use the existing high-throughput Direct Connect connection.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp và bỏ phí Direct Connect.", en: "Complex, and it ignores Direct Connect." } },
    },
    {
      option: "d",
      hide: ["vpn", "tgw", "dxgw"],
      steps: [
        {
          flow: [
            ["vpc1", "pl"],
            ["vpc25", "pl"],
          ],
          tone: "warn",
          badge: { vi: "một dịch vụ", en: "one service" },
          caption: {
            vi: "AWS PrivateLink dùng để công bố một dịch vụ một cách riêng tư; nó chỉ cho truy cập một chiều tới dịch vụ cụ thể đó.",
            en: "AWS PrivateLink exposes a service privately; it supports one-way access to that specific service.",
          },
        },
        {
          stop: ["dx", "pl"],
          caption: {
            vi: "PrivateLink không tạo giao tiếp ở cấp mạng giữa tất cả VPC và trung tâm dữ liệu.",
            en: "PrivateLink cannot provide general network-level communication between all the VPCs and the data center.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có định tuyến mạng tổng quát.", en: "No general network routing." } },
    },
    {
      option: "e",
      hide: ["vpn", "tgw", "pl"],
      steps: [
        {
          flow: VPCS.map((v) => ["dc", "dx", "dxgw", v]),
          tone: "warn",
          caption: {
            vi: "Direct Connect gateway cho truy cập on-premises tập trung, nhưng cần gắn một virtual private gateway cho mỗi VPC: 25 VGW phải quản lý.",
            en: "A Direct Connect gateway centralises on-premises access, but needs a virtual private gateway on every VPC: 25 VGWs to manage.",
          },
        },
        {
          stop: ["vpc1", "dxgw"],
          caption: {
            vi: "Direct Connect gateway không hỗ trợ định tuyến bắc cầu giữa các VPC; giao tiếp giữa các VPC vẫn cần peering hoặc một lớp định tuyến khác.",
            en: "A Direct Connect gateway does not support transitive routing between VPCs; inter-VPC traffic would still need peering or another routing layer.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Thiếu kết nối giữa các VPC.", en: "VPC-to-VPC connectivity is missing." } },
    },
  ],
};

export default spec;
