// Practice test 1, question 37: Direct Connect plus VPN for a dedicated, encrypted, consistent connection.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222733,
  cols: 3.6,
  rows: 1.5,
  nodes: [
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, kind: "onprem", at: [0, 0.3] },
    { id: "dxvpn", label: "Direct Connect + VPN", sub: "IPsec over DX", at: [1.3, 0.3] },
    { id: "dx", label: "Direct Connect", sub: { vi: "kết nối riêng", en: "dedicated link" }, at: [1.3, 0.3] },
    { id: "vpn", label: "Site-to-Site VPN", sub: "IPsec · internet", at: [1.3, 0.3] },
    { id: "tgw", label: "Transit Gateway", sub: "hub", kind: "ghost", at: [1.3, 0.3] },
    { id: "vpc", label: "Amazon VPC", at: [2.6, 0.3] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["dx", "vpn", "tgw"],
      steps: [
        {
          flow: ["dc", "dxvpn", "vpc"],
          times: 3,
          badge: "IPsec",
          caption: {
            vi: "Kết hợp kết nối Direct Connect riêng với VPC VPN cho đường truyền riêng được mã hoá IPsec, băng thông cao hơn và ổn định hơn VPN qua internet.",
            en: "Combining dedicated Direct Connect with the VPC VPN gives an IPsec-encrypted private connection, more bandwidth and a more consistent experience than internet-based VPN.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Riêng, mã hoá, độ trễ thấp.", en: "Dedicated, encrypted, low latency." } },
    },
    {
      option: "a",
      hide: ["dxvpn", "vpn", "tgw"],
      steps: [
        { flow: ["dc", "dx", "vpc"], times: 3, tone: "warn", caption: { vi: "Direct Connect cho kết nối mạng riêng, độ trễ thấp, thông lượng cao.", en: "Direct Connect gives a dedicated, low-latency, high-throughput connection." } },
        { mark: "dx", tone: "bad", badge: { vi: "không mã hoá", en: "not encrypted" }, caption: { vi: "Nhưng bản thân Direct Connect không cung cấp kết nối được mã hoá.", en: "But Direct Connect by itself does not provide an encrypted connection." } },
      ],
      verdict: { works: false, caption: { vi: "Thiếu mã hoá.", en: "Missing encryption." } },
    },
    {
      option: "b",
      hide: ["dxvpn", "dx", "tgw"],
      steps: [
        { flow: ["dc", "vpn", "vpc"], tone: "warn", caption: { vi: "Site-to-Site VPN mã hoá IPsec qua internet.", en: "Site-to-Site VPN encrypts with IPsec over the internet." } },
        {
          mark: "vpn",
          tone: "bad",
          badge: "internet",
          caption: {
            vi: "VPN hợp với nhu cầu tức thời, băng thông thấp đến vừa và chấp nhận biến động internet; nó không cho kết nối độ trễ thấp, thông lượng cao.",
            en: "VPN suits immediate needs with low to modest bandwidth and internet variability; it cannot give a low-latency, high-throughput connection.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không đủ độ trễ thấp, thông lượng cao.", en: "Not low-latency or high-throughput." } },
    },
    {
      option: "d",
      hide: ["dxvpn", "dx", "vpn"],
      steps: [
        {
          stop: ["dc", "tgw"],
          caption: {
            vi: "Transit Gateway là hub nối VPC và mạng on-premises; tự nó không tạo được kết nối độ trễ thấp, thông lượng cao giữa trung tâm dữ liệu và AWS.",
            en: "Transit Gateway is a hub that interconnects VPCs and on-premises networks; by itself it cannot create a low-latency, high-throughput connection to AWS.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phải đường kết nối.", en: "Not a connection by itself." } },
    },
  ],
};

export default spec;
