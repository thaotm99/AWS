// Practice test 5, question 35: Kinesis Data Streams with two consumers: Lambda cleanses into DynamoDB, internal apps
// read the raw stream. Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const apps = { vi: "Ứng dụng nội bộ", en: "Internal apps" };

const spec: IllustrationSpec = {
  questionId: 119517483,
  cols: 4.4,
  rows: 2.6,
  nodes: [
    { id: "web", label: "Web app", sub: { vi: "giao dịch", en: "transactions" }, kind: "actor", at: [0, 1] },
    { id: "kds", label: "Kinesis", sub: "Data Streams", at: [1.2, 1] },
    { id: "kdf", label: "Kinesis", sub: "Data Firehose", at: [1.2, 1] },
    { id: "s3", label: "Amazon S3", sub: { vi: "file phẳng (batch)", en: "flat files (batch)" }, kind: "data", at: [1.2, 1] },
    { id: "raw", label: "DynamoDB", sub: { vi: "giao dịch thô", en: "raw transactions" }, kind: "data", at: [1.2, 1] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "xoá dữ liệu nhạy cảm", en: "removes sensitive data" }, at: [2.4, 0.15] },
    { id: "ddb", label: "DynamoDB", sub: { vi: "đã làm sạch", en: "cleansed" }, kind: "data", at: [3.6, 0.15] },
    { id: "apps", label: apps, sub: "consumers", at: [3.6, 1.85] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["kdf", "s3", "raw"],
      steps: [
        {
          flow: ["web", "kds"],
          times: 4,
          caption: {
            vi: "Giao dịch được stream vào Amazon Kinesis Data Streams; dịch vụ tự quản lý hạ tầng, lưu trữ và mạng theo thông lượng dữ liệu.",
            en: "Transactions are streamed into Amazon Kinesis Data Streams, which manages the infrastructure, storage and networking for the data throughput.",
          },
        },
        {
          flow: ["kds", "lambda", "ddb"],
          times: 2,
          caption: {
            vi: "Lambda là một consumer của stream: nó xoá dữ liệu nhạy cảm khỏi từng giao dịch rồi lưu giao dịch đã làm sạch vào DynamoDB.",
            en: "Lambda is one consumer of the stream: it removes sensitive data from every transaction and stores the cleansed result in DynamoDB.",
          },
        },
        {
          flow: ["kds", "apps"],
          times: 2,
          badge: { vi: "dữ liệu thô", en: "raw" },
          caption: {
            vi: "Các ứng dụng nội bộ là những consumer khác của cùng stream và đọc giao dịch thô gần như thời gian thực.",
            en: "Internal applications are other consumers of the same stream and read the raw transactions in near-real time.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Gần thời gian thực, nhiều consumer, dữ liệu làm sạch trong DynamoDB.",
          en: "Near-real-time, multiple consumers, cleansed data in DynamoDB.",
        },
      },
    },
    {
      option: "a",
      hide: ["kds", "kdf", "raw"],
      steps: [
        {
          flow: ["web", "s3"],
          tone: "warn",
          badge: "batch",
          caption: {
            vi: "Giao dịch thô được xử lý theo lô thành các file phẳng trên Amazon S3.",
            en: "Raw transactions are batch-processed into flat files on Amazon S3.",
          },
        },
        {
          flow: ["s3", "lambda", "ddb"],
          tone: "warn",
          caption: {
            vi: "S3 event kích hoạt Lambda làm sạch file rồi lưu vào DynamoDB; DynamoDB Streams chia sẻ dữ liệu cho ứng dụng nội bộ.",
            en: "An S3 event triggers Lambda to cleanse the file and store it in DynamoDB; DynamoDB Streams shares the data with internal apps.",
          },
        },
        {
          flow: ["ddb", "apps"],
          tone: "bad",
          caption: {
            vi: "Yêu cầu là giải pháp gần thời gian thực, nên xử lý theo lô không phù hợp.",
            en: "The requirement is near-real-time, so a batch process is the wrong fit.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Xử lý theo lô, không gần thời gian thực.", en: "Batch, not near-real-time." },
      },
    },
    {
      option: "c",
      hide: ["kds", "s3", "raw"],
      steps: [
        {
          flow: ["web", "kdf", "lambda", "ddb"],
          tone: "warn",
          caption: {
            vi: "Kinesis Data Firehose là dịch vụ ETL: thu nhận, biến đổi và chuyển dữ liệu streaming tới data lake, kho dữ liệu và dịch vụ phân tích.",
            en: "Kinesis Data Firehose is an ETL service: it captures, transforms and delivers streaming data to data lakes, data stores and analytics services.",
          },
        },
        {
          stop: ["kdf", "apps"],
          caption: {
            vi: "Firehose delivery stream không hỗ trợ nhiều consumer, nên các ứng dụng nội bộ không thể đọc giao dịch thô từ đó.",
            en: "A Firehose delivery stream cannot have multiple consumers, so internal apps cannot read the raw transactions from it.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Firehose không có nhiều consumer.", en: "Firehose has no multiple consumers." },
      },
    },
    {
      option: "d",
      hide: ["kds", "kdf", "s3", "lambda", "ddb"],
      steps: [
        {
          flow: ["web", "raw"],
          tone: "warn",
          caption: {
            vi: "Giao dịch thô được ghi thẳng vào DynamoDB.",
            en: "Raw transactions are written straight to DynamoDB.",
          },
        },
        {
          flow: ["raw", "apps"],
          tone: "warn",
          badge: "DynamoDB Streams",
          caption: {
            vi: "Phương án dùng DynamoDB Streams để chia sẻ giao dịch với ứng dụng nội bộ, và dựa vào một “rule” để xoá dữ liệu nhạy cảm.",
            en: "The option shares transactions with internal apps through DynamoDB Streams, and relies on a “rule” to remove sensitive data.",
          },
        },
        {
          mark: "raw",
          tone: "bad",
          badge: { vi: "không có rule", en: "no such rule" },
          caption: {
            vi: "DynamoDB không có rule tự cập nhật item mỗi khi có bản ghi mới; cần trigger gọi dịch vụ bên ngoài như Lambda, và việc ghi rồi cập nhật lại cùng item là kém hiệu quả.",
            en: "DynamoDB has no rule that updates an item whenever one is written; it would need a trigger invoking something like Lambda, and writing then re-updating each item is inefficient.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "DynamoDB không có rule như vậy.", en: "DynamoDB has no such rule." },
      },
    },
  ],
};

export default spec;
