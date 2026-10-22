// Practice test 6, question 23: Aurora global database with a secondary cluster in us-west-2 for cross-Region DR.
// Captions follow the question's explanation. Its diagram link points to an S3 Object Lock blog post, so the
// Aurora documentation is used instead:
// - Replication to secondary Regions with latency typically under a second:
//   https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
// - Failover promotes a secondary DB cluster to primary; RPO typically a non-zero value measured in seconds:
//   https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const manual = (option: string, middle: string | null, badge: Bilingual | string, copy: Bilingual, fail: Bilingual): ScenarioSpec => ({
  option,
  hide: ["dms", "lambda"].filter((id) => id !== middle),
  steps: [
    { flow: ["app", "primary"], times: 2, caption: { vi: "Giao dịch được ghi vào cluster Aurora ở us-east-2.", en: "Transactions are written to the Aurora cluster in us-east-2." } },
    { flow: middle ? ["primary", middle, "secondary"] : ["primary", "secondary"], tone: "warn", badge, caption: copy },
    { mark: "primary", tone: "bad", badge: { vi: "sự cố Region", en: "Region outage" }, caption: { vi: "us-east-2 gặp sự cố.", en: "us-east-2 goes down." } },
    { mark: "secondary", tone: "warn", badge: { vi: "thủ công", en: "manual" }, caption: fail },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Không đảm bảo RPO/RTO với ít công sức vận hành.",
      en: "It does not reliably meet the RPO/RTO with little operational effort.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 130168889,
  cols: 4.5,
  rows: 2.4,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: { vi: "giao dịch", en: "transactions" }, kind: "actor", at: [0, 1] },
    { id: "primary", label: "Aurora MySQL", sub: { vi: "cluster chính", en: "primary cluster" }, kind: "data", at: [1.2, 1] },
    { id: "dms", label: "AWS DMS", sub: { vi: "replication liên tục", en: "ongoing replication" }, at: [2.3, 1] },
    { id: "lambda", label: "Lambda", sub: "snapshot export/import", at: [2.3, 1] },
    { id: "secondary", label: "Aurora MySQL", sub: { vi: "cluster DR", en: "DR cluster" }, kind: "data", at: [3.4, 1] },
  ],
  zones: [
    { id: "east", label: "us-east-2", tone: "region", from: [1.2, 1], to: [1.2, 1], pad: 22 },
    { id: "west", label: "us-west-2", tone: "region", from: [3.4, 1], to: [3.4, 1], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["dms", "lambda"],
      steps: [
        {
          flow: ["app", "primary"],
          times: 2,
          caption: {
            vi: "Giao dịch được ghi vào cluster chính của Aurora global database ở us-east-2.",
            en: "Transactions are written to the primary cluster of the Aurora global database in us-east-2.",
          },
        },
        {
          flow: ["primary", "secondary"],
          badge: "< 1 s",
          caption: {
            vi: "Aurora replicate sang cluster phụ ở us-west-2 bằng hạ tầng chuyên dụng, độ trễ thường dưới một giây: đáp ứng thoải mái RPO 5 phút.",
            en: "Aurora replicates to the secondary cluster in us-west-2 over dedicated infrastructure, typically with under a second of lag: well within the 5-minute RPO.",
          },
        },
        {
          mark: "primary",
          tone: "bad",
          badge: { vi: "sự cố Region", en: "Region outage" },
          caption: {
            vi: "us-east-2 gặp sự cố.",
            en: "us-east-2 goes down.",
          },
        },
        {
          mark: "secondary",
          tone: "ok",
          badge: { vi: "chính mới", en: "new primary" },
          caption: {
            vi: "Managed failover nâng cluster phụ lên làm cluster chính một cách nhanh và có điều phối; dữ liệu mất chỉ tính bằng giây.",
            en: "Managed failover promotes the secondary cluster to primary quickly and in a coordinated way; data loss is measured in seconds.",
          },
        },
        {
          flow: ["app", "secondary"],
          caption: {
            vi: "Ứng dụng tiếp tục ghi vào us-west-2, trong giới hạn RTO 15 phút.",
            en: "The application resumes writing in us-west-2, within the 15-minute RTO.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Replication liên Region và failover được quản lý sẵn, ít cấu hình và vận hành.",
          en: "Managed cross-Region replication and failover, with little configuration or operations.",
        },
      },
    },
    manual(
      "b",
      "dms",
      "DMS",
      {
        vi: "DMS replicate liên tục sang cluster riêng ở us-west-2, nhưng không đảm bảo độ trễ dưới 5 phút khi tải ghi cao, và các task DMS cần được giám sát.",
        en: "DMS continuously replicates to a separate cluster in us-west-2, but it does not guarantee under-5-minute lag at peak write load, and its tasks need monitoring.",
      },
      {
        vi: "DMS không tích hợp failover với Aurora: phải tự điều phối failover thủ công, có thể vượt RTO 15 phút.",
        en: "DMS has no native Aurora failover: it must be orchestrated manually, which can push past the 15-minute RTO.",
      },
    ),
    manual(
      "c",
      null,
      "read replica",
      {
        vi: "Read replica liên Region có độ trễ replication thấp...",
        en: "A cross-Region read replica has low replication lag...",
      },
      {
        vi: "...nhưng không có managed failover: phải tự promote replica lên làm cluster chính, thêm gánh nặng vận hành và rủi ro sai sót ảnh hưởng tới RTO.",
        en: "...but there is no managed failover: the replica must be promoted manually, adding operational burden and a risk of human error that affects the RTO.",
      },
    ),
    manual(
      "d",
      "lambda",
      "snapshot",
      {
        vi: "Lambda theo lịch xuất và nhập snapshot mỗi 5 phút: cách này không gần thời gian thực, không đảm bảo RPO 5 phút.",
        en: "Scheduled Lambda functions export and import snapshots every 5 minutes: not near real time, so a 5-minute RPO is not guaranteed.",
      },
      {
        vi: "DR dựa trên snapshot cũng cần failover thủ công, vi phạm cả RPO lẫn RTO.",
        en: "Snapshot-based DR also needs manual failover, breaking both the RPO and the RTO.",
      },
    ),
  ],
};

export default spec;
