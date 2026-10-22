// Practice test 6, question 12: AWS Transit Gateway as the hub of a star network of VPCs and on-premises (Direct Connect).
// Captions follow the question's explanation. Additional sources:
// - A transit gateway attaches to a Direct Connect gateway through a transit virtual interface:
//   https://docs.aws.amazon.com/vpc/latest/tgw/tgw-dcg-attachments.html
// - VPC peering does not support transitive peering relationships:
//   https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
// - PrivateLink exposes a service behind a Network Load Balancer through interface endpoints:
//   https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168895,
  cols: 5,
  rows: 3.2,
  nodes: [
    { id: "vpcA", label: "VPC A", sub: { vi: "tài khoản 1", en: "account 1" }, at: [0.8, 0.2] },
    { id: "vpcB", label: "VPC B", sub: { vi: "tài khoản 2", en: "account 2" }, at: [0, 1.4] },
    { id: "vpcC", label: "VPC C", sub: { vi: "tài khoản 3", en: "account 3" }, at: [0.8, 2.6] },
    { id: "tgw", label: "Transit Gateway", sub: "hub", at: [2, 1.4] },
    { id: "vgw", label: "Virtual private GW", sub: { vi: "đầu VPN của 1 VPC", en: "VPN end of 1 VPC" }, kind: "ghost", at: [2, 1.4] },
    { id: "pl", label: "PrivateLink", sub: "NLB → endpoint", at: [2, 1.4] },
    { id: "dxgw", label: "Direct Connect GW", at: [3.1, 1.4] },
    { id: "onprem", label: { vi: "On-premises", en: "On-premises" }, sub: "Direct Connect", kind: "onprem", at: [4.2, 1.4] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["vgw", "pl"],
      steps: [
        {
          flow: [["vpcA", "tgw"], ["vpcB", "tgw"], ["vpcC", "tgw"]],
          caption: {
            vi: "Mỗi VPC chỉ cần một kết nối duy nhất (attachment) tới Transit Gateway, đóng vai trò hub trung tâm.",
            en: "Each VPC needs only a single connection (attachment) to the Transit Gateway, which acts as the central hub.",
          },
        },
        {
          flow: ["vpcA", "tgw", "vpcC"],
          caption: {
            vi: "Lưu lượng giữa các VPC (spoke) đi qua hub; Transit Gateway kiểm soát cách định tuyến giữa mọi mạng được kết nối.",
            en: "Traffic between VPCs (spokes) goes through the hub; the Transit Gateway controls how traffic is routed among all connected networks.",
          },
        },
        {
          flow: ["vpcB", "tgw", "dxgw"],
          badge: "transit VIF",
          caption: {
            vi: "Transit Gateway gắn với Direct Connect gateway qua transit virtual interface.",
            en: "The Transit Gateway attaches to a Direct Connect gateway through a transit virtual interface.",
          },
        },
        {
          flow: ["dxgw", "onprem"],
          caption: {
            vi: "Lưu lượng tới on-premises qua Direct Connect, nên mạng on-premises cũng là một spoke của cùng hub.",
            en: "Traffic reaches on-premises over Direct Connect, so the on-premises network is another spoke of the same hub.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Mạng hình sao kết nối mọi VPC với nhau và với on-premises qua Direct Connect.",
          en: "A star network that connects every VPC with each other and with on-premises over Direct Connect.",
        },
      },
    },
    {
      option: "a",
      hide: ["tgw", "vgw", "pl", "dxgw"],
      steps: [
        {
          flow: [["vpcA", "vpcB"], ["vpcB", "vpcC"], ["vpcA", "vpcC"]],
          tone: "warn",
          badge: "peering",
          caption: {
            vi: "VPC peering chỉ nối hai VPC và không có tính bắc cầu (transitive), nên phải tạo một peering connection cho từng cặp VPC.",
            en: "VPC peering connects two VPCs and is not transitive, so a peering connection is needed for every pair of VPCs.",
          },
        },
        {
          stop: ["vpcB", "onprem"],
          caption: {
            vi: "Peering một mình không kết nối được on-premises; cần thêm Direct Connect và Direct Connect gateway, điều mà phương án này không đề cập.",
            en: "Peering alone does not connect on-premises; that needs Direct Connect and a Direct Connect gateway, which this option does not mention.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không tạo được mạng hình sao gồm cả on-premises.",
          en: "It does not build a star network that includes on-premises.",
        },
      },
    },
    {
      option: "b",
      hide: ["tgw", "pl", "dxgw"],
      steps: [
        {
          flow: ["vpcB", "vgw"],
          tone: "warn",
          badge: "VPN",
          caption: {
            vi: "Virtual private gateway (VPN gateway) là đầu phía VPC của một kết nối VPN, gắn với một VPC.",
            en: "A virtual private gateway (VPN gateway) is the VPC-side end of a VPN connection, attached to one VPC.",
          },
        },
        {
          stop: ["vpcA", "vgw"],
          caption: {
            vi: "Nó không làm hub nối các VPC với nhau, và đề bài không đề cập tới VPN.",
            en: "It is not a hub that connects VPCs to each other, and the scenario does not mention a VPN.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không kết nối các VPC theo mô hình hình sao.",
          en: "It does not connect the VPCs in a star.",
        },
      },
    },
    {
      option: "d",
      hide: ["tgw", "vgw", "dxgw"],
      steps: [
        {
          flow: ["vpcA", "pl", "vpcB"],
          tone: "warn",
          badge: { vi: "1 dịch vụ", en: "1 service" },
          caption: {
            vi: "PrivateLink tạo kết nối riêng tư tới một ứng dụng đặt sau NLB ở tài khoản khác, thông qua một network interface (ENI) trong VPC của bên dùng.",
            en: "PrivateLink creates a private connection to one application behind an NLB in another account, through a network interface (ENI) in the consumer's VPC.",
          },
        },
        {
          stop: ["pl", "onprem"],
          caption: {
            vi: "Nó chia sẻ từng dịch vụ, không định tuyến lưu lượng giữa mọi VPC và mạng on-premises như một hub.",
            en: "It shares individual services; it does not route traffic among all VPCs and the on-premises network like a hub.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không tạo được mạng hình sao.",
          en: "It does not build a star network.",
        },
      },
    },
  ],
};

export default spec;
