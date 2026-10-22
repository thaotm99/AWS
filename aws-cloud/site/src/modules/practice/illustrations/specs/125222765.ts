// Practice test 1, question 22: SSE-KMS gives an audit trail of when the key was used and by whom.
// Captions follow the question's explanation. Additional source:
// - "To audit the usage of your AWS KMS keys for your SSE-KMS encrypted data, you can use AWS CloudTrail logs." (CloudTrail node):
//   https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222765,
  cols: 3.8,
  rows: 2.6,
  nodes: [
    { id: "own", label: { vi: "Khoá của startup", en: "Startup's own key" }, kind: "ghost", at: [0, 1.6] },
    { id: "app", label: { vi: "Công cụ chẩn đoán", en: "Diagnostic tool" }, sub: { vi: "dữ liệu sức khoẻ", en: "health records" }, kind: "actor", at: [0, 0.4] },
    { id: "s3", label: "Amazon S3", sub: "backup", kind: "data", at: [1.4, 0.4] },
    { id: "kms", label: "AWS KMS", sub: "KMS key", at: [2.8, 0] },
    { id: "s3k", label: "S3 managed key", at: [2.8, 0] },
    { id: "ct", label: "AWS CloudTrail", sub: { vi: "ai dùng key, khi nào", en: "who used the key, when" }, at: [2.8, 1.4] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["own", "s3k"],
      steps: [
        { flow: ["app", "s3"], caption: { vi: "Bản sao lưu dữ liệu người dùng được ghi vào S3.", en: "Backups of user data are written to S3." } },
        {
          flow: ["s3", "kms"],
          badge: { vi: "mã hoá", en: "encrypt" },
          caption: {
            vi: "Với SSE-KMS, S3 mã hoá bằng KMS key, có thể là customer managed key đã tạo sẵn; startup không phải tự cung cấp khoá.",
            en: "With SSE-KMS, S3 encrypts with a KMS key, which can be a customer managed key created beforehand; the startup does not supply its own keys.",
          },
        },
        {
          flow: ["kms", "ct"],
          badge: { vi: "ai · khi nào", en: "who · when" },
          caption: {
            vi: "SSE-KMS cung cấp audit trail cho biết key được dùng khi nào và bởi ai.",
            en: "SSE-KMS provides an audit trail that shows when the key was used and by whom.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Mã hoá kèm nhật ký dùng key.", en: "Encryption with a key-usage trail." } },
    },
    {
      option: "a",
      hide: ["own", "kms"],
      steps: [
        { flow: ["app", "s3", "s3k"], caption: { vi: "Với SSE-S3, mỗi object được mã hoá bằng một khoá riêng do S3 quản lý.", en: "With SSE-S3, each object is encrypted with a unique key managed by S3." } },
        { mark: "ct", tone: "dim", badge: { vi: "không có nhật ký key", en: "no key trail" }, caption: { vi: "Nhưng SSE-S3 không cung cấp audit trail về việc sử dụng khoá mã hoá.", en: "But SSE-S3 does not provide an audit trail of encryption key usage." } },
      ],
      verdict: { works: false, caption: { vi: "Không có audit trail cho khoá.", en: "No audit trail for the key." } },
    },
    {
      option: "c",
      hide: ["kms", "s3k"],
      steps: [
        { flow: ["own", "app", "s3"], tone: "warn", badge: { vi: "khoá kèm request", en: "key in request" }, caption: { vi: "Với SSE-C, bạn quản lý khoá còn S3 lo mã hoá khi ghi và giải mã khi đọc.", en: "With SSE-C, you manage the keys and S3 handles encryption on write and decryption on read." } },
        {
          mark: "own",
          tone: "bad",
          caption: {
            vi: "Startup phải tự cung cấp khoá — điều họ không muốn — và SSE-C cũng không cung cấp audit trail về việc sử dụng khoá.",
            en: "The startup would have to provide the keys — which it does not want — and SSE-C does not provide an audit trail of key usage.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phải tự cấp khoá, không có audit trail.", en: "Own keys, no audit trail." } },
    },
    {
      option: "d",
      hide: ["kms", "s3k"],
      steps: [
        { flow: ["own", "app"], tone: "warn", badge: { vi: "tự mã hoá", en: "encrypts" }, caption: { vi: "Client-side encryption mã hoá dữ liệu bằng khoá của client trước khi tải lên.", en: "Client-side encryption encrypts the data with client-provided keys before upload." } },
        { flow: ["app", "s3"], tone: "warn", caption: { vi: "S3 chỉ nhận dữ liệu đã mã hoá.", en: "S3 only receives encrypted data." } },
        { mark: "own", tone: "bad", caption: { vi: "Bị loại vì startup không muốn tự cung cấp khoá mã hoá.", en: "Ruled out because the startup does not want to provide the encryption keys." } },
      ],
      verdict: { works: false, caption: { vi: "Startup phải tự cấp khoá.", en: "The startup must supply keys." } },
    },
  ],
};

export default spec;
