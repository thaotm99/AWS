// Practice test 3, question 9: an instance with a public IPv4 address in a public subnet; the internet gateway
// performs the network address translation. Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const viaIgw: StepSpec = {
  flow: ["e1", "i1"],
  caption: {
    vi: "Route table R1 của subnet S1 chuyển lưu lượng hướng ra internet tới Internet Gateway I1, nên S1 là public subnet.",
    en: "Route table R1 of subnet S1 directs internet-bound traffic to Internet Gateway I1, so S1 is a public subnet.",
  },
};
const igwNat: StepSpec = {
  mark: "i1",
  tone: "ok",
  badge: "NAT",
  caption: {
    vi: "Internet Gateway thực hiện network address translation cho các instance đã được gán địa chỉ IPv4 công khai, như E1.",
    en: "The internet gateway performs network address translation for instances that have been assigned public IPv4 addresses, such as E1.",
  },
};
const out: StepSpec = {
  flow: ["i1", "inet"],
  caption: {
    vi: "Lưu lượng của E1 ra internet qua I1; NAT instance N1 không nằm trên đường đi này.",
    en: "E1's traffic reaches the internet through I1; NAT instance N1 is not on this path.",
  },
};
const wrong = (vi: string, en: string) => ({ works: false, caption: { vi, en } as Bilingual });

const spec: IllustrationSpec = {
  questionId: 121078923,
  cols: 4.5,
  rows: 3,
  nodes: [
    { id: "e1", label: "EC2 instance E1", sub: { vi: "IPv4 công khai", en: "public IPv4" }, at: [0.2, 0.4] },
    { id: "n1", label: "NAT instance N1", at: [0.2, 1.6] },
    { id: "r1", label: "Route table R1", sub: "0.0.0.0/0 → I1", kind: "data", at: [1.3, 1.6] },
    { id: "s1", label: "Subnet S1", sub: { vi: "dải địa chỉ IP", en: "IP address range" }, kind: "ghost", at: [1.3, 1.6] },
    { id: "i1", label: "Internet gateway", sub: "I1", at: [2.4, 0.4] },
    { id: "inet", label: "Internet", kind: "actor", at: [3.5, 0.4] },
  ],
  zones: [
    { id: "vpc", label: "VPC V1", tone: "vpc", from: [0.2, 0.4], to: [1.3, 1.6], pad: 30 },
    { id: "sub", label: "Subnet S1", tone: "group", from: [0.2, 0.4], to: [0.2, 1.6], pad: 10 },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["s1"],
      steps: [viaIgw, igwNat, out],
      verdict: {
        works: true,
        caption: {
          vi: "Internet Gateway I1 thực hiện NAT cho E1.",
          en: "Internet Gateway I1 performs NAT for E1.",
        },
      },
    },
    {
      option: "a",
      hide: ["s1"],
      steps: [
        {
          mark: "n1",
          tone: "dim",
          badge: { vi: "cho private subnet", en: "for private subnets" },
          caption: {
            vi: "NAT instance trong public subnet cho phép instance ở private subnet khởi tạo lưu lượng IPv4 ra Internet.",
            en: "A NAT instance in a public subnet lets instances in a private subnet initiate outbound IPv4 traffic to the internet.",
          },
        },
        viaIgw,
        {
          mark: "n1",
          tone: "bad",
          caption: {
            vi: "E1 nằm trong public subnet và lưu lượng của nó đi thẳng tới I1, nên N1 không thực hiện NAT cho E1.",
            en: "E1 is in a public subnet and its traffic goes straight to I1, so N1 does not perform NAT for E1.",
          },
        },
      ],
      verdict: wrong("E1 ở public subnet, không đi qua NAT instance.", "E1 is in a public subnet and does not use the NAT instance."),
    },
    {
      option: "c",
      hide: ["r1"],
      steps: [
        {
          mark: "s1",
          tone: "bad",
          caption: {
            vi: "Subnet là một dải địa chỉ IP trong VPC; nó không thể thực hiện Network Address Translation.",
            en: "A subnet is a range of IP addresses in your VPC; it cannot perform network address translation.",
          },
        },
        { ...viaIgw, caption: { vi: "Lưu lượng hướng ra internet của E1 đi tới Internet Gateway I1.", en: "E1's internet-bound traffic goes to Internet Gateway I1." } },
        igwNat,
      ],
      verdict: wrong("Subnet không thực hiện NAT.", "A subnet does not perform NAT."),
    },
    {
      option: "d",
      hide: ["s1"],
      steps: [
        {
          mark: "r1",
          tone: "warn",
          caption: {
            vi: "Route table chứa các route, dùng để xác định nơi lưu lượng mạng được chuyển đến; nó không thực hiện Network Address Translation.",
            en: "A route table contains routes that determine where network traffic is directed; it does not perform network address translation.",
          },
        },
        viaIgw,
        igwNat,
      ],
      verdict: wrong("Route table chỉ chỉ đường, không thực hiện NAT.", "A route table only directs traffic; it does not perform NAT."),
    },
  ],
};

export default spec;
