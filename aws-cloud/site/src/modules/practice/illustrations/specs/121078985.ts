// Practice test 3, question 47: send heavy S3 traffic from a private subnet through a gateway endpoint instead of
// the NAT gateway, keeping internet access. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const viaNat: StepSpec = {
  flow: ["ec2", "nat", "igw", "s3"],
  tone: "warn",
  times: 2,
  badge: "NAT",
  caption: {
    vi: "Hiện tại mọi lưu lượng hướng ra internet, gồm cả khối lượng lớn dữ liệu đọc ghi Amazon S3, đều được định tuyến qua NAT gateway.",
    en: "Today all internet-bound traffic, including the large volume of Amazon S3 reads and writes, is routed through the NAT gateway.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078985,
  cols: 4.3,
  rows: 3.2,
  nodes: [
    { id: "ec2", label: "EC2 instances", sub: "private subnet", at: [0, 1] },
    { id: "gwe", label: "Gateway endpoint", sub: "endpoint policy", at: [1.4, 0.1] },
    { id: "eigw", label: "Egress-only IGW", sub: { vi: "chỉ IPv6", en: "IPv6 only" }, kind: "ghost", at: [1.4, 0.1] },
    { id: "gwlbe", label: "GWLB endpoint", sub: { vi: "cho S3?", en: "for S3?" }, kind: "ghost", at: [1.4, 0.1] },
    { id: "nat", label: "NAT gateway", at: [1.4, 1.9] },
    { id: "igw", label: "Internet gateway", at: [2.4, 1.9] },
    { id: "s3", label: "Amazon S3", sub: { vi: "cùng Region", en: "same Region" }, kind: "data", at: [3.4, 0.1] },
    { id: "inet", label: "Internet", kind: "actor", at: [3.4, 1.9] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.1], to: [2.4, 1.9], pad: 14 }],
  scenarios: [
    {
      option: "a",
      hide: ["eigw", "gwlbe"],
      steps: [
        viaNat,
        {
          flow: ["ec2", "gwe", "s3"],
          times: 2,
          badge: { vi: "route table", en: "route table" },
          caption: {
            vi: "Gateway endpoint được thêm làm target trong route table cho lưu lượng tới S3; kết nối tới S3 không cần internet gateway hay NAT device. Endpoint policy kiểm soát truy cập S3 qua endpoint.",
            en: "The gateway endpoint is added as a route table target for S3 traffic; S3 is reached without an internet gateway or NAT device. The endpoint policy controls S3 access through the endpoint.",
          },
        },
        {
          flow: ["ec2", "nat", "igw", "inet"],
          caption: {
            vi: "Lưu lượng internet khác vẫn qua NAT gateway. Gateway endpoint không tính phí, và dữ liệu ở cùng Region không phát sinh phí truyền dữ liệu.",
            en: "Other internet traffic still uses the NAT gateway. Gateway endpoints have no additional charge, and data within the same Region incurs no data transfer cost.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Giải pháp tối ưu chi phí nhất.", en: "The most cost-optimal solution." } },
    },
    {
      option: "b",
      hide: ["gwe", "eigw", "gwlbe"],
      steps: [
        viaNat,
        {
          flow: ["ec2", "igw", "s3"],
          tone: "warn",
          caption: {
            vi: "Thêm route tới internet gateway vào route table của private subnet sẽ biến subnet đó thành public subnet.",
            en: "Adding a route to the internet gateway in the private subnet's route table would make that subnet public.",
          },
        },
        {
          mark: "nat",
          tone: "bad",
          badge: { vi: "thừa", en: "redundant" },
          caption: {
            vi: "Định tuyến ra internet qua NAT gateway khi đó trở nên thừa; phương án này chỉ để gây nhiễu.",
            en: "Internet-bound routing through the NAT gateway would then be redundant; this option is a distractor.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Private subnet bị biến thành public.", en: "It turns the private subnet public." } },
    },
    {
      option: "c",
      hide: ["gwe", "gwlbe"],
      steps: [
        viaNat,
        {
          stop: ["ec2", "eigw"],
          caption: {
            vi: "Egress-only internet gateway cho phép lưu lượng đi ra qua IPv6; ở đây chỉ có lưu lượng IPv4.",
            en: "An egress-only internet gateway allows outbound communication over IPv6; this use case is IPv4 only.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Chỉ dành cho IPv6.", en: "IPv6 only." } },
    },
    {
      option: "d",
      hide: ["gwe", "eigw"],
      steps: [
        viaNat,
        {
          stop: ["ec2", "gwlbe"],
          caption: {
            vi: "Gateway Load Balancer endpoint kết nối riêng tư tới virtual appliance trong VPC của nhà cung cấp dịch vụ; không thể dùng nó để truy cập Amazon S3.",
            en: "A Gateway Load Balancer endpoint connects privately to virtual appliances in a service provider VPC; you cannot use one to reach Amazon S3.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "GWLB endpoint không dành cho S3.", en: "A GWLB endpoint is not for S3." } },
    },
  ],
};

export default spec;
