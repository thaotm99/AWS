// Practice test 1, question 60: Kinesis Data Streams → Lambda → DynamoDB for ordered score updates.
// Captions follow the question's explanation. Additional source:
// - "Lambda processes records in each shard in order.": https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
import type { Bilingual, IllustrationSpec } from "../types";

const ec2Overhead: Bilingual = {
  vi: "EC2 instance đòi hỏi nhiều hoạt động bảo trì, như quản lý hệ điều hành khách và phần mềm cài trên đó, gồm cả cập nhật và bản vá bảo mật; điều này trái với yêu cầu giảm thiểu chi phí vận hành.",
  en: "EC2 instances involve maintenance such as managing the guest operating system and the software on it, including updates and security patches; this goes against the requirement to minimise management overhead.",
};
const ec2Verdict = {
  works: false,
  caption: { vi: "Có EC2 instance phải tự quản lý.", en: "It includes EC2 instances to manage." },
};
const ec2Badge = { vi: "OS · bản vá", en: "OS · patches" };

const spec: IllustrationSpec = {
  questionId: 125222741,
  cols: 4,
  rows: 1.4,
  nodes: [
    { id: "game", label: "Mobile game", sub: { vi: "cập nhật điểm", en: "score updates" }, kind: "actor", at: [0, 0.3] },
    { id: "kds", label: "Kinesis Data Streams", at: [1, 0.3] },
    { id: "sqs", label: "Amazon SQS", sub: "queue", at: [1, 0.3] },
    { id: "sns", label: "Amazon SNS", sub: "topic", at: [1, 0.3] },
    { id: "lambda", label: "AWS Lambda", at: [2, 0.3] },
    { id: "ec2", label: "EC2 fleet", sub: "Auto Scaling", kind: "ghost", at: [2, 0.3] },
    { id: "ddb", label: "Amazon DynamoDB", sub: "leaderboard", kind: "data", at: [3, 0.3] },
    { id: "rds", label: "RDS for MySQL", kind: "data", at: [3, 0.3] },
    { id: "sqlEc2", label: "SQL DB on EC2", kind: "ghost", at: [3, 0.3] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["sqs", "sns", "ec2", "rds", "sqlEc2"],
      steps: [
        {
          flow: ["game", "kds"],
          times: 4,
          caption: {
            vi: "Kinesis Data Streams tiếp nhận các bản cập nhật điểm theo thời gian thực; dịch vụ có thể liên tục thu nhận hàng gigabyte dữ liệu mỗi giây và đảm bảo thứ tự các record.",
            en: "Kinesis Data Streams ingests score updates in real time; it can continuously capture gigabytes of data per second and keeps records in order.",
          },
        },
        {
          flow: ["kds", "lambda"],
          times: 3,
          badge: { vi: "theo thứ tự", en: "in order" },
          caption: {
            vi: "Lambda tích hợp nguyên bản với Kinesis Data Streams: việc poll, checkpoint và xử lý lỗi được trừu tượng hoá, và Lambda xử lý record trong mỗi shard theo đúng thứ tự.",
            en: "Lambda integrates natively with Kinesis Data Streams: polling, checkpointing and error handling are abstracted away, and Lambda processes the records in each shard in order.",
          },
        },
        {
          flow: ["lambda", "ddb"],
          caption: {
            vi: "Kết quả xử lý được lưu vào Amazon DynamoDB để hiển thị trên leaderboard.",
            en: "Processed updates are stored in Amazon DynamoDB for the leaderboard.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Xử lý theo thứ tự nhận, mở rộng theo lưu lượng, không có máy chủ phải quản lý.",
          en: "Processed in order of receipt, scales with traffic, no servers to manage.",
        },
      },
    },
    {
      option: "a",
      hide: ["kds", "sns", "lambda", "ddb", "sqlEc2"],
      steps: [
        {
          flow: ["game", "sqs", "ec2", "rds"],
          tone: "warn",
          times: 2,
          caption: {
            vi: "Bản cập nhật đi qua SQS queue tới nhóm EC2 instance trong Auto Scaling group rồi được lưu vào RDS for MySQL.",
            en: "Updates go through an SQS queue to an Auto Scaling fleet of EC2 instances and are stored in RDS for MySQL.",
          },
        },
        { mark: "ec2", tone: "bad", badge: ec2Badge, caption: ec2Overhead },
      ],
      verdict: ec2Verdict,
    },
    {
      option: "c",
      hide: ["sqs", "sns", "lambda", "rds", "sqlEc2"],
      steps: [
        {
          flow: ["game", "kds", "ec2", "ddb"],
          tone: "warn",
          times: 2,
          caption: {
            vi: "Kinesis Data Streams và DynamoDB giống phương án đúng, nhưng bước xử lý chạy trên nhóm EC2 instance trong Auto Scaling group.",
            en: "Kinesis Data Streams and DynamoDB are as in the correct option, but processing runs on an Auto Scaling fleet of EC2 instances.",
          },
        },
        { mark: "ec2", tone: "bad", badge: ec2Badge, caption: ec2Overhead },
      ],
      verdict: ec2Verdict,
    },
    {
      option: "d",
      hide: ["kds", "sqs", "ec2", "ddb", "rds"],
      steps: [
        {
          flow: ["game", "sns", "lambda", "sqlEc2"],
          tone: "warn",
          times: 2,
          caption: {
            vi: "Bản cập nhật được publish vào SNS topic, Lambda subscribe topic để xử lý, rồi lưu vào cơ sở dữ liệu SQL chạy trên EC2 instance.",
            en: "Updates are published to an SNS topic, a subscribed Lambda function processes them, and they are stored in a SQL database on an EC2 instance.",
          },
        },
        { mark: "sqlEc2", tone: "bad", badge: ec2Badge, caption: ec2Overhead },
      ],
      verdict: ec2Verdict,
    },
  ],
};

export default spec;
