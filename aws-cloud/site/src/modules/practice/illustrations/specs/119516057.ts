// Practice test 2, question 16: a Lambda function in account A reads an S3 bucket in account B.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516057,
  cols: 4.6,
  rows: 1.6,
  nodes: [
    { id: "lam", label: "Lambda function", kind: "actor", at: [0, 0.35] },
    { id: "role", label: "Execution role", sub: { vi: "IAM policy cho phép S3", en: "IAM policy allows S3" }, at: [1.2, 0.35] },
    { id: "fed", label: "Identity federation", sub: { vi: "không cần thiết", en: "not needed" }, kind: "ghost", at: [1.2, 0.35] },
    { id: "bp", label: "Bucket policy", sub: { vi: "cấp cho execution role", en: "grants the role" }, at: [2.45, 0.35] },
    { id: "s3", label: "S3 bucket", kind: "data", at: [3.6, 0.35] },
  ],
  zones: [
    { id: "acctA", label: { vi: "Tài khoản A", en: "Account A" }, tone: "account", from: [0, 0.35], to: [1.2, 0.35], pad: 22 },
    { id: "acctB", label: { vi: "Tài khoản B", en: "Account B" }, tone: "account", from: [2.45, 0.35], to: [3.6, 0.35], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["fed"],
      steps: [
        {
          flow: ["lam", "role"],
          badge: "IAM ✓",
          caption: {
            vi: "Tạo IAM role cấp quyền truy cập S3 bucket và đặt nó làm execution role của Lambda function.",
            en: "An IAM role that grants access to the S3 bucket is created and set as the Lambda function's execution role.",
          },
        },
        {
          flow: ["role", "bp", "s3"],
          badge: { vi: "cả hai phía ✓", en: "both sides ✓" },
          caption: {
            vi: "Vì role và bucket ở hai tài khoản khác nhau, bucket policy cũng phải cấp quyền cho execution role. Khi cả hai phía cho phép, Lambda truy cập được bucket.",
            en: "Because the role and the bucket are in different accounts, the bucket policy must also grant access to the execution role. With both sides allowing it, Lambda reaches the bucket.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Quyền ở cả IAM role và bucket policy.", en: "Permissions on both the IAM role and the bucket policy." } },
    },
    {
      option: "c",
      hide: ["fed"],
      steps: [
        { flow: ["lam", "role"], badge: "IAM ✓", caption: { vi: "Execution role có quyền truy cập S3 bucket.", en: "The execution role has permissions for the S3 bucket." } },
        {
          stop: ["role", "bp"],
          badge: { vi: "chưa cấp", en: "not granted" },
          caption: {
            vi: "Nhưng khi execution role và bucket thuộc hai tài khoản khác nhau, chỉ quyền trên role là chưa đủ: bucket policy cũng phải cấp quyền cho role đó.",
            en: "But when the execution role and the bucket are in different accounts, permissions on the role alone are not enough: the bucket policy must also grant that role access.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Thiếu quyền ở phía bucket.", en: "Missing the bucket-side grant." } },
    },
    {
      option: "b",
      hide: ["role"],
      steps: [
        {
          stop: ["lam", "fed"],
          caption: {
            vi: "Tiền đề của phương án sai: Lambda truy cập được tài nguyên ở tài khoản khác, nên không có giới hạn nào cần dùng identity federation để vượt qua.",
            en: "The premise is wrong: Lambda can access resources across AWS accounts, so there is no limitation for identity federation to work around.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phát biểu không đúng.", en: "An incorrect statement." } },
    },
    {
      option: "d",
      hide: ["role", "fed", "bp"],
      steps: [
        {
          flow: ["lam", "s3"],
          tone: "warn",
          badge: { vi: "công khai", en: "public" },
          caption: {
            vi: "Bucket công khai thì Lambda đọc được, nhưng ai khác cũng vậy.",
            en: "A public bucket is readable by the Lambda function, and by everyone else too.",
          },
        },
        {
          mark: "s3",
          tone: "bad",
          caption: {
            vi: "Đặt S3 bucket ở chế độ công khai cho trường hợp này là thực hành bảo mật kém; việc đó chỉ dành cho số ít trường hợp như host website trên S3.",
            en: "Making the S3 bucket public for this use case is a security bad practice; it is reserved for a few cases such as hosting a website on S3.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Mở dữ liệu cho mọi người.", en: "Exposes the data to everyone." } },
    },
  ],
};

export default spec;
