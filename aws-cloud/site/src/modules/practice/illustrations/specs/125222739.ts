// Practice test 1, question 54: AZ rebalancing launches before terminating; unhealthy replacement terminates first.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const unbalanced: StepSpec = {
  mark: ["a1", "a2"],
  tone: "bad",
  badge: { vi: "đã chấm dứt", en: "terminated" },
  caption: {
    vi: "Instance 1 và 2 ở AZ A bị chấm dứt thủ công, khiến các AZ mất cân bằng.",
    en: "Instances 1 and 2 in AZ A are terminated by hand, leaving the AZs unbalanced.",
  },
};
const unhealthy: StepSpec = {
  mark: "b1",
  tone: "bad",
  badge: "unhealthy",
  caption: { vi: "Health check của ALB phát hiện một instance ở AZ B không khoẻ mạnh.", en: "The ALB health check marks an instance in AZ B unhealthy." },
};
const wrongOrder: Bilingual = { vi: "Thứ tự trong phương án này ngược với cách Amazon EC2 Auto Scaling thực sự làm.", en: "This order is the opposite of what Amazon EC2 Auto Scaling actually does." };

const spec: IllustrationSpec = {
  questionId: 125222739,
  cols: 3.8,
  rows: 2.9,
  nodes: [
    { id: "alb", label: "Application LB", at: [0, 0.9] },
    { id: "a1", label: "Instance 1", at: [1.5, 0.1] },
    { id: "a2", label: "Instance 2", at: [2.7, 0.1] },
    { id: "b1", label: "Instance 3", at: [1.5, 1.7] },
    { id: "b2", label: "Instance 4", at: [2.7, 1.7] },
  ],
  zones: [
    { id: "azA", label: "AZ A", tone: "az", from: [1.5, 0.1], to: [2.7, 0.1], pad: 20 },
    { id: "azB", label: "AZ B", tone: "az", from: [1.5, 1.7], to: [2.7, 1.7], pad: 20 },
  ],
  links: [
    ["alb", "a1"],
    ["alb", "a2"],
    ["alb", "b1"],
    ["alb", "b2"],
  ],
  scenarios: [
    {
      option: "a",
      steps: [
        unbalanced,
        {
          mark: ["a1", "a2"],
          tone: "ok",
          badge: { vi: "khởi chạy trước", en: "launched first" },
          caption: {
            vi: "Amazon EC2 Auto Scaling bù lại bằng cách cân bằng lại các AZ; khi cân bằng lại, nó khởi chạy instance mới trước rồi mới chấm dứt instance cũ, để không ảnh hưởng hiệu năng hay tính sẵn sàng.",
            en: "Amazon EC2 Auto Scaling compensates by rebalancing the AZs; when rebalancing, it launches new instances before terminating old ones, so performance and availability are not compromised.",
          },
        },
        { flow: [["alb", "a1"], ["alb", "a2"], ["alb", "b1"], ["alb", "b2"]], caption: { vi: "Lưu lượng lại được phân phối đều giữa hai AZ.", en: "Traffic is spread across both AZs again." } },
      ],
      verdict: { works: true, caption: { vi: "Cân bằng lại: khởi chạy trước, chấm dứt sau.", en: "Rebalancing: launch first, terminate after." } },
    },
    {
      option: "b",
      steps: [
        unhealthy,
        { mark: "b1", tone: "dim", badge: { vi: "1. chấm dứt", en: "1. terminate" }, caption: { vi: "Auto Scaling tạo một scaling activity để chấm dứt instance không khoẻ mạnh, rồi chấm dứt nó.", en: "Auto Scaling creates a scaling activity to terminate the unhealthy instance, then terminates it." } },
        { mark: "b1", tone: "ok", badge: { vi: "2. khởi chạy", en: "2. launch" }, caption: { vi: "Sau đó, một scaling activity khác khởi chạy instance mới thay thế.", en: "Later, another scaling activity launches a new instance to replace it." } },
      ],
      verdict: { works: true, caption: { vi: "Thay thế: chấm dứt trước, khởi chạy sau.", en: "Replacement: terminate first, launch after." } },
    },
    {
      option: "c",
      steps: [unhealthy, { mark: "b1", tone: "bad", badge: { vi: "khởi chạy trước?", en: "launch first?" }, caption: wrongOrder }],
      verdict: { works: false, caption: { vi: "Với instance không khoẻ mạnh, Auto Scaling chấm dứt trước.", en: "For unhealthy instances, Auto Scaling terminates first." } },
    },
    {
      option: "d",
      steps: [unbalanced, { mark: ["a1", "a2"], tone: "bad", badge: { vi: "chấm dứt trước?", en: "terminate first?" }, caption: wrongOrder }],
      verdict: { works: false, caption: { vi: "Khi cân bằng lại, Auto Scaling khởi chạy trước.", en: "When rebalancing, Auto Scaling launches first." } },
    },
    {
      option: "e",
      steps: [
        unhealthy,
        {
          mark: "b1",
          tone: "bad",
          badge: { vi: "đồng thời?", en: "simultaneous?" },
          caption: {
            vi: "Hai hoạt động chấm dứt và khởi chạy không diễn ra đồng thời: instance không khoẻ mạnh bị chấm dứt trước, instance mới được khởi chạy sau.",
            en: "Termination and launch do not happen simultaneously: the unhealthy instance is terminated first and the new one launched later.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không diễn ra đồng thời.", en: "Not simultaneous." } },
    },
  ],
};

export default spec;
