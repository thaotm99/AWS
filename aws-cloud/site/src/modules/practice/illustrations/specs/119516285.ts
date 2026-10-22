// Practice test 4, question 18: maximise Site-to-Site VPN throughput with ECMP on AWS Transit Gateway.
// Captions follow the question's explanation (1.25 Gbps per tunnel, ECMP over multiple tunnels to a transit gateway
// with dynamic routing, no ECMP on a virtual private gateway, Transfer Acceleration and Global Accelerator).
import type { IllustrationSpec, StepSpec } from "../types";

const surge: StepSpec = {
  flow: [["dc", "t1", "vgw"], ["dc", "t2", "vgw"]],
  tone: "warn",
  caption: {
    vi: "Lưu lượng tăng đột biến qua kết nối VPN hiện có; mỗi VPN tunnel có thông lượng tối đa 1,25 Gbps, nên kết nối bị chậm.",
    en: "Traffic surges across the existing VPN connection; each VPN tunnel tops out at 1.25 Gbps, so connectivity slows down.",
  },
};

const tunnel = (id: string, row: number) => ({ id, label: "VPN tunnel", sub: "≤ 1.25 Gbps", at: [1.2, row] as [number, number] });

const spec: IllustrationSpec = {
  questionId: 119516285,
  cols: 4.5,
  rows: 2.85,
  nodes: [
    { id: "dc", label: "Data center", sub: "on-premises", kind: "onprem", at: [0, 1.1] },
    tunnel("t1", 0),
    tunnel("t2", 0.75),
    tunnel("t3", 1.5),
    tunnel("t4", 2.25),
    { id: "ta", label: "Transfer Accel.", sub: "Amazon S3", kind: "ghost", at: [1.2, 1.85] },
    { id: "ga", label: "Global Accelerator", kind: "ghost", at: [1.2, 1.85] },
    { id: "tgw", label: "Transit Gateway", sub: "ECMP · dynamic routing", at: [2.4, 1.1] },
    { id: "vgw", label: "Virtual private gw", sub: "VGW", at: [2.4, 1.1] },
    { id: "vpc", label: "VPC", sub: { vi: "tài nguyên AWS", en: "AWS resources" }, kind: "data", at: [3.5, 1.1] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["ta", "ga", "vgw"],
      steps: [
        {
          flow: [["dc", "t1", "tgw"], ["dc", "t2", "tgw"]],
          caption: {
            vi: "Mỗi VPN connection có hai tunnel; một tunnel vẫn chỉ đạt tối đa 1,25 Gbps.",
            en: "Each VPN connection has two tunnels; a single tunnel still has a maximum throughput of 1.25 Gbps.",
          },
        },
        {
          flow: [["dc", "t1", "tgw"], ["dc", "t2", "tgw"], ["dc", "t3", "tgw"], ["dc", "t4", "tgw"]],
          times: 2,
          badge: "ECMP",
          caption: {
            vi: "Thêm VPN tunnel tới transit gateway đã bật ECMP (cùng dynamic routing): lưu lượng được chia đều trên nhiều tunnel.",
            en: "More VPN tunnels go to an ECMP-enabled transit gateway (with dynamic routing): traffic is spread across the tunnels.",
          },
        },
        {
          flow: ["tgw", "vpc"],
          badge: "> 1.25 Gbps",
          caption: {
            vi: "Nhờ ECMP, tổng thông lượng IPsec VPN vượt giới hạn mặc định 1,25 Gbps của một tunnel.",
            en: "With ECMP, aggregate IPsec VPN throughput scales beyond the default 1.25 Gbps limit of one tunnel.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Transit Gateway với ECMP và nhiều tunnel tối đa hoá thông lượng VPN.",
          en: "Transit Gateway with ECMP over more tunnels maximises VPN throughput.",
        },
      },
    },
    {
      option: "c",
      hide: ["ta", "ga", "tgw", "t3", "t4"],
      steps: [
        surge,
        {
          mark: "vgw",
          tone: "bad",
          badge: { vi: "không ECMP", en: "no ECMP" },
          caption: {
            vi: "Virtual private gateway là đầu VPN phía AWS, gắn với một VPC, và không hỗ trợ equal cost multi-path (ECMP) routing.",
            en: "A virtual private gateway is the AWS-side VPN endpoint for a single VPC, and it does not support equal cost multi-path (ECMP) routing.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "VGW không hỗ trợ ECMP.", en: "A VGW does not support ECMP." },
      },
    },
    {
      option: "a",
      hide: ["ga", "tgw", "t3", "t4"],
      steps: [
        surge,
        {
          stop: ["dc", "ta"],
          caption: {
            vi: "Transfer Acceleration là tính năng ở cấp S3 bucket, tăng tốc truyền file từ client tới bucket qua edge location; không liên quan tới VPN connection.",
            en: "Transfer Acceleration is an S3 bucket-level feature that speeds up file transfers into a bucket via edge locations; it is not relevant to VPN connections.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Tính năng của S3, không phải của VPN.", en: "An S3 feature, not a VPN one." },
      },
    },
    {
      option: "b",
      hide: ["ta", "tgw", "t3", "t4"],
      steps: [
        surge,
        {
          flow: ["dc", "ga"],
          tone: "warn",
          caption: {
            vi: "Global Accelerator tối ưu đường đi qua mạng toàn cầu của AWS (accelerated VPN) để tránh gián đoạn trên internet công cộng.",
            en: "Global Accelerator optimises the network path over the AWS global network (an accelerated VPN) to avoid disruptions on the public internet.",
          },
        },
        {
          mark: "ga",
          tone: "bad",
          badge: { vi: "không tăng thông lượng", en: "no more throughput" },
          caption: {
            vi: "Tối ưu đường đi không làm tăng thông lượng của VPN.",
            en: "A better path does not maximise VPN throughput.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không tối đa hoá thông lượng VPN.", en: "It does not maximise VPN throughput." },
      },
    },
  ],
};

export default spec;
