// Practice test 6, question 31: Kinesis Data Streams in on-demand mode with a Lambda consumer for real-time clickstream.
// Captions follow the question's explanation. The explanation of the Firehose option mentions AWS Glue, which that
// option does not use, so its captions describe only Firehose, S3 and Athena. Additional sources:
// - On-demand mode needs no capacity planning; Kinesis Data Streams manages the shards:
//   https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html
// - Firehose buffers incoming data to a size or for a period of time before delivering it:
//   https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168971,
  cols: 4.4,
  rows: 1.5,
  nodes: [
    { id: "users", label: { vi: "Người xem", en: "Viewers" }, sub: "play, pause, search", kind: "actor", at: [0, 0.3] },
    { id: "kds", label: "Kinesis Data Streams", sub: "on-demand", at: [1.1, 0.3] },
    { id: "fh", label: "Data Firehose", at: [1.1, 0.3] },
    { id: "sns", label: "Amazon SNS", at: [1.1, 0.3] },
    { id: "kafka", label: "Kafka on EC2", sub: { vi: "tự quản lý", en: "self-managed" }, at: [1.1, 0.3] },
    { id: "lambda", label: "AWS Lambda", sub: "consumer", at: [2.3, 0.3] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [2.3, 0.3] },
    { id: "sqs", label: "SQS standard", kind: "data", at: [2.3, 0.3] },
    { id: "athena", label: "Amazon Athena", sub: { vi: "truy vấn định kỳ", en: "periodic queries" }, at: [3.4, 0.3] },
    { id: "glue", label: "AWS Glue", sub: { vi: "job theo lịch", en: "scheduled jobs" }, at: [3.4, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["fh", "sns", "kafka", "s3", "sqs", "athena", "glue"],
      steps: [
        {
          flow: ["users", "kds"],
          times: 3,
          caption: {
            vi: "Sự kiện tương tác được ghi vào một data stream ở on-demand mode.",
            en: "Engagement events are written to a data stream in on-demand mode.",
          },
        },
        {
          flow: ["users", "kds"],
          times: 6,
          badge: { vi: "đột biến", en: "spike" },
          caption: {
            vi: "Khi nội dung mới ra mắt, lưu lượng tăng vọt; on-demand mode tự quản lý shard để đáp ứng thông lượng, không cần lập kế hoạch dung lượng.",
            en: "A popular release brings a traffic spike; on-demand mode manages the shards itself to provide the throughput, with no capacity planning.",
          },
        },
        {
          flow: ["kds", "lambda"],
          times: 3,
          caption: {
            vi: "Lambda làm consumer, xử lý sự kiện theo thời gian thực theo kiểu serverless.",
            en: "Lambda acts as the consumer and processes the events in real time, serverless.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Thu nhận và xử lý thời gian thực, serverless, tự co giãn.",
          en: "Real-time ingestion and processing, serverless and self-scaling.",
        },
      },
    },
    {
      option: "b",
      hide: ["kds", "sns", "kafka", "lambda", "sqs", "glue"],
      steps: [
        {
          flow: ["users", "fh"],
          times: 3,
          caption: {
            vi: "Firehose nhận sự kiện và phân phối chúng tới S3.",
            en: "Firehose takes in the events and delivers them to S3.",
          },
        },
        {
          flow: ["fh", "s3"],
          badge: "buffer",
          tone: "warn",
          caption: {
            vi: "Firehose đệm dữ liệu tới một kích thước hoặc một khoảng thời gian trước khi giao, nên không xử lý sự kiện theo thời gian thực.",
            en: "Firehose buffers data to a size or for a period of time before delivering it, so events are not processed in real time.",
          },
        },
        {
          flow: ["s3", "athena"],
          tone: "warn",
          badge: { vi: "định kỳ", en: "periodic" },
          caption: {
            vi: "Athena chạy truy vấn theo lịch trên dữ liệu đã lưu: phân tích định kỳ, có độ trễ.",
            en: "Athena runs scheduled queries on stored data: periodic analysis, with delay.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không đáp ứng yêu cầu phân tích theo thời gian thực.",
          en: "It misses the real-time analysis requirement.",
        },
      },
    },
    {
      option: "c",
      hide: ["kds", "fh", "kafka", "lambda", "s3", "athena"],
      steps: [
        {
          flow: ["users", "sns", "sqs"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "SNS phát sự kiện tới một SQS standard queue; cách này không lý tưởng để thu nhận clickstream thông lượng cao theo thời gian thực.",
            en: "SNS fans events out to an SQS standard queue; this is not ideal for high-throughput, real-time clickstream ingestion.",
          },
        },
        {
          flow: ["sqs", "glue"],
          tone: "warn",
          badge: "batch",
          caption: {
            vi: "AWS Glue chủ yếu dành cho ETL theo lô; job chạy theo chu kỳ cố định nên không xử lý độ trễ thấp.",
            en: "AWS Glue is mainly for batch ETL; jobs run at fixed intervals, so there is no low-latency processing.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Xử lý theo lô, không phải thời gian thực.",
          en: "Batch processing, not real time.",
        },
      },
    },
    {
      option: "d",
      hide: ["kds", "fh", "sns", "lambda", "sqs", "glue"],
      steps: [
        {
          flow: ["users", "kafka"],
          times: 6,
          tone: "warn",
          badge: { vi: "đột biến", en: "spike" },
          caption: {
            vi: "Kafka tự quản lý trên EC2 phải được scale thủ công bằng script theo CPU: tốn công vận hành, khó theo kịp đợt tăng bất ngờ.",
            en: "Self-managed Kafka on EC2 is scaled manually with scripts based on CPU: heavy operations, and hard to keep up with sudden spikes.",
          },
        },
        {
          flow: ["kafka", "s3", "athena"],
          tone: "warn",
          badge: { vi: "định kỳ", en: "periodic" },
          caption: {
            vi: "Athena truy vấn log đã lưu trong S3, không phân tích luồng theo thời gian thực.",
            en: "Athena queries logs stored in S3; it does not analyze the stream in real time.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không serverless và không thời gian thực.",
          en: "Neither serverless nor real time.",
        },
      },
    },
  ],
};

export default spec;
