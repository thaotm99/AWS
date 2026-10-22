// Practice test 3, question 50: replica lag under 1 second by moving from RDS for MySQL read replicas to Aurora
// Replicas that share the cluster volume. Captions follow the question's explanation. Additional source:
// - "Aurora Auto Scaling dynamically adjusts the number of Aurora Replicas (reader DB instances)":
//   https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html
import type { IllustrationSpec, StepSpec } from "../types";

const today: StepSpec = {
  flow: [
    ["rds", "reps"],
    ["site", "rds"],
  ],
  tone: "warn",
  badge: { vi: "lag tăng", en: "lag grows" },
  caption: {
    vi: "Hiện tại: một primary RDS for MySQL và ba read replica; khi lưu lượng tăng đột biến, replica tụt lại xa hơn mức 1 giây cho phép.",
    en: "Today: an RDS for MySQL primary with three read replicas; during traffic spikes the replicas fall further behind than the 1-second limit.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078957,
  cols: 4.2,
  rows: 2.7,
  nodes: [
    { id: "site", label: "Website", kind: "actor", at: [0, 0.6] },
    { id: "rds", label: "RDS for MySQL", sub: "primary", kind: "data", at: [1.4, 0.6] },
    { id: "reps", label: "Read replicas", sub: "×3", kind: "data", at: [2.9, 0.6] },
    { id: "writer", label: "Aurora writer", sub: "primary", kind: "data", at: [1.4, 0.6] },
    { id: "areps", label: "Aurora Replicas", sub: "Auto Scaling", kind: "data", at: [2.9, 0.6] },
    { id: "vol", label: "Cluster volume", sub: { vi: "dùng chung · 3 AZ", en: "shared · 3 AZs" }, kind: "data", at: [2.15, 1.8] },
    { id: "ec2db", label: "MySQL on EC2", sub: "memory-optimized", kind: "ghost", at: [1.4, 0.6] },
    { id: "ec2reps", label: "Replicas on EC2", sub: "compute-optimized", kind: "ghost", at: [2.9, 0.6] },
    { id: "cache", label: "ElastiCache", sub: "Redis", kind: "data", at: [1.4, 1.8] },
    { id: "ddb", label: "Amazon DynamoDB", sub: "RCUs", kind: "data", at: [1.4, 0.6] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["rds", "reps", "ec2db", "ec2reps", "cache", "ddb"],
      steps: [
        {
          flow: ["site", "writer", "vol"],
          badge: { vi: "ghi", en: "write" },
          caption: {
            vi: "Sau khi chuyển sang Aurora MySQL, writer ghi vào hệ thống lưu trữ phân tán, tự phục hồi, tách khỏi compute và nhân bản trên ba AZ.",
            en: "After the move to Aurora MySQL, the writer writes to a distributed, self-healing storage system that is decoupled from compute and replicated across three AZs.",
          },
        },
        {
          flow: ["vol", "areps"],
          back: true,
          badge: { vi: "10s ms", en: "10s of ms" },
          caption: {
            vi: "Aurora Replica dùng chung data volume với primary trong cùng Region nên gần như không có replication lag: khoảng vài chục mili giây, so với vài giây của MySQL read replica.",
            en: "Aurora Replicas share the same data volume as the primary in the same Region, so there is virtually no replication lag: tens of milliseconds, compared with seconds for MySQL read replicas.",
          },
        },
        {
          flow: ["site", "areps"],
          times: 3,
          caption: {
            vi: "Truy vấn tìm kiếm đọc từ Aurora Replica; Aurora Auto Scaling điều chỉnh số Aurora Replica theo tải.",
            en: "Searches read from the Aurora Replicas; Aurora Auto Scaling adjusts the number of Aurora Replicas to the load.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Lag dưới 1 giây, ít thay đổi mã.", en: "Sub-second lag with minimal code changes." } },
    },
    {
      option: "a",
      hide: ["rds", "reps", "writer", "areps", "vol", "cache", "ddb"],
      steps: [
        {
          flow: [
            ["site", "ec2db"],
            ["ec2db", "ec2reps"],
          ],
          tone: "warn",
          caption: {
            vi: "Primary MySQL chạy trên EC2 tối ưu bộ nhớ, các replica trên EC2 tối ưu tính toán.",
            en: "The MySQL primary runs on memory-optimized EC2 and the replicas on compute-optimized EC2.",
          },
        },
        {
          mark: ["ec2db", "ec2reps"],
          tone: "bad",
          badge: { vi: "vá OS · DB", en: "OS · DB patching" },
          caption: {
            vi: "Tự chạy cơ sở dữ liệu trên EC2 tạo gánh nặng quản lý đáng kể, như vá hệ điều hành và vá cơ sở dữ liệu.",
            en: "Running the database on EC2 adds significant management overhead, such as OS patching and database patching.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Tăng công quản lý hạ tầng.", en: "More infrastructure to manage." } },
    },
    {
      option: "b",
      hide: ["writer", "areps", "vol", "ec2db", "ec2reps", "ddb"],
      steps: [
        today,
        {
          flow: ["site", "cache"],
          tone: "warn",
          caption: {
            vi: "Website phải được sửa để kiểm tra cache trước khi truy vấn read replica.",
            en: "The website must be changed to check the cache before querying the read replicas.",
          },
        },
        {
          mark: "site",
          tone: "bad",
          caption: {
            vi: "Thêm lớp cache đòi hỏi thay đổi đáng kể mã ứng dụng, trái với yêu cầu.",
            en: "Introducing a caching layer requires significant application code changes, against the requirement.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phải sửa mã nhiều.", en: "Too many code changes." } },
    },
    {
      option: "c",
      hide: ["rds", "reps", "writer", "areps", "vol", "ec2db", "ec2reps", "cache"],
      steps: [
        {
          flow: ["site", "ddb"],
          tone: "warn",
          caption: {
            vi: "Dữ liệu chuyển sang DynamoDB với nhiều RCU và Auto Scaling.",
            en: "The data moves to DynamoDB with many RCUs and Auto Scaling.",
          },
        },
        {
          mark: "site",
          tone: "bad",
          caption: {
            vi: "Chuyển sang cơ sở dữ liệu NoSQL buộc phải viết lại các truy vấn, tức thay đổi lớn trong mã ứng dụng.",
            en: "Moving to a NoSQL database means rewriting the queries, a large change to the application code.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phải viết lại truy vấn.", en: "Queries must be rewritten." } },
    },
  ],
};

export default spec;
