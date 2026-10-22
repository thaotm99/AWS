// Practice test 5, question 56: Route 53 active-passive failover to a static error page on S3.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const users = { vi: "Người dùng", en: "Users" };
const primaryOk: StepSpec = {
  flow: ["users", "r53", "alb"],
  caption: {
    vi: "Route 53 trả về bản ghi trỏ tới Application Load Balancer của website chính.",
    en: "Route 53 answers with the record pointing to the primary website's Application Load Balancer.",
  },
};
const albDown: StepSpec = {
  mark: "alb",
  tone: "bad",
  badge: "unhealthy",
  caption: {
    vi: "Health check của Route 53 xác định endpoint ALB không khoẻ mạnh.",
    en: "A Route 53 health check finds the ALB endpoint unhealthy.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119517525,
  cols: 3.8,
  rows: 2.6,
  nodes: [
    { id: "users", label: users, kind: "actor", at: [0, 1.05] },
    { id: "r53", label: "Route 53", sub: "DNS", at: [1.3, 1.05] },
    { id: "alb", label: "Application LB", sub: { vi: "website chính", en: "primary website" }, at: [2.7, 0.2] },
    { id: "s3", label: "S3 bucket", sub: { vi: "trang lỗi tĩnh", en: "static error page" }, kind: "data", at: [2.7, 1.9] },
  ],
  scenarios: [
    {
      option: "a",
      steps: [
        { ...primaryOk, badge: "primary" },
        albDown,
        {
          flow: ["users", "r53", "s3"],
          badge: "secondary",
          caption: {
            vi: "Với failover routing kiểu active-passive, Route 53 chỉ trả về tài nguyên primary khoẻ mạnh; khi primary không khoẻ mạnh, nó chuyển sang tài nguyên secondary là trang lỗi trên S3.",
            en: "With active-passive failover routing, Route 53 returns only healthy primary resources; once the primary is unhealthy, it returns the secondary, the error page on S3.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Trang lỗi chỉ được dùng khi website chính không khả dụng.",
          en: "The error page is used only when the primary site is unavailable.",
        },
      },
    },
    {
      option: "b",
      steps: [
        {
          mark: "r53",
          tone: "bad",
          badge: { vi: "không tồn tại", en: "does not exist" },
          caption: {
            vi: "Route 53 không có failover routing policy kiểu active-active; failover routing policy chỉ cấu hình active-passive.",
            en: "Route 53 has no active-active failover routing policy; the failover routing policy configures active-passive only.",
          },
        },
        {
          flow: [["users", "r53", "alb"], ["r53", "s3"]],
          tone: "warn",
          caption: {
            vi: "Trong cấu hình active-active, mọi bản ghi đều active trừ khi không khoẻ mạnh, và Route 53 có thể trả lời bằng bất kỳ bản ghi khoẻ mạnh nào, kể cả trang lỗi.",
            en: "In an active-active setup, every record is active unless unhealthy, and Route 53 may answer with any healthy record, including the error page.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không có policy active-active failover.", en: "There is no active-active failover policy." },
      },
    },
    {
      option: "c",
      steps: [
        { ...primaryOk, badge: "latency", tone: "warn" },
        {
          mark: "r53",
          tone: "bad",
          caption: {
            vi: "Latency-based routing phục vụ request từ Region có độ trễ thấp nhất khi ứng dụng chạy ở nhiều Region; nó không giúp chuyển sang trang lỗi khi website không khả dụng.",
            en: "Latency-based routing serves requests from the Region with the lowest latency when the app runs in several Regions; it does not help divert users to an error page on failure.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Latency routing không dành cho failover này.", en: "Latency routing does not do this failover." },
      },
    },
    {
      option: "d",
      steps: [
        { ...primaryOk, times: 3, badge: { vi: "trọng số lớn", en: "high weight" } },
        {
          flow: ["users", "r53", "s3"],
          tone: "bad",
          badge: { vi: "trọng số nhỏ", en: "low weight" },
          caption: {
            vi: "Weighted routing chia lưu lượng giữa các tài nguyên theo trọng số, dùng cho cân bằng tải hoặc thử phiên bản mới; nó không phù hợp với trường hợp này.",
            en: "Weighted routing splits traffic across resources by weight, for load balancing or testing new versions; it does not fit this use case.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Weighted routing không phải cơ chế failover.", en: "Weighted routing is not a failover mechanism." },
      },
    },
  ],
};

export default spec;
