// Practice test 2, question 53: ALB + Auto Scaling group for the app tier, Aurora Serverless v2 for MySQL.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516075,
  cols: 4.4,
  rows: 1.5,
  nodes: [
    { id: "users", label: { vi: "Độc giả", en: "Readers" }, kind: "actor", at: [0, 0.3] },
    { id: "alb", label: "Application LB", at: [1.1, 0.3] },
    { id: "nlb", label: "Network LB", at: [1.1, 0.3] },
    { id: "asg", label: "Auto Scaling group", sub: "EC2 · multi-AZ", at: [2.25, 0.3] },
    { id: "tg", label: "EC2 target group", sub: { vi: "không tự mở rộng", en: "no auto scaling" }, at: [2.25, 0.3] },
    { id: "ecs", label: "Amazon ECS", sub: "EC2 launch type", at: [2.25, 0.3] },
    { id: "aur", label: "Aurora Serverless v2", sub: "MySQL", kind: "data", at: [3.4, 0.3] },
    { id: "rds", label: "RDS for MySQL", sub: "Multi-AZ", kind: "data", at: [3.4, 0.3] },
    { id: "redis", label: "ElastiCache Redis", sub: "Redis Streams", kind: "data", at: [3.4, 0.3] },
    { id: "nep", label: "Amazon Neptune", sub: "graph", kind: "data", at: [3.4, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["nlb", "tg", "ecs", "rds", "redis", "nep"],
      steps: [
        {
          flow: ["users", "alb", "asg"],
          times: 3,
          badge: { vi: "tự mở rộng", en: "scales out" },
          caption: {
            vi: "Auto Scaling group sau ALB mở rộng tầng ứng dụng theo chiều ngang, trải trên nhiều AZ.",
            en: "The Auto Scaling group behind the ALB scales the application tier horizontally across AZs.",
          },
        },
        {
          flow: ["asg", "aur"],
          badge: { vi: "tự điều chỉnh", en: "auto capacity" },
          caption: {
            vi: "Aurora Serverless v2 tương thích MySQL, tự điều chỉnh capacity theo tải, có tính sẵn sàng cao trên nhiều AZ, backup và failover mà không phải quản lý máy chủ database.",
            en: "Aurora Serverless v2 is MySQL-compatible and adjusts capacity to the workload, with multi-AZ high availability, backups and failover and no database servers to manage.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Hai tầng tách biệt, cả hai tự mở rộng.", en: "Separate tiers, both scale automatically." } },
    },
    {
      option: "d",
      hide: ["nlb", "asg", "ecs", "aur", "redis", "nep"],
      steps: [
        { flow: ["users", "alb", "tg", "rds"], tone: "warn", caption: { vi: "RDS for MySQL Multi-AZ cung cấp tính sẵn sàng cao và failover tự động.", en: "RDS for MySQL Multi-AZ provides high availability and automatic failover." } },
        {
          mark: "rds",
          tone: "bad",
          badge: { vi: "đổi cỡ thủ công", en: "manual resize" },
          caption: {
            vi: "Nhưng nó không tự mở rộng compute cho tầng database; tải tăng thì phải can thiệp thủ công để đổi cỡ instance hoặc thêm read replica.",
            en: "But it does not scale database compute automatically; growth requires manual work to resize the instance or add read replicas.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Database không tự mở rộng.", en: "The database does not auto-scale." } },
    },
    {
      option: "b",
      hide: ["alb", "asg", "ecs", "aur", "rds", "nep"],
      steps: [
        { flow: ["users", "nlb", "tg", "redis"], tone: "warn", caption: { vi: "ElastiCache for Redis được dùng làm database, với Redis Streams để lưu trữ bền vững.", en: "ElastiCache for Redis is used as the database, with Redis Streams for persistence." } },
        {
          mark: "redis",
          tone: "bad",
          badge: "key-value",
          caption: {
            vi: "ElastiCache là kho key-value để làm cache, không thay được MySQL: Redis không hỗ trợ join quan hệ, transaction và ACID như MySQL.",
            en: "ElastiCache is a key-value store for caching, not a MySQL replacement: Redis does not support relational joins, transactions or ACID the way MySQL does.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phải cơ sở dữ liệu quan hệ.", en: "Not a relational database." } },
    },
    {
      option: "c",
      hide: ["nlb", "asg", "tg", "aur", "rds", "redis"],
      steps: [
        { flow: ["users", "alb", "ecs", "nep"], tone: "warn", caption: { vi: "Ứng dụng container trên ECS ghi dữ liệu vào Amazon Neptune.", en: "The containerised application on ECS stores data in Amazon Neptune." } },
        {
          mark: "nep",
          tone: "bad",
          badge: "graph",
          caption: {
            vi: "Neptune là graph database, không hỗ trợ SQL hay lược đồ quan hệ và không tương thích MySQL; phải thiết kế lại toàn bộ mô hình dữ liệu và truy vấn.",
            en: "Neptune is a graph database with no SQL or relational schema and no MySQL compatibility; the data model and queries would need a full redesign.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không tương thích MySQL.", en: "Not MySQL-compatible." } },
    },
  ],
};

export default spec;
