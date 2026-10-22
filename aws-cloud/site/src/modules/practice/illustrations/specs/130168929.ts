// Practice test 6, question 53: ALB + Auto Scaling group across two AZs + RDS MySQL Multi-AZ.
// Captions follow the question's explanation. Additional sources:
// - Multi-AZ: automatic failover to the standby:
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
// - Promoting a read replica to a standalone DB instance is a separate, explicit operation:
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168929,
  cols: 4.7,
  rows: 3.2,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.2] },
    { id: "alb", label: "ALB", at: [1.1, 1.2] },
    { id: "r53", label: "Route 53", sub: { vi: "chia đều", en: "equal split" }, at: [1.1, 1.2] },
    { id: "ec2a", label: "EC2", at: [2.3, 0.3] },
    { id: "ec2a2", label: "EC2", at: [2.3, 1.2] },
    { id: "ec2b", label: "EC2", at: [2.3, 2.1] },
    { id: "dbP", label: "RDS MySQL", sub: { vi: "chính", en: "primary" }, kind: "data", at: [3.6, 0.3] },
    { id: "dbS", label: "Standby", sub: "Multi-AZ", kind: "data", at: [3.6, 2.1] },
    { id: "dbR", label: "Read replica", kind: "data", at: [3.6, 2.1] },
    { id: "db2", label: "RDS MySQL #2", sub: { vi: "đồng bộ bằng script", en: "script-synced" }, kind: "data", at: [3.6, 2.1] },
  ],
  zones: [
    { id: "azA", label: "AZ A", tone: "az", from: [2.3, 0.3], to: [3.6, 0.3], pad: 20 },
    { id: "azAc", label: "AZ A", tone: "az", from: [2.3, 0.3], to: [3.6, 1.2] },
    { id: "azB", label: "AZ B", tone: "az", from: [2.3, 2.1], to: [3.6, 2.1], pad: 20 },
    { id: "azBc", label: "AZ B", tone: "az", from: [3.6, 2.1], to: [3.6, 2.1] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["r53", "ec2a2", "dbR", "db2", "azAc", "azBc"],
      steps: [
        {
          flow: [["users", "alb", "ec2a"], ["users", "alb", "ec2b"]],
          caption: {
            vi: "ALB phân phối lưu lượng tới hai EC2 instance của Auto Scaling group ở hai AZ, chỉ gửi tới target khoẻ mạnh.",
            en: "The ALB distributes traffic to the Auto Scaling group's two EC2 instances in two AZs, only to healthy targets.",
          },
        },
        {
          flow: [["ec2a", "dbP"], ["dbP", "dbS"]],
          badge: "sync",
          caption: {
            vi: "RDS tự động duy trì một standby ở AZ khác; mọi cập nhật được replicate đồng bộ sang standby.",
            en: "RDS automatically maintains a standby in another AZ; every update is synchronously replicated to it.",
          },
        },
        {
          mark: ["ec2a", "dbP"],
          tone: "bad",
          badge: { vi: "AZ hỏng", en: "AZ down" },
          caption: {
            vi: "AZ A gặp sự cố.",
            en: "AZ A goes down.",
          },
        },
        {
          mark: "dbS",
          tone: "ok",
          badge: { vi: "chính mới", en: "new primary" },
          caption: {
            vi: "RDS tự động failover sang standby.",
            en: "RDS automatically fails over to the standby.",
          },
        },
        {
          flow: ["users", "alb", "ec2b", "dbS"],
          caption: {
            vi: "ALB chỉ gửi lưu lượng tới instance ở AZ B; ứng dụng vẫn chạy mà không cần vận hành thủ công.",
            en: "The ALB sends traffic only to the instance in AZ B; the application keeps running with no manual work.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tính sẵn sàng cao ở cả tầng ứng dụng và cơ sở dữ liệu, với dịch vụ được quản lý.",
          en: "High availability at both tiers, with managed services.",
        },
      },
    },
    {
      option: "a",
      hide: ["r53", "ec2a2", "dbS", "db2", "azAc", "azBc"],
      steps: [
        {
          flow: [["users", "alb", "ec2a", "dbP"], ["dbP", "dbR"]],
          badge: "async",
          caption: {
            vi: "Tầng ứng dụng giống phương án đúng, nhưng tầng dữ liệu dùng read replica ở AZ khác.",
            en: "The app tier matches the right answer, but the data tier uses a read replica in another AZ.",
          },
        },
        {
          mark: ["ec2a", "dbP"],
          tone: "bad",
          badge: { vi: "AZ hỏng", en: "AZ down" },
          caption: {
            vi: "AZ A gặp sự cố, mất DB chính.",
            en: "AZ A goes down, taking the primary DB with it.",
          },
        },
        {
          stop: ["ec2b", "dbR"],
          badge: { vi: "chỉ đọc", en: "read-only" },
          caption: {
            vi: "Không có failover tự động: read replica vẫn chỉ đọc cho tới khi được promote thủ công. Cấu hình cho tính sẵn sàng cao của RDS MySQL là Multi-AZ.",
            en: "There is no automatic failover: the read replica stays read-only until someone promotes it manually. The high-availability configuration for RDS MySQL is Multi-AZ.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Tầng cơ sở dữ liệu không có tính sẵn sàng cao.",
          en: "The database tier is not highly available.",
        },
      },
    },
    {
      option: "c",
      hide: ["r53", "ec2b", "dbR", "db2", "azA", "azB"],
      steps: [
        {
          flow: [["users", "alb", "ec2a"], ["users", "alb", "ec2a2"]],
          caption: {
            vi: "Hai EC2 instance đều nằm trong cùng một AZ.",
            en: "Both EC2 instances sit in the same AZ.",
          },
        },
        {
          mark: ["ec2a", "ec2a2"],
          tone: "bad",
          caption: {
            vi: "Khi cả AZ A gặp sự cố, mọi EC2 instance đều không truy cập được.",
            en: "When AZ A goes down, every EC2 instance becomes unreachable.",
          },
        },
        {
          stop: ["alb", "ec2a2"],
          caption: {
            vi: "Dù RDS có Multi-AZ, tầng ứng dụng vẫn ngừng hoạt động.",
            en: "Even with RDS Multi-AZ, the application tier is down.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Một AZ duy nhất ở tầng ứng dụng không có tính sẵn sàng cao.",
          en: "A single AZ in the app tier is not highly available.",
        },
      },
    },
    {
      option: "d",
      hide: ["alb", "ec2a2", "dbS", "dbR", "azAc", "azBc"],
      steps: [
        {
          flow: [["users", "r53", "ec2a"], ["users", "r53", "ec2b"]],
          tone: "warn",
          caption: {
            vi: "Route 53 chia đều lưu lượng cho hai EC2 instance tự quản lý ở hai AZ.",
            en: "Route 53 splits traffic evenly between two self-managed EC2 instances in two AZs.",
          },
        },
        {
          flow: ["dbP", "db2"],
          tone: "warn",
          badge: "script",
          caption: {
            vi: "Hai DB MySQL được đồng bộ bằng script tự viết: cần nhiều công sức phát triển và giám sát để giữ chúng nhất quán và ứng dụng luôn sẵn sàng.",
            en: "The two MySQL DBs are synced by a custom script: significant development and monitoring effort to keep them consistent and the app available.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Trái với yêu cầu giảm thiểu công sức bảo trì hạ tầng.",
          en: "It goes against minimizing infrastructure maintenance.",
        },
      },
    },
  ],
};

export default spec;
