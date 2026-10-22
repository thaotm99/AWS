// Practice test 1, question 41: copying an AMI to Region B also creates its snapshot there.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec, StepSpec } from "../types";

const build: StepSpec[] = [
  { flow: ["inst1A", "snapA", "amiA"], caption: { vi: "Ở Region A: instance 1A → snapshot → AMI.", en: "In Region A: instance 1A → snapshot → AMI." } },
  {
    flow: ["amiA", "amiB"],
    badge: "copy",
    caption: { vi: "AMI được sao chép sang Region B.", en: "The AMI is copied to Region B." },
  },
  {
    flow: ["amiB", "snapB"],
    badge: { vi: "+ snapshot", en: "+ snapshot" },
    caption: {
      vi: "Vì AMI dựa trên snapshot bên dưới, việc sao chép AMI tự động tạo một snapshot ở Region B.",
      en: "Because AMIs are based on underlying snapshots, copying the AMI automatically creates a snapshot in Region B.",
    },
  },
  { flow: ["amiB", "inst1B"], caption: { vi: "Instance 1B được khởi chạy từ AMI ở Region B.", en: "Instance 1B is launched from the AMI in Region B." } },
];

const wrong = (option: string, mark: string[], caption: Bilingual): ScenarioSpec => ({
  option,
  steps: [...build, { mark, tone: "bad", badge: { vi: "đếm sai", en: "miscounted" }, caption }],
  verdict: { works: false, caption: { vi: "Region B có 1 instance, 1 AMI, 1 snapshot.", en: "Region B holds 1 instance, 1 AMI, 1 snapshot." } },
});

const spec: IllustrationSpec = {
  questionId: 125222753,
  cols: 3.4,
  rows: 2.8,
  nodes: [
    { id: "inst1A", label: "Instance 1A", at: [0, 0.2] },
    { id: "snapA", label: "Snapshot", kind: "data", at: [1.2, 0.2] },
    { id: "amiA", label: "AMI", at: [2.4, 0.2] },
    { id: "inst1B", label: "Instance 1B", at: [0, 1.8] },
    { id: "snapB", label: "Snapshot", sub: { vi: "tạo khi sao chép", en: "created by the copy" }, kind: "data", at: [1.2, 1.8] },
    { id: "amiB", label: "AMI", sub: { vi: "bản sao", en: "copy" }, at: [2.4, 1.8] },
  ],
  zones: [
    { id: "regA", label: "Region A", tone: "region", from: [0, 0.2], to: [2.4, 0.2], pad: 22 },
    { id: "regB", label: "Region B", tone: "region", from: [0, 1.8], to: [2.4, 1.8], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      steps: [
        ...build,
        {
          mark: ["inst1B", "amiB", "snapB"],
          tone: "ok",
          badge: "1 + 1 + 1",
          caption: { vi: "Region B có 1 EC2 instance, 1 AMI và 1 snapshot.", en: "Region B holds 1 EC2 instance, 1 AMI and 1 snapshot." },
        },
      ],
      verdict: { works: true, caption: { vi: "Instance, AMI và snapshot.", en: "Instance, AMI and snapshot." } },
    },
    wrong("b", ["snapB"], { vi: "Phương án bỏ sót snapshot được tạo khi sao chép AMI.", en: "The option misses the snapshot created by the AMI copy." }),
    wrong("c", ["amiB"], { vi: "Phương án bỏ sót AMI đã được sao chép sang Region B.", en: "The option misses the AMI copied into Region B." }),
    wrong("d", ["amiB"], { vi: "Region B chỉ có một AMI — bản sao — chứ không phải hai.", en: "Region B has one AMI — the copy — not two." }),
  ],
};

export default spec;
