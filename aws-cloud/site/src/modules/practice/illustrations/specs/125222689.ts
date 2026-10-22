// Practice test 1, question 1: cache DynamoDB reads with DAX and S3 static content with CloudFront.
// Captions follow the question's explanation. Additional sources:
// - DAX cache hit / cache miss: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html
//   ("If DAX does not have the item available (a cache miss), DAX passes the request through to DynamoDB.")
// - ElastiCache sits between the application and the data store, and the application populates it
//   (lazy loading): https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222689,
  cols: 5,
  rows: 3,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1] },
    { id: "cf", label: "Amazon CloudFront", sub: "edge location", at: [1, 0] },
    { id: "mc", label: "ElastiCache Memcached", kind: "ghost", at: [1, 0] },
    { id: "s3", label: "Amazon S3", sub: { vi: "nội dung tĩnh", en: "static content" }, kind: "data", at: [2.5, 0] },
    { id: "alb", label: "ALB", sub: "Application Load Balancer", at: [1, 2] },
    { id: "api", label: "REST API", sub: "Auto Scaling group", at: [2, 2] },
    { id: "dax", label: "DAX", sub: "DynamoDB Accelerator", at: [3, 2] },
    { id: "redis", label: "ElastiCache Redis", at: [3, 2] },
    { id: "ddb", label: "Amazon DynamoDB", sub: { vi: "dữ liệu người dùng", en: "user data" }, kind: "data", at: [4, 2] },
  ],
  links: [["mc", "s3"]],
  scenarios: [
    {
      option: "a",
      hide: ["mc", "redis"],
      steps: [
        {
          flow: ["user", "cf", "s3"],
          tone: "warn",
          badge: "MISS",
          caption: {
            vi: "Yêu cầu một ảnh tĩnh được định tuyến tới edge location gần nhất. Tệp chưa có trong cache, nên CloudFront lấy tệp từ origin là S3 bucket.",
            en: "A request for a static image is routed to the nearest edge location. The file is not cached yet, so CloudFront retrieves it from the origin, the S3 bucket.",
          },
        },
        {
          flow: ["user", "cf"],
          badge: "HIT",
          caption: {
            vi: "Các yêu cầu tiếp theo cho cùng tệp được CloudFront trả về từ bản sao đã cache tại edge location, với latency thấp.",
            en: "Later requests for the same file are answered from the cached copy at the edge location, with low latency.",
          },
        },
        {
          flow: ["user", "alb", "api", "dax"],
          badge: "HIT",
          caption: {
            vi: "Yêu cầu đọc dữ liệu đi qua ALB tới REST API. Ứng dụng dùng DAX client SDK nên các lệnh gọi DynamoDB API đi tới DAX cluster; 90% lượt đọc là dữ liệu dùng chung, được DAX trả về từ cache trong bộ nhớ.",
            en: "Data reads go through the ALB to the REST API. With the DAX client SDK, its DynamoDB API calls go to the DAX cluster; 90% of reads are for commonly accessed data, which DAX returns from its in-memory cache.",
          },
        },
        {
          flow: ["dax", "ddb"],
          tone: "warn",
          badge: "MISS",
          caption: {
            vi: "Khi item chưa có trong cache (cache miss), DAX chuyển yêu cầu tới DynamoDB rồi trả kết quả cho ứng dụng. DAX tương thích API với DynamoDB, nên mã ứng dụng không phải thay đổi chức năng.",
            en: "When an item is not in the cache (a cache miss), DAX passes the request through to DynamoDB and returns the result. DAX is API-compatible with DynamoDB, so the application code needs no functional changes.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Mỗi tầng dữ liệu có cache chuyên dụng: DAX cho lượt đọc DynamoDB, CloudFront cho nội dung tĩnh trên S3.",
          en: "Each data tier gets a purpose-built cache: DAX for DynamoDB reads, CloudFront for static content on S3.",
        },
      },
    },
    {
      option: "b",
      hide: ["mc", "dax"],
      steps: [
        {
          flow: ["user", "cf"],
          badge: "HIT",
          caption: {
            vi: "Phần nội dung tĩnh giống phương án đúng: CloudFront cache tệp từ S3 tại edge location gần người dùng.",
            en: "Static content works as in the correct option: CloudFront caches files from S3 at the edge location near the user.",
          },
        },
        {
          flow: ["user", "alb", "api", "redis"],
          tone: "warn",
          caption: {
            vi: "ElastiCache for Redis nằm giữa ứng dụng và DynamoDB nhưng không tương thích DynamoDB API: ứng dụng phải tự đọc cache trước và tự nạp dữ liệu vào cache.",
            en: "ElastiCache for Redis sits between the application and DynamoDB but is not DynamoDB API-compatible: the application itself must check the cache and load data into it.",
          },
        },
        {
          flow: ["redis", "ddb"],
          tone: "warn",
          caption: {
            vi: "Có thể tích hợp Redis với DynamoDB, nhưng việc này phức tạp hơn nhiều so với DAX, vốn được thiết kế để cache lượt đọc DynamoDB một cách nguyên bản.",
            en: "Redis can be integrated with DynamoDB, but it is much more involved than DAX, which natively caches DynamoDB reads.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Cache được dữ liệu, nhưng không phải giải pháp hiệu quả NHẤT cho DynamoDB; DAX phù hợp hơn hẳn.",
          en: "It caches the data, but it is not the MOST efficient solution for DynamoDB; DAX is a much better fit.",
        },
      },
    },
    {
      option: "c",
      hide: ["cf", "redis"],
      steps: [
        {
          stop: ["user", "mc"],
          caption: {
            vi: "ElastiCache Memcached là kho key-value trong bộ nhớ dùng để giảm latency cho cơ sở dữ liệu; nó không thể dùng làm cache để phân phối nội dung tĩnh từ Amazon S3 tới người dùng.",
            en: "ElastiCache Memcached is an in-memory key-value store that cuts database latency; it cannot be used as a cache to serve static content from Amazon S3 to users.",
          },
        },
        {
          flow: ["user", "alb", "api", "dax"],
          badge: "HIT",
          caption: {
            vi: "Phần dữ liệu DynamoDB dùng DAX như phương án đúng, nhưng tầng nội dung tĩnh vẫn không có cache phù hợp.",
            en: "DynamoDB reads use DAX as in the correct option, but static content still has no suitable cache.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Memcached không phân phối được nội dung tĩnh từ S3.",
          en: "Memcached cannot serve static content from S3.",
        },
      },
    },
    {
      option: "d",
      hide: ["cf", "dax"],
      steps: [
        {
          stop: ["user", "mc"],
          caption: {
            vi: "ElastiCache Memcached không thể dùng làm cache để phân phối nội dung tĩnh từ Amazon S3.",
            en: "ElastiCache Memcached cannot be used as a cache to serve static content from Amazon S3.",
          },
        },
        {
          flow: ["user", "alb", "api", "redis", "ddb"],
          tone: "warn",
          caption: {
            vi: "Với DynamoDB, Redis đòi hỏi ứng dụng tự tích hợp, phức tạp hơn nhiều so với DAX.",
            en: "For DynamoDB, Redis needs the application to integrate it, which is much more involved than DAX.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Cả hai lựa chọn cache đều không phù hợp với tầng dữ liệu tương ứng.",
          en: "Neither cache fits the data tier it is placed in front of.",
        },
      },
    },
  ],
};

export default spec;
