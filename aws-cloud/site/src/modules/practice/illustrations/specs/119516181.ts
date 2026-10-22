// Practice test 2, question 57: share an encrypted RDS snapshot and its KMS key with the auditor's account.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516181,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "rds", label: "RDS DB", sub: { vi: "dữ liệu kế toán", en: "accounting data" }, kind: "data", at: [0, 0.2] },
    { id: "snap", label: { vi: "Snapshot mã hoá", en: "Encrypted snapshot" }, at: [1.3, 0.2] },
    { id: "s3", label: "Amazon S3", sub: { vi: "RDS tự quản lý", en: "managed by RDS" }, kind: "ghost", at: [1.3, 0.2] },
    { id: "txt", label: { vi: "File văn bản", en: "Text files" }, sub: "Amazon S3", kind: "data", at: [1.3, 0.2] },
    { id: "rr", label: "Read replica", at: [1.3, 0.2] },
    { id: "kms", label: "KMS key", sub: "key policy", at: [1.3, 1.4] },
    { id: "aud", label: { vi: "Kiểm toán viên", en: "Auditor" }, sub: { vi: "bản sao riêng", en: "own copy" }, kind: "actor", at: [3, 0.2] },
  ],
  zones: [
    { id: "own", label: { vi: "Tài khoản công ty", en: "Company account" }, tone: "account", from: [0, 0.2], to: [1.3, 1.4], pad: 22 },
    { id: "audA", label: { vi: "Tài khoản kiểm toán", en: "Auditor account" }, tone: "account", from: [3, 0.2], to: [3, 0.2], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["s3", "txt", "rr"],
      steps: [
        { flow: ["rds", "snap"], badge: { vi: "mã hoá", en: "encrypted" }, caption: { vi: "Tạo snapshot mã hoá của database.", en: "An encrypted snapshot of the database is created." } },
        {
          flow: ["snap", "aud"],
          badge: { vi: "chia sẻ", en: "shared" },
          caption: {
            vi: "Snapshot được chia sẻ với tài khoản AWS của kiểm toán viên, cho họ một bản sao database của riêng mình.",
            en: "The snapshot is shared with the auditor's AWS account, giving the auditor its own copy of the database.",
          },
        },
        {
          flow: ["kms", "aud"],
          badge: { vi: "quyền dùng key", en: "key access" },
          caption: {
            vi: "KMS key đã dùng để mã hoá snapshot được chia sẻ bằng cách thêm tài khoản kiểm toán vào key policy, để họ dùng được snapshot.",
            en: "The KMS key that encrypted the snapshot is shared by adding the auditor's account to the key policy, so the auditor can use the snapshot.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Bản sao riêng, vẫn được mã hoá.", en: "Its own copy, still encrypted." } },
    },
    {
      option: "b",
      hide: ["snap", "txt", "rr", "kms"],
      steps: [
        {
          stop: ["aud", "s3"],
          caption: {
            vi: "RDS lưu snapshot trong S3 thay cho bạn, nhưng bạn không truy cập trực tiếp được các object đó, nên không thể cấp quyền cho kiểm toán viên vào chúng.",
            en: "RDS stores snapshots in S3 on your behalf, but you have no direct access to those objects, so they cannot be granted to the auditor.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không truy cập trực tiếp được.", en: "No direct access." } },
    },
    {
      option: "c",
      hide: ["snap", "s3", "rr", "kms"],
      steps: [
        { flow: ["rds", "txt", "aud"], tone: "warn", caption: { vi: "Xuất dữ liệu ra file văn bản trên S3 rồi tạo IAM user cho kiểm toán viên: làm được.", en: "Exporting to text files in S3 with a new IAM user for the auditor: feasible." } },
        {
          mark: "txt",
          tone: "bad",
          badge: { vi: "xuất hàng loạt", en: "bulk export" },
          caption: {
            vi: "Nhưng tốn nhiều công không cần thiết, và dữ liệu xuất hàng loạt ra file văn bản thì khó kiểm toán.",
            en: "But it is a lot of unnecessary work, and bulk data exported to text files is hard to audit.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Khả thi nhưng không tối ưu.", en: "Feasible, not optimal." } },
    },
    {
      option: "d",
      hide: ["snap", "s3", "txt", "kms"],
      steps: [
        { flow: ["rds", "rr"], tone: "warn", caption: { vi: "Read replica dùng để mở rộng cho tải đọc nặng.", en: "Read replicas scale out read-heavy workloads." } },
        {
          stop: ["aud", "rr"],
          caption: {
            vi: "Tạo read replica cho việc kiểm toán là quá mức cần thiết, và kiểm toán viên cần bản sao database của riêng mình, điều replica không đáp ứng được.",
            en: "A read replica for an audit is overkill, and the auditor needs its own copy of the database, which a replica does not give.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phải bản sao riêng.", en: "Not the auditor's own copy." } },
    },
  ],
};

export default spec;
