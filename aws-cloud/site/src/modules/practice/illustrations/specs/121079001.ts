// Practice test 3, question 18: an AWS managed IPsec VPN has a virtual private gateway on the AWS side and a
// customer gateway on the on-premises side. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const cgwOk: StepSpec = {
  mark: "cgw",
  tone: "ok",
  caption: {
    vi: "Customer gateway là tài nguyên AWS cung cấp cho AWS thông tin về thiết bị customer gateway, tức thiết bị phía khách hàng của kết nối Site-to-Site VPN.",
    en: "A customer gateway is an AWS resource that gives AWS information about the customer gateway device, the device on the customer side of the Site-to-Site VPN connection.",
  },
};
const vgwOk: StepSpec = {
  mark: "vgw",
  tone: "ok",
  caption: {
    vi: "Virtual private gateway (VGW), còn gọi là VPN gateway, là endpoint phía AWS VPC của kết nối VPN.",
    en: "A virtual private gateway (VGW), also known as a VPN gateway, is the endpoint on the AWS VPC side of the VPN connection.",
  },
};
const noVgwOnPrem: StepSpec = {
  stop: ["net", "vgwOn"],
  caption: {
    vi: "VGW là endpoint phía VPC của AWS, không được tạo ở phía on-premises.",
    en: "The VGW is the endpoint on the AWS VPC side; it is not created on the on-premises side.",
  },
};
const noCgwOnAws: StepSpec = {
  stop: ["vpc", "cgwAws"],
  caption: {
    vi: "Customer gateway mô tả thiết bị phía khách hàng, không đặt ở phía AWS của VPN.",
    en: "A customer gateway describes the device on the customer side; it does not belong on the AWS side of the VPN.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121079001,
  cols: 5,
  rows: 1.7,
  nodes: [
    { id: "net", label: { vi: "Mạng on-premises", en: "On-prem network" }, kind: "onprem", at: [0, 0.5] },
    { id: "cgw", label: "Customer gateway", sub: { vi: "phía khách hàng", en: "customer side" }, kind: "onprem", at: [1, 0.5] },
    { id: "vgwOn", label: "VGW", sub: { vi: "phía on-premises?", en: "on-premises side?" }, kind: "ghost", at: [1, 0.5] },
    { id: "tunnel", label: "VPN tunnel", sub: { vi: "IPsec qua internet", en: "IPsec over internet" }, at: [2, 0.5] },
    { id: "vgw", label: "VGW", sub: { vi: "phía AWS", en: "AWS side" }, at: [3, 0.5] },
    { id: "cgwAws", label: "Customer gateway", sub: { vi: "phía AWS?", en: "AWS side?" }, kind: "ghost", at: [3, 0.5] },
    { id: "vpc", label: "Amazon VPC", at: [4, 0.5] },
  ],
  zones: [
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 0.5], to: [1, 0.5], pad: 10 },
    { id: "aws", label: "AWS", tone: "region", from: [3, 0.5], to: [4, 0.5], pad: 10 },
  ],
  links: [
    ["net", "cgw"],
    ["net", "vgwOn"],
    ["vgw", "vpc"],
    ["cgwAws", "vpc"],
    ["cgw", "tunnel"],
    ["vgwOn", "tunnel"],
    ["tunnel", "vgw"],
    ["tunnel", "cgwAws"],
  ],
  scenarios: [
    {
      option: "c",
      hide: ["vgwOn", "cgwAws"],
      steps: [
        cgwOk,
        vgwOk,
        {
          flow: ["net", "cgw", "tunnel", "vgw", "vpc"],
          caption: {
            vi: "VPN tunnel là đường liên kết được mã hoá, nơi dữ liệu đi giữa mạng của khách hàng và AWS.",
            en: "A VPN tunnel is an encrypted link where data passes between the customer network and AWS.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "VGW phía AWS, customer gateway phía on-premises.", en: "VGW on the AWS side, customer gateway on-premises." },
      },
    },
    {
      option: "a",
      hide: ["cgw", "vgw"],
      steps: [noVgwOnPrem, noCgwOnAws],
      verdict: { works: false, caption: { vi: "Hai thành phần bị đặt ngược phía.", en: "The two sides are swapped." } },
    },
    {
      option: "b",
      hide: ["vgwOn", "vgw"],
      steps: [cgwOk, noCgwOnAws],
      verdict: { works: false, caption: { vi: "Phía AWS cần VGW.", en: "The AWS side needs a VGW." } },
    },
    {
      option: "d",
      hide: ["cgw", "cgwAws"],
      steps: [noVgwOnPrem, vgwOk],
      verdict: { works: false, caption: { vi: "Phía on-premises cần customer gateway.", en: "The on-premises side needs a customer gateway." } },
    },
  ],
};

export default spec;
