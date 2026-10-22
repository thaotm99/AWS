// Practice test 1, question 33: fully serverless sensor ingestion, SQS standard queue → Lambda → DynamoDB.
// Captions follow the question's explanation. Additional sources:
// - Lambda polls the SQS queue and invokes the function with a batch of messages:
//   https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
// - Firehose destinations (S3, Iceberg tables, Redshift, OpenSearch, HTTP endpoints, partner services; no DynamoDB):
//   https://docs.aws.amazon.com/firehose/latest/dev/create-destination.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222723,
  cols: 4,
  rows: 1.4,
  nodes: [
    { id: "cars", label: { vi: "Xe", en: "Cars" }, sub: { vi: "dữ liệu cảm biến", en: "sensor data" }, kind: "actor", at: [0, 0.3] },
    { id: "sqs", label: "SQS standard queue", kind: "data", at: [1, 0.3] },
    { id: "fh", label: "Kinesis Data Firehose", at: [1, 0.3] },
    { id: "kds", label: "Kinesis Data Streams", at: [1, 0.3] },
    { id: "lambda", label: "AWS Lambda", sub: "serverless", at: [2, 0.3] },
    { id: "ec2", label: "EC2 instance", sub: { vi: "ứng dụng poll", en: "polling app" }, kind: "ghost", at: [2, 0.3] },
    { id: "ddb", label: "Amazon DynamoDB", sub: "auto scaling", kind: "data", at: [3, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["fh", "kds", "ec2"],
      steps: [
        {
          flow: ["cars", "sqs"],
          times: 3,
          caption: {
            vi: "Dữ liệu cảm biến được đưa vào SQS standard queue. SQS do AWS quản lý toàn bộ và tự động mở rộng, nên không cần cấp phát dung lượng thủ công khi khối lượng dữ liệu thay đổi.",
            en: "Sensor data goes into an SQS standard queue. SQS is fully managed by AWS and scales automatically, so no capacity is provisioned by hand as data volumes change.",
          },
        },
        {
          flow: ["sqs", "lambda"],
          badge: "batch",
          caption: {
            vi: "Lambda poll queue và gọi function với từng batch message; không có máy chủ nào phải cấp phát hay quản lý.",
            en: "Lambda polls the queue and invokes the function with batches of messages; there are no servers to provision or manage.",
          },
        },
        {
          flow: ["lambda", "ddb"],
          caption: {
            vi: "Function ghi dữ liệu vào bảng DynamoDB có auto scaling để xử lý ở các bước sau.",
            en: "The function writes the data into an auto-scaled DynamoDB table for downstream processing.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Mọi thành phần đều serverless và tự mở rộng.",
          en: "Every component is serverless and scales on its own.",
        },
      },
    },
    {
      option: "b",
      hide: ["fh", "kds", "lambda"],
      steps: [
        {
          flow: ["cars", "sqs"],
          times: 3,
          caption: {
            vi: "Phần tiếp nhận giống phương án đúng: SQS tự động mở rộng.",
            en: "Ingestion is the same as in the correct option: SQS scales automatically.",
          },
        },
        {
          flow: ["sqs", "ec2", "ddb"],
          tone: "warn",
          caption: {
            vi: "Ứng dụng chạy trên EC2 instance poll queue rồi ghi vào DynamoDB.",
            en: "An application on an EC2 instance polls the queue and writes to DynamoDB.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: { vi: "không serverless", en: "not serverless" },
          caption: {
            vi: "EC2 instance không phải thành phần serverless, trái với yêu cầu chỉ dùng thành phần serverless do AWS cấp phát và quản lý.",
            en: "An EC2 instance is not a serverless component, which goes against the requirement for fully serverless components managed by AWS.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Có thành phần không serverless.",
          en: "Not fully serverless.",
        },
      },
    },
    {
      option: "c",
      hide: ["sqs", "kds", "lambda", "ec2"],
      steps: [
        {
          flow: ["cars", "fh"],
          times: 3,
          caption: {
            vi: "Kinesis Data Firehose là dịch vụ được quản lý toàn bộ, phân phối dữ liệu streaming tới các đích như Amazon S3, Amazon Redshift, Amazon OpenSearch Service, Splunk hoặc HTTP endpoint.",
            en: "Kinesis Data Firehose is a fully managed service that delivers streaming data to destinations such as Amazon S3, Amazon Redshift, Amazon OpenSearch Service, Splunk or HTTP endpoints.",
          },
        },
        {
          stop: ["fh", "ddb"],
          caption: {
            vi: "DynamoDB không phải là đích của Firehose: Firehose không thể ghi trực tiếp vào bảng DynamoDB.",
            en: "DynamoDB is not a Firehose destination: Firehose cannot write directly into a DynamoDB table.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Luồng dữ liệu không tới được DynamoDB.",
          en: "The data never reaches DynamoDB.",
        },
      },
    },
    {
      option: "d",
      hide: ["sqs", "fh", "lambda"],
      steps: [
        {
          flow: ["cars", "kds"],
          times: 3,
          caption: {
            vi: "Dữ liệu cảm biến được đưa vào Kinesis Data Streams.",
            en: "Sensor data goes into Kinesis Data Streams.",
          },
        },
        {
          flow: ["kds", "ec2", "ddb"],
          tone: "warn",
          caption: {
            vi: "Ứng dụng chạy trên EC2 instance poll stream rồi ghi vào DynamoDB.",
            en: "An application on an EC2 instance polls the stream and writes to DynamoDB.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: { vi: "không serverless", en: "not serverless" },
          caption: {
            vi: "EC2 instance không phải thành phần serverless, trái với yêu cầu chỉ dùng thành phần serverless.",
            en: "An EC2 instance is not a serverless component, which goes against the requirement.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Có thành phần không serverless.",
          en: "Not fully serverless.",
        },
      },
    },
  ],
};

export default spec;
