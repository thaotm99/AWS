// Practice test 5, question 38: enhanced fan-out gives each Kinesis consumer its own read throughput per shard.
// Captions follow the question's explanation. Additional source:
// - Shared-throughput consumers: "Fixed at a total of 2 MB/sec per shard"; each enhanced fan-out consumer "receives its
//   own read throughput per shard, up to 2 MB/sec": https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const consumers: string[][] = [
  ["kds", "c1"],
  ["kds", "c2"],
  ["kds", "c3"],
];
const app = (n: number): Bilingual => ({ vi: `Ứng dụng ${n}`, en: `Consumer app ${n}` });
const sqsStep = (from: string): StepSpec[] => [
  {
    flow: ["dev", from],
    times: 2,
    tone: "warn",
    caption: {
      vi: "Dữ liệu IoT được gửi vào SQS queue thay cho data stream.",
      en: "IoT data is sent to an SQS queue instead of a data stream.",
    },
  },
  {
    flow: [
      [from, "c1"],
      [from, "c2"],
      [from, "c3"],
    ],
    tone: "bad",
    caption: {
      vi: "Nhiều ứng dụng cần tiêu thụ đồng thời cùng một luồng dữ liệu, nên cả SQS Standard lẫn SQS FIFO đều không phù hợp.",
      en: "Several applications consume the same stream concurrently, so neither SQS Standard nor SQS FIFO is the right fit.",
    },
  },
];
const sqsVerdict = {
  works: false,
  caption: {
    vi: "SQS không dành cho nhiều ứng dụng đọc cùng một stream.",
    en: "SQS is not for many apps reading one stream.",
  } as Bilingual,
};

const spec: IllustrationSpec = {
  questionId: 119517489,
  cols: 3.8,
  rows: 2.6,
  nodes: [
    { id: "dev", label: { vi: "Thiết bị IoT", en: "IoT devices" }, sub: "producers", kind: "actor", at: [0, 1] },
    { id: "kds", label: "Kinesis", sub: "Data Streams · shard", at: [1.3, 1] },
    { id: "sqs", label: "SQS Standard", sub: "queue", at: [1.3, 1] },
    { id: "fifo", label: "SQS FIFO", sub: "queue", at: [1.3, 1] },
    { id: "kdf", label: "Kinesis", sub: "Data Firehose", at: [1.3, 1] },
    { id: "c1", label: app(1), at: [2.8, 0.1] },
    { id: "c2", label: app(2), at: [2.8, 1] },
    { id: "c3", label: app(3), at: [2.8, 1.9] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["sqs", "fifo", "kdf"],
      steps: [
        {
          flow: ["dev", "kds"],
          times: 3,
          caption: {
            vi: "Kinesis Data Streams liên tục thu nhận dữ liệu từ các thiết bị IoT.",
            en: "Kinesis Data Streams continuously captures data from the IoT devices.",
          },
        },
        {
          flow: consumers,
          tone: "warn",
          badge: { vi: "2 MB/s dùng chung", en: "2 MB/s shared" },
          caption: {
            vi: "Mặc định, thông lượng đọc 2 MB/giây cho mỗi shard được chia cho tất cả ứng dụng consumer, nên dữ liệu tới consumer bị chậm.",
            en: "By default, the 2 MB/second per shard of read throughput is shared by all consumer applications, so delivery lags.",
          },
        },
        {
          flow: consumers,
          times: 2,
          badge: { vi: "2 MB/s mỗi app", en: "2 MB/s each" },
          caption: {
            vi: "Với enhanced fan-out, mỗi consumer đăng ký nhận đường đọc riêng 2 MB/giây cho mỗi shard, và thông lượng này tự mở rộng theo số shard.",
            en: "With enhanced fan-out, each registered consumer gets its own 2 MB/second pipe per shard, and this scales automatically with the number of shards.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Mỗi consumer có thông lượng đọc riêng.",
          en: "Each consumer gets its own read throughput.",
        },
      },
    },
    { option: "a", hide: ["kds", "fifo", "kdf"], steps: sqsStep("sqs"), verdict: sqsVerdict },
    { option: "b", hide: ["kds", "sqs", "kdf"], steps: sqsStep("fifo"), verdict: sqsVerdict },
    {
      option: "d",
      hide: ["kds", "sqs", "fifo"],
      steps: [
        {
          flow: ["dev", "kdf"],
          times: 2,
          caption: {
            vi: "Kinesis Data Firehose nạp dữ liệu streaming vào data lake, kho dữ liệu và công cụ phân tích.",
            en: "Kinesis Data Firehose loads streaming data into data lakes, data stores and analytics tools.",
          },
        },
        {
          stop: ["kdf", "c2"],
          caption: {
            vi: "Ứng dụng không thể tiêu thụ data stream từ Firehose; đó là việc của Kinesis Data Streams.",
            en: "Applications cannot consume data streams from Firehose; that is the job of Kinesis Data Streams.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Firehose không phục vụ ứng dụng consumer.", en: "Firehose does not serve consumer apps." },
      },
    },
  ],
};

export default spec;
