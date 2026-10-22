// Practice test 2, question 36: share one VPC's subnets with AWS RAM so every account's instances talk privately.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516143,
  cols: 4.4,
  rows: 2.6,
  nodes: [
    { id: "instA", label: "EC2", sub: { vi: "tài khoản A", en: "account A" }, at: [0, 0.2] },
    { id: "instB", label: "EC2", sub: { vi: "tài khoản B", en: "account B" }, at: [2.4, 0.2] },
    { id: "instC", label: "EC2", sub: { vi: "tài khoản C", en: "account C" }, at: [1.2, 1.6] },
    { id: "tgw", label: "Transit Gateway", at: [1.2, 0.2] },
    { id: "pl", label: "PrivateLink", sub: { vi: "giữa mọi instance?", en: "between all instances?" }, kind: "ghost", at: [1.2, 0.2] },
    { id: "ram", label: "AWS RAM", sub: { vi: "chia sẻ subnet", en: "shares subnets" }, at: [3.4, 1.6] },
  ],
  zones: [
    { id: "shared", label: { vi: "Một VPC dùng chung", en: "One shared VPC" }, tone: "vpc", from: [0, 0.2], to: [2.4, 1.6], pad: 14 },
    { id: "vA", label: "VPC A", tone: "vpc", from: [0, 0.2], to: [0, 0.2], pad: 22 },
    { id: "vB", label: "VPC B", tone: "vpc", from: [2.4, 0.2], to: [2.4, 0.2], pad: 22 },
    { id: "vC", label: "VPC C", tone: "vpc", from: [1.2, 1.6], to: [1.2, 1.6], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["tgw", "pl", "vA", "vB", "vC"],
      steps: [
        {
          flow: [["ram", "instB"], ["ram", "instC"]],
          badge: { vi: "không tính phí", en: "no charge" },
          caption: {
            vi: "Tạo VPC ở một tài khoản và chia sẻ subnet của nó cho các tài khoản khác bằng AWS Resource Access Manager; RAM không tính thêm phí.",
            en: "A VPC is created in one account and its subnets are shared with the other accounts through AWS Resource Access Manager, which has no additional charge.",
          },
        },
        {
          flow: [["instA", "instB"], ["instA", "instC"], ["instB", "instC"]],
          badge: { vi: "cùng VPC", en: "same VPC" },
          caption: {
            vi: "Instance của các tài khoản khác nhau được triển khai trong cùng một VPC, nên giao tiếp riêng tư với nhau dễ dàng.",
            en: "Instances from different accounts are deployed in the same VPC, so they communicate privately with one another.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Rẻ nhất: một VPC, chia sẻ subnet.", en: "Cheapest: one VPC, shared subnets." } },
    },
    {
      option: "b",
      hide: ["pl", "ram", "shared"],
      steps: [
        {
          flow: [["instA", "tgw"], ["instB", "tgw"], ["instC", "tgw"]],
          tone: "warn",
          caption: {
            vi: "Transit Gateway nối các VPC của mọi tài khoản vào một gateway chung, và cách này hoạt động.",
            en: "A Transit Gateway connects every account's VPCs to a single gateway, and it works.",
          },
        },
        { mark: "tgw", tone: "bad", badge: { vi: "đắt", en: "expensive" }, caption: { vi: "Nhưng đây là giải pháp tốn kém, trong khi yêu cầu là chi phí thấp nhất.", en: "But it is an expensive solution, while the requirement is the lowest cost." } },
      ],
      verdict: { works: false, caption: { vi: "Chạy được nhưng đắt.", en: "Works, but expensive." } },
    },
    {
      option: "c",
      hide: ["tgw", "pl", "ram", "shared"],
      steps: [
        {
          flow: [["instA", "instB"], ["instA", "instC"], ["instB", "instC"]],
          tone: "warn",
          badge: "peering",
          caption: {
            vi: "VPC peering cho phép instance ở hai VPC giao tiếp như trong cùng một mạng, kể cả khác tài khoản.",
            en: "VPC peering lets instances in two VPCs communicate as if they were on the same network, even across accounts.",
          },
        },
        {
          mark: ["instA", "instB", "instC"],
          tone: "warn",
          badge: { vi: "nhiều kết nối", en: "many links" },
          caption: {
            vi: "Cách này hoạt động nhưng không mở rộng hiệu quả: thêm tài khoản là phải tạo thêm nhiều peering connection.",
            en: "It works but does not scale efficiently: each new account means many more peering connections.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không mở rộng hiệu quả.", en: "Does not scale efficiently." } },
    },
    {
      option: "d",
      hide: ["tgw", "ram", "shared"],
      steps: [
        {
          stop: ["instA", "pl"],
          caption: {
            vi: "PrivateLink tạo kết nối riêng giữa một ứng dụng đứng sau NLB ở một tài khoản và ENI ở tài khoản khác; nó không phải là kết nối giữa mọi EC2 instance.",
            en: "PrivateLink creates a private connection between an application fronted by an NLB in one account and an ENI in another; it is not a link between all EC2 instances.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "PrivateLink không dùng như vậy.", en: "PrivateLink does not work that way." } },
    },
  ],
};

export default spec;
