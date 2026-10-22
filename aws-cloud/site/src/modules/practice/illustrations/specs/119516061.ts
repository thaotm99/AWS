// Practice test 2, question 31: keep at least 4 instances through an AZ outage, at minimum cost.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516061,
  cols: 2.8,
  rows: 3.4,
  nodes: [
    { id: "alb", label: "Application LB", at: [0, 1.2] },
    { id: "a1", label: "2 × EC2", kind: "data", at: [1.6, 0.1] },
    { id: "a2", label: "2 × EC2", kind: "data", at: [1.6, 1.2] },
    { id: "a3", label: "2 × EC2", kind: "data", at: [1.6, 2.3] },
    { id: "c1", label: "4 × EC2", kind: "data", at: [1.6, 0.1] },
    { id: "c2", label: "4 × EC2", kind: "data", at: [1.6, 1.2] },
  ],
  zones: [
    { id: "az1", label: "AZ 1", tone: "az", from: [1.6, 0.1], to: [1.6, 0.1] },
    { id: "az2", label: "AZ 2", tone: "az", from: [1.6, 1.2], to: [1.6, 1.2] },
    { id: "az3", label: "AZ 3", tone: "az", from: [1.6, 2.3], to: [1.6, 2.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["c1", "c2"],
      steps: [
        {
          flow: [["alb", "a1"], ["alb", "a2"], ["alb", "a3"]],
          badge: { vi: "6 instance", en: "6 instances" },
          caption: { vi: "Hai instance ở mỗi AZ trong ba AZ: tổng cộng 6 instance.", en: "Two instances in each of three AZs: 6 instances in total." },
        },
        {
          mark: "a1",
          tone: "bad",
          badge: { vi: "AZ ngừng", en: "AZ down" },
          caption: { vi: "Một AZ ngừng hoạt động.", en: "One AZ goes out of service." },
        },
        {
          flow: [["alb", "a2"], ["alb", "a3"]],
          badge: { vi: "còn 4 ✓", en: "4 left ✓" },
          caption: {
            vi: "Vẫn còn 4 instance, đủ mức tối thiểu cho trải nghiệm chấp nhận được; đạt tính sẵn sàng cao chỉ với 6 instance.",
            en: "4 instances remain, meeting the minimum for an acceptable experience; high availability with only 6 instances.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Chịu được mất một AZ với 6 instance.", en: "Survives an AZ loss with 6 instances." } },
    },
    {
      option: "b",
      hide: ["a3", "az3", "c1", "c2"],
      steps: [
        { flow: [["alb", "a1"], ["alb", "a2"]], badge: { vi: "4 instance", en: "4 instances" }, caption: { vi: "Hai instance ở mỗi AZ trong hai AZ: 4 instance.", en: "Two instances in each of two AZs: 4 instances." } },
        { mark: "a1", tone: "bad", badge: { vi: "AZ ngừng", en: "AZ down" }, caption: { vi: "Một AZ ngừng hoạt động.", en: "One AZ goes out of service." } },
        {
          flow: ["alb", "a2"],
          tone: "bad",
          badge: { vi: "còn 2 < 4", en: "2 left < 4" },
          caption: { vi: "Chỉ còn 2 instance, dưới ngưỡng tối thiểu 4.", en: "Only 2 instances remain, below the minimum of 4." },
        },
      ],
      verdict: { works: false, caption: { vi: "Mất một AZ là dưới ngưỡng.", en: "Losing an AZ drops below the minimum." } },
    },
    {
      option: "c",
      hide: ["a1", "a2", "a3", "az3"],
      steps: [
        { flow: [["alb", "c1"], ["alb", "c2"]], badge: { vi: "8 instance", en: "8 instances" }, caption: { vi: "Bốn instance ở mỗi AZ trong hai AZ: 8 instance.", en: "Four instances in each of two AZs: 8 instances." } },
        { mark: "c1", tone: "bad", badge: { vi: "AZ ngừng", en: "AZ down" }, caption: { vi: "Một AZ ngừng hoạt động.", en: "One AZ goes out of service." } },
        {
          flow: ["alb", "c2"],
          tone: "warn",
          badge: { vi: "còn 4", en: "4 left" },
          caption: {
            vi: "Vẫn còn 4 instance, nhưng phải trả tiền cho 8 instance — không tối ưu chi phí so với 6.",
            en: "4 instances remain, but you pay for 8 — not cost-optimal compared with 6.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sẵn sàng nhưng tốn 8 instance.", en: "Available, but 8 instances." } },
    },
    {
      option: "d",
      hide: ["a2", "a3", "az2", "az3", "c1", "c2"],
      steps: [
        {
          flow: ["alb", "a1"],
          tone: "bad",
          badge: { vi: "2 < 4", en: "2 < 4" },
          caption: {
            vi: "Chỉ hai instance trong một AZ: dưới ngưỡng tối thiểu 4 ngay cả khi không có sự cố.",
            en: "Just two instances in one AZ: below the minimum of 4 even without a failure.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Dưới ngưỡng ngay từ đầu.", en: "Below the minimum from the start." } },
    },
  ],
};

export default spec;
