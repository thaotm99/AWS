// Practice test 5, question 3: Aurora reader endpoint for reads, and an Aurora Replica in another AZ as failover target.
// Captions follow the question's explanation. Additional sources:
// - The cluster endpoint connects to the current primary; after a failover it keeps serving connections from the new
//   primary: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html
// - The reader endpoint balances connections among the Aurora Replicas:
//   https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const overloaded: StepSpec = {
  mark: "writer",
  tone: "bad",
  badge: "CPU · RAM",
  caption: {
    vi: "Điểm nghẽn nằm ở tầng cơ sở dữ liệu: instance Aurora duy nhất có mức sử dụng CPU và bộ nhớ cao trong lúc lưu lượng tăng đột biến.",
    en: "The bottleneck is the database layer: the single Aurora instance runs at high CPU and memory during traffic spikes.",
  },
};
const dbVerdict = {
  works: false,
  caption: {
    vi: "Không giải quyết điểm nghẽn ở tầng cơ sở dữ liệu.",
    en: "It does not address the bottleneck at the database layer.",
  } as Bilingual,
};

const spec: IllustrationSpec = {
  questionId: 119517575,
  cols: 4,
  rows: 3,
  nodes: [
    { id: "app", label: "AWS Lambda", sub: { vi: "ghi đơn hàng", en: "order writes" }, at: [0, 1.15] },
    { id: "ec2", label: "EC2 + ALB", sub: { vi: "ghi đơn hàng", en: "order writes" }, at: [0, 1.15] },
    { id: "clusterEp", label: "Cluster endpoint", sub: "writer", at: [1.4, 0.4] },
    { id: "readerEp", label: "Reader endpoint", sub: "read-only", at: [1.4, 1.9] },
    { id: "writer", label: "Aurora writer", sub: "primary", kind: "data", at: [2.9, 0.4] },
    { id: "replica", label: "Aurora Replica", sub: "read-only", kind: "data", at: [2.9, 1.9] },
    { id: "standby", label: "Standby instance", sub: { vi: "không có trong Aurora", en: "not in Aurora" }, kind: "ghost", at: [2.9, 1.9] },
  ],
  zones: [
    { id: "aza", label: "AZ a", tone: "az", from: [2.9, 0.4], to: [2.9, 0.4], pad: 22 },
    { id: "azb", label: "AZ b", tone: "az", from: [2.9, 1.9], to: [2.9, 1.9], pad: 22 },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["ec2", "standby"],
      steps: [
        {
          flow: ["app", "clusterEp", "writer"],
          caption: {
            vi: "Thao tác ghi đơn hàng đi qua cluster endpoint tới writer DB instance.",
            en: "Order writes go through the cluster endpoint to the writer DB instance.",
          },
        },
        {
          flow: ["writer", "replica"],
          badge: { vi: "sao chép", en: "replication" },
          caption: {
            vi: "Khi thêm DB instance vào cluster, Aurora tự động thiết lập sao chép từ writer sang instance đó; các instance này chỉ đọc và gọi là Aurora Replica.",
            en: "When another DB instance is added to the cluster, Aurora automatically sets up replication from the writer to it; these read-only instances are Aurora Replicas.",
          },
        },
        {
          flow: ["app", "readerEp", "replica"],
          times: 3,
          caption: {
            vi: "Mọi thao tác đọc kết nối qua reader endpoint; Aurora phân tải các kết nối chỉ đọc lên các Aurora Replica, giảm tải cho writer.",
            en: "All reads connect through the reader endpoint; Aurora spreads the read-only connections across the Aurora Replicas, taking load off the writer.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai lựa chọn đúng: chuyển tải đọc khỏi writer đang quá tải.",
          en: "One of the two correct choices: read load moves off the overloaded writer.",
        },
      },
    },
    {
      option: "d",
      hide: ["ec2", "standby"],
      steps: [
        {
          flow: ["writer", "replica"],
          badge: { vi: "sao chép", en: "replication" },
          caption: {
            vi: "Một Aurora Replica ở Availability Zone khác nhận dữ liệu sao chép từ writer.",
            en: "An Aurora Replica in another Availability Zone receives replicated data from the writer.",
          },
        },
        {
          mark: "writer",
          tone: "bad",
          badge: { vi: "sự cố", en: "failed" },
          caption: {
            vi: "Writer instance gặp sự cố và không còn khả dụng.",
            en: "The writer instance fails and becomes unavailable.",
          },
        },
        {
          mark: "replica",
          tone: "ok",
          badge: { vi: "writer mới", en: "new writer" },
          caption: {
            vi: "Aurora tự động failover bằng cách nâng cấp Aurora Replica hiện có thành primary instance mới.",
            en: "Aurora automatically fails over by promoting the existing Aurora Replica to the new primary instance.",
          },
        },
        {
          flow: ["app", "clusterEp", "replica"],
          caption: {
            vi: "Cluster endpoint luôn trỏ tới primary hiện tại, nên thao tác ghi tiếp tục tới primary mới với gián đoạn tối thiểu.",
            en: "The cluster endpoint always connects to the current primary, so writes continue on the new primary with minimal interruption.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai lựa chọn đúng: Aurora Replica là mục tiêu failover, tăng tính sẵn sàng.",
          en: "One of the two correct choices: the Aurora Replica is a failover target, which improves availability.",
        },
      },
    },
    {
      option: "a",
      hide: ["ec2", "readerEp", "replica", "standby", "azb"],
      steps: [
        {
          flow: ["app", "clusterEp", "writer"],
          times: 4,
          tone: "warn",
          caption: {
            vi: "Tăng concurrency của Lambda chỉ đẩy thêm thao tác ghi vào cùng một DB instance.",
            en: "Raising the Lambda concurrency only pushes more writes into the same DB instance.",
          },
        },
        overloaded,
      ],
      verdict: dbVerdict,
    },
    {
      option: "c",
      hide: ["ec2", "readerEp", "replica"],
      steps: [
        {
          flow: ["app", "clusterEp", "writer"],
          caption: {
            vi: "Thao tác ghi đi tới writer instance duy nhất.",
            en: "Writes go to the single writer instance.",
          },
        },
        {
          mark: "standby",
          tone: "bad",
          badge: { vi: "không tồn tại", en: "does not exist" },
          caption: {
            vi: "Aurora không có standby instance; khi phát hiện sự cố, Aurora tự động failover sang một read replica.",
            en: "There are no standby instances in Aurora; when a problem is detected, Aurora fails over to a read replica.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Aurora không có khái niệm standby instance.",
          en: "Aurora has no standby instances.",
        },
      },
    },
    {
      option: "e",
      hide: ["app", "readerEp", "replica", "standby", "azb"],
      steps: [
        {
          flow: ["ec2", "clusterEp", "writer"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "Thay Lambda bằng EC2 instance sau Application Load Balancer vẫn ghi vào cùng một DB instance.",
            en: "Replacing Lambda with EC2 instances behind an Application Load Balancer still writes to the same DB instance.",
          },
        },
        overloaded,
      ],
      verdict: dbVerdict,
    },
  ],
};

export default spec;
