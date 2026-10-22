// Practice test 3, question 14: traffic shares with cross-zone load balancing enabled and disabled, with one target
// in AZ A and four in AZ B. Captions follow the question's explanation (each node receives 50% of client traffic).
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const B = ["b1", "b2", "b3", "b4"];

const split: StepSpec = {
  flow: [
    ["clients", "nodeA"],
    ["clients", "nodeB"],
  ],
  caption: {
    vi: "Lưu lượng client chia cho hai node của load balancer, mỗi node ở một Availability Zone nhận 50%.",
    en: "Client traffic is split between the two load balancer nodes, one per Availability Zone, 50% each.",
  },
};
const allPaths = [
  ["nodeA", "a1"],
  ...B.map((b) => ["nodeA", b]),
  ["nodeB", "a1"],
  ...B.map((b) => ["nodeB", b]),
];
const enabled: StepSpec[] = [
  {
    flow: allPaths,
    badge: "20%",
    caption: {
      vi: "Bật cross-zone: mỗi node phân phối lưu lượng tới các target đã đăng ký trong tất cả các AZ được kích hoạt. Năm target chia đều: instance ở AZ A nhận 20%.",
      en: "Cross-zone enabled: each node distributes traffic across the registered targets in all enabled AZs. Five targets share it evenly: the instance in AZ A receives 20%.",
    },
  },
  {
    mark: B,
    tone: "ok",
    badge: { vi: "20% mỗi instance", en: "20% each" },
    caption: {
      vi: "Bốn instance ở AZ B cũng nhận 20% mỗi instance.",
      en: "The four instances in AZ B also receive 20% each.",
    },
  },
];
const disabled: StepSpec[] = [
  {
    flow: [["nodeA", "a1"], ...B.map((b) => ["nodeB", b])],
    badge: "50%",
    caption: {
      vi: "Tắt cross-zone: mỗi node chỉ phân phối tới target trong AZ của chính nó. Node ở AZ A gửi toàn bộ 50% của nó tới instance duy nhất.",
      en: "Cross-zone disabled: each node distributes only to targets in its own AZ. The node in AZ A sends its whole 50% to its single instance.",
    },
  },
  {
    mark: B,
    tone: "ok",
    badge: { vi: "12,5% mỗi instance", en: "12.5% each" },
    caption: {
      vi: "Node ở AZ B chia 50% của nó cho bốn instance: 12,5% mỗi instance.",
      en: "The node in AZ B splits its 50% across four instances: 12.5% each.",
    },
  },
];
const claim = (node: string, badge: Bilingual, vi: string, en: string): StepSpec => ({ mark: node, tone: "bad", badge, caption: { vi, en } });

const spec: IllustrationSpec = {
  questionId: 121078981,
  cols: 4.3,
  rows: 4.7,
  nodes: [
    { id: "clients", label: { vi: "Client", en: "Clients" }, kind: "actor", at: [0.4, 1.4] },
    { id: "nodeA", label: "LB node", sub: "AZ A", at: [1.9, 0.2] },
    { id: "nodeB", label: "LB node", sub: "AZ B", at: [1.9, 2.45] },
    { id: "a1", label: "EC2", sub: "AZ A", at: [3.1, 0.2] },
    { id: "b1", label: "EC2", sub: "AZ B", at: [3.1, 1.45] },
    { id: "b2", label: "EC2", sub: "AZ B", at: [3.1, 2.1] },
    { id: "b3", label: "EC2", sub: "AZ B", at: [3.1, 2.75] },
    { id: "b4", label: "EC2", sub: "AZ B", at: [3.1, 3.4] },
  ],
  zones: [
    { id: "azA", label: "Availability Zone A", tone: "az", from: [1.9, 0.2], to: [3.1, 0.2], pad: 8 },
    { id: "azB", label: "Availability Zone B", tone: "az", from: [1.9, 1.45], to: [3.1, 3.4], pad: 8 },
  ],
  scenarios: [
    {
      option: "a",
      steps: [split, ...enabled, ...disabled],
      verdict: {
        works: true,
        caption: {
          vi: "Bật: 20% cho mỗi instance. Tắt: 50% cho instance ở AZ A, 12,5% cho mỗi instance ở AZ B.",
          en: "Enabled: 20% per instance. Disabled: 50% for the AZ A instance, 12.5% for each AZ B instance.",
        },
      },
    },
    {
      option: "b",
      steps: [
        split,
        ...enabled,
        claim(
          "a1",
          { vi: "không phải 50%", en: "not 50%" },
          "Phương án này gán kết quả của trạng thái tắt (50% và 12,5%) cho trạng thái bật, và ngược lại; điều đó mâu thuẫn với cách các node phân phối lưu lượng.",
          "This option swaps the outcomes: it gives the disabled split (50% and 12.5%) to the enabled case and vice versa, which contradicts how the nodes distribute traffic.",
        ),
      ],
      verdict: { works: false, caption: { vi: "Hai trạng thái bị đảo ngược.", en: "The two cases are swapped." } },
    },
    {
      option: "c",
      steps: [
        split,
        ...enabled,
        claim(
          "a1",
          { vi: "không phải 0%", en: "not 0%" },
          "Khi bật cross-zone, instance ở AZ A vẫn là target đã đăng ký trong một AZ được kích hoạt, nên nó nhận 20% chứ không phải không nhận gì.",
          "With cross-zone enabled, the AZ A instance is still a registered target in an enabled AZ, so it receives 20%, not nothing.",
        ),
      ],
      verdict: { works: false, caption: { vi: "Sai ở trạng thái bật.", en: "Wrong for the enabled case." } },
    },
    {
      option: "d",
      steps: [
        split,
        ...disabled,
        claim(
          "a1",
          { vi: "không phải 0%", en: "not 0%" },
          "Khi tắt cross-zone, node ở AZ A vẫn gửi 50% lưu lượng của nó tới instance trong AZ của mình, nên instance này nhận 50% chứ không phải không nhận gì.",
          "With cross-zone disabled, the node in AZ A still sends its 50% to the instance in its own AZ, so that instance receives 50%, not nothing.",
        ),
      ],
      verdict: { works: false, caption: { vi: "Sai ở trạng thái tắt.", en: "Wrong for the disabled case." } },
    },
  ],
};

export default spec;
