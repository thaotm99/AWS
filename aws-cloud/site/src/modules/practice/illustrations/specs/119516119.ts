// Practice test 2, question 47: an SQS queue buffers sensor bursts in front of the EC2 backend.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516119,
  cols: 3.8,
  rows: 2.8,
  nodes: [
    { id: "sensors", label: { vi: "Cảm biến", en: "Motion sensors" }, sub: { vi: "hàng nghìn con vật", en: "thousands of animals" }, kind: "actor", at: [0, 0.7] },
    { id: "sqs", label: "Amazon SQS", sub: { vi: "bộ đệm", en: "buffer" }, at: [1.4, 0.7] },
    { id: "ecs", label: "Amazon ECS", sub: { vi: "queue tự viết", en: "custom internal queue" }, at: [1.4, 0.7] },
    { id: "fh", label: "Data Firehose", at: [1.4, 0.7] },
    { id: "iot", label: "IoT Core rule", at: [1.4, 0.7] },
    { id: "ec2", label: "EC2 backend", sub: { vi: "nhiều AZ", en: "multi-AZ" }, at: [2.8, 0.7] },
    { id: "s3", label: "Amazon S3", sub: "files", kind: "data", at: [2.8, 1.8] },
    { id: "sns", label: "Amazon SNS", sub: "topic", at: [2.8, 1.8] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["ecs", "fh", "iot", "s3", "sns"],
      steps: [
        {
          flow: ["sensors", "sqs"],
          times: 5,
          badge: { vi: "đột biến", en: "surge" },
          caption: {
            vi: "Dữ liệu vị trí được lưu vào SQS queue, lớp đệm giữa tiếp nhận và xử lý; SQS tự mở rộng theo lượng message lớn.",
            en: "Location data is stored in an SQS queue, a buffer between ingestion and processing; SQS scales automatically with large message volumes.",
          },
        },
        {
          flow: ["sqs", "ec2"],
          times: 2,
          badge: { vi: "theo nhịp riêng", en: "own pace" },
          caption: {
            vi: "Ứng dụng backend poll queue và xử lý theo nhịp của mình; SQS giao ít nhất một lần, có retry và dead-letter queue, nên đợt tăng đột biến không còn làm mất bản ghi.",
            en: "The backend polls the queue and processes at its own pace; SQS gives at-least-once delivery with retries and dead-letter queues, so surges no longer drop records.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Đệm được đột biến, không phải quản lý máy chủ.", en: "Bursts buffered, no servers to manage." } },
    },
    {
      option: "b",
      hide: ["sqs", "fh", "iot", "s3", "sns", "ec2"],
      steps: [
        { flow: ["sensors", "ecs"], times: 5, tone: "warn", caption: { vi: "Cảm biến gửi thẳng tới endpoint container có queue tự viết trong tầng ứng dụng.", en: "Sensors send directly to container endpoints with a queue built into the application layer." } },
        {
          mark: "ecs",
          tone: "bad",
          badge: { vi: "tự lo độ bền", en: "DIY durability" },
          caption: {
            vi: "Queue tự viết phải tự lo khả năng mở rộng, độ bền và retry, và hàng nghìn cảm biến gửi trực tiếp có thể làm quá tải endpoint khi lưu lượng tăng vọt.",
            en: "The custom queue must handle scaling, durability and retries itself, and thousands of sensors sending directly can overload the endpoints during bursts.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp và kém chịu tải đột biến.", en: "Complex and fragile under bursts." } },
    },
    {
      option: "c",
      hide: ["sqs", "ecs", "iot", "sns"],
      steps: [
        { flow: ["sensors", "fh", "s3"], times: 3, tone: "warn", caption: { vi: "Data Firehose gom dữ liệu và ghi thành file vào S3.", en: "Data Firehose collects the data and delivers it as files to S3." } },
        {
          flow: ["s3", "ec2"],
          tone: "warn",
          badge: { vi: "quét định kỳ", en: "periodic scans" },
          caption: {
            vi: "Ứng dụng phải quét file định kỳ: thêm độ trễ và độ phức tạp, không xử lý từng sự kiện ngay, và không có retry cho từng sự kiện nếu không thêm dịch vụ như Lambda.",
            en: "The application scans files periodically: added latency and complexity, no immediate event-by-event processing, and no per-event retry without extra services such as Lambda.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không hợp xử lý theo từng sự kiện.", en: "Not built for per-event processing." } },
    },
    {
      option: "d",
      hide: ["sqs", "ecs", "fh", "s3"],
      steps: [
        { flow: ["sensors", "iot", "sns"], tone: "warn", caption: { vi: "IoT Core rule chuyển cập nhật vị trí tới SNS topic.", en: "An IoT Core rule routes location updates to an SNS topic." } },
        {
          stop: ["ec2", "sns"],
          badge: { vi: "không poll được", en: "cannot poll" },
          caption: {
            vi: "Ứng dụng không thể poll SNS topic: SNS đẩy message tới subscriber, không làm bộ đệm, nên khi subscriber quá tải hay không sẵn sàng thì dễ mất message.",
            en: "Applications cannot poll an SNS topic: SNS pushes to subscribers and does not buffer, so messages are likely lost when the subscriber is overwhelmed or unavailable.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "SNS không phải queue.", en: "SNS is not a queue." } },
    },
  ],
};

export default spec;
