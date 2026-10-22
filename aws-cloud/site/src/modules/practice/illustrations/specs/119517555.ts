// Practice test 5, question 14: VPC peering is not transitive; a transit gateway interconnects all five VPCs.
// Captions follow the question's explanation. The count of connections for a full mesh is n(n-1)/2 for n = 5.
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const hubSpoke: StepSpec = {
  flow: [
    ["b", "a"],
    ["c", "a"],
    ["d", "a"],
    ["e", "a"],
  ],
  badge: "hub",
  caption: {
    vi: "Hiện tại có VPC peering connection giữa VPC A và từng VPC còn lại, theo mô hình hub-and-spoke với VPC A ở trung tâm.",
    en: "Today there is a VPC peering connection between VPC A and each other VPC, a hub-and-spoke model with VPC A at the centre.",
  },
};
const notTransitive: StepSpec = {
  stop: ["b", "a"],
  badge: { vi: "không bắc cầu", en: "not transitive" },
  caption: {
    vi: "VPC peering không có tính bắc cầu: peering A–B và A–C không tạo ra kết nối giữa B và C, nên lưu lượng từ B không thể đi qua A tới C.",
    en: "VPC peering is not transitive: peerings A–B and A–C give no connection between B and C, so traffic from B cannot pass through A to C.",
  },
};
const vpc = (n: string): Bilingual => ({ vi: `VPC ${n}`, en: `VPC ${n}` });

const spec: IllustrationSpec = {
  questionId: 119517555,
  cols: 4,
  rows: 3,
  nodes: [
    { id: "a", label: vpc("A"), kind: "data", at: [1.5, 0.05] },
    { id: "b", label: vpc("B"), kind: "data", at: [0, 0.8] },
    { id: "c", label: vpc("C"), kind: "data", at: [3, 0.8] },
    { id: "d", label: vpc("D"), kind: "data", at: [0.6, 2.1] },
    { id: "e", label: vpc("E"), kind: "data", at: [2.4, 2.1] },
    { id: "tgw", label: "Transit Gateway", sub: "network hub", at: [1.5, 1.2] },
    { id: "igw", label: "Internet gateway", kind: "ghost", at: [1.5, 1.5] },
    { id: "vpce", label: "VPC endpoint", kind: "ghost", at: [1.5, 1.5] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["igw", "vpce"],
      steps: [
        {
          flow: [
            ["a", "tgw"],
            ["b", "tgw"],
            ["c", "tgw"],
            ["d", "tgw"],
            ["e", "tgw"],
          ],
          badge: "attach",
          caption: {
            vi: "AWS Transit Gateway là trung tâm trung chuyển mạng: mỗi VPC chỉ cần kết nối tới transit gateway.",
            en: "AWS Transit Gateway is a network transit hub: each VPC only needs to connect to the transit gateway.",
          },
        },
        {
          flow: [
            ["b", "tgw", "c"],
            ["d", "tgw", "e"],
          ],
          caption: {
            vi: "Lưu lượng giữa bất kỳ hai VPC nào được định tuyến qua transit gateway, nên tất cả các VPC đều kết nối được với nhau.",
            en: "Traffic between any two VPCs is routed through the transit gateway, so every VPC can reach every other.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một điểm trung tâm kết nối mọi VPC, tiết kiệm tài nguyên và mở rộng được.",
          en: "One hub interconnects every VPC: resource-efficient and scalable.",
        },
      },
    },
    {
      option: "a",
      hide: ["tgw", "igw", "vpce"],
      steps: [
        hubSpoke,
        notTransitive,
        {
          flow: [
            ["b", "c"],
            ["b", "d"],
            ["b", "e"],
            ["c", "d"],
            ["c", "e"],
            ["d", "e"],
          ],
          tone: "warn",
          badge: { vi: "10 kết nối", en: "10 links" },
          caption: {
            vi: "Peering giữa mọi cặp VPC cần một kết nối cho từng cặp, tức 10 kết nối cho 5 VPC; cách làm này cồng kềnh và khó mở rộng.",
            en: "Peering every pair of VPCs needs one connection per pair, 10 for five VPCs; this is clumsy and hard to scale.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Kết nối được, nhưng không tiết kiệm tài nguyên và không mở rộng tốt.",
          en: "It connects them, but it is neither resource-efficient nor scalable.",
        },
      },
    },
    {
      option: "c",
      hide: ["tgw", "vpce"],
      steps: [
        hubSpoke,
        {
          stop: ["b", "igw"],
          caption: {
            vi: "Internet gateway cho phép instance trong VPC giao tiếp với internet; nó không thể dùng để kết nối các VPC với nhau.",
            en: "An internet gateway lets instances in a VPC communicate with the internet; it cannot interconnect VPCs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Internet gateway không kết nối các VPC với nhau.",
          en: "An internet gateway does not interconnect VPCs.",
        },
      },
    },
    {
      option: "d",
      hide: ["tgw", "igw"],
      steps: [
        hubSpoke,
        {
          stop: ["b", "vpce"],
          caption: {
            vi: "VPC endpoint kết nối private một VPC tới các dịch vụ AWS được hỗ trợ và endpoint service dùng AWS PrivateLink; nó không thể dùng để kết nối các VPC với nhau.",
            en: "A VPC endpoint privately connects a VPC to supported AWS services and PrivateLink endpoint services; it cannot interconnect VPCs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "VPC endpoint không kết nối các VPC với nhau.",
          en: "A VPC endpoint does not interconnect VPCs.",
        },
      },
    },
  ],
};

export default spec;
