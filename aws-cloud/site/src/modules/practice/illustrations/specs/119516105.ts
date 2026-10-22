// Practice test 2, question 26: Textract output analysed by Amazon Comprehend, results stored in S3.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516105,
  cols: 5,
  rows: 2.3,
  nodes: [
    { id: "pdf", label: { vi: "Tài liệu PDF", en: "PDF documents" }, sub: { vi: "bản tin, tạp chí", en: "bulletins, magazines" }, kind: "data", at: [0, 0.6] },
    { id: "tx", label: "Amazon Textract", sub: { vi: "trích xuất văn bản", en: "extracts text" }, at: [1, 0.6] },
    { id: "comp", label: "Amazon Comprehend", sub: { vi: "cảm xúc · thực thể", en: "sentiment · entities" }, at: [2, 0.6] },
    { id: "sm", label: "Amazon SageMaker", sub: { vi: "tự huấn luyện model", en: "custom model" }, at: [2, 0.6] },
    { id: "lam", label: "AWS Lambda", sub: { vi: "chuyển sang CSV", en: "converts to CSV" }, at: [2, 0.6] },
    { id: "glue", label: "AWS Glue", sub: "ETL", at: [2, 0.6] },
    { id: "out", label: "Amazon S3", sub: { vi: "kết quả", en: "results" }, kind: "data", at: [3, 0.6] },
    { id: "ddb", label: "DynamoDB", kind: "data", at: [3, 0.6] },
    { id: "ath", label: "Amazon Athena", sub: { vi: "truy vấn SQL", en: "SQL queries" }, at: [3, 0.6] },
    { id: "rs", label: "Amazon Redshift", kind: "data", at: [3, 0.6] },
    { id: "qs", label: "QuickSight", at: [4, 0.6] },
    { id: "rek", label: "Amazon Rekognition", sub: { vi: "ảnh và video", en: "images and video" }, kind: "ghost", at: [4, 0.6] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["sm", "lam", "glue", "ddb", "ath", "rs", "qs", "rek"],
      steps: [
        {
          flow: ["pdf", "tx"],
          caption: {
            vi: "Amazon Textract trích xuất văn bản từ các PDF có bố cục phức tạp.",
            en: "Amazon Textract extracts the text from PDFs with complex layouts.",
          },
        },
        {
          flow: ["tx", "comp"],
          badge: { vi: "có sẵn model", en: "pre-trained" },
          caption: {
            vi: "Văn bản được gửi tới Amazon Comprehend, có sẵn model NLP huấn luyện trước để phân tích cảm xúc, nhận diện thực thể và phân loại chủ đề; không phải tự xây hay huấn luyện model.",
            en: "The text goes to Amazon Comprehend, whose pre-trained NLP models perform sentiment analysis, entity recognition and topic classification; no custom models to build or train.",
          },
        },
        {
          flow: ["comp", "out"],
          caption: {
            vi: "Kết quả được lưu trong Amazon S3 để xử lý tiếp hoặc trực quan hoá; toàn bộ là dịch vụ được quản lý, serverless.",
            en: "Results are stored in Amazon S3 for downstream processing or visualisation; everything is managed and serverless.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "NLP được quản lý, ít công vận hành nhất.", en: "Managed NLP, least operational effort." } },
    },
    {
      option: "a",
      hide: ["comp", "lam", "glue", "out", "ath", "rs", "qs", "rek"],
      steps: [
        { flow: ["pdf", "tx", "sm", "ddb"], tone: "warn", caption: { vi: "Văn bản đi qua model phân tích cảm xúc tự huấn luyện trên SageMaker, kết quả lưu vào DynamoDB.", en: "The text goes through a custom sentiment model on SageMaker, and the output is stored in DynamoDB." } },
        {
          mark: "sm",
          tone: "bad",
          badge: { vi: "tự huấn luyện", en: "train it yourself" },
          caption: {
            vi: "Phải thu thập dữ liệu huấn luyện, phát triển model và quản lý hạ tầng huấn luyện — trái với yêu cầu ít công vận hành; DynamoDB cũng không tối ưu cho phân tích văn bản.",
            en: "Training data, model development and training infrastructure are all on the team — against the low-overhead requirement; DynamoDB is also not optimised for text analysis.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Tự xây model là thừa.", en: "A custom model is unnecessary." } },
    },
    {
      option: "b",
      hide: ["comp", "sm", "glue", "out", "ddb", "rs", "rek"],
      steps: [
        { flow: ["pdf", "tx", "lam", "ath", "qs"], tone: "warn", caption: { vi: "Lambda chuyển văn bản sang CSV, Athena truy vấn và QuickSight trực quan hoá.", en: "Lambda converts the text to CSV, Athena queries it and QuickSight visualises it." } },
        {
          mark: "ath",
          tone: "bad",
          badge: { vi: "không có NLP", en: "no NLP" },
          caption: {
            vi: "Athena là công cụ truy vấn dữ liệu có cấu trúc, không phân tích cảm xúc; không có bước NLP thì QuickSight cũng không rút ra được cảm xúc từ văn bản thô.",
            en: "Athena is a query engine for structured data, not sentiment analysis; without an NLP step, QuickSight cannot extract sentiment from plain text either.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có bước phân tích cảm xúc.", en: "No sentiment analysis step." } },
    },
    {
      option: "c",
      hide: ["comp", "sm", "lam", "out", "ddb", "ath", "qs"],
      steps: [
        { flow: ["pdf", "tx", "glue", "rs"], tone: "warn", caption: { vi: "AWS Glue nạp dữ liệu vào Redshift qua nhiều bước ETL và quản lý schema.", en: "AWS Glue loads the data into Redshift through several ETL steps and schema management." } },
        {
          stop: ["rs", "rek"],
          caption: {
            vi: "Amazon Rekognition là dịch vụ thị giác máy tính, phân tích ảnh và video, không phân tích sắc thái cảm xúc của văn bản.",
            en: "Amazon Rekognition is a computer vision service for images and video; it does not analyse the emotional tone of text.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai dịch vụ cho văn bản.", en: "The wrong service for text." } },
    },
  ],
};

export default spec;
