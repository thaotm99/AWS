// Practice test 5, question 6: real-time search and analytics with Kinesis Data Streams, OpenSearch Service and QuickSight.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const sources = { vi: "Hệ thống nguồn", en: "Source systems" };

const spec: IllustrationSpec = {
  questionId: 119517571,
  cols: 4.3,
  rows: 2.2,
  nodes: [
    { id: "src", label: sources, sub: "streaming data", kind: "actor", at: [0, 1.2] },
    { id: "kds", label: "Kinesis", sub: "Data Streams", at: [1.1, 1.2] },
    { id: "ec2", label: "EC2 instances", sub: { vi: "tự xử lý stream", en: "self-managed" }, at: [1.1, 1.2] },
    { id: "glue", label: "AWS Glue", sub: "streaming ETL", at: [1.1, 1.2] },
    { id: "ecs", label: "ECS on Fargate", at: [1.1, 1.2] },
    { id: "os", label: "OpenSearch", sub: { vi: "index · tìm kiếm", en: "index · search" }, kind: "data", at: [2.2, 1.2] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [2.2, 1.2] },
    { id: "rs", label: "Amazon Redshift", sub: "data warehouse", kind: "data", at: [2.2, 1.2] },
    { id: "ddb", label: "DynamoDB", sub: "key-value", kind: "data", at: [2.2, 1.2] },
    { id: "athena", label: "Amazon Athena", sub: "SQL on S3", at: [3.3, 0.1] },
    { id: "qs", label: "QuickSight", sub: "dashboards", at: [3.3, 1.2] },
    { id: "grafana", label: "Managed Grafana", sub: "dashboards", at: [3.3, 1.2] },
    { id: "cw", label: "CloudWatch", sub: "dashboards", at: [3.3, 1.2] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["ec2", "glue", "ecs", "s3", "rs", "ddb", "athena", "grafana", "cw"],
      steps: [
        {
          flow: ["src", "kds"],
          times: 3,
          caption: {
            vi: "Kinesis Data Streams tiếp nhận stream dữ liệu với thông lượng cao và độ trễ thấp.",
            en: "Kinesis Data Streams ingests the streams with high throughput and low latency.",
          },
        },
        {
          flow: ["kds", "os"],
          times: 2,
          badge: "index",
          caption: {
            vi: "Amazon OpenSearch Service đánh index full-text cho dữ liệu và cung cấp khả năng tìm kiếm thời gian thực; dịch vụ được xây dựng riêng cho tìm kiếm và phân tích.",
            en: "Amazon OpenSearch Service builds a full-text index and provides real-time search; it is purpose-built for search and analytics.",
          },
        },
        {
          flow: ["os", "qs"],
          caption: {
            vi: "Amazon QuickSight kết nối tới dữ liệu đã index để xây dựng dashboard và trực quan hoá tương tác.",
            en: "Amazon QuickSight connects to the indexed data to build interactive dashboards and visualizations.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Nền tảng tìm kiếm và phân tích thời gian thực, mở rộng được và được quản lý hoàn toàn.",
          en: "A scalable, fully managed, real-time search and analytics platform.",
        },
      },
    },
    {
      option: "a",
      hide: ["kds", "glue", "ecs", "os", "rs", "ddb", "qs", "cw"],
      steps: [
        {
          flow: ["src", "ec2", "s3"],
          tone: "warn",
          badge: { vi: "vận hành", en: "overhead" },
          caption: {
            vi: "Dùng EC2 instance để tiếp nhận và xử lý dữ liệu streaming thời gian thực làm tăng gánh nặng vận hành không cần thiết.",
            en: "Using EC2 instances to ingest and process real-time streaming data adds unnecessary operational overhead.",
          },
        },
        {
          flow: ["s3", "athena"],
          tone: "bad",
          caption: {
            vi: "Athena được tối ưu để truy vấn dữ liệu trên Amazon S3, không phải cho tìm kiếm thời gian thực với độ trễ thấp.",
            en: "Athena is optimized for querying data on Amazon S3, not for low-latency, real-time search.",
          },
        },
        {
          flow: ["athena", "grafana"],
          tone: "warn",
          caption: {
            vi: "Managed Grafana hiển thị được dashboard, nhưng kiến trúc thiếu tốc độ phản hồi và hiệu năng index cần cho tìm kiếm thời gian thực.",
            en: "Managed Grafana can show dashboards, but the architecture lacks the responsiveness and indexing performance real-time search needs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Thiếu tìm kiếm thời gian thực, thêm gánh nặng vận hành EC2.",
          en: "No real-time search, and EC2 to operate.",
        },
      },
    },
    {
      option: "c",
      hide: ["kds", "ec2", "ecs", "os", "s3", "ddb", "athena", "grafana", "cw"],
      steps: [
        {
          flow: ["src", "glue", "rs"],
          tone: "warn",
          caption: {
            vi: "AWS Glue streaming ETL xử lý stream và nạp vào Amazon Redshift; tổ hợp Glue và Redshift tăng độ phức tạp và có thể gây thêm độ trễ.",
            en: "AWS Glue streaming ETL processes the streams and loads Amazon Redshift; the Glue and Redshift combination adds complexity and may add latency.",
          },
        },
        {
          mark: "rs",
          tone: "bad",
          badge: { vi: "full-text hạn chế", en: "limited full-text" },
          caption: {
            vi: "Redshift chủ yếu là data warehouse, không được tối ưu cho tìm kiếm full-text độ trễ thấp; khả năng tìm kiếm hạn chế so với OpenSearch.",
            en: "Redshift is primarily a data warehouse, not optimized for low-latency full-text search; its search is limited compared with OpenSearch.",
          },
        },
        {
          flow: ["rs", "qs"],
          tone: "warn",
          caption: {
            vi: "QuickSight vẫn trực quan hoá được dữ liệu, nhưng yêu cầu tìm kiếm thời gian thực chưa được đáp ứng.",
            en: "QuickSight can still visualize the data, but the real-time search requirement is not met.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Redshift không phải công cụ tìm kiếm full-text độ trễ thấp.",
          en: "Redshift is not a low-latency full-text search engine.",
        },
      },
    },
    {
      option: "d",
      hide: ["kds", "ec2", "glue", "os", "s3", "rs", "athena", "qs", "grafana"],
      steps: [
        {
          flow: ["src", "ecs", "ddb"],
          tone: "warn",
          caption: {
            vi: "Container trên ECS với Fargate nạp dữ liệu vào Amazon DynamoDB.",
            en: "Containers on ECS with Fargate load the data into Amazon DynamoDB.",
          },
        },
        {
          mark: "ddb",
          tone: "bad",
          badge: { vi: "không full-text", en: "no full-text" },
          caption: {
            vi: "DynamoDB là cơ sở dữ liệu NoSQL tối ưu cho truy cập key-value, không phải cho tìm kiếm full-text.",
            en: "DynamoDB is a NoSQL database optimized for key-value access, not full-text search.",
          },
        },
        {
          flow: ["ddb", "cw"],
          tone: "bad",
          caption: {
            vi: "Amazon CloudWatch được thiết kế để giám sát hạ tầng và ứng dụng, không phải để tìm kiếm hay trực quan hoá nâng cao dữ liệu người dùng.",
            en: "Amazon CloudWatch is designed for infrastructure and application monitoring, not advanced search or visualization of user data.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không có index và truy vấn thời gian thực cho tìm kiếm.",
          en: "No native indexing or real-time query for search.",
        },
      },
    },
  ],
};

export default spec;
