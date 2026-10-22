// Practice test 2, question 10: SSE-C keeps the encryption key in the company's own application while S3 encrypts.
// Captions follow the question's explanation. Additional source:
// - "S3 never stores the encryption key when you use SSE-C." / the key must be supplied on every download:
//   https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html
import type { Bilingual, IllustrationSpec } from "../types";

const keyUnused: Bilingual = {
  vi: "Khoá mã hoá hiện có trong ứng dụng on-premises không được dùng, trong khi yêu cầu là tiếp tục dùng chính khoá đó.",
  en: "The existing key in the on-premises application is not used, while the requirement is to keep using that key.",
};

const spec: IllustrationSpec = {
  questionId: 119516147,
  cols: 3.6,
  rows: 2.3,
  nodes: [
    { id: "keyapp", label: { vi: "Ứng dụng quản lý khoá", en: "Key application" }, sub: "on-premises", kind: "onprem", at: [0, 0.2] },
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: "AWS Cloud", at: [1.3, 0.2] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [2.6, 0.2] },
    { id: "s3key", label: "S3 managed key", sub: { vi: "S3 tự xoay vòng", en: "rotated by S3" }, at: [2.6, 1.3] },
    { id: "kms", label: "AWS KMS", sub: "KMS key", at: [2.6, 1.3] },
  ],
  links: [["keyapp", "app"]],
  scenarios: [
    {
      option: "c",
      hide: ["s3key", "kms"],
      steps: [
        {
          flow: ["keyapp", "app"],
          badge: { vi: "khoá", en: "key" },
          caption: {
            vi: "Khoá mã hoá vẫn nằm trong ứng dụng tuỳ chỉnh on-premises; công ty chỉ phải quản lý khoá.",
            en: "The encryption key stays in the custom on-premises application; the company only manages the key.",
          },
        },
        {
          flow: ["app", "s3"],
          badge: { vi: "dữ liệu + khoá", en: "data + key" },
          caption: {
            vi: "Với SSE-C, khoá được gửi kèm request; Amazon S3 mã hoá dữ liệu khi ghi xuống đĩa và giải mã khi bạn truy cập object.",
            en: "With SSE-C the key is provided as part of the request; Amazon S3 encrypts the data as it writes to disk and decrypts it when you access the object.",
          },
        },
        {
          mark: "s3",
          tone: "ok",
          badge: { vi: "không lưu khoá", en: "key not stored" },
          caption: {
            vi: "S3 không bao giờ lưu khoá khi dùng SSE-C; mỗi lần tải dữ liệu xuống phải cung cấp lại khoá.",
            en: "S3 never stores the key with SSE-C; the key must be supplied again for every download.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Khoá của công ty, việc mã hoá do S3 làm.", en: "The company's key, encryption done by S3." } },
    },
    {
      option: "a",
      hide: ["kms"],
      steps: [
        {
          flow: ["app", "s3", "s3key"],
          tone: "warn",
          caption: {
            vi: "Với SSE-S3, mỗi object được mã hoá bằng một khoá riêng, và khoá đó lại được mã hoá bằng một master key mà S3 xoay vòng định kỳ.",
            en: "With SSE-S3, each object is encrypted with a unique key, which is itself encrypted with a master key that S3 rotates regularly.",
          },
        },
        { mark: "keyapp", tone: "bad", badge: { vi: "không dùng", en: "unused" }, caption: keyUnused },
      ],
      verdict: { works: false, caption: { vi: "Khoá do S3 quản lý.", en: "Keys managed by S3." } },
    },
    {
      option: "b",
      hide: ["s3key"],
      steps: [
        {
          flow: ["app", "s3", "kms"],
          tone: "warn",
          caption: {
            vi: "Với SSE-KMS, Amazon S3 mã hoá dữ liệu object bằng AWS KMS key.",
            en: "With SSE-KMS, Amazon S3 encrypts the object data with AWS KMS keys.",
          },
        },
        { mark: "keyapp", tone: "bad", badge: { vi: "không dùng", en: "unused" }, caption: keyUnused },
      ],
      verdict: { works: false, caption: { vi: "Khoá nằm trong AWS KMS.", en: "Keys live in AWS KMS." } },
    },
    {
      option: "d",
      hide: ["s3key", "kms"],
      steps: [
        {
          mark: "app",
          tone: "warn",
          badge: { vi: "tự mã hoá", en: "encrypts" },
          caption: {
            vi: "Với client-side encryption, dữ liệu được mã hoá phía client trước khi gửi lên; bạn tự quản lý quá trình mã hoá, khoá và công cụ liên quan.",
            en: "With client-side encryption, data is encrypted on the client before upload; you manage the encryption process, the keys and the related tools.",
          },
        },
        {
          flow: ["app", "s3"],
          tone: "bad",
          badge: { vi: "đã mã hoá", en: "ciphertext" },
          caption: {
            vi: "S3 chỉ lưu dữ liệu đã mã hoá; việc mã hoá không được chuyển giao cho S3 như công ty mong muốn.",
            en: "S3 only stores the encrypted data; the encryption is not offloaded to S3 as the company wants.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Việc mã hoá không được chuyển cho S3.", en: "Encryption is not offloaded to S3." } },
    },
  ],
};

export default spec;
