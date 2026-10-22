// Practice test 2, question 24: one S3 access point per analytics service, each scoped to its own prefix.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516137,
  cols: 3.8,
  rows: 2.4,
  nodes: [
    { id: "svcA", label: "Service A", kind: "actor", at: [0, 0] },
    { id: "svcB", label: "Service B", kind: "actor", at: [0, 1.4] },
    { id: "apA", label: "Access point A", sub: "policy: a/*", at: [1.4, 0] },
    { id: "apB", label: "Access point B", sub: "policy: b/*", at: [1.4, 1.4] },
    { id: "users", label: "IAM users", sub: { vi: "inline · tên object", en: "inline, object names" }, at: [1.4, 0.7] },
    { id: "macie", label: "Amazon Macie", sub: { vi: "phân loại dữ liệu", en: "data classification" }, kind: "ghost", at: [1.4, 0.7] },
    { id: "bp", label: "Bucket policy", sub: { vi: "liệt kê ARN từng object", en: "lists every object ARN" }, at: [1.4, 0.7] },
    { id: "pa", label: "a/", sub: "prefix", kind: "data", at: [2.8, 0] },
    { id: "pb", label: "b/", sub: "prefix", kind: "data", at: [2.8, 1.4] },
  ],
  zones: [{ id: "bucket", label: { vi: "S3 bucket dùng chung", en: "Shared S3 bucket" }, tone: "group", from: [2.8, 0], to: [2.8, 1.4], pad: 12 }],
  scenarios: [
    {
      option: "b",
      hide: ["users", "macie", "bp"],
      steps: [
        {
          flow: [["svcA", "apA", "pa"], ["svcB", "apB", "pb"]],
          caption: {
            vi: "Mỗi dịch vụ có access point riêng; access point policy giới hạn quyền truy cập trong đúng prefix của dịch vụ đó.",
            en: "Each service gets its own access point, whose access point policy scopes access down to that service's prefix.",
          },
        },
        {
          stop: ["apA", "pb"],
          badge: { vi: "bị từ chối", en: "denied" },
          caption: {
            vi: "Service A không đọc hay sửa được dữ liệu dưới b/. Bucket policy không phải phình to, cũng không phải quản lý quyền theo từng object.",
            en: "Service A cannot see or modify data under b/. The bucket policy stays simple and there are no per-object permissions to manage.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Ranh giới quyền tách biệt cho từng dịch vụ.", en: "An isolated permission boundary per service." } },
    },
    {
      option: "a",
      hide: ["apA", "apB", "macie", "bp"],
      steps: [
        {
          flow: [["svcA", "users", "pa"], ["svcB", "users", "pb"]],
          tone: "warn",
          caption: {
            vi: "IAM policy có thể giới hạn theo prefix, nhưng ở đây là inline policy gắn với IAM user và ghi cứng tên object.",
            en: "IAM policies can restrict prefixes, but here they are inline policies on IAM users that hard-code object names.",
          },
        },
        {
          mark: "users",
          tone: "bad",
          badge: { vi: "sửa tay liên tục", en: "constant edits" },
          caption: {
            vi: "Khi tên object thay đổi hay dịch vụ phát triển, policy phải cập nhật thủ công liên tục; khó mở rộng và trái thực hành tốt.",
            en: "As object names change or services evolve, the policies need constant manual updates; this does not scale and violates best practices.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Vận hành phức tạp, khó mở rộng.", en: "Complex to operate, does not scale." } },
    },
    {
      option: "c",
      hide: ["apA", "apB", "users", "bp"],
      steps: [
        {
          stop: ["svcA", "macie"],
          caption: {
            vi: "Amazon Macie dùng để phát hiện và phân loại dữ liệu nhạy cảm như PII; nó không tự áp đặt quyền S3 hay gán policy theo prefix.",
            en: "Amazon Macie discovers and classifies sensitive data such as PII; it cannot enforce S3 permissions or assign per-prefix policies.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Macie không kiểm soát truy cập.", en: "Macie does not control access." } },
    },
    {
      option: "d",
      hide: ["apA", "apB", "users", "macie"],
      steps: [
        {
          flow: [["svcA", "bp", "pa"], ["svcB", "bp", "pb"]],
          tone: "warn",
          caption: {
            vi: "Một bucket policy duy nhất liệt kê ARN của từng object dưới mỗi prefix có thể giới hạn quyền.",
            en: "A single bucket policy listing every object ARN under each prefix can restrict access.",
          },
        },
        {
          mark: "bp",
          tone: "bad",
          badge: { vi: "không mở rộng được", en: "does not scale" },
          caption: {
            vi: "Số object và dịch vụ tăng thì policy phẳng ngày càng cồng kềnh và dễ sai; mỗi thay đổi đều phải triển khai lại toàn bộ policy.",
            en: "As objects and services grow, the flat policy becomes cumbersome and error-prone, and every change means redeploying the whole policy.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Khó duy trì theo thời gian.", en: "Hard to maintain over time." } },
    },
  ],
};

export default spec;
