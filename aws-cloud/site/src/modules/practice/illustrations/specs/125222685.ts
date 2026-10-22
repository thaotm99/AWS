// Practice test 1, question 4: S3 event → Lambda → Comprehend custom entity recognition → DynamoDB lookup.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222685,
  cols: 4.2,
  rows: 2.6,
  nodes: [
    { id: "seller", label: { vi: "Người bán", en: "Sellers" }, kind: "actor", at: [0, 0.8] },
    { id: "s3", label: "Amazon S3", sub: { vi: "mô tả .txt", en: "description .txt" }, kind: "data", at: [1.05, 0.8] },
    { id: "eb", label: "EventBridge", at: [1.05, 1.9] },
    { id: "lam", label: "AWS Lambda", at: [2.1, 0.8] },
    { id: "comp", label: "Amazon Comprehend", sub: "custom entities", at: [3.2, 0] },
    { id: "sm", label: "SageMaker endpoint", sub: { vi: "model tự huấn luyện", en: "custom-trained model" }, at: [3.2, 0] },
    { id: "tr", label: "Amazon Transcribe", sub: { vi: "âm thanh tổng hợp", en: "synthetic audio" }, kind: "ghost", at: [3.2, 0] },
    { id: "lfv", label: "Lookout for Vision", sub: { vi: "chỉ cho hình ảnh", en: "images only" }, kind: "ghost", at: [3.2, 0] },
    { id: "ddb", label: "DynamoDB", sub: { vi: "điểm thành phần", en: "ingredient scores" }, kind: "data", at: [3.2, 1.6] },
    { id: "sns", label: "Amazon SNS", sub: { vi: "báo người duyệt", en: "notifies reviewers" }, at: [3.2, 1.6] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["eb", "sm", "tr", "lfv", "sns"],
      steps: [
        { flow: ["seller", "s3"], caption: { vi: "Người bán tải mô tả sản phẩm dạng file văn bản lên S3.", en: "Sellers upload product descriptions as text files to S3." } },
        {
          flow: ["s3", "lam"],
          badge: "event",
          caption: { vi: "S3 Event Notification kích hoạt Lambda function mỗi khi có mô tả mới.", en: "An S3 Event Notification triggers a Lambda function for every new description." },
        },
        {
          flow: ["lam", "comp"],
          badge: { vi: "thành phần", en: "ingredients" },
          caption: {
            vi: "Lambda dùng tính năng custom entity recognition của Amazon Comprehend để trích tên thành phần; Comprehend được quản lý hoàn toàn và không cần chuyên gia ML.",
            en: "Lambda uses Amazon Comprehend's custom entity recognition to extract ingredient names; Comprehend is fully managed and needs no ML expertise.",
          },
        },
        {
          flow: ["lam", "ddb"],
          badge: "lookup",
          caption: {
            vi: "Tên thành phần làm khoá tra cứu bảng DynamoDB chứa điểm sức khoẻ và an toàn tính sẵn. Kiến trúc hướng sự kiện, serverless, chi phí thấp.",
            en: "The ingredient names are lookup keys into the DynamoDB table of precomputed health and safety scores. Event-driven, serverless and low-cost.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "NLP được quản lý trong pipeline serverless.", en: "Managed NLP in a serverless pipeline." } },
    },
    {
      option: "b",
      hide: ["comp", "tr", "lfv", "sns"],
      steps: [
        { flow: ["seller", "s3", "eb", "lam", "sm"], tone: "warn", caption: { vi: "EventBridge gọi Lambda, Lambda gửi nội dung tới SageMaker endpoint chạy model NLP tự huấn luyện.", en: "EventBridge invokes Lambda, which sends the content to a SageMaker endpoint running a custom-trained NLP model." } },
        {
          mark: "sm",
          tone: "bad",
          badge: { vi: "huấn luyện hằng tháng", en: "monthly retraining" },
          caption: {
            vi: "Huấn luyện, triển khai, tinh chỉnh và huấn luyện lại model hằng tháng đòi hỏi chuyên môn ML và tốn công, tốn tiền — quá mức cho bài toán này.",
            en: "Training, deploying, fine-tuning and monthly retraining need ML expertise and substantial effort and cost — over-engineered for this use case.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Cần chuyên môn ML, tốn kém.", en: "Needs ML expertise, costly." } },
    },
    {
      option: "c",
      hide: ["eb", "comp", "sm", "lfv", "ddb"],
      steps: [
        { flow: ["seller", "s3", "lam", "tr"], tone: "warn", caption: { vi: "Văn bản được chuyển thành âm thanh tổng hợp rồi Transcribe chuyển ngược lại thành văn bản.", en: "Text is turned into synthetic audio and Transcribe turns it back into text." } },
        {
          flow: ["lam", "sns"],
          tone: "bad",
          badge: { vi: "thủ công", en: "manual" },
          caption: {
            vi: "Các bước xử lý thừa và chậm, phân tích thủ công hoặc khớp từ khoá, rồi SNS báo người duyệt — vi phạm yêu cầu tự động hoàn toàn.",
            en: "Redundant, slow processing, manual or keyword analysis, then SNS alerts human reviewers — this breaks the fully automated requirement.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Vòng vèo và không tự động.", en: "Convoluted and not automated." } },
    },
    {
      option: "d",
      hide: ["eb", "comp", "sm", "tr", "ddb", "sns"],
      steps: [
        { flow: ["seller", "s3", "lam"], caption: { vi: "Lambda được kích hoạt từ S3.", en: "Lambda is triggered from S3." } },
        {
          stop: ["lam", "lfv"],
          caption: {
            vi: "Amazon Lookout for Vision phát hiện bất thường trên hình ảnh, không xử lý văn bản và không trích xuất được thực thể.",
            en: "Amazon Lookout for Vision detects anomalies in images; it does not process text or extract entities.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai loại dữ liệu.", en: "The wrong kind of data." } },
    },
  ],
};

export default spec;
