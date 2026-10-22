// Practice test 1, question 13: SQS FIFO queue between the web tier and the processing tier (exactly-once).
// Captions follow the question's explanation. Additional sources:
// - "Unlike standard queues, FIFO queues don't introduce duplicate messages."
//   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
// - Standard queues: at-least-once delivery, a message may be processed more than once:
//   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222761,
  cols: 4,
  rows: 1.4,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, sub: { vi: "gửi biểu mẫu", en: "submit forms" }, kind: "actor", at: [0, 0.3] },
    { id: "web", label: { vi: "Tầng web", en: "Web tier" }, at: [1, 0.3] },
    { id: "fifo", label: "SQS FIFO queue", kind: "data", at: [2, 0.3] },
    { id: "std", label: "SQS standard queue", kind: "data", at: [2, 0.3] },
    { id: "eb", label: "EventBridge", sub: "event bus", at: [2, 0.3] },
    { id: "apigw", label: "API Gateway", at: [1, 0.3] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "xử lý đồng bộ", en: "synchronous" }, at: [2, 0.3] },
    { id: "proc", label: { vi: "Tầng xử lý", en: "Processing tier" }, at: [3, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["std", "eb", "apigw", "lambda"],
      steps: [
        {
          flow: ["user", "web", "fifo"],
          times: 3,
          caption: {
            vi: "Tầng web gửi mỗi biểu mẫu thành một message vào SQS FIFO queue. Queue đệm message khi lưu lượng tăng cao và tách rời (decouple) hai tầng.",
            en: "The web tier sends each form as a message to an SQS FIFO queue. The queue buffers messages during traffic peaks and decouples the two tiers.",
          },
        },
        {
          flow: ["fifo", "proc"],
          times: 3,
          badge: "1×",
          caption: {
            vi: "FIFO queue không tạo message trùng lặp và bảo toàn thứ tự: mỗi biểu mẫu được chuyển giao và xử lý đúng một lần (exactly-once).",
            en: "A FIFO queue does not introduce duplicate messages and preserves order: each form is delivered and processed exactly once.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Hàng đợi bền vững giữa hai tầng, xử lý đúng một lần.",
          en: "A durable buffer between the tiers with exactly-once processing.",
        },
      },
    },
    {
      option: "b",
      hide: ["fifo", "eb", "apigw", "lambda"],
      steps: [
        {
          flow: ["user", "web", "std"],
          times: 3,
          caption: {
            vi: "Standard queue cũng đệm message và tách rời hai tầng.",
            en: "A standard queue also buffers messages and decouples the tiers.",
          },
        },
        {
          flow: ["std", "proc"],
          tone: "warn",
          times: 4,
          badge: "×2",
          caption: {
            vi: "Standard queue cung cấp chuyển giao ít nhất một lần (at-least-once) và sắp xếp thứ tự theo khả năng tốt nhất (best-effort): một message có thể được chuyển giao nhiều hơn một lần hoặc sai thứ tự.",
            en: "A standard queue provides at-least-once delivery and best-effort ordering: a message can be delivered more than once or out of order.",
          },
        },
        {
          mark: "proc",
          tone: "bad",
          caption: {
            vi: "Một biểu mẫu có thể bị xử lý hai lần, vi phạm yêu cầu mỗi request được xử lý đúng một lần.",
            en: "A form can be processed twice, which breaks the exactly-once requirement.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không đảm bảo xử lý đúng một lần.",
          en: "Exactly-once processing is not guaranteed.",
        },
      },
    },
    {
      option: "c",
      hide: ["fifo", "std", "apigw", "lambda"],
      steps: [
        {
          flow: ["user", "web", "eb"],
          times: 3,
          caption: {
            vi: "Tầng web gửi sự kiện tới event bus của EventBridge, tạo kiến trúc liên kết lỏng (loosely coupled).",
            en: "The web tier sends events to an EventBridge event bus, giving a loosely coupled architecture.",
          },
        },
        {
          flow: ["eb", "proc"],
          tone: "warn",
          times: 4,
          badge: "×2",
          caption: {
            vi: "EventBridge cung cấp ngữ nghĩa chuyển giao ít nhất một lần: trong một số kịch bản lỗi, sự kiện có thể được chuyển giao nhiều hơn một lần, và không có cơ chế sắp xếp thứ tự tích hợp sẵn.",
            en: "EventBridge provides at-least-once delivery: in some failure scenarios an event can be delivered more than once, and there is no built-in ordering.",
          },
        },
        {
          mark: "proc",
          tone: "bad",
          caption: {
            vi: "Biểu mẫu có thể bị xử lý trùng lặp, không đáp ứng yêu cầu xử lý đúng một lần.",
            en: "Forms can be processed twice, which fails the exactly-once requirement.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không đảm bảo chuyển giao đúng một lần.",
          en: "Exactly-once delivery is not guaranteed.",
        },
      },
    },
    {
      option: "d",
      hide: ["web", "fifo", "std", "eb", "proc"],
      steps: [
        {
          flow: ["user", "apigw", "lambda"],
          tone: "warn",
          times: 3,
          caption: {
            vi: "API Gateway chuyển từng biểu mẫu tới Lambda để xử lý đồng bộ theo thời gian thực.",
            en: "API Gateway passes each form to Lambda for synchronous, real-time processing.",
          },
        },
        {
          mark: "lambda",
          tone: "bad",
          badge: { vi: "không có hàng đợi", en: "no queue" },
          caption: {
            vi: "Giữa hai tầng không có hàng đợi bền vững để tách rời và đệm lưu lượng, cũng không có cơ chế nguyên bản đảm bảo xử lý đúng một lần cho workload bất đồng bộ.",
            en: "There is no durable queue to decouple the tiers and buffer traffic, and no native guarantee of exactly-once processing for asynchronous workloads.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Thiếu tách rời giữa các tầng và đảm bảo xử lý đúng một lần.",
          en: "No decoupling between the tiers and no exactly-once guarantee.",
        },
      },
    },
  ],
};

export default spec;
