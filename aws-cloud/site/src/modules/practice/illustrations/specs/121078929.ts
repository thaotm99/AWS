// Practice test 3, question 40: a serverless web app with static content on S3, dynamic content from Lambda and
// DynamoDB, and CloudFront in front. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const staticPath: StepSpec = {
  flow: ["users", "cf", "s3"],
  badge: { vi: "tĩnh", en: "static" },
  caption: {
    vi: "Nội dung tĩnh nằm trên Amazon S3, cách phân phối nội dung tĩnh tiết kiệm và nhanh; CloudFront đưa nội dung tới người dùng ở nhiều vùng địa lý với độ trễ thấp.",
    en: "Static content sits on Amazon S3, a cost-effective and fast way to serve static content; CloudFront delivers it to users in different geographies with low latency.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078929,
  cols: 4.5,
  rows: 2.8,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1] },
    { id: "cf", label: "Amazon CloudFront", at: [1.2, 1] },
    { id: "s3", label: "Amazon S3", sub: { vi: "nội dung tĩnh", en: "static content" }, kind: "data", at: [2.4, 0.1] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "nội dung động", en: "dynamic content" }, at: [2.4, 1.9] },
    { id: "ddb", label: "Amazon DynamoDB", kind: "data", at: [3.5, 1.9] },
    { id: "ec2", label: "Amazon EC2", sub: { vi: "nội dung động", en: "dynamic content" }, at: [2.4, 1.9] },
    { id: "ec2all", label: "Amazon EC2", sub: { vi: "tĩnh + động", en: "static + dynamic" }, at: [2.4, 1.9] },
    { id: "rds", label: "Amazon RDS", kind: "data", at: [3.5, 1.9] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["ec2", "ec2all", "rds"],
      steps: [
        staticPath,
        {
          flow: ["users", "cf", "lambda", "ddb"],
          badge: { vi: "động", en: "dynamic" },
          caption: {
            vi: "Nội dung động do AWS Lambda tạo cùng Amazon DynamoDB, một tổ hợp serverless; CloudFront đứng trước Lambda để phân phối toàn cầu.",
            en: "Dynamic content comes from AWS Lambda with Amazon DynamoDB, a serverless pair; CloudFront sits in front of Lambda for global distribution.",
          },
        },
        {
          flow: ["ddb", "lambda", "cf", "users"],
          back: true,
          caption: {
            vi: "Không có máy chủ nào phải quản lý ở bất kỳ tầng nào.",
            en: "There are no servers to manage at any layer.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Serverless và tiết kiệm chi phí.", en: "Serverless and cost-effective." } },
    },
    {
      option: "a",
      hide: ["lambda", "ddb", "ec2", "ec2all", "rds"],
      steps: [
        staticPath,
        {
          stop: ["cf", "s3"],
          badge: { vi: "động", en: "dynamic" },
          caption: {
            vi: "Amazon S3 không phù hợp để lưu trữ nội dung động, nên phần động của ứng dụng không có nơi chạy.",
            en: "Amazon S3 is not the right fit for hosting dynamic content, so the dynamic part of the application has nowhere to run.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "S3 không phục vụ nội dung động.", en: "S3 does not serve dynamic content." } },
    },
    {
      option: "c",
      hide: ["lambda", "ddb", "ec2all"],
      steps: [
        staticPath,
        {
          flow: ["users", "cf", "ec2", "rds"],
          tone: "warn",
          badge: { vi: "động", en: "dynamic" },
          caption: {
            vi: "Nội dung động được tạo trên Amazon EC2 cùng Amazon RDS, với CloudFront phía trước.",
            en: "Dynamic content is generated on Amazon EC2 with Amazon RDS, with CloudFront in front.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          caption: {
            vi: "Công ty cần giải pháp serverless, mà EC2 không phải serverless: khách hàng phải tự quản lý các instance.",
            en: "The company wants a serverless solution, and EC2 is not serverless: customers manage the instances themselves.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phải serverless.", en: "Not serverless." } },
    },
    {
      option: "d",
      hide: ["s3", "lambda", "ddb", "ec2"],
      steps: [
        {
          flow: ["users", "cf", "ec2all", "rds"],
          tone: "warn",
          caption: {
            vi: "Cả nội dung tĩnh và động đều do EC2 phục vụ, với RDS làm cơ sở dữ liệu và CloudFront phía trước.",
            en: "Both static and dynamic content are served from EC2, with RDS as the database and CloudFront in front.",
          },
        },
        {
          mark: "ec2all",
          tone: "bad",
          caption: {
            vi: "Giải pháp chạy được nhưng không tối ưu chi phí: nội dung tĩnh trên S3 rẻ hơn và được phân phối nhanh hơn so với lấy từ máy chủ EC2.",
            en: "It works but is not cost-effective or optimal: static content on S3 is cheaper and is served faster than from an EC2 server.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không serverless, không tối ưu chi phí.", en: "Neither serverless nor cost-optimal." } },
    },
  ],
};

export default spec;
