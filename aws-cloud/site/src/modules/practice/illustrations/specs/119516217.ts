// Practice test 4, question 16: scale-in under the default termination policy, AZ-A with 3 instances and AZ-B with 4.
// Captions follow the question's explanation, which lists the steps of the default termination policy
// (https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-termination.html).
import type { IllustrationSpec, StepSpec } from "../types";

const alarm: StepSpec = {
  flow: ["alarm", "asg"],
  badge: "scale in",
  caption: {
    vi: "CloudWatch alarm kích hoạt sự kiện scale-in; Auto Scaling group áp dụng default termination policy.",
    en: "A CloudWatch alarm triggers a scale-in event; the Auto Scaling group applies the default termination policy.",
  },
};

const pickAz: StepSpec = {
  mark: ["b1", "b2", "b3", "b4"],
  tone: "warn",
  caption: {
    vi: "Bước đầu tiên: chọn Availability Zone có nhiều instance nhất (và có instance không được bảo vệ khỏi scale-in), ở đây là AZ-B với 4 instance so với 3.",
    en: "First, the policy picks the Availability Zone with the most instances (and at least one not protected from scale-in): AZ-B, with 4 instances against 3.",
  },
};

const ids = ["a1", "a2", "a3", "b1", "b2", "b3", "b4"];
const inst = (id: string, at: [number, number], sub?: { vi: string; en: string }) => ({ id, label: "EC2", sub, at });

const spec: IllustrationSpec = {
  questionId: 119516217,
  cols: 4.5,
  rows: 4.4,
  nodes: [
    { id: "alarm", label: "CloudWatch alarm", sub: "scale-in", kind: "actor", at: [0, 1.85] },
    { id: "asg", label: "Auto Scaling group", sub: "default policy", at: [1.1, 1.85] },
    inst("a1", [2.3, 0.85]),
    inst("a2", [2.3, 1.85]),
    inst("a3", [2.3, 2.85]),
    inst("b1", [3.5, 0.35], { vi: "template cũ nhất", en: "oldest template" }),
    inst("b2", [3.5, 1.35]),
    inst("b3", [3.5, 2.35]),
    inst("b4", [3.5, 3.35]),
  ],
  zones: [
    { id: "aza", label: "AZ-A", tone: "az", from: [2.3, 0.85], to: [2.3, 2.85] },
    { id: "azb", label: "AZ-B", tone: "az", from: [3.5, 0.35], to: [3.5, 3.35] },
  ],
  links: ids.map((id) => ["asg", id] as [string, string]),
  scenarios: [
    {
      option: "a",
      steps: [
        alarm,
        pickAz,
        {
          mark: "b1",
          tone: "bad",
          badge: { vi: "bị chọn", en: "selected" },
          caption: {
            vi: "Trong AZ-B, policy chọn instance dùng launch template hoặc launch configuration cũ nhất.",
            en: "Within AZ-B, the policy selects the instance that uses the oldest launch template or launch configuration.",
          },
        },
        {
          mark: "b1",
          tone: "dim",
          badge: { vi: "đã terminate", en: "terminated" },
          caption: {
            vi: "Instance đó bị terminate; mỗi AZ còn 3 instance, nên các instance vẫn trải đều giữa các AZ.",
            en: "That instance is terminated, leaving 3 instances in each AZ, so the group stays balanced across AZs.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Cân bằng AZ trước, rồi chọn instance có launch template cũ nhất trong AZ-B.",
          en: "AZs are balanced first, then the instance with the oldest launch template in AZ-B is chosen.",
        },
      },
    },
    {
      option: "b",
      steps: [
        alarm,
        {
          stop: ["asg", "a2"],
          caption: {
            vi: "AZ-A chỉ có 3 instance, ít hơn AZ-B; terminate ở đây sẽ để lại 2 so với 4 và làm lệch phân bố giữa các AZ.",
            en: "AZ-A has only 3 instances, fewer than AZ-B; terminating one here would leave 2 against 4 and unbalance the AZs.",
          },
        },
        pickAz,
      ],
      verdict: {
        works: false,
        caption: { vi: "Policy chọn AZ có nhiều instance nhất.", en: "The policy picks the AZ with the most instances." },
      },
    },
    {
      option: "c",
      steps: [
        alarm,
        {
          stop: ["asg", "a2"],
          badge: "+1?",
          caption: {
            vi: "Scale-in là giảm số instance; sự kiện này không khởi chạy instance mới.",
            en: "Scaling in removes instances; this event does not launch a new one.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Scale-in không tạo instance.", en: "A scale-in does not create instances." },
      },
    },
    {
      option: "d",
      steps: [
        alarm,
        pickAz,
        {
          mark: "b1",
          tone: "bad",
          badge: { vi: "không ngẫu nhiên", en: "not random" },
          caption: {
            vi: "Chọn AZ-B là đúng, nhưng không chọn ngẫu nhiên: policy ưu tiên instance có launch template hoặc launch configuration cũ nhất, sau đó mới xét instance gần giờ tính phí tiếp theo nhất.",
            en: "AZ-B is right, but the choice is not random: the policy prefers the oldest launch template or launch configuration, then the instance closest to the next billing hour.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Default policy không chọn ngẫu nhiên.", en: "The default policy does not pick at random." },
      },
    },
  ],
};

export default spec;
