// Practice test 4, question 19: maximum availability for SQL Server with the least overhead, using RDS Multi-AZ.
// Captions follow the question's explanation (Database Mirroring or Always On AGs, automatic failover, one endpoint,
// read replicas are for read scalability, no cross-Region Multi-AZ).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516201,
  cols: 4.8,
  rows: 2.6,
  nodes: [
    { id: "app", label: "App servers", kind: "actor", at: [0, 1] },
    { id: "ep", label: "DB endpoint", sub: { vi: "một tên DNS", en: "one DNS name" }, at: [1.1, 1] },
    { id: "primary", label: "RDS SQL Server", sub: "primary", kind: "data", at: [2.3, 0.3] },
    { id: "standby", label: "RDS SQL Server", sub: "standby", kind: "data", at: [2.3, 1.7] },
    { id: "ec2a", label: "SQL Server on EC2", kind: "data", at: [2.3, 0.3] },
    { id: "ec2b", label: "SQL Server on EC2", kind: "data", at: [2.3, 1.7] },
    { id: "replica", label: "Read replica", sub: { vi: "Region khác", en: "other Region" }, kind: "data", at: [3.75, 1] },
    { id: "xmaz", label: "Multi-AZ", sub: { vi: "liên Region?", en: "cross-Region?" }, kind: "ghost", at: [3.75, 1] },
  ],
  zones: [
    { id: "aza", label: "AZ a", tone: "az", from: [2.3, 0.3], to: [2.3, 0.3] },
    { id: "azb", label: "AZ b", tone: "az", from: [2.3, 1.7], to: [2.3, 1.7] },
    { id: "reg2", label: "Region 2", tone: "region", from: [3.75, 1], to: [3.75, 1] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["ec2a", "ec2b", "replica", "xmaz", "reg2"],
      steps: [
        {
          flow: ["app", "ep", "primary"],
          caption: {
            vi: "Ứng dụng kết nối qua endpoint của DB instance; endpoint đang trỏ tới primary.",
            en: "The application connects through the DB instance endpoint, which points to the primary.",
          },
        },
        {
          flow: ["primary", "standby"],
          badge: "DBM / AG",
          caption: {
            vi: "RDS triển khai Multi-AZ cho SQL Server bằng Database Mirroring hoặc Always On Availability Groups và duy trì đồng bộ với bản secondary.",
            en: "RDS implements Multi-AZ for SQL Server with Database Mirroring or Always On Availability Groups and keeps the secondary in sync.",
          },
        },
        {
          mark: "primary",
          tone: "bad",
          caption: {
            vi: "Khi có bảo trì theo kế hoạch hoặc sự cố ngoài dự kiến, RDS tự động failover sang bản secondary đã được cập nhật, không cần can thiệp thủ công.",
            en: "On planned maintenance or an unplanned disruption, RDS automatically fails over to the up-to-date secondary, without manual intervention.",
          },
        },
        {
          flow: ["app", "ep", "standby"],
          badge: { vi: "primary mới", en: "new primary" },
          caption: {
            vi: "Primary và standby dùng chung endpoint; địa chỉ mạng của endpoint chuyển sang bản secondary, nên không phải cấu hình lại ứng dụng.",
            en: "Primary and standby share the same endpoint; its network address moves to the secondary, so the application needs no reconfiguration.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tính sẵn sàng tối đa cho tầng database với chi phí vận hành thấp nhất.",
          en: "Maximum availability for the database layer with the least operational overhead.",
        },
      },
    },
    {
      option: "a",
      hide: ["primary", "standby", "replica", "xmaz", "reg2"],
      steps: [
        {
          flow: [["app", "ep", "ec2a"], ["ep", "ec2b"]],
          tone: "warn",
          caption: {
            vi: "SQL Server tự cài trên EC2 instance ở nhiều AZ có thể đạt tính sẵn sàng cao.",
            en: "SQL Server hosted on EC2 instances across AZs can be made highly available.",
          },
        },
        {
          mark: ["ec2a", "ec2b"],
          tone: "bad",
          badge: { vi: "vá OS · DB", en: "OS · DB patches" },
          caption: {
            vi: "Nhưng phải tự vá hệ điều hành, vá database và tự quản lý cơ chế dự phòng: chi phí vận hành và quản lý lớn.",
            en: "But OS patching, database patching and the failover setup are yours to run: significant operational and management overhead.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Chi phí vận hành cao.", en: "High operational overhead." },
      },
    },
    {
      option: "b",
      hide: ["standby", "ec2a", "ec2b", "xmaz", "azb"],
      steps: [
        {
          flow: ["app", "ep", "primary"],
          caption: {
            vi: "Ứng dụng làm việc với DB instance chính.",
            en: "The application works with the main DB instance.",
          },
        },
        {
          flow: ["primary", "replica"],
          tone: "warn",
          badge: "read-only",
          caption: {
            vi: "Read Replica là bản sao chỉ đọc, ở cùng Region hoặc Region khác, dùng để tăng khả năng mở rộng cho lượt đọc.",
            en: "A read replica is a read-only copy, in the same or another Region, used to scale reads.",
          },
        },
        {
          mark: "replica",
          tone: "bad",
          caption: {
            vi: "Không dùng Read Replica để nâng cao tính sẵn sàng của database.",
            en: "Read replicas cannot be used to improve the availability of a database.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Read Replica dành cho mở rộng lượt đọc.", en: "Read replicas are for read scaling." },
      },
    },
    {
      option: "c",
      hide: ["standby", "ec2a", "ec2b", "replica", "azb"],
      steps: [
        {
          flow: ["app", "ep", "primary"],
          caption: {
            vi: "Ứng dụng làm việc với DB instance chính.",
            en: "The application works with the main DB instance.",
          },
        },
        {
          stop: ["primary", "xmaz"],
          caption: {
            vi: "Multi-AZ chỉ nâng cao tính sẵn sàng trong phạm vi một AWS Region; không tồn tại “cross-region Multi-AZ deployment”.",
            en: "Multi-AZ provides availability within a single AWS Region; there is no such thing as a cross-region Multi-AZ deployment.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Cấu hình không tồn tại.", en: "That configuration does not exist." },
      },
    },
  ],
};

export default spec;
