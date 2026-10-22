// Practice test 3, question 35: hybrid DNS in both directions over Direct Connect with Route 53 Resolver inbound
// and outbound endpoints. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const askVpc: StepSpec = {
  flow: ["app", "resolver"],
  caption: {
    vi: "Instance trong VPC cần phân giải tên của một tài nguyên on-premises; truy vấn tới Route 53 Resolver.",
    en: "An instance in the VPC needs to resolve the name of an on-premises resource; the query goes to Route 53 Resolver.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078951,
  cols: 5.6,
  rows: 3.3,
  nodes: [
    { id: "dns", label: "DNS resolver", sub: "on-premises", kind: "onprem", at: [0, 1.1] },
    { id: "dx", label: "Direct Connect", at: [1.1, 1.1] },
    { id: "inb", label: "Inbound endpoint", at: [2.3, 0.2] },
    { id: "out", label: "Outbound endpoint", sub: "Resolver rule", at: [2.3, 2.0] },
    { id: "uni", label: "Universal endpoint", sub: { vi: "không tồn tại", en: "does not exist" }, kind: "ghost", at: [2.3, 1.1] },
    { id: "resolver", label: "Route 53 Resolver", at: [3.4, 1.1] },
    { id: "app", label: "EC2 instance", kind: "actor", at: [4.4, 1.1] },
  ],
  zones: [
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 1.1], to: [0, 1.1], pad: 10 },
    { id: "vpc", label: "VPC", tone: "vpc", from: [2.3, 0.2], to: [4.4, 2.0], pad: 12 },
  ],
  links: [["dx", "dns"]],
  scenarios: [
    {
      option: "d",
      hide: ["uni"],
      steps: [
        {
          flow: ["dns", "dx", "inb", "resolver"],
          badge: { vi: "tên trong VPC", en: "VPC names" },
          caption: {
            vi: "DNS resolver on-premises chuyển tiếp truy vấn về tài nguyên trong VPC tới Route 53 Resolver qua inbound endpoint.",
            en: "DNS resolvers on the on-premises network forward queries for resources in the VPC to Route 53 Resolver through the inbound endpoint.",
          },
        },
        {
          flow: ["resolver", "inb", "dx", "dns"],
          back: true,
          caption: {
            vi: "Route 53 Resolver trả lời các tên miền cục bộ của VPC; câu trả lời quay về mạng on-premises.",
            en: "Route 53 Resolver answers for the VPC's local domain names; the answer returns to the on-premises network.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chiều on-premises → VPC. Kết hợp với outbound endpoint cho chiều ngược lại.",
          en: "On-premises → VPC. Combined with an outbound endpoint for the other direction.",
        },
      },
    },
    {
      option: "e",
      hide: ["uni"],
      steps: [
        askVpc,
        {
          flow: ["resolver", "out"],
          badge: "example.com",
          caption: {
            vi: "Resolver rule chỉ định tên miền cần chuyển tiếp (ví dụ example.com) và địa chỉ IP của DNS resolver on-premises; truy vấn khớp rule đi tới outbound endpoint.",
            en: "A Resolver rule names the domains to forward (such as example.com) and the IP addresses of the on-premises DNS resolvers; a matching query goes to the outbound endpoint.",
          },
        },
        {
          flow: ["out", "dx", "dns"],
          caption: {
            vi: "Outbound endpoint chuyển tiếp có điều kiện truy vấn tới resolver trên mạng on-premises.",
            en: "The outbound endpoint conditionally forwards the query to the resolvers on the on-premises network.",
          },
        },
        {
          flow: ["dns", "dx", "out", "resolver", "app"],
          back: true,
          caption: {
            vi: "Câu trả lời trở về instance trong VPC.",
            en: "The answer returns to the instance in the VPC.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chiều VPC → on-premises. Kết hợp với inbound endpoint cho chiều ngược lại.",
          en: "VPC → on-premises. Combined with an inbound endpoint for the other direction.",
        },
      },
    },
    {
      option: "a",
      hide: ["uni"],
      steps: [
        {
          flow: ["dns", "dx"],
          tone: "warn",
          caption: {
            vi: "DNS resolver on-premises muốn gửi truy vấn tới Route 53 Resolver.",
            en: "The on-premises DNS resolver wants to send queries to Route 53 Resolver.",
          },
        },
        {
          stop: ["dx", "out"],
          caption: {
            vi: "DNS resolver on-premises chuyển tiếp truy vấn tới Route 53 Resolver qua inbound endpoint, không phải outbound endpoint.",
            en: "On-premises DNS resolvers forward queries to Route 53 Resolver through an inbound endpoint, not an outbound endpoint.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Dùng sai loại endpoint.", en: "The wrong endpoint type." } },
    },
    {
      option: "b",
      hide: ["uni"],
      steps: [
        askVpc,
        {
          stop: ["resolver", "inb"],
          caption: {
            vi: "Route 53 Resolver chuyển tiếp có điều kiện truy vấn tới resolver on-premises qua outbound endpoint, không phải inbound endpoint.",
            en: "Route 53 Resolver conditionally forwards queries to on-premises resolvers through an outbound endpoint, not an inbound endpoint.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Dùng sai loại endpoint.", en: "The wrong endpoint type." } },
    },
    {
      option: "c",
      hide: ["inb", "out"],
      steps: [
        askVpc,
        {
          stop: ["resolver", "uni"],
          caption: {
            vi: "Route 53 Resolver không có thứ gọi là universal endpoint; phương án này chỉ để gây nhiễu.",
            en: "There is no such thing as a universal endpoint on Route 53 Resolver; this option is a distractor.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Loại endpoint không tồn tại.", en: "The endpoint type does not exist." } },
    },
  ],
};

export default spec;
