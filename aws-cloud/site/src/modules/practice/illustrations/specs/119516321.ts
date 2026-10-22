// Practice test 4, question 63: Amazon CloudFront routing to multiple origins, origin failover with an origin group,
// and field-level encryption. Captions follow the question's explanation. Additional source:
// - Cache behaviors apply settings, including the origin, per URL path pattern:
//   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516321,
  cols: 4.3,
  rows: 2.6,
  nodes: [
    { id: "viewer", label: { vi: "Người dùng", en: "Viewers" }, kind: "actor", at: [0, 1.1] },
    { id: "cf", label: "Amazon CloudFront", sub: "distribution", at: [1.4, 1.1] },
    { id: "kms", label: "AWS KMS", sub: { vi: "trong CloudFront?", en: "in CloudFront?" }, kind: "ghost", at: [1.4, 0] },
    { id: "s3", label: "Amazon S3", sub: { vi: "nội dung tĩnh", en: "static content" }, kind: "data", at: [3, 0.2] },
    { id: "lb", label: "Load balancer", sub: { vi: "nội dung động", en: "dynamic content" }, at: [3, 1.1] },
    { id: "app", label: "Web servers", sub: { vi: "giải mã field", en: "decrypt fields" }, at: [3, 1.1] },
    { id: "pri", label: "Primary origin", sub: "origin group", kind: "data", at: [3, 0.2] },
    { id: "sec", label: "Secondary origin", sub: "origin group", kind: "data", at: [3, 2] },
  ],
  links: [["viewer", "cf"]],
  scenarios: [
    {
      option: "d",
      hide: ["kms", "app", "pri", "sec"],
      steps: [
        {
          flow: ["viewer", "cf", "s3"],
          badge: { vi: "tĩnh", en: "static" },
          caption: {
            vi: "Một distribution phục vụ nhiều loại request từ nhiều origin: nội dung tĩnh đi tới S3 bucket…",
            en: "One distribution serves different types of requests from multiple origins: static content comes from an S3 bucket…",
          },
        },
        {
          flow: ["viewer", "cf", "lb"],
          badge: { vi: "động", en: "dynamic" },
          caption: {
            vi: "…còn nội dung động đi tới load balancer. Mỗi cache behavior gắn một path pattern với origin tương ứng.",
            en: "…and dynamic content from a load balancer. Each cache behavior maps a path pattern to its origin.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Định tuyến tới nhiều origin theo loại nội dung.", en: "Routing to multiple origins by content type." },
      },
    },
    {
      option: "e",
      hide: ["kms", "s3", "lb", "app"],
      steps: [
        {
          flow: ["viewer", "cf", "pri"],
          caption: {
            vi: "Cache behavior dùng một origin group gồm primary và secondary origin; request đi tới primary.",
            en: "The cache behavior uses an origin group with a primary and a secondary origin; requests go to the primary.",
          },
        },
        {
          mark: "pri",
          tone: "bad",
          badge: "error",
          caption: {
            vi: "Primary không khả dụng hoặc trả về HTTP status code được cấu hình là lỗi.",
            en: "The primary becomes unavailable or returns specific HTTP status codes that indicate a failure.",
          },
        },
        {
          flow: ["cf", "sec"],
          badge: "failover",
          caption: {
            vi: "CloudFront tự động chuyển sang secondary origin.",
            en: "CloudFront automatically switches to the secondary origin.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Origin failover cho tính sẵn sàng cao.", en: "Origin failover for high availability." },
      },
    },
    {
      option: "f",
      hide: ["kms", "s3", "lb", "pri", "sec"],
      steps: [
        {
          flow: ["viewer", "cf"],
          badge: "POST",
          caption: {
            vi: "Người dùng gửi thông tin nhạy cảm trong POST request.",
            en: "Users submit sensitive information in a POST request.",
          },
        },
        {
          mark: "cf",
          tone: "ok",
          badge: { vi: "mã hoá field", en: "fields encrypted" },
          caption: {
            vi: "CloudFront mã hoá các field đã chỉ định (tối đa 10) bằng public key ngay tại edge, gần người dùng.",
            en: "CloudFront encrypts the specified fields (up to 10) with the public key at the edge, close to the user.",
          },
        },
        {
          flow: ["cf", "app"],
          caption: {
            vi: "Dữ liệu vẫn được mã hoá xuyên suốt stack ứng dụng; chỉ ứng dụng có thông tin xác thực mới giải mã được.",
            en: "The data stays encrypted throughout the application stack; only applications with the credentials can decrypt it.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Field-level encryption bảo vệ dữ liệu nhạy cảm.", en: "Field-level encryption protects sensitive data." },
      },
    },
    {
      option: "a",
      hide: ["s3", "lb", "pri", "sec"],
      steps: [
        {
          flow: ["viewer", "cf", "app"],
          caption: {
            vi: "Người dùng gửi dữ liệu nhạy cảm qua CloudFront.",
            en: "Users send sensitive data through CloudFront.",
          },
        },
        {
          stop: ["cf", "kms"],
          caption: {
            vi: "Đây là phương án gây nhiễu: để bảo vệ dữ liệu nhạy cảm cho nội dung cụ thể, CloudFront dùng field-level encryption.",
            en: "This option is a distractor: to protect sensitive data for specific content, CloudFront uses field-level encryption.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Tính năng đúng là field-level encryption.", en: "The right feature is field-level encryption." },
      },
    },
    {
      option: "b",
      hide: ["kms", "s3", "lb", "app"],
      steps: [
        {
          flow: ["viewer", "cf"],
          tone: "warn",
          badge: "geo",
          caption: {
            vi: "Geo restriction (geo blocking) ngăn người dùng ở các vị trí địa lý cụ thể truy cập nội dung.",
            en: "Geo restriction (geo blocking) prevents users in specific geographic locations from accessing content.",
          },
        },
        {
          mark: "pri",
          tone: "bad",
          caption: {
            vi: "Nó không được dùng để cấu hình tính sẵn sàng cao hay failover; việc đó cần origin group.",
            en: "It is not used to configure high availability or failover; that needs an origin group.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Geo restriction không phải failover.", en: "Geo restriction is not failover." },
      },
    },
    {
      option: "c",
      hide: ["kms", "app", "pri", "sec"],
      steps: [
        {
          mark: "cf",
          tone: "warn",
          badge: "price class",
          caption: {
            vi: "Price class nhóm các khu vực edge location theo chi phí, ví dụ loại trừ các khu vực đắt nhất.",
            en: "Price classes group edge location regions by cost, for example excluding the most expensive regions.",
          },
        },
        {
          flow: [["cf", "s3"], ["cf", "lb"]],
          caption: {
            vi: "CloudFront chọn origin theo loại nội dung, không theo price class.",
            en: "CloudFront routes to origins by content type, not by price class.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Price class không quyết định origin.", en: "Price class does not choose the origin." },
      },
    },
  ],
};

export default spec;
