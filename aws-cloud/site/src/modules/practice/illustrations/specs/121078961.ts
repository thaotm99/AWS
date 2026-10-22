// Practice test 3, question 62: internet access for private subnets in three AZs with one NAT gateway in each
// AZ's public subnet. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const AZ = ["A", "B", "C"];
const X = [0, 1.45, 2.9];

const nodes = [
  { id: "inet", label: "Internet", kind: "actor" as const, at: [3.85, 0] as const },
  { id: "igw", label: "Internet gateway", at: [1.45, 0] as const },
  ...AZ.flatMap((z, i) => [
    { id: `nat${z}`, label: "NAT gateway", sub: "public subnet", at: [X[i], 1.1] as const },
    { id: `eo${z}`, label: "Egress-only IGW", sub: "public subnet", kind: "ghost" as const, at: [X[i], 1.1] as const },
    { id: `pn${z}`, label: "NAT gateway", sub: "private subnet", kind: "ghost" as const, at: [X[i], 2.15] as const },
    { id: `pi${z}`, label: "Internet gateway", sub: "private subnet", kind: "ghost" as const, at: [X[i], 2.15] as const },
    { id: `ec2${z}`, label: "EC2", sub: `AZ ${z}`, at: [X[i], 3.05] as const },
  ]),
];
const ids = (p: string) => AZ.map((z) => p + z);

const wants: StepSpec = {
  mark: ids("ec2"),
  tone: "warn",
  badge: { vi: "cần bản cập nhật", en: "needs updates" },
  caption: {
    vi: "EC2 instance trong private subnet của cả ba AZ cần ra internet qua IPv4 để tải bản cập nhật phần mềm.",
    en: "EC2 instances in the private subnets of all three AZs need IPv4 internet access to download software updates.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078961,
  cols: 4.85,
  rows: 4.3,
  nodes,
  zones: AZ.map((z, i) => ({ id: `az${z}`, label: `AZ ${z}`, tone: "az" as const, from: [X[i], 1.1] as const, to: [X[i], 3.05] as const, pad: 10 })),
  links: [["igw", "inet"]],
  scenarios: [
    {
      option: "c",
      hide: [...ids("eo"), ...ids("pn"), ...ids("pi")],
      steps: [
        wants,
        {
          flow: AZ.map((z) => [`ec2${z}`, `nat${z}`, "igw", "inet"]),
          caption: {
            vi: "Mỗi AZ có một NAT gateway trong public subnet; route table riêng của từng AZ chuyển lưu lượng không thuộc VPC tới NAT gateway trong cùng AZ.",
            en: "Each AZ has a NAT gateway in its public subnet; each AZ's own route table forwards non-local traffic to the NAT gateway in the same AZ.",
          },
        },
        {
          mark: "natA",
          tone: "bad",
          badge: { vi: "AZ A gặp sự cố", en: "AZ A down" },
          caption: {
            vi: "Mỗi NAT gateway được tạo trong một AZ cụ thể. Nếu AZ A gặp sự cố, chỉ tài nguyên ở AZ A bị ảnh hưởng.",
            en: "Each NAT gateway is created in a specific AZ. If AZ A goes down, only resources in AZ A are affected.",
          },
        },
        {
          flow: ["B", "C"].map((z) => [`ec2${z}`, `nat${z}`, "igw", "inet"]),
          caption: {
            vi: "AZ B và AZ C vẫn ra internet qua NAT gateway của chính mình: kiến trúc không phụ thuộc vào một AZ.",
            en: "AZ B and AZ C keep internet access through their own NAT gateways: the architecture is Availability Zone-independent.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "NAT gateway trong public subnet, mỗi AZ một cái.", en: "One NAT gateway per AZ, in the public subnets." } },
    },
    {
      option: "a",
      hide: [...ids("nat"), ...ids("eo"), ...ids("pi")],
      steps: [
        wants,
        {
          stop: ["ec2A", "pnA"],
          caption: {
            vi: "NAT gateway cần được đặt trong public subnet, không phải trong private subnet.",
            en: "NAT gateways need to be set up in public subnets, not in private subnets.",
          },
        },
        { mark: ["pnB", "pnC"], tone: "bad", caption: { vi: "Điều này đúng với cả ba AZ.", en: "The same holds in all three AZs." } },
      ],
      verdict: { works: false, caption: { vi: "Đặt NAT gateway sai subnet.", en: "NAT gateways in the wrong subnets." } },
    },
    {
      option: "b",
      hide: ["igw", ...ids("nat"), ...ids("eo"), ...ids("pn")],
      steps: [
        wants,
        {
          stop: ["ec2A", "piA"],
          caption: {
            vi: "Không thể cấp phát Internet gateway trong private subnet của VPC.",
            en: "Internet gateways cannot be provisioned in private subnets of a VPC.",
          },
        },
        { mark: ["piB", "piC"], tone: "bad", caption: { vi: "Điều này đúng với cả ba AZ.", en: "The same holds in all three AZs." } },
      ],
      verdict: { works: false, caption: { vi: "Internet gateway không nằm trong private subnet.", en: "An internet gateway cannot sit in a private subnet." } },
    },
    {
      option: "d",
      hide: [...ids("nat"), ...ids("pn"), ...ids("pi")],
      steps: [
        wants,
        {
          stop: ["ec2A", "eoA"],
          badge: { vi: "chỉ IPv6", en: "IPv6 only" },
          caption: {
            vi: "Egress-only internet gateway chỉ cho phép lưu lượng đi ra qua IPv6; bài toán ở đây là lưu lượng IPv4.",
            en: "An egress-only internet gateway allows only outbound IPv6 communication; this use case is IPv4 traffic.",
          },
        },
        { mark: ["eoB", "eoC"], tone: "bad", caption: { vi: "Điều này đúng với cả ba AZ.", en: "The same holds in all three AZs." } },
      ],
      verdict: { works: false, caption: { vi: "Chỉ dành cho IPv6.", en: "IPv6 only." } },
    },
  ],
};

export default spec;
