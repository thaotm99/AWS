// Practice test 4, question 22: clickstream analytics with Kinesis Data Streams → Kinesis Data Analytics → Firehose → S3.
// Captions follow the question's explanation (QuickSight cannot use Kinesis Data Streams as a source, Athena cannot
// analyse in real time, a third-party library on EC2 is not the best fit).
import type { IllustrationSpec, StepSpec } from "../types";

const capture: StepSpec = {
  flow: ["web", "kds"],
  times: 3,
  caption: {
    vi: "Kinesis Data Streams thu nhận dữ liệu click từ website, kể cả khi lưu lượng tăng đột biến.",
    en: "Kinesis Data Streams captures the click data from the website, including during traffic spikes.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516279,
  cols: 5,
  rows: 2.2,
  nodes: [
    { id: "web", label: "Website", sub: "clickstream", kind: "actor", at: [0, 0.3] },
    { id: "kds", label: "Kinesis Data Streams", at: [1, 0.3] },
    { id: "sqs", label: "Amazon SQS", sub: "queue", at: [1, 0.3] },
    { id: "kda", label: "Data Analytics", sub: "Amazon Kinesis", at: [2, 0.3] },
    { id: "qs", label: "Amazon QuickSight", kind: "ghost", at: [2, 0.3] },
    { id: "ec2", label: "EC2 fleet", sub: "Auto Scaling", at: [2, 0.3] },
    { id: "fh", label: "Data Firehose", sub: "Amazon Kinesis", at: [3, 0.3] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [4, 0.3] },
    { id: "athena", label: "Amazon Athena", sub: "SQL on S3", at: [4, 1.5] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["sqs", "qs", "ec2", "athena"],
      steps: [
        capture,
        {
          flow: ["kds", "kda"],
          times: 2,
          badge: "real time",
          caption: {
            vi: "Kinesis Data Analytics đọc stream, biến đổi và phân tích dữ liệu theo thời gian thực, tự mở rộng theo khối lượng dữ liệu đến.",
            en: "Kinesis Data Analytics reads the stream and transforms and analyses it in real time, scaling automatically with the incoming volume.",
          },
        },
        {
          flow: ["kda", "fh", "s3"],
          caption: {
            vi: "Kết quả phân tích được đưa vào Kinesis Data Firehose để lưu trữ lâu dài trên Amazon S3 mà không mất dữ liệu.",
            en: "The analysed feed goes to Kinesis Data Firehose, which persists it to Amazon S3 without data loss.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Kiến trúc tách rời, phân tích theo thời gian thực và không mất dữ liệu.",
          en: "Decoupled, analysed in real time, with no data loss.",
        },
      },
    },
    {
      option: "a",
      hide: ["sqs", "kda", "ec2", "athena"],
      steps: [
        capture,
        {
          stop: ["kds", "qs"],
          caption: {
            vi: "Amazon QuickSight không thể dùng Kinesis Data Streams làm nguồn dữ liệu và không phân tích dữ liệu streaming theo thời gian thực.",
            en: "Amazon QuickSight cannot use Kinesis Data Streams as a source and cannot analyse streaming data in real time.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "QuickSight không đọc được stream.", en: "QuickSight cannot read the stream." },
      },
    },
    {
      option: "c",
      hide: ["sqs", "kda", "qs", "ec2"],
      steps: [
        capture,
        {
          flow: ["kds", "fh", "s3"],
          caption: {
            vi: "Firehose ghi dữ liệu vào Amazon S3.",
            en: "Firehose delivers the data to Amazon S3.",
          },
        },
        {
          flow: ["athena", "s3"],
          tone: "warn",
          badge: "SQL",
          caption: {
            vi: "Athena truy vấn dữ liệu đã nằm trên S3 bằng SQL chuẩn.",
            en: "Athena queries data already in S3 with standard SQL.",
          },
        },
        {
          mark: "athena",
          tone: "bad",
          badge: { vi: "không real-time", en: "not real time" },
          caption: {
            vi: "Athena không phân tích dữ liệu theo thời gian thực.",
            en: "Athena cannot analyse the data in real time.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không phân tích theo thời gian thực.", en: "No real-time analysis." },
      },
    },
    {
      option: "d",
      hide: ["kds", "kda", "qs", "fh", "s3", "athena"],
      steps: [
        {
          flow: ["web", "sqs", "ec2"],
          times: 2,
          tone: "warn",
          caption: {
            vi: "SQS cùng các EC2 instance trong Auto Scaling group (scale theo số message chờ) giúp tách rời kiến trúc.",
            en: "SQS with EC2 instances in an Auto Scaling group, scaled on the number of pending messages, does decouple the architecture.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: { vi: "thư viện bên thứ ba", en: "third-party library" },
          caption: {
            vi: "Nhưng phân tích thời gian thực bằng thư viện bên thứ ba trên EC2 không phải giải pháp phù hợp nhất; họ dịch vụ Kinesis được thiết kế cho thu nhận, phân tích và chuyển giao dữ liệu streaming.",
            en: "But real-time analytics with a third-party library on EC2 is not the best fit; the Kinesis family is built for streaming ingestion, real-time analysis and delivery.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không phải lựa chọn phù hợp nhất.", en: "Not the best fit." },
      },
    },
  ],
};

export default spec;
