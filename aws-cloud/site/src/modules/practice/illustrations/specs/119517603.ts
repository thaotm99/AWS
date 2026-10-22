// Practice test 5, question 32: API Gateway → SQS → Lambda → Comprehend → DynamoDB with a 365-day TTL.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const forms = { vi: "Form phản hồi", en: "Feedback forms" };

const spec: IllustrationSpec = {
  questionId: 119517603,
  cols: 5,
  rows: 2.2,
  nodes: [
    { id: "user", label: forms, sub: { vi: "hàng nghìn/giờ", en: "thousands/hour" }, kind: "actor", at: [0, 1.2] },
    { id: "apigw", label: "API Gateway", sub: "REST API", at: [1, 1.2] },
    { id: "ec2", label: "EC2 web service", at: [1, 1.2] },
    { id: "eb", label: "EventBridge", at: [1, 1.2] },
    { id: "kds", label: "Kinesis", sub: "Data Streams", at: [1, 1.2] },
    { id: "sqs", label: "Amazon SQS", sub: "queue", at: [2, 1.2] },
    { id: "sfn", label: "Step Functions", sub: "workflow", at: [2, 1.2] },
    { id: "lambda", label: "AWS Lambda", at: [3, 1.2] },
    { id: "comprehend", label: "Comprehend", sub: "sentiment", at: [3, 0.1] },
    { id: "transcribe", label: "Transcribe", sub: "speech → text", kind: "ghost", at: [3, 0.1] },
    { id: "translate", label: "Translate", sub: { vi: "dịch ngôn ngữ", en: "translation" }, kind: "ghost", at: [3, 0.1] },
    { id: "ddb", label: "DynamoDB", sub: "TTL 365 days", kind: "data", at: [4, 1.2] },
    { id: "rds", label: "Amazon RDS", kind: "data", at: [4, 1.2] },
    { id: "os", label: "OpenSearch", sub: "ISM 12 months", kind: "data", at: [4, 1.2] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["ec2", "eb", "kds", "sfn", "transcribe", "translate", "rds", "os"],
      steps: [
        {
          flow: ["user", "apigw", "sqs"],
          times: 4,
          caption: {
            vi: "API Gateway tiếp nhận phản hồi qua REST API và chuyển vào SQS queue; queue làm vùng đệm cho lượng dữ liệu tăng đột biến.",
            en: "API Gateway takes feedback through a REST API and forwards it to an SQS queue, which buffers bursts of data.",
          },
        },
        {
          flow: ["sqs", "lambda"],
          times: 2,
          caption: {
            vi: "Lambda xử lý message trong queue một cách bất đồng bộ và tự động mở rộng theo lượng phản hồi.",
            en: "Lambda processes the queued messages asynchronously and scales automatically with the volume.",
          },
        },
        {
          flow: ["lambda", "comprehend"],
          badge: { vi: "cảm xúc", en: "sentiment" },
          caption: {
            vi: "Amazon Comprehend được thiết kế riêng để phân tích cảm xúc trên văn bản.",
            en: "Amazon Comprehend is built for sentiment analysis on text.",
          },
        },
        {
          flow: ["lambda", "ddb"],
          badge: "TTL",
          caption: {
            vi: "Kết quả được lưu vào DynamoDB; Time to Live (TTL) tự động xoá item sau một năm.",
            en: "Results go to DynamoDB; Time to Live (TTL) expires the items automatically after one year.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Serverless, tự mở rộng khi tăng đột biến, tự động hết hạn sau một năm.",
          en: "Serverless, absorbs spikes, expires automatically after a year.",
        },
      },
    },
    {
      option: "b",
      hide: ["apigw", "eb", "kds", "sqs", "sfn", "lambda", "transcribe", "translate", "rds", "os"],
      steps: [
        {
          flow: [["user", "ec2", "ddb"], ["ec2", "comprehend"]],
          tone: "warn",
          badge: { vi: "2 bảng", en: "2 tables" },
          caption: {
            vi: "Web service trên EC2 nhận phản hồi, gọi Amazon Comprehend và ghi kết quả vào bảng DynamoDB thứ hai; Comprehend được dùng đúng, nhưng bảng thứ hai thêm phức tạp.",
            en: "A web service on EC2 receives feedback, calls Amazon Comprehend and writes results to a second DynamoDB table; Comprehend is used correctly, but the second table adds complexity.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: { vi: "vận hành", en: "overhead" },
          caption: {
            vi: "EC2 cần cấp phát, vá lỗi và scale thủ công; đây không phải kiến trúc serverless, hướng sự kiện và thiếu tính co giãn khi lưu lượng tăng đột biến.",
            en: "EC2 must be provisioned, patched and scaled; this is not serverless or event-driven and lacks elasticity for sudden spikes.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Gánh nặng vận hành EC2, kém co giãn.", en: "EC2 overhead and poor elasticity." },
      },
    },
    {
      option: "c",
      hide: ["apigw", "ec2", "kds", "sqs", "comprehend", "translate", "ddb", "os"],
      steps: [
        {
          flow: ["user", "eb", "sfn", "lambda"],
          tone: "warn",
          caption: {
            vi: "EventBridge chuyển sự kiện tới workflow Step Functions, workflow gọi Lambda để kiểm tra dữ liệu.",
            en: "EventBridge forwards events to a Step Functions workflow, which invokes Lambda for validation.",
          },
        },
        {
          flow: ["lambda", "transcribe"],
          tone: "bad",
          caption: {
            vi: "Amazon Transcribe chuyển giọng nói thành văn bản, không làm chiều ngược lại, và không phân tích cảm xúc.",
            en: "Amazon Transcribe converts speech to text, not the other way round, and does no sentiment analysis.",
          },
        },
        {
          flow: ["lambda", "rds"],
          tone: "warn",
          caption: {
            vi: "Lưu vào Amazon RDS tăng gánh nặng quản lý và không mở rộng tốt bằng DynamoDB cho tải ghi tốc độ cao.",
            en: "Storing in Amazon RDS adds management burden and does not scale as well as DynamoDB for high-velocity writes.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Dùng sai dịch vụ, không phân tích cảm xúc.", en: "Wrong services; no sentiment analysis." },
      },
    },
    {
      option: "d",
      hide: ["apigw", "ec2", "eb", "sqs", "sfn", "comprehend", "transcribe", "ddb", "rds"],
      steps: [
        {
          flow: ["user", "kds", "lambda"],
          times: 3,
          caption: {
            vi: "Kinesis Data Streams phù hợp để thu nhận dữ liệu thời gian thực với thông lượng cao; Lambda xử lý record theo lô.",
            en: "Kinesis Data Streams suits high-throughput, real-time capture; Lambda processes the records in batches.",
          },
        },
        {
          flow: ["lambda", "translate"],
          tone: "bad",
          caption: {
            vi: "Amazon Translate dùng để dịch ngôn ngữ, trong khi yêu cầu cốt lõi là phân tích cảm xúc.",
            en: "Amazon Translate is for language translation, while the core requirement is sentiment analysis.",
          },
        },
        {
          flow: ["lambda", "os"],
          tone: "warn",
          caption: {
            vi: "OpenSearch Service thêm gánh nặng vận hành đáng kể khi không cần tìm kiếm, và kém tiết kiệm hơn DynamoDB cho lưu trữ có cấu trúc đơn giản.",
            en: "OpenSearch Service adds significant operational overhead when no search is needed, and is less cost-effective than DynamoDB for simple structured storage.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không phân tích cảm xúc.", en: "No sentiment analysis." },
      },
    },
  ],
};

export default spec;
