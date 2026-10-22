// Practice test 2, question 14: S3 event notifications to SQS, processed by Lambda as each photo arrives.
// Captions follow the question's explanation. Additional sources:
// - Lambda function timeout quota: 900 seconds (15 minutes):
//   https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
// - S3 event notification destinations are SNS topics, SQS queues, Lambda functions and EventBridge:
//   https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516111,
  cols: 5,
  rows: 1.5,
  nodes: [
    { id: "mobile", label: "Mobile app", sub: { vi: "người dùng gửi ảnh", en: "users submit photos" }, kind: "actor", at: [0, 0.3] },
    { id: "s3", label: "Amazon S3", sub: "photos", kind: "data", at: [1, 0.3] },
    { id: "sqs", label: "Amazon SQS", sub: "queue", at: [2, 0.3] },
    { id: "eb", label: "EventBridge", sub: "rule", at: [2, 0.3] },
    { id: "apprunner", label: "AWS App Runner", sub: { vi: "dịch vụ container", en: "container service" }, kind: "ghost", at: [2, 0.3] },
    { id: "lam", label: "AWS Lambda", sub: "512 MB · ~3 min", at: [3, 0.3] },
    { id: "ri", label: "EC2 Reserved", sub: { vi: "1 instance chạy liên tục", en: "1 instance, always on" }, at: [3, 0.3] },
    { id: "sfn", label: "Step Functions", at: [3, 0.3] },
    { id: "fg", label: "ECS on Fargate", sub: "task", at: [4, 0.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["eb", "apprunner", "ri", "sfn", "fg"],
      steps: [
        { flow: ["mobile", "s3"], caption: { vi: "Người dùng tải ảnh lên S3 bucket.", en: "Users upload photos to the S3 bucket." } },
        {
          flow: ["s3", "sqs"],
          badge: "event",
          caption: {
            vi: "Mỗi lần có ảnh mới, S3 event notification gửi metadata của object vào SQS queue, đóng vai trò bộ đệm bền vững.",
            en: "On every upload, an S3 event notification sends the object's metadata to an SQS queue, which acts as a durable buffer.",
          },
        },
        {
          flow: ["sqs", "lam"],
          times: 3,
          badge: { vi: "≤ 15 phút", en: "≤ 15 min" },
          caption: {
            vi: "Lambda được kích hoạt bởi message mới và tính tiền theo mức dùng; 512 MB và vài phút xử lý mỗi ảnh nằm trong giới hạn của Lambda (timeout tối đa 15 phút), không còn EC2 instance phải quản lý.",
            en: "Lambda is triggered by new messages and billed per use; 512 MB and a few minutes per photo fit Lambda's limits (15-minute maximum timeout), and there are no EC2 instances to manage.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Gần thời gian thực, trả tiền theo mức dùng.", en: "Near real time, pay per use." } },
    },
    {
      option: "b",
      hide: ["eb", "apprunner", "lam", "sfn", "fg"],
      steps: [
        {
          flow: ["mobile", "s3", "sqs", "ri"],
          tone: "warn",
          caption: {
            vi: "S3 đẩy event vào SQS, một Reserved Instance liên tục poll queue và xử lý từng ảnh: vẫn gần thời gian thực.",
            en: "S3 pushes events to SQS and a Reserved Instance continuously polls the queue and processes each image: still near real time.",
          },
        },
        {
          mark: "ri",
          tone: "bad",
          badge: { vi: "tốn tiền khi rảnh", en: "idle cost" },
          caption: {
            vi: "Instance chạy liên tục nên tốn chi phí cả khi rảnh, không co giãn theo sự kiện, có thể dư hoặc quá tải tuỳ lượng ảnh, và thêm việc quản trị.",
            en: "The long-running instance costs money while idle, is not elastic, may be underused or overwhelmed depending on uploads, and adds administration.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Đắt hơn và không co giãn.", en: "Costlier and not elastic." } },
    },
    {
      option: "c",
      hide: ["sqs", "apprunner", "lam", "ri"],
      steps: [
        {
          flow: ["mobile", "s3", "eb", "sfn", "fg"],
          tone: "warn",
          caption: {
            vi: "S3 event qua EventBridge rule khởi chạy workflow Step Functions, workflow này chạy một Fargate task để xử lý ảnh. Về kỹ thuật là khả thi.",
            en: "S3 events go through an EventBridge rule to a Step Functions workflow that starts a Fargate task to process the image. Technically feasible.",
          },
        },
        {
          mark: ["sfn", "fg"],
          tone: "warn",
          badge: { vi: "thêm thành phần", en: "more parts" },
          caption: {
            vi: "Nhưng nhiều thành phần được quản lý hơn nghĩa là phức tạp và tốn kém hơn mức cần cho tác vụ ngắn, nhẹ; thiết kế này hợp với workflow nhiều bước.",
            en: "But more managed components mean more complexity and cost than this short, lightweight task needs; the design suits multi-step workflows.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp và đắt hơn cần thiết.", en: "More complex and costly than needed." } },
    },
    {
      option: "d",
      hide: ["sqs", "eb", "lam", "ri", "sfn", "fg"],
      steps: [
        {
          stop: ["s3", "apprunner"],
          caption: {
            vi: "App Runner không được thiết kế để S3 gọi trực tiếp theo sự kiện; đích của S3 event notification là SNS, SQS, Lambda hoặc EventBridge, nên cần thêm thành phần trung gian.",
            en: "App Runner is not designed for direct invocation by S3 events; S3 event notifications go to SNS, SQS, Lambda or EventBridge, so an intermediate component is needed.",
          },
        },
        {
          mark: "apprunner",
          tone: "bad",
          badge: { vi: "luôn chạy sẵn", en: "kept warm" },
          caption: {
            vi: "App Runner còn giữ container instance chạy sẵn để đảm bảo hiệu năng, gây chi phí không cần thiết cho tác vụ nền ngắn, không thường xuyên.",
            en: "App Runner also keeps container instances warm for performance, adding unnecessary charges for short, infrequent background tasks.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "S3 không gọi trực tiếp App Runner.", en: "S3 cannot trigger App Runner directly." } },
    },
  ],
};

export default spec;
