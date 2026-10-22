// Practice test 4, question 44: cut Aurora load and cost for a read-heavy REST API with API Gateway caching.
// Captions follow the question's explanation (stage cache with a TTL in seconds, default 300 and maximum 3600;
// read replicas add cost; Lambda has no native in-memory caching; an ALB adds no caching).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516297,
  cols: 4.6,
  rows: 2.3,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, sub: { vi: "chủ yếu đọc", en: "mostly reads" }, kind: "actor", at: [0, 1] },
    { id: "apigw", label: "API Gateway", sub: "stage cache", at: [1.2, 1] },
    { id: "alb", label: "Application LB", at: [1.2, 1] },
    { id: "lambda", label: "AWS Lambda", at: [2.4, 1] },
    { id: "aurora", label: "Amazon Aurora", sub: "writer", kind: "data", at: [3.6, 1] },
    { id: "replica", label: "Aurora Replica", kind: "data", at: [3.6, 0] },
  ],
  links: [["lambda", "aurora"]],
  scenarios: [
    {
      option: "b",
      hide: ["alb", "replica"],
      steps: [
        {
          flow: ["users", "apigw", "lambda", "aurora"],
          badge: "MISS",
          caption: {
            vi: "Request đầu tiên đi tới endpoint; API Gateway lưu response vào cache của stage trong thời gian TTL (tính bằng giây).",
            en: "The first request reaches the endpoint; API Gateway caches the response for the stage for the TTL period, in seconds.",
          },
        },
        {
          flow: ["users", "apigw"],
          times: 4,
          badge: "HIT",
          caption: {
            vi: "Các request sau được API Gateway trả lời từ cache thay vì gọi endpoint (TTL mặc định 300 giây, tối đa 3600 giây).",
            en: "Later requests are answered from the cache instead of calling the endpoint (default TTL 300 seconds, maximum 3600).",
          },
        },
        {
          mark: ["lambda", "aurora"],
          tone: "ok",
          caption: {
            vi: "Số lần gọi Lambda và Aurora giảm, latency của request cũng giảm; dữ liệu cũ một chút vẫn được chấp nhận.",
            en: "Fewer calls reach Lambda and Aurora and request latency drops; slightly stale data is acceptable here.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Bật caching ở API Gateway: giảm chi phí, tăng hiệu năng, thay đổi tối thiểu.",
          en: "API Gateway caching: lower cost, better performance, minimal changes.",
        },
      },
    },
    {
      option: "a",
      hide: ["alb"],
      steps: [
        {
          flow: [["users", "apigw", "lambda", "replica"]],
          times: 3,
          tone: "warn",
          caption: {
            vi: "Aurora Replica phục vụ lượt đọc và tăng khả năng mở rộng.",
            en: "Aurora Replicas serve reads and scale read operations.",
          },
        },
        {
          mark: "replica",
          tone: "bad",
          badge: "$$",
          caption: {
            vi: "Nhưng thêm Aurora Replica làm chi phí tăng mạnh, trái với mục tiêu giảm chi phí.",
            en: "But adding Aurora Replicas would greatly increase the cost, against the goal of reducing it.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Chi phí tăng.", en: "Costs go up." },
      },
    },
    {
      option: "c",
      hide: ["alb", "replica"],
      steps: [
        {
          flow: ["users", "apigw", "lambda"],
          times: 2,
          tone: "warn",
          caption: {
            vi: "Mỗi request vẫn được chuyển tới Lambda.",
            en: "Every request still reaches Lambda.",
          },
        },
        {
          mark: "lambda",
          tone: "bad",
          badge: { vi: "không tồn tại", en: "does not exist" },
          caption: {
            vi: "AWS Lambda không có khả năng in-memory caching tích hợp sẵn; đây là phương án gây nhiễu.",
            en: "AWS Lambda has no native in-memory caching capability; this option is a distractor.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Tính năng không tồn tại.", en: "No such feature." },
      },
    },
    {
      option: "d",
      hide: ["apigw", "replica"],
      steps: [
        {
          flow: ["users", "alb", "lambda", "aurora"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "ALB đánh giá listener rule và chọn target cho từng request.",
            en: "The ALB evaluates its listener rules and picks a target for every request.",
          },
        },
        {
          mark: "aurora",
          tone: "bad",
          caption: {
            vi: "Không có cơ chế caching, nên mọi request vẫn tới Aurora.",
            en: "There is no caching, so every request still reaches Aurora.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Cần cơ chế caching.", en: "A caching mechanism is needed." },
      },
    },
  ],
};

export default spec;
