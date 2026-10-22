// Practice test 4, question 45: the most cost-effective way to connect several VPCs in one account: VPC peering.
// Captions follow the question's explanation (private IPv4/IPv6 routing, not transitive, Direct Connect is overkill,
// internet and NAT gateways do not connect VPCs).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516257,
  cols: 3.4,
  rows: 2.5,
  nodes: [
    { id: "v1", label: "Billing VPC", kind: "data", at: [0, 0.2] },
    { id: "v2", label: "Operations VPC", kind: "data", at: [2.3, 0.2] },
    { id: "v3", label: "Finance VPC", kind: "data", at: [1.15, 1.8] },
    { id: "dx", label: "Direct Connect", sub: { vi: "tới on-premises", en: "to on-premises" }, at: [1.15, 0.95] },
    { id: "igw", label: "Internet gateway", sub: { vi: "ra internet", en: "to the internet" }, kind: "ghost", at: [1.15, 0.95] },
    { id: "nat", label: "NAT gateway", sub: { vi: "ra internet", en: "to the internet" }, kind: "ghost", at: [1.15, 0.95] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["dx", "igw", "nat"],
      steps: [
        {
          flow: [["v1", "v2"], ["v2", "v3"], ["v3", "v1"]],
          badge: "peering",
          caption: {
            vi: "Mỗi VPC peering connection định tuyến lưu lượng giữa hai VPC bằng địa chỉ private IPv4 hoặc IPv6; instance giao tiếp như trong cùng một mạng.",
            en: "Each VPC peering connection routes traffic between two VPCs using private IPv4 or IPv6 addresses; instances communicate as if on the same network.",
          },
        },
        {
          flow: ["v1", "v3"],
          times: 2,
          caption: {
            vi: "Peering không có tính bắc cầu (transitive), nên mỗi cặp VPC cần giao tiếp phải có peering connection riêng.",
            en: "Peering is not transitive, so each pair of VPCs that must talk needs its own peering connection.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "VPC peering là cách kết nối các VPC với chi phí hợp lý nhất ở đây.",
          en: "VPC peering is the most cost-effective way to connect the VPCs here.",
        },
      },
    },
    {
      option: "a",
      hide: ["igw", "nat"],
      steps: [
        {
          flow: [["v1", "dx"], ["v2", "dx"]],
          tone: "warn",
          caption: {
            vi: "AWS Direct Connect là kết nối mạng chuyên dụng từ cơ sở của khách hàng tới AWS.",
            en: "AWS Direct Connect is a dedicated network connection from your premises to AWS.",
          },
        },
        {
          mark: "dx",
          tone: "bad",
          badge: "$$",
          caption: {
            vi: "Dùng nó để nối các VPC với nhau là quá mức cần thiết và không tối ưu chi phí bằng VPC peering.",
            en: "Using it to connect VPCs is overkill and not as cost-optimal as VPC peering.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Quá đắt cho nhu cầu này.", en: "Overkill for this need." },
      },
    },
    {
      option: "c",
      hide: ["dx", "nat"],
      steps: [
        {
          stop: ["v1", "igw"],
          caption: {
            vi: "Internet gateway cho phép instance trong VPC giao tiếp với internet; nó không dùng để kết nối các VPC với nhau.",
            en: "An internet gateway lets instances in a VPC communicate with the internet; it is not meant for connecting VPCs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không kết nối VPC với VPC.", en: "It does not connect VPCs." },
      },
    },
    {
      option: "d",
      hide: ["dx", "igw"],
      steps: [
        {
          stop: ["v1", "nat"],
          caption: {
            vi: "NAT gateway cho instance trong private subnet kết nối ra internet hoặc dịch vụ AWS; nó không kết nối các VPC với nhau và còn tính phí theo giờ và theo dữ liệu xử lý.",
            en: "A NAT gateway lets private-subnet instances reach the internet or AWS services; it does not connect VPCs, and it is billed hourly and per data processed.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không kết nối VPC với VPC.", en: "It does not connect VPCs." },
      },
    },
  ],
};

export default spec;
