// Practice test 3, question 41: run heavy business reports against an RDS read replica so the production
// application is unaffected. Captions follow the question's explanation. Additional source:
// - "When you make updates to the primary DB instance, Amazon RDS copies them asynchronously to the read replica.":
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
import type { IllustrationSpec, StepSpec } from "../types";

const both: StepSpec = {
  flow: [
    ["app", "db"],
    ["reports", "db"],
  ],
  tone: "warn",
  times: 2,
  caption: {
    vi: "Ứng dụng production và báo cáo nghiệp vụ (truy vấn lớn, nhiều phép join) cùng chạy trên một DB instance.",
    en: "The production application and the business reports (large queries with many joins) run on the same DB instance.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121079047,
  cols: 4,
  rows: 2.7,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Production app" }, sub: "production", kind: "actor", at: [0, 0.2] },
    { id: "reports", label: { vi: "Công cụ báo cáo", en: "Report tool" }, kind: "actor", at: [0, 1.8] },
    { id: "db", label: "Amazon RDS", sub: "primary", kind: "data", at: [1.6, 0.2] },
    { id: "replica", label: "Read replica", kind: "data", at: [3, 1.8] },
    { id: "standby", label: "Standby", sub: "Multi-AZ", kind: "data", at: [3, 1.8] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["standby"],
      steps: [
        {
          flow: ["app", "db"],
          times: 2,
          caption: {
            vi: "Ứng dụng production tiếp tục đọc ghi trên DB instance chính.",
            en: "The production application keeps reading and writing on the primary DB instance.",
          },
        },
        {
          flow: ["db", "replica"],
          badge: { vi: "bất đồng bộ", en: "async" },
          caption: {
            vi: "Read replica là một bản sao của DB instance nguồn; RDS sao chép các cập nhật trên primary sang replica một cách bất đồng bộ.",
            en: "A read replica is a copy of the source DB instance; RDS copies updates on the primary to the replica asynchronously.",
          },
        },
        {
          flow: ["reports", "replica"],
          times: 2,
          badge: { vi: "báo cáo", en: "reports" },
          caption: {
            vi: "Truy vấn báo cáo nghiệp vụ chạy trên read replica thay vì DB instance production, nên ứng dụng không bị ảnh hưởng.",
            en: "Business reporting queries run against the read replica rather than the production DB instance, so the application is unaffected.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Tách tải báo cáo khỏi production.", en: "Reporting load is off production." } },
    },
    {
      option: "a",
      hide: ["replica", "standby"],
      steps: [
        both,
        {
          mark: "db",
          tone: "bad",
          badge: "~50%",
          caption: {
            vi: "Tăng kích thước RDS instance không giúp được: CPU, bộ nhớ và dung lượng lưu trữ đang chỉ ở khoảng 50%; báo cáo vẫn chạy trên production.",
            en: "A larger RDS instance does not help: CPU, memory and storage are only around 50%, and the reports still run on production.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Báo cáo vẫn chạy trên production.", en: "Reports still run on production." } },
    },
    {
      option: "b",
      hide: ["replica", "standby"],
      steps: [
        both,
        {
          mark: "db",
          tone: "bad",
          badge: "magnetic",
          caption: {
            vi: "Amazon RDS chỉ hỗ trợ magnetic storage để tương thích ngược; AWS khuyến nghị General Purpose SSD hoặc Provisioned IOPS.",
            en: "Amazon RDS supports magnetic storage for backward compatibility only; AWS recommends General Purpose SSD or Provisioned IOPS.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Magnetic chỉ để tương thích ngược; báo cáo vẫn chạy trên production.", en: "Magnetic is legacy only, and reports still run on production." } },
    },
    {
      option: "d",
      hide: ["replica"],
      steps: [
        {
          flow: ["db", "standby"],
          badge: { vi: "đồng bộ", en: "sync" },
          caption: {
            vi: "Với Multi-AZ, RDS sao chép đồng bộ dữ liệu sang một standby ở AZ khác để tăng tính sẵn sàng và độ bền.",
            en: "With Multi-AZ, RDS synchronously replicates data to a standby in another AZ for availability and durability.",
          },
        },
        {
          stop: ["reports", "standby"],
          caption: {
            vi: "Không thể đọc từ standby, nên công cụ báo cáo không thể kết nối vào đó.",
            en: "You cannot read from the standby, so the report tool cannot use it.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Standby không phục vụ đọc.", en: "The standby serves no reads." } },
    },
  ],
};

export default spec;
