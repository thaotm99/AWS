// Practice test 4, question 13: RDS read replicas to raise read throughput behind API Gateway and Lambda.
// Captions follow the question's explanation. Additional sources:
// - Updates are copied asynchronously to the read replica, which allows only read-only connections:
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
// - "You can't use a standby replica to serve read traffic.":
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
import type { IllustrationSpec } from "../types";

const refactor = { vi: "đổi logic", en: "refactor" };

const spec: IllustrationSpec = {
  questionId: 119516289,
  cols: 4.5,
  rows: 2.6,
  nodes: [
    { id: "api", label: "API Gateway", sub: { vi: "lượt đọc lớn", en: "heavy reads" }, kind: "actor", at: [0, 1] },
    { id: "lambda", label: "AWS Lambda", at: [1.15, 1] },
    { id: "cache", label: "ElastiCache", sub: "in-memory", at: [2.3, 0] },
    { id: "primary", label: "RDS PostgreSQL", sub: "primary", kind: "data", at: [2.3, 1] },
    { id: "ddb", label: "Amazon DynamoDB", kind: "data", at: [2.3, 1] },
    { id: "rr1", label: "Read replica", kind: "data", at: [3.5, 0.2] },
    { id: "rr2", label: "Read replica", kind: "data", at: [3.5, 1.8] },
    { id: "standby", label: "Standby", sub: "Multi-AZ", kind: "data", at: [3.5, 1] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["cache", "ddb", "standby"],
      steps: [
        {
          flow: ["api", "lambda", "primary"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "Lưu lượng đọc lớn khiến các Lambda function dồn tải đọc lên một DB instance duy nhất.",
            en: "Heavy read traffic makes the Lambda functions put all the read load on a single DB instance.",
          },
        },
        {
          flow: [["primary", "rr1"], ["primary", "rr2"]],
          badge: "async",
          caption: {
            vi: "Read Replica được tạo từ DB instance nguồn; thay đổi trên primary được sao chép bất đồng bộ sang các replica.",
            en: "Read replicas are created from the source DB instance; changes on the primary are copied asynchronously to them.",
          },
        },
        {
          flow: [["lambda", "rr1"], ["lambda", "rr2"]],
          times: 2,
          caption: {
            vi: "Lưu lượng đọc được phục vụ từ nhiều bản sao dữ liệu, làm tăng tổng thông lượng đọc mà không đổi logic cốt lõi của ứng dụng.",
            en: "Read traffic is served from several copies of the data, increasing aggregate read throughput without changing the application's core logic.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Read Replica mở rộng khả năng đọc vượt giới hạn của một DB instance.",
          en: "Read replicas scale reads beyond the capacity of a single DB instance.",
        },
      },
    },
    {
      option: "a",
      hide: ["cache", "ddb", "rr1", "rr2"],
      steps: [
        {
          flow: ["primary", "standby"],
          badge: "sync",
          caption: {
            vi: "Multi-AZ sao chép đồng bộ dữ liệu sang một standby ở AZ khác để tự động failover khi có sự cố.",
            en: "Multi-AZ synchronously replicates data to a standby in another AZ for automatic failover.",
          },
        },
        {
          flow: ["api", "lambda", "primary"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "Mọi lượt đọc vẫn dồn vào primary.",
            en: "All reads still land on the primary.",
          },
        },
        {
          stop: ["lambda", "standby"],
          caption: {
            vi: "Standby không phục vụ lưu lượng đọc; Multi-AZ dành cho tính sẵn sàng, không phải để mở rộng khả năng đọc.",
            en: "The standby cannot serve read traffic; Multi-AZ is for availability, not for scaling reads.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không tăng thông lượng đọc.", en: "It does not raise read throughput." },
      },
    },
    {
      option: "c",
      hide: ["ddb", "rr1", "rr2", "standby"],
      steps: [
        {
          flow: ["api", "lambda", "cache"],
          tone: "warn",
          caption: {
            vi: "ElastiCache chắc chắn giúp giảm tải đọc cho database.",
            en: "ElastiCache would definitely help with the read load.",
          },
        },
        {
          mark: "lambda",
          tone: "bad",
          badge: refactor,
          caption: {
            vi: "Nhưng ứng dụng phải được viết lại để đọc và ghi cache, tức là thay đổi logic cốt lõi.",
            en: "But the application would have to be refactored to use the cache, changing its core logic.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Phải thay đổi logic cốt lõi.", en: "It requires changing the core logic." },
      },
    },
    {
      option: "d",
      hide: ["primary", "cache", "rr1", "rr2", "standby"],
      steps: [
        {
          flow: ["api", "lambda", "ddb"],
          tone: "warn",
          caption: {
            vi: "DynamoDB (kèm DAX) có thể xử lý tải đọc lớn.",
            en: "DynamoDB with DAX would probably help with the read load.",
          },
        },
        {
          mark: "lambda",
          tone: "bad",
          badge: refactor,
          caption: {
            vi: "Nhưng chuyển từ PostgreSQL sang DynamoDB đòi hỏi viết lại logic cốt lõi của ứng dụng.",
            en: "But moving from PostgreSQL to DynamoDB requires a refactor of the application's core logic.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Phải thay đổi logic cốt lõi.", en: "It requires changing the core logic." },
      },
    },
  ],
};

export default spec;
