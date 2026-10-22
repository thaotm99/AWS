// Practice test 6, question 54: an origin access identity (OAI) and a bucket policy so users reach S3 only through CloudFront.
// Captions follow the question's explanation. Additional source:
// - CloudFront now recommends origin access control (OAC) over the legacy OAI:
//   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168931,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.4] },
    { id: "cf", label: "CloudFront", sub: "distribution", at: [1.5, 0.2] },
    { id: "role", label: "IAM role", sub: { vi: "gắn vào CloudFront?", en: "on CloudFront?" }, kind: "ghost", at: [2.6, 0.2] },
    { id: "sg", label: "Security group", sub: { vi: "của bucket?", en: "on a bucket?" }, kind: "ghost", at: [2.6, 0.2] },
    { id: "s3", label: "Amazon S3", sub: { vi: "file tĩnh", en: "static files" }, kind: "data", at: [3, 1.4] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["role", "sg"],
      steps: [
        {
          flow: ["users", "cf"],
          caption: {
            vi: "Người dùng truy cập website qua URL của CloudFront.",
            en: "Users open the website through the CloudFront URL.",
          },
        },
        {
          flow: ["cf", "s3"],
          badge: "OAI",
          caption: {
            vi: "CloudFront dùng origin access identity (OAI), một user đặc biệt của CloudFront; bucket policy chỉ cho phép OAI này đọc file.",
            en: "CloudFront uses an origin access identity (OAI), a special CloudFront user; the bucket policy lets only this OAI read the files.",
          },
        },
        {
          flow: ["s3", "cf", "users"],
          back: true,
          caption: {
            vi: "File được trả về cho người dùng qua CloudFront.",
            en: "The files reach users through CloudFront.",
          },
        },
        {
          stop: ["users", "s3"],
          badge: { vi: "URL S3 trực tiếp", en: "direct S3 URL" },
          caption: {
            vi: "Request dùng URL S3 trực tiếp bị từ chối vì bucket policy chỉ cấp quyền cho OAI.",
            en: "A request with the direct S3 URL is denied, because the bucket policy grants access only to the OAI.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chỉ truy cập được qua CloudFront. Hiện AWS khuyến nghị dùng origin access control (OAC), phiên bản kế nhiệm của OAI.",
          en: "Access only through CloudFront. AWS now recommends origin access control (OAC), the successor to OAI.",
        },
      },
    },
    {
      option: "a",
      hide: ["sg"],
      steps: [
        { flow: ["users", "cf"], caption: { vi: "Người dùng truy cập qua CloudFront.", en: "Users come in through CloudFront." } },
        {
          stop: ["cf", "role"],
          caption: {
            vi: "Không thể gắn IAM role vào CloudFront distribution, nên bucket policy không có role nào để cấp quyền.",
            en: "You cannot attach an IAM role to a CloudFront distribution, so the bucket policy has no role to authorize.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Cơ chế này không tồn tại; cần dùng OAI.",
          en: "This mechanism does not exist; an OAI is needed.",
        },
      },
    },
    {
      option: "b",
      hide: ["role"],
      steps: [
        { flow: ["users", "cf"], caption: { vi: "Người dùng truy cập qua CloudFront.", en: "Users come in through CloudFront." } },
        {
          stop: ["cf", "sg"],
          caption: {
            vi: "Bucket S3 không có security group, nên không thể giới hạn lưu lượng theo security group của CloudFront.",
            en: "S3 buckets do not have security groups, so traffic cannot be limited to a CloudFront security group.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "S3 không dùng security group.",
          en: "S3 does not use security groups.",
        },
      },
    },
    {
      option: "c",
      hide: ["role", "sg"],
      steps: [
        { flow: ["users", "cf", "s3"], caption: { vi: "Truy cập qua CloudFront vẫn hoạt động.", en: "Access through CloudFront still works." } },
        {
          flow: ["users", "s3"],
          tone: "bad",
          badge: "public",
          caption: {
            vi: "Nhưng bucket public thì ai cũng truy cập trực tiếp được, bỏ qua CloudFront.",
            en: "But a public bucket can be accessed directly by anyone, bypassing CloudFront.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Ngược lại với yêu cầu.",
          en: "The opposite of the requirement.",
        },
      },
    },
  ],
};

export default spec;
