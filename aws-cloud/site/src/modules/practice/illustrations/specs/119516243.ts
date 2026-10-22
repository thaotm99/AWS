// Practice test 4, question 50: real-time driver locations cached in ElastiCache for Redis in front of RDS for PostgreSQL.
// Captions follow the question's explanation (sub-millisecond reads and writes, geospatial commands such as GEOADD and
// GEORADIUS, TTL-based expiry; read replicas do not reduce write load; OpenSearch is not built for rapid read/write
// cycles). Additional sources:
// - A read replica allows only read-only connections:
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
// - "You can't use a standby replica to serve read traffic.":
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516243,
  cols: 5,
  rows: 2.6,
  nodes: [
    { id: "app", label: "Ride app backend", sub: { vi: "cập nhật GPS", en: "GPS updates" }, kind: "actor", at: [0, 1] },
    { id: "redis", label: "ElastiCache Redis", sub: "GEO · TTL", at: [1.4, 0] },
    { id: "proxy", label: "RDS Proxy", at: [1.4, 1] },
    { id: "pg", label: "RDS PostgreSQL", sub: "primary", kind: "data", at: [2.8, 1] },
    { id: "os", label: "OpenSearch", sub: "geospatial", kind: "data", at: [2.8, 1] },
    { id: "rr", label: "Read replica", kind: "data", at: [4, 0.2] },
    { id: "standby", label: "Standby", sub: "Multi-AZ", kind: "data", at: [4, 1.8] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["proxy", "os", "rr", "standby"],
      steps: [
        {
          flow: ["app", "redis"],
          times: 4,
          badge: "GEOADD",
          caption: {
            vi: "Vị trí mới được ghi vào Redis thay vì vào PostgreSQL mỗi lần; ElastiCache for Redis cho độ trễ dưới một mili giây cho cả đọc và ghi.",
            en: "New positions go to Redis instead of hitting PostgreSQL for every update; ElastiCache for Redis gives sub-millisecond latency for reads and writes.",
          },
        },
        {
          flow: ["redis", "app"],
          back: true,
          badge: "GEORADIUS",
          caption: {
            vi: "Redis hỗ trợ sẵn kiểu dữ liệu và lệnh geospatial, nên tìm tài xế trong một bán kính mà không gây áp lực lên database quan hệ.",
            en: "Redis natively supports geospatial types and commands, so drivers within a radius are found without pressure on the relational database.",
          },
        },
        {
          mark: "redis",
          tone: "ok",
          badge: "TTL",
          caption: {
            vi: "Mỗi bản ghi có TTL và tự hết hạn nếu không được làm mới, giữ dữ liệu luôn mới và giảm bộ nhớ sử dụng.",
            en: "Each entry has a TTL and expires unless refreshed, keeping the data current and the memory footprint small.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Cache vị trí trong Redis: hiệu năng cao, mở rộng tốt, chi phí hợp lý.",
          en: "Caching locations in Redis: fast, scalable and cost-effective.",
        },
      },
    },
    {
      option: "a",
      hide: ["redis", "os", "standby"],
      steps: [
        {
          flow: ["app", "proxy", "pg"],
          times: 4,
          tone: "warn",
          badge: { vi: "ghi", en: "writes" },
          caption: {
            vi: "Mọi cập nhật vị trí vẫn phải ghi vào primary.",
            en: "Every location update still has to be written to the primary.",
          },
        },
        {
          flow: ["pg", "rr"],
          caption: {
            vi: "Thêm replica và RDS Proxy cải thiện thông lượng đọc và gom kết nối; replica chỉ nhận kết nối đọc.",
            en: "More replicas and RDS Proxy improve read throughput and pool connections; a replica accepts only read-only connections.",
          },
        },
        {
          mark: "pg",
          tone: "bad",
          caption: {
            vi: "Tải ghi, điểm nghẽn chính, không giảm; replica còn có độ trễ sao chép, không phù hợp với dữ liệu thời gian thực.",
            en: "The write load, the main bottleneck, does not drop; replicas also add replication lag, unsuitable for real-time data.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không giảm tải ghi.", en: "It does not reduce write load." },
      },
    },
    {
      option: "b",
      hide: ["redis", "proxy", "pg", "rr", "standby"],
      steps: [
        {
          flow: ["app", "os"],
          times: 4,
          tone: "warn",
          caption: {
            vi: "OpenSearch có truy vấn geospatial, nhưng là search and analytics engine, không phải kho dữ liệu giao dịch thời gian thực.",
            en: "OpenSearch has geospatial queries, but it is a search and analytics engine, not a real-time transactional data store.",
          },
        },
        {
          mark: "os",
          tone: "bad",
          caption: {
            vi: "Nó không được tối ưu cho cập nhật tần suất cao, độ trễ thấp; ghi liên tục có thể làm giảm hiệu năng cluster.",
            en: "It is not optimised for high-frequency, low-latency updates; constant writes can degrade cluster performance.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không hợp với ghi tần suất cao.", en: "Not built for rapid writes." },
      },
    },
    {
      option: "d",
      hide: ["redis", "proxy", "os", "rr"],
      steps: [
        {
          flow: ["pg", "standby"],
          badge: "Multi-AZ",
          caption: {
            vi: "Multi-AZ cải thiện tính sẵn sàng và failover, không cải thiện khả năng mở rộng hay hiệu năng.",
            en: "Multi-AZ improves availability and failover, not scalability or performance.",
          },
        },
        {
          flow: ["app", "pg"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "Mọi lượt đọc và ghi vẫn dồn vào primary.",
            en: "All reads and writes still land on the primary.",
          },
        },
        {
          stop: ["app", "standby"],
          caption: {
            vi: "Standby của Multi-AZ không phục vụ lưu lượng đọc, nên không thể dùng để chia tải đọc giờ cao điểm.",
            en: "A Multi-AZ standby cannot serve read traffic, so it cannot spread peak-hour reads.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Multi-AZ không tăng hiệu năng.", en: "Multi-AZ does not add performance." },
      },
    },
  ],
};

export default spec;
