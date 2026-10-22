// Practice test 4, question 32: disaster recovery for an ElastiCache (Redis) caching layer with Multi-AZ automatic failover.
// Captions follow the question's explanation. Additional source:
// - With Multi-AZ, ElastiCache promotes the replica with the least replication lag to primary, propagates the DNS
//   name so the primary endpoint needs no change, and the downtime is minimized:
//   https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html
import type { IllustrationSpec, StepSpec } from "../types";

const serve: StepSpec = {
  flow: ["app", "primary"],
  times: 2,
  caption: {
    vi: "Ứng dụng đọc và ghi cache qua primary endpoint.",
    en: "The application reads and writes the cache through the primary endpoint.",
  },
};

const fail: StepSpec = {
  mark: "primary",
  tone: "bad",
  badge: { vi: "hỏng", en: "fails" },
  caption: {
    vi: "Primary node gặp sự cố phần cứng.",
    en: "The primary node suffers a hardware failure.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516303,
  cols: 4,
  rows: 2.5,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: "RDS + cache", kind: "actor", at: [0, 1] },
    { id: "primary", label: "Primary node", sub: "Redis · AZ a", kind: "data", at: [1.5, 0.3] },
    { id: "replica", label: "Replica node", sub: "Redis · AZ b", kind: "data", at: [1.5, 1.7] },
    { id: "backup", label: "Daily backup", sub: { vi: "1 lần/ngày", en: "once a day" }, kind: "data", at: [2.9, 0.3] },
    { id: "aof", label: "AOF backup", sub: { vi: "thủ công", en: "manual" }, kind: "data", at: [2.9, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["backup", "aof"],
      steps: [
        serve,
        {
          flow: ["primary", "replica"],
          badge: "Multi-AZ",
          caption: {
            vi: "Bật Multi-AZ: replica nằm ở AZ khác và automatic failover được kích hoạt.",
            en: "With Multi-AZ enabled, the replica sits in another AZ and automatic failover is on.",
          },
        },
        fail,
        {
          mark: "replica",
          tone: "ok",
          badge: "primary",
          caption: {
            vi: "ElastiCache tự động promote replica có độ trễ sao chép thấp nhất lên làm primary và cập nhật DNS, nên primary endpoint không đổi.",
            en: "ElastiCache automatically promotes the replica with the least replication lag to primary and propagates the DNS name, so the primary endpoint is unchanged.",
          },
        },
        {
          flow: ["app", "replica"],
          times: 2,
          caption: {
            vi: "Ứng dụng tiếp tục ghi vào primary mới ngay khi promote xong; downtime được giảm thiểu và gần như không mất dữ liệu.",
            en: "The application resumes writing to the new primary as soon as promotion completes; downtime is minimised with little data loss.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Multi-AZ với automatic failover: downtime và mất dữ liệu ở mức tối thiểu.",
          en: "Multi-AZ with automatic failover: minimal downtime and data loss.",
        },
      },
    },
    {
      option: "b",
      hide: ["replica", "aof"],
      steps: [
        serve,
        {
          flow: ["primary", "backup"],
          badge: { vi: "hằng ngày", en: "daily" },
          caption: {
            vi: "Backup tự động chạy mỗi ngày một lần vào giờ thấp điểm.",
            en: "Automatic backups run once a day at a low-utilisation time.",
          },
        },
        fail,
        {
          flow: ["backup", "primary"],
          tone: "bad",
          badge: { vi: "mất ~1 ngày", en: "~1 day lost" },
          caption: {
            vi: "Khôi phục từ bản backup gần nhất có thể mất gần một ngày dữ liệu.",
            en: "Restoring from the last backup can lose almost a day's worth of data.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Nguy cơ mất dữ liệu cao.", en: "High data-loss potential." },
      },
    },
    {
      option: "c",
      hide: ["replica", "backup"],
      steps: [
        serve,
        {
          flow: ["primary", "aof"],
          badge: "AOF",
          caption: {
            vi: "Backup thủ công bằng append-only file (AOF) hữu ích cho kiểm thử và lưu trữ lâu dài.",
            en: "Manual backups with the append-only file (AOF) are useful for testing and archiving.",
          },
        },
        fail,
        {
          mark: "aof",
          tone: "bad",
          caption: {
            vi: "AOF không bảo vệ được dữ liệu trước sự cố phần cứng của cache node, nên vẫn có nguy cơ mất dữ liệu.",
            en: "AOF cannot protect the data from a hardware-related cache node failure, so data can still be lost.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không chống được sự cố node.", en: "No protection from node failure." },
      },
    },
    {
      option: "d",
      hide: ["backup", "aof"],
      steps: [
        serve,
        {
          flow: ["primary", "replica"],
          caption: {
            vi: "Read replica ở nhiều AZ được dùng để mở rộng khả năng đọc.",
            en: "Read replicas across AZs are added to scale read capacity.",
          },
        },
        {
          flow: ["app", "replica"],
          times: 2,
          caption: {
            vi: "Replica giảm tải lượt đọc cho primary.",
            en: "The replicas take read traffic off the primary.",
          },
        },
        {
          mark: "primary",
          tone: "bad",
          caption: {
            vi: "Bản thân read replica không phải là giải pháp chịu lỗi hoàn chỉnh; thiếu Multi-AZ với automatic failover thì không đảm bảo downtime tối thiểu.",
            en: "Read replicas alone are not a complete fault-tolerant solution; without Multi-AZ automatic failover, minimal downtime is not guaranteed.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Replica dùng để mở rộng lượt đọc.", en: "Replicas are for read scaling." },
      },
    },
  ],
};

export default spec;
