// Practice test 1, question 51: spread uploads across customer prefixes in one bucket to scale S3 request rates.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const TARGETS = ["pA", "pB", "pC", "bA", "bB", "bC", "dA", "dB", "dC", "efs"];

const buckets = (option: string, ids: string[], flowCaption: Bilingual): ScenarioSpec => ({
  option,
  hide: ["bucket", ...TARGETS.filter((t) => !ids.includes(t))],
  steps: [
    { flow: ids.map((id) => ["app", id]), times: 2, tone: "warn", caption: flowCaption },
    {
      mark: ids,
      tone: "bad",
      badge: { vi: "tên toàn cục", en: "global names" },
      caption: {
        vi: "Tên bucket phải là duy nhất trên toàn cầu nên tạo bucket liên tục là cách dùng tài nguyên kém hiệu quả; cũng không cần thiết vì prefix đã tăng được hiệu năng.",
        en: "Bucket names are globally unique, so creating buckets continually is an inefficient use of resources — and unnecessary, since prefixes already raise performance.",
      },
    },
  ],
  verdict: { works: false, caption: { vi: "Kém hiệu quả và không cần thiết.", en: "Inefficient and unnecessary." } },
});

const spec: IllustrationSpec = {
  questionId: 125222665,
  cols: 3.2,
  rows: 3.4,
  nodes: [
    { id: "app", label: { vi: "Dịch vụ lưu file", en: "File-hosting service" }, kind: "actor", at: [0, 1.3] },
    { id: "pA", label: "customerA/", sub: "prefix", kind: "data", at: [2, 0.2] },
    { id: "pB", label: "customerB/", sub: "prefix", kind: "data", at: [2, 1.3] },
    { id: "pC", label: "customerC/", sub: "prefix", kind: "data", at: [2, 2.4] },
    { id: "bA", label: "Bucket", sub: { vi: "khách hàng A", en: "customer A" }, kind: "data", at: [2, 0.2] },
    { id: "bB", label: "Bucket", sub: { vi: "khách hàng B", en: "customer B" }, kind: "data", at: [2, 1.3] },
    { id: "bC", label: "Bucket", sub: { vi: "khách hàng C", en: "customer C" }, kind: "data", at: [2, 2.4] },
    { id: "dA", label: "Bucket", sub: { vi: "ngày 1", en: "day 1" }, kind: "data", at: [2, 0.2] },
    { id: "dB", label: "Bucket", sub: { vi: "ngày 2", en: "day 2" }, kind: "data", at: [2, 1.3] },
    { id: "dC", label: "Bucket", sub: { vi: "ngày 3", en: "day 3" }, kind: "data", at: [2, 2.4] },
    { id: "efs", label: "Amazon EFS", kind: "data", at: [2, 1.3] },
  ],
  zones: [{ id: "bucket", label: { vi: "Một S3 bucket", en: "One S3 bucket" }, tone: "group", from: [2, 0.2], to: [2, 2.4], pad: 24 }],
  scenarios: [
    {
      option: "d",
      hide: ["bA", "bB", "bC", "dA", "dB", "dC", "efs"],
      steps: [
        {
          flow: [["app", "pA"], ["app", "pB"], ["app", "pC"]],
          times: 3,
          badge: { vi: "3.500 PUT/s mỗi prefix", en: "3,500 PUT/s each" },
          caption: {
            vi: "S3 đạt ít nhất 3.500 request PUT/COPY/POST/DELETE mỗi giây cho mỗi prefix, và số prefix trong bucket không giới hạn; chia file theo prefix của từng khách hàng nhân khả năng ghi lên.",
            en: "S3 supports at least 3,500 PUT/COPY/POST/DELETE requests per second per prefix, with no limit on the number of prefixes; customer prefixes multiply the write capacity.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Một bucket, nhiều prefix.", en: "One bucket, many prefixes." } },
    },
    buckets("a", ["bA", "bB", "bC"], { vi: "Mỗi khách hàng một bucket riêng.", en: "One new bucket per customer." }),
    buckets("b", ["dA", "dB", "dC"], { vi: "Mỗi ngày một bucket mới cho dữ liệu của ngày đó.", en: "One new bucket for each day's data." }),
    {
      option: "c",
      hide: ["bucket", "pA", "pB", "pC", "bA", "bB", "bC", "dA", "dB", "dC"],
      steps: [
        { flow: ["app", "efs"], times: 3, tone: "warn", caption: { vi: "File của khách hàng được lưu trên Amazon EFS thay cho S3.", en: "Customer files are stored on Amazon EFS instead of S3." } },
        { mark: "efs", tone: "bad", badge: { vi: "đắt hơn", en: "costlier" }, caption: { vi: "Amazon EFS là lựa chọn lưu trữ đắt hơn Amazon S3, nên bị loại.", en: "Amazon EFS is a costlier storage option than Amazon S3, so it is ruled out." } },
      ],
      verdict: { works: false, caption: { vi: "Không tối ưu chi phí.", en: "Not cost-optimal." } },
    },
  ],
};

export default spec;
