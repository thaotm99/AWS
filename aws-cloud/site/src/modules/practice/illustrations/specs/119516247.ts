// Practice test 4, question 48: Direct Connect as the primary private link with a Site-to-Site VPN backup over the internet.
// Captions follow the question's explanation (Direct Connect does not involve the internet, VPN uses IPsec over the
// internet, Egress-Only Internet Gateway is IPv6 outbound only, Direct Connect is costly as a backup).
import type { IllustrationSpec, ScenarioSpec, StepSpec } from "../types";

const primary: StepSpec = {
  flow: ["dc", "dx", "vpc"],
  times: 2,
  badge: "primary",
  caption: {
    vi: "Direct Connect là kết nối riêng, chuyên dụng giữa trung tâm dữ liệu và AWS, không đi qua internet.",
    en: "Direct Connect is a dedicated, private connection between the data center and AWS that does not involve the internet.",
  },
};

const dxDown: StepSpec = {
  mark: "dx",
  tone: "bad",
  caption: {
    vi: "Kết nối Direct Connect gặp sự cố.",
    en: "The Direct Connect connection fails.",
  },
};

const backup: StepSpec = {
  flow: ["dc", "vpn", "vpc"],
  times: 2,
  badge: "IPsec",
  caption: {
    vi: "Lưu lượng chuyển sang Site-to-Site VPN: kết nối được mã hoá bằng IPsec đi qua internet, đảm bảo uptime.",
    en: "Traffic fails over to the Site-to-Site VPN: an IPsec-encrypted connection over the internet keeps the link up.",
  },
};

const correct = (option: string): ScenarioSpec => ({
  option,
  hide: ["eigw", "dx2"],
  steps: [primary, dxDown, backup],
  verdict: {
    works: true,
    caption: {
      vi: "Direct Connect làm kết nối chính, Site-to-Site VPN làm kết nối dự phòng.",
      en: "Direct Connect as the primary connection, Site-to-Site VPN as the backup.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 119516247,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "dc", label: "Data center", sub: "on-premises", kind: "onprem", at: [0, 1] },
    { id: "dx", label: "Direct Connect", sub: { vi: "riêng · chuyên dụng", en: "private · dedicated" }, at: [1.45, 0.2] },
    { id: "vpn", label: "Site-to-Site VPN", sub: "IPsec · internet", at: [1.45, 1.8] },
    { id: "eigw", label: "Egress-only IGW", sub: "IPv6 outbound", kind: "ghost", at: [1.45, 1.8] },
    { id: "dx2", label: "Direct Connect", sub: { vi: "dự phòng", en: "backup" }, at: [1.45, 1.8] },
    { id: "vpc", label: "VPC", sub: "Amazon S3 …", kind: "data", at: [2.9, 1] },
  ],
  scenarios: [
    correct("a"),
    correct("d"),
    {
      option: "b",
      hide: ["eigw", "dx2", "dx"],
      steps: [
        {
          flow: ["dc", "vpn", "vpc"],
          times: 2,
          tone: "warn",
          badge: "primary",
          caption: {
            vi: "Site-to-Site VPN làm kết nối chính đưa toàn bộ lưu lượng qua internet.",
            en: "A Site-to-Site VPN as the primary sends all traffic over the internet.",
          },
        },
        {
          mark: "vpn",
          tone: "bad",
          caption: {
            vi: "Công ty cần kết nối riêng chuyên dụng làm kết nối chính; internet chỉ được dùng khi failover.",
            en: "The company wants a dedicated private primary connection; the internet is only for failover.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Internet chỉ dành cho failover.", en: "The internet is only for failover." },
      },
    },
    {
      option: "c",
      hide: ["vpn", "dx2"],
      steps: [
        primary,
        dxDown,
        {
          stop: ["dc", "eigw"],
          caption: {
            vi: "Egress-Only Internet Gateway chỉ cho phép lưu lượng IPv6 đi ra từ VPC tới internet; nó không kết nối được trung tâm dữ liệu on-premises với AWS.",
            en: "An Egress-Only Internet Gateway only allows outbound IPv6 from the VPC to the internet; it cannot connect an on-premises data center to AWS.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không phải kết nối hybrid.", en: "Not a hybrid connection." },
      },
    },
    {
      option: "e",
      hide: ["vpn", "eigw"],
      steps: [
        primary,
        {
          flow: ["dc", "dx2", "vpc"],
          tone: "warn",
          badge: "$$",
          caption: {
            vi: "Direct Connect là kết nối vật lý, bảo mật cao nhưng tốn kém; duy trì thêm một kết nối chỉ để dự phòng là không hợp lý.",
            en: "Direct Connect is a highly secure physical connection but costly; keeping one only as a backup makes little sense.",
          },
        },
        {
          mark: "dx2",
          tone: "bad",
          caption: {
            vi: "Công ty đã chấp nhận dùng internet công cộng có mã hoá cho trường hợp sự cố, nên không cần đường Direct Connect thứ hai.",
            en: "The company already accepts an encrypted public-internet path for failures, so a second Direct Connect is not needed.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Tốn kém cho vai trò dự phòng.", en: "Costly as a backup." },
      },
    },
  ],
};

export default spec;
