// Practice test 1, question 55: RDS Proxy connection pooling and an SQS queue with worker Auto Scaling group.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const ALT = ["sqs", "workers", "proxy", "cache", "rr", "apigw"];

const spec: IllustrationSpec = {
  questionId: 125222719,
  cols: 4.6,
  rows: 2.8,
  nodes: [
    { id: "buyers", label: { vi: "Người mua vé", en: "Buyers" }, kind: "actor", at: [0, 0.9] },
    { id: "apigw", label: "API Gateway", sub: "throttling", at: [1.1, 0.9] },
    { id: "web", label: "EC2 · Auto Scaling", sub: { vi: "dịch vụ giao dịch", en: "transaction service" }, at: [2.2, 0.9] },
    { id: "sqs", label: "Amazon SQS", sub: { vi: "sự kiện mua", en: "purchase events" }, at: [2.2, 0] },
    { id: "workers", label: "EC2 workers", sub: "Auto Scaling", at: [3.5, 0] },
    { id: "proxy", label: "RDS Proxy", sub: "connection pool", at: [2.2, 1.8] },
    { id: "cache", label: "ElastiCache", sub: { vi: "ghi vào cache trước?", en: "writes cached first?" }, at: [2.2, 1.8] },
    { id: "rr", label: "Read replica", sub: { vi: "Region khác · chỉ đọc", en: "other Region · read-only" }, kind: "data", at: [2.2, 1.8] },
    { id: "aur", label: "Aurora PostgreSQL", kind: "data", at: [3.5, 1.8] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["apigw", "sqs", "workers", "cache", "rr"],
      steps: [
        { flow: ["buyers", "web"], times: 3, caption: { vi: "EC2 trong Auto Scaling group mở rộng tầng ứng dụng theo nhu cầu.", en: "EC2 instances in an Auto Scaling group scale the application tier with demand." } },
        {
          flow: ["web", "proxy"],
          times: 3,
          badge: { vi: "gộp kết nối", en: "pooled" },
          caption: {
            vi: "RDS Proxy quản lý connection pooling và throttling — nguyên nhân thường gặp của timeout trên Aurora khi tải cao.",
            en: "RDS Proxy handles connection pooling and throttling — common causes of Aurora timeouts under heavy load.",
          },
        },
        {
          flow: ["proxy", "aur"],
          badge: { vi: "tái sử dụng", en: "reused" },
          caption: {
            vi: "Proxy giữ một pool kết nối và tái sử dụng chúng cho các client, giảm chi phí tạo kết nối liên tục và giảm áp lực kết nối lên Aurora.",
            en: "The proxy keeps a pool of connections and reuses them across clients, cutting the cost of constant connection setup and the connection stress on Aurora.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Ít áp lực kết nối hơn, không đổi database.", en: "Less connection stress, same database." } },
    },
    {
      option: "b",
      hide: ["apigw", "proxy", "cache", "rr"],
      steps: [
        { flow: ["buyers", "web"], times: 3, caption: { vi: "Đợt mở bán vé tạo lưu lượng tăng vọt.", en: "A flash sale creates a burst of traffic." } },
        {
          flow: ["web", "sqs"],
          times: 3,
          badge: { vi: "bộ đệm", en: "buffer" },
          caption: {
            vi: "Ứng dụng publish sự kiện mua vào SQS queue, tách tầng web khỏi logic xử lý và đệm đợt tăng đột biến mà không làm quá tải database.",
            en: "The application publishes purchase events to an SQS queue, decoupling the web tier from processing and buffering bursts without overwhelming the database.",
          },
        },
        {
          flow: ["sqs", "workers", "aur"],
          badge: { vi: "bất đồng bộ", en: "async" },
          caption: {
            vi: "EC2 worker trong Auto Scaling group poll queue và xử lý giao dịch bất đồng bộ, mở rộng và thu hẹp theo lượng việc thực tế.",
            en: "EC2 workers in an Auto Scaling group poll the queue and process purchases asynchronously, scaling out and in with actual demand.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Đệm đột biến, xử lý theo nhịp.", en: "Bursts buffered, processed at pace." } },
    },
    {
      option: "c",
      hide: ALT.filter((a) => a !== "cache"),
      steps: [
        { flow: ["buyers", "web", "cache"], times: 2, tone: "warn", caption: { vi: "Giao dịch được ghi vào ElastiCache trước khi ghi xuống database.", en: "Transactions are stored in ElastiCache before they are written to the database." } },
        {
          mark: "cache",
          tone: "bad",
          badge: { vi: "có thể mất dữ liệu", en: "data-loss risk" },
          caption: {
            vi: "ElastiCache hợp với tải đọc nhiều, không dành cho ghi giao dịch bền vững: node cache lỗi trước khi dữ liệu xuống database là mất dữ liệu, và cache không ngăn được việc cạn kết nối database khi ghi nhiều.",
            en: "ElastiCache suits read-heavy loads, not durable transactional writes: a cache node failure before persistence loses data, and caching does not prevent connection saturation under heavy writes.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không bền vững cho giao dịch.", en: "Not durable for transactions." } },
    },
    {
      option: "d",
      hide: ALT.filter((a) => a !== "apigw"),
      steps: [
        { flow: ["buyers", "apigw"], times: 4, tone: "warn", caption: { vi: "API Gateway với throttling và usage plan làm chậm request mua vé lúc cao điểm.", en: "API Gateway throttling and usage plans slow down purchase requests at peak." } },
        {
          stop: ["apigw", "web"],
          badge: { vi: "bị từ chối", en: "rejected" },
          caption: {
            vi: "Cách này bảo vệ backend bằng cách trì hoãn hoặc từ chối lưu lượng — trải nghiệm khách hàng tệ hơn, và không tăng năng lực xử lý của backend.",
            en: "It protects the backend by delaying or rejecting traffic — a worse customer experience, and no gain in backend throughput.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Kìm nhu cầu thay vì đáp ứng.", en: "Suppresses demand instead of meeting it." } },
    },
    {
      option: "e",
      hide: ALT.filter((a) => a !== "rr"),
      steps: [
        { flow: ["buyers", "web"], times: 2, caption: { vi: "Ứng dụng đọc và ghi vào replica gần nhất theo độ trễ.", en: "The application reads and writes to the nearest replica by latency." } },
        {
          stop: ["web", "rr"],
          badge: { vi: "ghi?", en: "write?" },
          caption: { vi: "Read replica chỉ đọc, không nhận được lưu lượng ghi.", en: "Read replicas are read-only and cannot handle write traffic." },
        },
      ],
      verdict: { works: false, caption: { vi: "Replica không ghi được.", en: "Replicas cannot take writes." } },
    },
  ],
};

export default spec;
