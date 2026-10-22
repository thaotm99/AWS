// Practice test 3, question 42: serve static game assets from Amazon S3 through Amazon CloudFront, with no
// infrastructure to provision. Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 121078969,
  cols: 4,
  rows: 2.8,
  nodes: [
    { id: "players", label: { vi: "Người chơi", en: "Players" }, sub: { vi: "tải tài nguyên tĩnh", en: "download static assets" }, kind: "actor", at: [0, 1] },
    { id: "cf", label: "Amazon CloudFront", sub: "edge location", at: [1.4, 1] },
    { id: "lambda", label: "AWS Lambda", at: [1.4, 1] },
    { id: "s3", label: "Amazon S3", sub: { vi: "tài nguyên tĩnh", en: "static assets" }, kind: "data", at: [2.9, 1] },
    { id: "ddb", label: "Amazon DynamoDB", kind: "data", at: [2.9, 1] },
    { id: "cache", label: "ElastiCache", kind: "data", at: [2.9, 0.1] },
    { id: "rds", label: "Amazon RDS", kind: "data", at: [2.9, 1.9] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["lambda", "ddb", "cache", "rds"],
      steps: [
        {
          flow: ["players", "cf", "s3"],
          badge: "miss",
          caption: {
            vi: "Request được chuyển tới Edge Location gần nhất. Nếu file chưa có trong cache, CloudFront lấy nó từ origin là S3 bucket; S3 tự mở rộng và không có máy chủ phải vá.",
            en: "The request goes to a nearby edge location. If the file is not cached yet, CloudFront retrieves it from the S3 bucket origin; S3 scales automatically with no servers to patch.",
          },
        },
        {
          flow: ["s3", "cf", "players"],
          back: true,
          caption: {
            vi: "File được trả về và lưu cache tại edge.",
            en: "The file is returned and cached at the edge.",
          },
        },
        {
          flow: ["cf", "players"],
          back: true,
          times: 3,
          badge: "HIT",
          caption: {
            vi: "Các request tiếp theo được phục vụ ngay từ edge, giảm tải cho S3 bucket; truyền dữ liệu qua CloudFront thường rẻ hơn phục vụ trực tiếp từ S3.",
            en: "Later requests are served from the edge right away, reducing load on the S3 bucket; data transfer out through CloudFront is often cheaper than serving directly from S3.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Nhanh, rẻ, không cần cấp phát hạ tầng.", en: "Fast, cheap, nothing to provision." } },
    },
    {
      option: "a",
      hide: ["cf", "s3", "ddb", "cache"],
      steps: [
        {
          flow: ["players", "lambda", "rds"],
          tone: "warn",
          caption: {
            vi: "Mỗi lượt tải tài nguyên tĩnh đi qua Lambda và cơ sở dữ liệu RDS.",
            en: "Every static asset download goes through Lambda and an RDS database.",
          },
        },
        {
          mark: "rds",
          tone: "bad",
          caption: {
            vi: "RDS kéo theo chi phí vận hành của một hệ quản trị cơ sở dữ liệu, trong khi bài toán có thể giải bằng Amazon S3.",
            en: "RDS brings the overhead of a database management system, while the use case can be solved with Amazon S3.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Thêm cơ sở dữ liệu không cần thiết.", en: "An unnecessary database." } },
    },
    {
      option: "b",
      hide: ["lambda", "s3", "cache", "rds"],
      steps: [
        {
          flow: ["players", "cf", "ddb"],
          tone: "warn",
          caption: {
            vi: "CloudFront đứng trước DynamoDB, một cơ sở dữ liệu key-value và document có độ trễ mili giây một chữ số.",
            en: "CloudFront sits in front of DynamoDB, a key-value and document database with single-digit millisecond performance.",
          },
        },
        {
          mark: "ddb",
          tone: "bad",
          caption: {
            vi: "DynamoDB là quá mức cần thiết cho tài nguyên tĩnh và sẽ là giải pháp rất tốn kém.",
            en: "DynamoDB is overkill for static assets and would be a very costly solution.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Tốn kém không cần thiết.", en: "Needlessly costly." } },
    },
    {
      option: "c",
      hide: ["cf", "s3", "ddb"],
      steps: [
        {
          flow: [
            ["players", "lambda", "cache"],
            ["players", "lambda", "rds"],
          ],
          tone: "warn",
          caption: {
            vi: "Lambda đọc tài nguyên qua ElastiCache và Amazon RDS.",
            en: "Lambda reads the assets through ElastiCache and Amazon RDS.",
          },
        },
        {
          mark: "rds",
          tone: "bad",
          caption: {
            vi: "Không cần RDS cho các trang tĩnh và file tải về; Amazon S3 phù hợp hơn nhiều.",
            en: "RDS is not needed for static pages and downloads; Amazon S3 is much better suited.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp và không cần thiết.", en: "Complex and unnecessary." } },
    },
  ],
};

export default spec;
