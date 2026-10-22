// Practice test 2, question 52: Aurora MySQL with Aurora Replicas; the dev copy is restored from automated backups.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516127,
  cols: 4.2,
  rows: 2.6,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, kind: "actor", at: [0, 0.8] },
    { id: "prim", label: "Aurora MySQL", sub: "primary", kind: "data", at: [1.4, 0.1] },
    { id: "rdsP", label: "RDS for MySQL", sub: "primary", kind: "data", at: [1.4, 0.1] },
    { id: "sqlP", label: "RDS for SQL Server", sub: "primary", kind: "data", at: [1.4, 0.1] },
    { id: "rep", label: "Aurora Replicas", sub: "Multi-AZ", kind: "data", at: [1.4, 1.5] },
    { id: "stby", label: "Standby", sub: "Multi-AZ", kind: "data", at: [1.4, 1.5] },
    { id: "rr", label: "Read replica", sub: "read-only", kind: "data", at: [1.4, 1.5] },
    { id: "bk", label: "Automated backups", sub: { vi: "liên tục, tăng dần", en: "continuous, incremental" }, at: [2.8, 0.1] },
    { id: "dump", label: "mysqldump", sub: { vi: "đọc từ primary", en: "reads the primary" }, at: [2.8, 0.1] },
    { id: "dev", label: "Dev database", kind: "data", at: [3.2, 1.5] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["rdsP", "sqlP", "stby", "rr", "dump"],
      steps: [
        {
          flow: [["app", "prim"], ["app", "rep"]],
          times: 2,
          caption: {
            vi: "Aurora hỗ trợ Aurora Replica trên nhiều AZ, cải thiện khả năng mở rộng đọc và tính sẵn sàng của ứng dụng.",
            en: "Aurora supports Multi-AZ Aurora Replicas, which improve the application's read scaling and availability.",
          },
        },
        {
          flow: ["prim", "bk"],
          badge: { vi: "không ảnh hưởng", en: "no impact" },
          caption: {
            vi: "Aurora tự động sao lưu cluster volume; backup liên tục và tăng dần, không ảnh hưởng hiệu năng hay làm gián đoạn dịch vụ.",
            en: "Aurora backs up the cluster volume automatically; backups are continuous and incremental, with no performance impact or interruption.",
          },
        },
        {
          flow: ["bk", "dev"],
          badge: "restore",
          caption: {
            vi: "Dev database được tạo bằng cách khôi phục từ automated backup, nên việc sao chép buổi sáng không còn đè lên database production.",
            en: "The dev database is created by restoring from the automated backups, so the morning copy no longer loads the production database.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Mở rộng đọc, tạo dev mà không tải lên production.", en: "Read scaling, dev copy without loading production." } },
    },
    {
      option: "d",
      hide: ["rdsP", "sqlP", "stby", "rr", "bk"],
      steps: [
        { flow: [["app", "prim"], ["app", "rep"]], caption: { vi: "Aurora MySQL với Aurora Replica trên nhiều AZ.", en: "Aurora MySQL with Multi-AZ Aurora Replicas." } },
        { flow: ["prim", "dump", "dev"], tone: "warn", caption: { vi: "Dev database được dựng lại bằng mysqldump.", en: "The dev database is rebuilt with mysqldump." } },
        {
          mark: "prim",
          tone: "bad",
          badge: { vi: "tải nặng", en: "heavy load" },
          caption: {
            vi: "mysqldump vẫn tạo tải đáng kể lên primary DB, nên người dùng vẫn gặp độ trễ cao.",
            en: "mysqldump still puts significant load on the primary DB, so users still see high latency.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Vẫn đè tải lên primary.", en: "Still loads the primary." } },
    },
    {
      option: "a",
      hide: ["prim", "sqlP", "rep", "rr", "bk", "dump"],
      steps: [
        { flow: [["app", "rdsP"], ["rdsP", "stby"]], caption: { vi: "RDS for MySQL Multi-AZ có standby ở AZ khác.", en: "RDS for MySQL Multi-AZ keeps a standby in another AZ." } },
        {
          stop: ["dev", "stby"],
          caption: {
            vi: "Standby chỉ dùng để failover trong Multi-AZ; không truy cập được standby, nên không thể dùng nó làm dev database.",
            en: "The standby only handles failover in a Multi-AZ deployment; it cannot be accessed, so it cannot serve as the dev database.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Standby không truy cập được.", en: "The standby is not accessible." } },
    },
    {
      option: "b",
      hide: ["prim", "rdsP", "rep", "stby", "bk", "dump"],
      steps: [
        { flow: [["app", "sqlP"], ["sqlP", "rr"]], caption: { vi: "RDS for SQL Server Multi-AZ kèm read replica.", en: "RDS for SQL Server Multi-AZ with a read replica." } },
        {
          stop: ["dev", "rr"],
          badge: { vi: "không ghi", en: "no writes" },
          caption: {
            vi: "Read replica chỉ phục vụ đọc và không cho phép thao tác ghi, nên không dùng làm dev database được.",
            en: "A read replica only serves reads and allows no write operations, so it cannot be used as a dev database.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Replica không ghi được.", en: "A replica cannot take writes." } },
    },
  ],
};

export default spec;
