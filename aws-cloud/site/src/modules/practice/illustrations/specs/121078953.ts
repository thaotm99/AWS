// Practice test 3, question 63: store every transaction on at least two nodes with RDS Multi-AZ synchronous
// replication. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const write: StepSpec = {
  flow: ["app", "primary"],
  badge: { vi: "giao dịch", en: "transaction" },
  caption: {
    vi: "Ứng dụng ghi một giao dịch vào DB instance chính.",
    en: "The application writes a transaction to the primary DB instance.",
  },
};
const asyncNote = {
  vi: "Read replica dùng cơ chế replication sẵn có của engine: cập nhật trên primary được sao chép bất đồng bộ sang replica. Phương án nói “đồng bộ” là sai.",
  en: "A read replica uses the engine's built-in replication: updates on the primary are copied asynchronously to the replica. The option's “synchronously” is wrong.",
};

const spec: IllustrationSpec = {
  questionId: 121078953,
  cols: 4.3,
  rows: 3.1,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, kind: "actor", at: [0, 1.1] },
    { id: "primary", label: "RDS MySQL", sub: "primary", kind: "data", at: [1.5, 0.3] },
    { id: "standby", label: "Standby", sub: "Multi-AZ", kind: "data", at: [3.1, 0.3] },
    { id: "replica", label: "Read replica", kind: "data", at: [3.1, 1.9] },
    { id: "ec2db", label: "MySQL on EC2", kind: "ghost", at: [1.5, 0.3] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "sao chép", en: "replication" }, at: [1.5, 1.9] },
    { id: "rds", label: "RDS MySQL", kind: "data", at: [3.1, 1.9] },
  ],
  zones: [
    { id: "azA", label: "AZ A", tone: "az", from: [1.5, 0.3], to: [1.5, 0.3], pad: 10 },
    { id: "azB", label: "AZ B", tone: "az", from: [3.1, 0.3], to: [3.1, 0.3], pad: 10 },
    { id: "azR", label: { vi: "AZ khác", en: "Another AZ" }, tone: "az", from: [3.1, 1.9], to: [3.1, 1.9], pad: 10 },
    { id: "regR", label: { vi: "Region khác", en: "Another Region" }, tone: "region", from: [3.1, 1.9], to: [3.1, 1.9], pad: 10 },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["replica", "ec2db", "lambda", "rds", "azR", "regR"],
      steps: [
        write,
        {
          flow: ["primary", "standby"],
          badge: { vi: "đồng bộ", en: "sync" },
          caption: {
            vi: "Với Multi-AZ, RDS tự tạo một standby ở AZ khác và sao chép đồng bộ dữ liệu sang đó, nên mỗi giao dịch nằm trên hai node.",
            en: "With Multi-AZ, RDS creates a standby in a different AZ and replicates data to it synchronously, so every transaction is on two nodes.",
          },
        },
        {
          mark: "primary",
          tone: "bad",
          badge: { vi: "sự cố", en: "outage" },
          caption: {
            vi: "DB instance chính gặp sự cố.",
            en: "The primary DB instance has an outage.",
          },
        },
        {
          flow: ["app", "standby"],
          badge: { vi: "primary mới", en: "new primary" },
          caption: {
            vi: "RDS tự động chuyển sang standby ở AZ kia; thời gian failover thường là 60–120 giây, tuỳ hoạt động của cơ sở dữ liệu.",
            en: "RDS automatically switches to the standby in the other AZ; failover typically takes 60–120 seconds, depending on database activity.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Sao chép đồng bộ, mất ít dữ liệu nhất.", en: "Synchronous copies, minimal data loss." } },
    },
    {
      option: "a",
      hide: ["standby", "ec2db", "lambda", "rds", "azB", "regR"],
      steps: [
        write,
        { flow: ["primary", "replica"], tone: "warn", badge: { vi: "bất đồng bộ", en: "async" }, caption: asyncNote },
      ],
      verdict: { works: false, caption: { vi: "Read replica không sao chép đồng bộ.", en: "Read replicas are not synchronous." } },
    },
    {
      option: "b",
      hide: ["standby", "ec2db", "lambda", "rds", "azB", "azR"],
      steps: [
        write,
        { flow: ["primary", "replica"], tone: "warn", badge: { vi: "bất đồng bộ", en: "async" }, caption: asyncNote },
      ],
      verdict: { works: false, caption: { vi: "Read replica không sao chép đồng bộ.", en: "Read replicas are not synchronous." } },
    },
    {
      option: "d",
      hide: ["primary", "standby", "replica", "azA", "azB", "azR", "regR"],
      steps: [
        {
          flow: ["app", "ec2db", "lambda", "rds"],
          tone: "warn",
          caption: {
            vi: "MySQL tự cài trên EC2 gọi Lambda để sao chép dữ liệu sang một RDS MySQL DB instance.",
            en: "A self-installed MySQL on EC2 triggers Lambda to replicate data to an RDS MySQL DB instance.",
          },
        },
        {
          mark: ["ec2db", "lambda"],
          tone: "bad",
          caption: {
            vi: "Cơ sở dữ liệu trên EC2 kém tin cậy vì phải tự giám sát và quản lý instance; sao chép bằng Lambda làm giải pháp rất phức tạp trong khi Multi-AZ làm được sẵn.",
            en: "A database on EC2 is less reliable because you must monitor and manage the instance; Lambda replication makes it very complex when Multi-AZ does this out of the box.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp và kém tin cậy.", en: "Complex and less reliable." } },
    },
  ],
};

export default spec;
