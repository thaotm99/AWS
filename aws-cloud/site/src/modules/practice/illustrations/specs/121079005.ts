// Practice test 3, question 44: database instances in a private subnet download patches through a NAT gateway in
// the public subnet (IPv4, fully managed). Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const wants: StepSpec = {
  mark: "db",
  tone: "warn",
  badge: "IPv4",
  caption: {
    vi: "DB instance trong private subnet cần tải bản vá từ internet; công ty chỉ dùng IPv4 và muốn một dịch vụ được quản lý hoàn toàn.",
    en: "The DB instances in the private subnet need to download patches from the internet; the company uses IPv4 only and wants a fully managed service.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121079005,
  cols: 4.45,
  rows: 3.4,
  nodes: [
    { id: "app", label: "App servers", at: [0.15, 0.3] },
    { id: "nat", label: "NAT gateway", sub: "Elastic IP", at: [1.35, 0.3] },
    { id: "nati", label: "NAT instance", sub: { vi: "tự quản lý", en: "self-managed" }, at: [1.35, 0.3] },
    { id: "igw", label: "Internet gateway", at: [2.45, 0.3] },
    { id: "inet", label: "Internet", sub: { vi: "bản vá", en: "patches" }, kind: "actor", at: [3.55, 0.3] },
    { id: "db", label: "DB instances", kind: "data", at: [0.75, 2] },
    { id: "eigw", label: "Egress-only IGW", sub: { vi: "chỉ IPv6", en: "IPv6 only" }, kind: "ghost", at: [2.45, 2] },
  ],
  zones: [
    { id: "vpc", label: "VPC", tone: "vpc", from: [0.15, 0.3], to: [2.45, 2], pad: 24 },
    { id: "pub", label: "Public subnet", tone: "group", from: [0.15, 0.3], to: [1.35, 0.3], pad: 10 },
    { id: "priv", label: "Private subnet", tone: "group", from: [0.75, 2], to: [0.75, 2], pad: 10 },
  ],
  links: [["app", "db"]],
  scenarios: [
    {
      option: "b",
      hide: ["nati", "eigw"],
      steps: [
        wants,
        {
          flow: ["db", "nat", "igw", "inet"],
          caption: {
            vi: "NAT gateway nằm trong public subnet và gắn một Elastic IP; route table của private subnet trỏ lưu lượng hướng ra internet tới NAT gateway.",
            en: "The NAT gateway lives in the public subnet with an Elastic IP; the private subnet's route table points internet-bound traffic at the NAT gateway.",
          },
        },
        {
          flow: ["inet", "igw", "nat", "db"],
          back: true,
          caption: {
            vi: "Bản vá được tải về DB instance.",
            en: "The patches download to the DB instances.",
          },
        },
        {
          stop: ["inet", "nat"],
          caption: {
            vi: "Internet không thể khởi tạo kết nối tới các instance phía sau NAT gateway.",
            en: "The internet cannot initiate a connection with the instances behind the NAT gateway.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Đi ra internet qua dịch vụ được quản lý.", en: "Outbound internet through a managed service." } },
    },
    {
      option: "a",
      hide: ["nat", "eigw"],
      steps: [
        wants,
        {
          flow: ["db", "nati", "igw", "inet"],
          tone: "warn",
          caption: {
            vi: "NAT instance trong public subnet cũng cho phép instance ở private subnet khởi tạo lưu lượng IPv4 ra internet.",
            en: "A NAT instance in the public subnet also lets private-subnet instances initiate outbound IPv4 traffic to the internet.",
          },
        },
        {
          mark: "nati",
          tone: "bad",
          caption: {
            vi: "NAT instance không phải dịch vụ được quản lý; khách hàng phải tự quản lý và bảo trì nó.",
            en: "A NAT instance is not a managed service; the customer has to manage and maintain it.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không được quản lý hoàn toàn.", en: "Not fully managed." } },
    },
    {
      option: "c",
      hide: ["nat", "nati", "eigw"],
      steps: [
        wants,
        {
          stop: ["db", "igw"],
          caption: {
            vi: "Internet Gateway không thể dùng trực tiếp với private subnet; không có NAT instance hay NAT gateway trong public subnet thì không thiết lập được cấu hình này.",
            en: "An internet gateway cannot be used directly with a private subnet; without a NAT instance or NAT gateway in the public subnet this cannot be set up.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Private subnet cần NAT.", en: "A private subnet needs NAT." } },
    },
    {
      option: "d",
      hide: ["nat", "nati"],
      steps: [
        wants,
        {
          stop: ["db", "eigw"],
          caption: {
            vi: "Egress-only internet gateway chỉ hỗ trợ lưu lượng IPv6, nên không phù hợp khi công ty chỉ dùng IPv4.",
            en: "An egress-only internet gateway supports IPv6 traffic, so it does not fit a company that uses only IPv4.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Chỉ dành cho IPv6.", en: "IPv6 only." } },
    },
  ],
};

export default spec;
