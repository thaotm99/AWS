// Practice test 6, question 34: AWS VPN CloudHub lets branch offices (Site-to-Site VPN) and headquarters (Direct Connect)
// reach each other through the virtual private gateway. Captions follow the question's explanation and its reference:
//   https://docs.aws.amazon.com/vpn/latest/s2svpn/VPN_CloudHub.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const notBetweenSites = (option: string, node: string, reach: string[] | null, how: Bilingual, why: Bilingual): ScenarioSpec => ({
  option,
  hide: ["vgw", "peer", "swvpn", "vpce"].filter((id) => id !== node),
  steps: [
    ...(reach ? [{ flow: reach, tone: "warn" as const, caption: how }] : []),
    { stop: (reach ? [node, "mia"] : ["sf", node]) as [string, string], caption: reach ? why : { vi: `${how.vi} ${why.vi}`, en: `${how.en} ${why.en}` } },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Các văn phòng không gửi/nhận dữ liệu với nhau được.",
      en: "The offices cannot send and receive data with each other.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 130168977,
  cols: 4.2,
  rows: 3.3,
  nodes: [
    { id: "la", label: { vi: "Trụ sở LA", en: "LA headquarters" }, sub: "Direct Connect", kind: "onprem", at: [0, 0.2] },
    { id: "sf", label: "San Francisco", sub: "Site-to-Site VPN", kind: "onprem", at: [0, 1.4] },
    { id: "mia", label: "Miami", sub: "Site-to-Site VPN", kind: "onprem", at: [0, 2.6] },
    { id: "vgw", label: "Virtual private GW", sub: "VPN CloudHub", at: [1.9, 1.4] },
    { id: "peer", label: "VPC peering", sub: "VPC ↔ VPC", kind: "ghost", at: [1.9, 1.4] },
    { id: "swvpn", label: "Software VPN", sub: { vi: "appliance trong VPC", en: "appliance in VPC" }, at: [1.9, 1.4] },
    { id: "vpce", label: "VPC endpoint", sub: { vi: "tới dịch vụ AWS", en: "to AWS services" }, kind: "ghost", at: [1.9, 1.4] },
    { id: "vpc", label: "VPC", sub: { vi: "tài nguyên", en: "resources" }, at: [3.2, 1.4] },
  ],
  links: [["vgw", "vpc"]],
  scenarios: [
    {
      option: "b",
      hide: ["peer", "swvpn", "vpce"],
      steps: [
        {
          flow: [["la", "vgw"], ["sf", "vgw"], ["mia", "vgw"]],
          caption: {
            vi: "Trụ sở dùng Direct Connect, hai chi nhánh dùng Site-to-Site VPN, tất cả kết nối tới virtual private gateway của VPC.",
            en: "Headquarters uses Direct Connect and the two branches use Site-to-Site VPN, all connecting to the VPC's virtual private gateway.",
          },
        },
        {
          flow: ["sf", "vgw", "mia"],
          caption: {
            vi: "VPN CloudHub hoạt động theo mô hình hub-and-spoke: các site giao tiếp được với nhau, không chỉ với tài nguyên trong VPC.",
            en: "VPN CloudHub works as hub-and-spoke: the sites can communicate with each other, not just with the resources in the VPC.",
          },
        },
        {
          flow: ["mia", "vgw", "la"],
          caption: {
            vi: "Site dùng Direct Connect tới virtual private gateway cũng tham gia CloudHub, nên chi nhánh trao đổi dữ liệu được với trụ sở.",
            en: "Sites that use Direct Connect to the virtual private gateway can also be part of CloudHub, so branches exchange data with headquarters.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Các chi nhánh và trụ sở gửi/nhận dữ liệu với nhau qua một hub.",
          en: "Branches and headquarters send and receive data with each other through one hub.",
        },
      },
    },
    notBetweenSites(
      "a",
      "peer",
      null,
      {
        vi: "VPC peering là kết nối giữa hai VPC trong mạng AWS.",
        en: "VPC peering is a connection between two VPCs inside the AWS network.",
      },
      {
        vi: "Nó không thể chuyển dữ liệu giữa các văn phòng chi nhánh.",
        en: "It cannot carry data between the branch offices.",
      },
    ),
    notBetweenSites(
      "c",
      "swvpn",
      ["sf", "swvpn", "vpc"],
      {
        vi: "Software VPN appliance chạy trong VPC xử lý kết nối giữa một mạng ở xa và VPC.",
        en: "A software VPN appliance running in the VPC handles connectivity between a remote network and the VPC.",
      },
      {
        vi: "Nó chỉ nối mạng ở xa với VPC, không cho các chi nhánh gửi/nhận dữ liệu với nhau.",
        en: "It only links a remote network to the VPC; it does not let the branches send and receive data with each other.",
      },
    ),
    notBetweenSites(
      "d",
      "vpce",
      null,
      {
        vi: "VPC endpoint kết nối riêng tư từ VPC tới các dịch vụ AWS; lưu lượng không rời mạng Amazon.",
        en: "A VPC endpoint privately connects a VPC to AWS services; the traffic does not leave the Amazon network.",
      },
      {
        vi: "Nó không dùng được để gửi/nhận dữ liệu giữa các chi nhánh.",
        en: "It cannot be used to send and receive data between the branch offices.",
      },
    ),
  ],
};

export default spec;
