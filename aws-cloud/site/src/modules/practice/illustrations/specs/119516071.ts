// Practice test 2, question 46: S3 replication to us-west-1 with SSE-KMS under an AWS KMS multi-Region key.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516071,
  cols: 4.2,
  rows: 2.6,
  nodes: [
    { id: "old", label: { vi: "Bucket hiện tại", en: "Current bucket" }, sub: "SSE-KMS", kind: "data", at: [0, 0.2] },
    { id: "srk", label: "KMS key", sub: "single-Region", at: [0, 1.6] },
    { id: "newb", label: { vi: "Bucket mới", en: "New bucket" }, sub: "SSE-KMS · MRK", kind: "data", at: [1.4, 0.2] },
    { id: "lam", label: "AWS Lambda", sub: { vi: "chép mỗi ngày", en: "daily copy" }, at: [1.4, 0.2] },
    { id: "mrkE", label: "KMS key", sub: "multi-Region primary", at: [1.4, 1.6] },
    { id: "dest", label: { vi: "Bucket đích", en: "Destination bucket" }, kind: "data", at: [3.2, 0.2] },
    { id: "mrkW", label: "KMS key", sub: "multi-Region replica", at: [3.2, 1.6] },
    { id: "srkW", label: "KMS key", sub: { vi: "chia sẻ từ us-east-1?", en: "shared from us-east-1?" }, kind: "ghost", at: [3.2, 1.6] },
  ],
  zones: [
    { id: "east", label: "us-east-1", tone: "region", from: [0, 0.2], to: [1.4, 1.6], pad: 22 },
    { id: "west", label: "us-west-1", tone: "region", from: [3.2, 0.2], to: [3.2, 1.6], pad: 22 },
  ],
  links: [
    ["newb", "mrkE"],
    ["dest", "mrkW"],
  ],
  scenarios: [
    {
      option: "b",
      hide: ["lam", "srkW"],
      steps: [
        {
          flow: ["old", "newb"],
          badge: { vi: "chép", en: "copy" },
          caption: {
            vi: "Dữ liệu hiện có được mã hoá bằng key chỉ dùng trong us-east-1, nên được chép sang một bucket mới trong us-east-1 bật SSE-KMS với multi-Region key.",
            en: "The existing data was encrypted with a key restricted to us-east-1, so it is copied into a new us-east-1 bucket that uses SSE-KMS with a multi-Region key.",
          },
        },
        {
          flow: ["newb", "dest"],
          badge: "replication",
          caption: {
            vi: "Bucket mới bật replication sang bucket ở us-west-1, nên dữ liệu có sẵn ở Region khác cho sao lưu và khôi phục.",
            en: "The new bucket replicates to a bucket in us-west-1, so the data is available in another Region for backup and recovery.",
          },
        },
        {
          mark: ["mrkE", "mrkW"],
          tone: "ok",
          badge: { vi: "cùng key ID", en: "same key ID" },
          caption: {
            vi: "Các multi-Region key liên quan có cùng key material và key ID, nên dữ liệu được mã hoá và giải mã bằng cùng một key ở cả hai Region.",
            en: "Related multi-Region keys share the same key material and key ID, so the data is encrypted and decrypted with the same key in both Regions.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Nhân bản liên Region, cùng một key.", en: "Cross-Region replication, one key." } },
    },
    {
      option: "c",
      hide: ["newb", "lam", "mrkE", "mrkW", "srkW"],
      steps: [
        {
          flow: ["old", "dest"],
          tone: "warn",
          badge: "batch replication",
          caption: {
            vi: "S3 Batch Replication hoàn toàn chép được dữ liệu hiện có sang bucket ở us-west-1.",
            en: "S3 Batch Replication can certainly replicate the existing data to a bucket in us-west-1.",
          },
        },
        {
          mark: "srk",
          tone: "bad",
          badge: { vi: "không chuyển đổi được", en: "cannot convert" },
          caption: {
            vi: "Nhưng không thể chuyển một single-Region key có sẵn thành multi-Region key; thiết kế này giữ nguyên tính lưu trú và chủ quyền dữ liệu của mọi dữ liệu đã được key đó bảo vệ.",
            en: "But an existing single-Region key cannot be converted to a multi-Region key; this keeps the residency and sovereignty properties of all data it already protects.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không đổi được loại key.", en: "The key type cannot change." } },
    },
    {
      option: "d",
      hide: ["newb", "lam", "mrkE", "mrkW"],
      steps: [
        { flow: ["old", "dest"], tone: "warn", badge: "replication", caption: { vi: "Bucket hiện tại bật replication sang us-west-1.", en: "The current bucket replicates to us-west-1." } },
        {
          stop: ["srk", "srkW"],
          caption: {
            vi: "Không thể chia sẻ một KMS key sang Region khác, nên không có cùng một key ở cả hai Region.",
            en: "A KMS key cannot be shared to another Region, so there is no single key in both Regions.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "KMS key không chia sẻ sang Region khác.", en: "KMS keys cannot be shared across Regions." } },
    },
    {
      option: "a",
      hide: ["newb", "mrkE", "mrkW", "srkW"],
      steps: [
        {
          flow: ["old", "lam", "dest"],
          tone: "warn",
          badge: { vi: "mỗi ngày", en: "daily" },
          caption: {
            vi: "CloudWatch scheduled rule gọi Lambda function mỗi ngày để chép dữ liệu sang bucket ở us-west-1.",
            en: "A CloudWatch scheduled rule invokes a Lambda function every day to copy the data to the us-west-1 bucket.",
          },
        },
        {
          mark: "dest",
          tone: "bad",
          badge: { vi: "mất dữ liệu", en: "data loss" },
          caption: {
            vi: "Chép mỗi ngày một lần thì khi có thảm hoạ sẽ mất đáng kể dữ liệu; tự xây cơ chế nhân bản tin cậy cũng tốn nhiều công phát triển.",
            en: "Copying once a day means significant data loss in a disaster, and building reliable replication by hand takes significant development effort.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Mất dữ liệu và tốn công phát triển.", en: "Data loss and development effort." } },
    },
  ],
};

export default spec;
