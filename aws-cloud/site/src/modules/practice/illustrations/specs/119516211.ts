// Practice test 4, question 59: traffic share per target behind a Network Load Balancer with cross-zone load
// balancing disabled (AZ-A: 4 targets, AZ-B: 6 targets). Captions follow the question's explanation. Additional source:
// - With cross-zone load balancing enabled, each of the 10 targets receives 10% of the traffic:
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
import type { Bilingual, IllustrationSpec, ScenarioSpec, StepSpec } from "../types";

const A = ["a1", "a2", "a3", "a4"];
const B = ["b1", "b2", "b3", "b4", "b5", "b6"];

const split: StepSpec = {
  flow: [["r53", "nlbA"], ["r53", "nlbB"]],
  badge: "50%",
  caption: {
    vi: "Route 53 phân phối lưu lượng sao cho mỗi node của load balancer nhận 50% lưu lượng từ client.",
    en: "Route 53 distributes traffic so that each load balancer node receives 50% of the client traffic.",
  },
};

const toA: StepSpec = {
  flow: A.map((t) => ["nlbA", t]),
  caption: {
    vi: "Cross-zone load balancing bị tắt: node ở AZ-A chỉ chia 50% của nó cho 4 target trong AZ-A.",
    en: "Cross-zone load balancing is disabled: the AZ-A node splits its 50% only across the 4 targets in AZ-A.",
  },
};

const toB: StepSpec = {
  flow: B.map((t) => ["nlbB", t]),
  caption: {
    vi: "Node ở AZ-B chỉ chia 50% của nó cho 6 target trong AZ-B.",
    en: "The AZ-B node splits its 50% only across the 6 targets in AZ-B.",
  },
};

const shareA: StepSpec = {
  mark: A,
  tone: "ok",
  badge: "12.5%",
  caption: {
    vi: "Mỗi target trong 4 target ở AZ-A nhận 50% ÷ 4 = 12,5% lưu lượng.",
    en: "Each of the four targets in AZ-A receives 50% ÷ 4 = 12.5% of the traffic.",
  },
};

const shareB: StepSpec = {
  mark: B,
  tone: "ok",
  badge: "8.3%",
  caption: {
    vi: "Mỗi target trong 6 target ở AZ-B nhận 50% ÷ 6 ≈ 8,3% lưu lượng.",
    en: "Each of the six targets in AZ-B receives 50% ÷ 6 ≈ 8.3% of the traffic.",
  },
};

const tenPercent: Bilingual = {
  vi: "10% cho mỗi target chỉ đúng khi bật cross-zone load balancing (mỗi node chia cho cả 10 target); ở đây tính năng này bị tắt.",
  en: "10% per target would hold only with cross-zone load balancing enabled (each node spreading across all 10 targets); here it is disabled.",
};

const wrong = (option: string, mark: string[], badge: string, caption: Bilingual, verdict: Bilingual): ScenarioSpec => ({
  option,
  steps: [split, toA, toB, { mark, tone: "bad", badge, caption }],
  verdict: { works: false, caption: verdict },
});

const target = (id: string, at: [number, number]) => ({ id, label: "Target", at });

const spec: IllustrationSpec = {
  questionId: 119516211,
  cols: 3.8,
  rows: 6.1,
  nodes: [
    { id: "r53", label: "Amazon Route 53", kind: "actor", at: [0, 2.3] },
    { id: "nlbA", label: "NLB node", sub: "AZ-A", at: [1.3, 0.75] },
    { id: "nlbB", label: "NLB node", sub: "AZ-B", at: [1.3, 3.85] },
    ...A.map((id, i) => target(id, [2.75, i * 0.5])),
    ...B.map((id, i) => target(id, [2.75, 2.6 + i * 0.5])),
  ],
  zones: [
    { id: "aza", label: "AZ-A", tone: "az", from: [1.3, 0], to: [2.75, 1.3] },
    { id: "azb", label: "AZ-B", tone: "az", from: [1.3, 2.55], to: [2.75, 5.1] },
  ],
  scenarios: [
    {
      option: "c",
      steps: [split, toA, shareA, toB, shareB],
      verdict: {
        works: true,
        caption: {
          vi: "Mỗi node chỉ định tuyến 50% của nó tới target trong AZ của mình: 12,5% cho mỗi target ở AZ-A.",
          en: "Each node routes its 50% only to targets in its own AZ: 12.5% per target in AZ-A.",
        },
      },
    },
    wrong(
      "a",
      B,
      "10%?",
      tenPercent,
      { vi: "Target ở AZ-B nhận khoảng 8,3%.", en: "AZ-B targets receive about 8.3%." },
    ),
    wrong(
      "b",
      A,
      "8%?",
      {
        vi: "Target ở AZ-A nhận 12,5%, không phải 8%: node AZ-A chia 50% cho chỉ 4 target.",
        en: "AZ-A targets receive 12.5%, not 8%: the AZ-A node splits 50% across only 4 targets.",
      },
      { vi: "Target ở AZ-A nhận 12,5%.", en: "AZ-A targets receive 12.5%." },
    ),
    wrong("d", A, "10%?", tenPercent, { vi: "Target ở AZ-A nhận 12,5%.", en: "AZ-A targets receive 12.5%." }),
  ],
};

export default spec;
