// Practice test 5, question 23: S3 event notification → Lambda → thumbnail in a second bucket.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119517585,
  cols: 4.3,
  rows: 1.5,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, sub: { vi: "~200 ảnh/ngày", en: "~200 images/day" }, kind: "actor", at: [0, 0.4] },
    { id: "src", label: "Amazon S3", sub: { vi: "ảnh gốc", en: "originals" }, kind: "data", at: [1.1, 0.4] },
    { id: "lambda", label: "AWS Lambda", sub: "thumbnail", at: [2.2, 0.4] },
    { id: "glue", label: "AWS Glue job", sub: { vi: "quét theo lịch", en: "scheduled scan" }, at: [2.2, 0.4] },
    { id: "fargate", label: "Fargate task", sub: { vi: "poll mỗi phút", en: "polls every minute" }, at: [2.2, 0.4] },
    { id: "analyzer", label: "Access Analyzer", sub: "for S3", kind: "ghost", at: [2.2, 0.4] },
    { id: "thumbs", label: "Amazon S3", sub: "thumbnails", kind: "data", at: [3.3, 0.4] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["glue", "fargate", "analyzer"],
      steps: [
        {
          flow: ["user", "src"],
          caption: {
            vi: "Ảnh được tải trực tiếp lên bucket S3 chính.",
            en: "Images are uploaded straight into the primary S3 bucket.",
          },
        },
        {
          flow: ["src", "lambda"],
          badge: "event",
          caption: {
            vi: "Mỗi lần có ảnh mới, S3 gửi event notification tới Lambda function; tích hợp này có sẵn, không cần hạ tầng chạy liên tục hay job theo lịch.",
            en: "For every new image, S3 sends an event notification to the Lambda function; the integration is native, with no always-on infrastructure or scheduled jobs.",
          },
        },
        {
          flow: ["lambda", "thumbs"],
          caption: {
            vi: "Lambda xử lý ảnh, tạo thumbnail và lưu vào bucket thứ hai. Lambda chỉ chạy khi được gọi và tự mở rộng, nên rất tiết kiệm với khoảng 200 ảnh mỗi ngày.",
            en: "Lambda processes the image, creates the thumbnail and stores it in the second bucket. It runs only when invoked and scales automatically, so it is very cost-effective for about 200 uploads a day.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Hướng sự kiện, serverless, chi phí thấp nhất.",
          en: "Event-driven, serverless, lowest cost.",
        },
      },
    },
    {
      option: "a",
      hide: ["lambda", "fargate", "analyzer"],
      steps: [
        {
          flow: ["user", "src"],
          caption: { vi: "Ảnh được tải lên bucket S3 chính.", en: "Images are uploaded to the primary S3 bucket." },
        },
        {
          flow: ["glue", "src"],
          tone: "warn",
          badge: { vi: "theo lịch", en: "scheduled" },
          caption: {
            vi: "AWS Glue job chạy theo chu kỳ để quét bucket tìm file mới. Glue được thiết kế cho ETL trên dữ liệu có cấu trúc và bán cấu trúc, không phải xử lý ảnh.",
            en: "AWS Glue jobs run on an interval to scan the bucket for new files. Glue is built for ETL on structured and semi-structured data, not image processing.",
          },
        },
        {
          flow: ["glue", "thumbs"],
          tone: "warn",
          caption: {
            vi: "Thumbnail vẫn được tạo, nhưng chạy Glue theo lịch cho việc này thêm độ phức tạp và chi phí không cần thiết.",
            en: "Thumbnails do get made, but running Glue on a schedule for this adds needless complexity and cost.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Phức tạp và tốn kém hơn cần thiết.", en: "More complex and costly than needed." },
      },
    },
    {
      option: "b",
      hide: ["lambda", "glue", "analyzer"],
      steps: [
        {
          flow: ["fargate", "src"],
          times: 3,
          tone: "warn",
          badge: "poll",
          caption: {
            vi: "Container trên Fargate poll bucket mỗi phút; việc poll liên tục kém hiệu quả và phát sinh chi phí ngay cả khi không có ảnh mới.",
            en: "A Fargate container polls the bucket every minute; continuous polling is inefficient and costs money even when no new images arrive.",
          },
        },
        {
          flow: ["fargate", "thumbs"],
          tone: "warn",
          caption: {
            vi: "Thumbnail được tạo, nhưng cách làm này phức tạp hơn khi vận hành so với xử lý hướng sự kiện.",
            en: "Thumbnails are created, but this is more complex to operate than event-driven processing.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Tốn chi phí cả khi không có ảnh mới.", en: "It costs money even with no new images." },
      },
    },
    {
      option: "c",
      hide: ["lambda", "glue", "fargate"],
      steps: [
        {
          flow: ["user", "src"],
          caption: { vi: "Ảnh được tải lên bucket S3 chính.", en: "Images are uploaded to the primary S3 bucket." },
        },
        {
          stop: ["src", "analyzer"],
          caption: {
            vi: "IAM Access Analyzer for S3 dùng để kiểm tra và phân tích bảo mật; nó không phát hiện việc tải object lên và không thể kích hoạt Lambda để tạo thumbnail.",
            en: "IAM Access Analyzer for S3 is for auditing and security analysis; it cannot detect object uploads or trigger Lambda to make thumbnails.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Access Analyzer không phát sinh sự kiện khi có object mới.",
          en: "Access Analyzer does not react to new objects.",
        },
      },
    },
  ],
};

export default spec;
