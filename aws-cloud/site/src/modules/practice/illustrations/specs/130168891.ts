// Practice test 6, question 13: one public NAT gateway in the public subnet of each AZ for highly available outbound access.
// Captions follow the question's explanation and its reference:
//   https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168891,
  cols: 5.25,
  rows: 3.6,
  nodes: [
    { id: "ec2a", label: "EC2", sub: "PR1 · private", at: [0.15, 0.4] },
    { id: "ec2b", label: "EC2", sub: "PR2 · private", at: [0.15, 2.4] },
    { id: "n1", label: "NAT gateway N1", at: [1.4, 0.4] },
    { id: "n2", label: "NAT gateway N2", at: [1.4, 2.4] },
    { id: "n2a", label: "NAT gateway N2", at: [2.35, 0.4] },
    { id: "igw", label: "Internet gateway", at: [3.25, 1.4] },
    { id: "inet", label: "Internet", sub: { vi: "bản vá, phần mềm", en: "patches, software" }, kind: "actor", at: [4.25, 1.4] },
  ],
  zones: [
    { id: "azA", label: "AZ A1", tone: "az", from: [0.15, 0.4], to: [1.4, 0.4], pad: 34 },
    { id: "azAwide", label: "AZ A1", tone: "az", from: [0.15, 0.4], to: [2.35, 0.4], pad: 34 },
    { id: "azB", label: "AZ A2", tone: "az", from: [0.15, 2.4], to: [1.4, 2.4], pad: 34 },
    { id: "pu1", label: "PU1 · public", tone: "group", from: [1.4, 0.4], to: [1.4, 0.4], pad: 20 },
    { id: "pu1wide", label: "PU1 · public", tone: "group", from: [1.4, 0.4], to: [2.35, 0.4], pad: 20 },
    { id: "pu2", label: "PU2 · public", tone: "group", from: [1.4, 2.4], to: [1.4, 2.4], pad: 20 },
    { id: "pr1", label: "PR1 · private", tone: "group", from: [0.15, 0.4], to: [1.4, 0.4], pad: 20 },
    { id: "pr2", label: "PR2 · private", tone: "group", from: [0.15, 2.4], to: [1.4, 2.4], pad: 20 },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["n2a", "azAwide", "pu1wide", "pr1", "pr2"],
      steps: [
        {
          flow: [["ec2a", "n1", "igw", "inet"], ["ec2b", "n2", "igw", "inet"]],
          caption: {
            vi: "Mỗi AZ có một public NAT gateway (gắn Elastic IP) trong public subnet của AZ đó; route table cho instance dùng NAT gateway cùng AZ, rồi tới internet gateway.",
            en: "Each AZ has a public NAT gateway (with an Elastic IP) in its own public subnet; route tables send instances to the NAT gateway in the same AZ, then to the internet gateway.",
          },
        },
        {
          mark: ["ec2a", "n1"],
          tone: "bad",
          badge: { vi: "AZ hỏng", en: "AZ down" },
          caption: {
            vi: "AZ A1 gặp sự cố, kéo theo NAT gateway N1.",
            en: "AZ A1 goes down, taking NAT gateway N1 with it.",
          },
        },
        {
          flow: ["ec2b", "n2", "igw", "inet"],
          caption: {
            vi: "Instance ở AZ A2 vẫn ra internet qua N2 trong AZ của chính nó; không phụ thuộc vào AZ còn lại.",
            en: "Instances in AZ A2 keep reaching the internet through N2 in their own AZ; they do not depend on the other AZ.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Cấu hình độc lập theo AZ, có tính sẵn sàng cao.",
          en: "An AZ-independent, highly available configuration.",
        },
      },
    },
    {
      option: "a",
      hide: ["n2a", "azAwide", "pu1", "pu1wide", "pu2"],
      steps: [
        {
          flow: [["ec2a", "n1"], ["ec2b", "n2"]],
          tone: "warn",
          caption: {
            vi: "Hai NAT gateway được đặt trong private subnet PR1 và PR2.",
            en: "The two NAT gateways are placed in private subnets PR1 and PR2.",
          },
        },
        {
          stop: ["n1", "igw"],
          caption: {
            vi: "Để instance trong private subnet ra internet, public NAT gateway phải nằm trong public subnet; với yêu cầu này không thể đặt NAT gateway trong private subnet.",
            en: "For instances in a private subnet to reach the internet, the public NAT gateway must be in a public subnet; for this use case you cannot create it in the private subnet.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Sai vị trí NAT gateway.",
          en: "The NAT gateways are in the wrong subnets.",
        },
      },
    },
    {
      option: "b",
      hide: ["n2", "azA", "pu1", "pu2", "pr1", "pr2"],
      steps: [
        {
          flow: [["ec2a", "n1", "igw"], ["ec2b", "n2a", "igw"]],
          caption: {
            vi: "Cả N1 và N2 đều nằm trong cùng public subnet PU1 của AZ A1.",
            en: "Both N1 and N2 sit in the same public subnet PU1 in AZ A1.",
          },
        },
        {
          mark: ["ec2a", "n1", "n2a"],
          tone: "bad",
          badge: { vi: "AZ hỏng", en: "AZ down" },
          caption: {
            vi: "AZ A1 gặp sự cố: cả hai NAT gateway cùng mất.",
            en: "AZ A1 goes down: both NAT gateways go with it.",
          },
        },
        {
          stop: ["ec2b", "n2a"],
          caption: {
            vi: "Instance ở AZ A2 mất truy cập internet dù vẫn chạy bình thường.",
            en: "Instances in AZ A2 lose internet access even though they are still running.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Hai NAT gateway trong một subnet không có tính sẵn sàng cao.",
          en: "Two NAT gateways in one subnet are not highly available.",
        },
      },
    },
    {
      option: "c",
      hide: ["n2", "n2a", "azAwide", "pu1wide", "pu2", "pr1", "pr2"],
      steps: [
        {
          flow: [["ec2a", "n1", "igw"], ["ec2b", "n1"]],
          caption: {
            vi: "Chỉ có một NAT gateway N1 trong PU1; instance của cả hai AZ dùng chung nó.",
            en: "There is only one NAT gateway, N1 in PU1; instances in both AZs share it.",
          },
        },
        {
          mark: ["ec2a", "n1"],
          tone: "bad",
          badge: { vi: "AZ hỏng", en: "AZ down" },
          caption: {
            vi: "Khi AZ của NAT gateway gặp sự cố...",
            en: "When the NAT gateway's AZ goes down...",
          },
        },
        {
          stop: ["ec2b", "n1"],
          caption: {
            vi: "...tài nguyên ở AZ còn lại mất truy cập internet.",
            en: "...resources in the other AZ lose internet access.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Một NAT gateway là điểm lỗi đơn, không có tính sẵn sàng cao.",
          en: "A single NAT gateway is a single point of failure, not highly available.",
        },
      },
    },
  ],
};

export default spec;
