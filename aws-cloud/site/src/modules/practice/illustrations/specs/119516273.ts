// Practice test 4, question 28: connect VPCs and on-premises networks through a central hub with AWS Transit Gateway.
// Captions follow the question's explanation (hub and spoke, Transit VPC with EC2-based software appliances,
// VPC peering is point-to-point and not transitive, no on-premises connectivity through a peered VPC).
import type { IllustrationSpec, StepSpec } from "../types";

const noOnPrem: StepSpec = {
  stop: ["dc", "vpc1"],
  caption: {
    vi: "VPC peering là kết nối điểm-điểm giữa các VPC, không hỗ trợ transitive routing và không thiết lập được kết nối với mạng on-premises; tài nguyên trong một VPC cũng không đi ra on-premises qua kết nối hybrid của VPC đã peer.",
    en: "VPC peering is point-to-point between VPCs, does not support transitive routing and cannot provide on-premises connectivity; resources cannot reach on-premises through a peered VPC's hybrid link.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516273,
  cols: 4.8,
  rows: 2.8,
  nodes: [
    { id: "dc", label: "On-premises", sub: { vi: "trung tâm dữ liệu", en: "data center" }, kind: "onprem", at: [0, 1.1] },
    { id: "tgw", label: "Transit Gateway", sub: "hub", at: [1.35, 1.1] },
    { id: "tvpc", label: "Transit VPC", sub: { vi: "appliance trên EC2", en: "EC2 appliances" }, at: [1.35, 1.1] },
    { id: "vpc1", label: "VPC 1", kind: "data", at: [2.7, 0.1] },
    { id: "vpc2", label: "VPC 2", kind: "data", at: [3.8, 1.1] },
    { id: "vpc3", label: "VPC 3", kind: "data", at: [2.7, 2.1] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["tvpc"],
      steps: [
        {
          flow: ["dc", "tgw"],
          caption: {
            vi: "Trung tâm dữ liệu chỉ cần một kết nối tới gateway trung tâm.",
            en: "The data center needs a single connection to the central gateway.",
          },
        },
        {
          flow: [["tgw", "vpc1"], ["tgw", "vpc2"], ["tgw", "vpc3"]],
          badge: "hub",
          caption: {
            vi: "Mỗi VPC cũng chỉ kết nối tới Transit Gateway; Transit Gateway đóng vai trò hub điều phối định tuyến giữa mọi mạng (spoke).",
            en: "Each VPC also connects only to the Transit Gateway, which acts as the hub controlling how traffic is routed among all the networks (spokes).",
          },
        },
        {
          flow: ["dc", "tgw", "vpc2"],
          caption: {
            vi: "Không mạng nào phải kết nối trực tiếp với từng mạng khác, nên việc quản lý đơn giản và chi phí vận hành giảm.",
            en: "No network has to connect to every other one, which simplifies management and reduces operational costs.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Mô hình hub-and-spoke với chi phí vận hành thấp nhất.",
          en: "A hub-and-spoke model with the least operational overhead.",
        },
      },
    },
    {
      option: "b",
      hide: ["tgw"],
      steps: [
        {
          flow: [["dc", "tvpc", "vpc1"], ["tvpc", "vpc2"], ["tvpc", "vpc3"]],
          tone: "warn",
          caption: {
            vi: "Transit VPC cũng kết nối các VPC và trung tâm dữ liệu qua một VPC dùng chung làm trung tâm trung chuyển.",
            en: "A Transit VPC also connects the VPCs and data centers through a common VPC that serves as a transit center.",
          },
        },
        {
          mark: "tvpc",
          tone: "bad",
          badge: { vi: "tự vận hành", en: "self-managed" },
          caption: {
            vi: "Nhưng phải tự quản lý và mở rộng các software appliance chạy trên EC2, tự lo tính sẵn sàng cao và các VPN connection; Transit Gateway loại bỏ những việc này.",
            en: "But you manage and scale the EC2-based software appliances, their high availability and the VPN connections yourself; Transit Gateway removes all of that.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Chi phí vận hành cao hơn.", en: "More operational overhead." },
      },
    },
    {
      option: "c",
      hide: ["tgw", "tvpc"],
      steps: [
        {
          flow: [["vpc1", "vpc2"], ["vpc2", "vpc3"]],
          badge: "peering",
          caption: {
            vi: "Partially meshed VPC peering nối một số cặp VPC với nhau.",
            en: "Partially meshed VPC peering connects some pairs of VPCs.",
          },
        },
        noOnPrem,
      ],
      verdict: {
        works: false,
        caption: { vi: "Peering không kết nối được on-premises.", en: "Peering cannot connect on-premises." },
      },
    },
    {
      option: "d",
      hide: ["tgw", "tvpc"],
      steps: [
        {
          flow: [["vpc1", "vpc2"], ["vpc2", "vpc3"], ["vpc3", "vpc1"]],
          badge: "peering",
          caption: {
            vi: "Fully meshed VPC peering nối mọi cặp VPC; mỗi cặp cần một peering connection riêng.",
            en: "Fully meshed VPC peering connects every pair of VPCs; each pair needs its own peering connection.",
          },
        },
        noOnPrem,
      ],
      verdict: {
        works: false,
        caption: { vi: "Peering không kết nối được on-premises.", en: "Peering cannot connect on-premises." },
      },
    },
  ],
};

export default spec;
