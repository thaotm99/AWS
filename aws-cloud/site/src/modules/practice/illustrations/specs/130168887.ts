// Practice test 6, question 22: AWS Budgets alerts plus a Budgets action that applies a Deny IAM policy per developer account.
// Captions follow the question's explanation. Additional source:
// - Budget actions can apply an IAM policy or SCP, or target EC2/RDS instances, automatically or after approval:
//   https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168887,
  cols: 4.4,
  rows: 2.9,
  nodes: [
    { id: "dev", label: { vi: "Developer", en: "Developer" }, kind: "actor", at: [0, 1.3] },
    { id: "role", label: "IAM role", sub: { vi: "của developer", en: "developer's" }, at: [1.1, 1.3] },
    { id: "sc", label: "Service Catalog", sub: { vi: "template", en: "templates" }, at: [1.1, 1.3] },
    { id: "res", label: { vi: "Tài nguyên", en: "Resources" }, sub: "EC2, …", kind: "data", at: [2.2, 1.3] },
    { id: "budgets", label: "AWS Budgets", sub: { vi: "ngưỡng chi phí", en: "spend threshold" }, at: [2.2, 0.2] },
    { id: "ce", label: "Cost Explorer", sub: { vi: "báo cáo, dashboard", en: "reports, dashboards" }, at: [2.2, 0.2] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "mỗi tài khoản", en: "per account" }, at: [3.3, 1.3] },
    { id: "config", label: "AWS Config", sub: "remediation", at: [3.3, 0.2] },
  ],
  zones: [{ id: "acct", label: { vi: "Tài khoản developer", en: "Developer account" }, tone: "account", from: [1.1, 1.3], to: [3.3, 1.3], pad: 20 }],
  scenarios: [
    {
      option: "b",
      hide: ["sc", "ce", "lambda", "config"],
      steps: [
        {
          flow: ["dev", "role", "res"],
          times: 3,
          caption: {
            vi: "Developer tạo tài nguyên trong tài khoản riêng; chi phí tăng dần.",
            en: "The developer provisions resources in their own account; spend climbs.",
          },
        },
        {
          flow: ["res", "budgets"],
          badge: { vi: "vượt ngưỡng", en: "over limit" },
          caption: {
            vi: "AWS Budgets theo dõi chi phí thực tế và dự báo của tài khoản; khi vượt ngưỡng, cảnh báo được gửi tới developer.",
            en: "AWS Budgets tracks the account's actual and forecasted spend; when it crosses the threshold, an alert goes to the developer.",
          },
        },
        {
          flow: ["budgets", "role"],
          badge: "DenyAll",
          caption: {
            vi: "Budgets action tự động gắn IAM policy DenyAll hạn chế vào IAM role chính của developer.",
            en: "A Budgets action automatically attaches a restrictive DenyAll IAM policy to the developer's primary IAM role.",
          },
        },
        {
          stop: ["dev", "role"],
          caption: {
            vi: "Developer không thể tạo thêm tài nguyên tốn kém vượt hạn mức; không cần ai can thiệp thủ công.",
            en: "The developer cannot launch more costly resources beyond the allocation; no one has to step in manually.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Cảnh báo và cưỡng chế ngân sách tự động bằng tính năng có sẵn, ít vận hành.",
          en: "Automatic alerts and budget enforcement with a native feature and little overhead.",
        },
      },
    },
    {
      option: "a",
      hide: ["sc", "budgets", "ce"],
      steps: [
        {
          flow: ["lambda", "res"],
          tone: "warn",
          badge: { vi: "hằng ngày", en: "daily" },
          caption: {
            vi: "Một Lambda function trong mỗi tài khoản developer chạy hằng ngày, đọc dữ liệu chi phí qua Cost Explorer API.",
            en: "A Lambda function in each developer account runs daily and reads cost data through the Cost Explorer API.",
          },
        },
        {
          flow: ["lambda", "config"],
          tone: "warn",
          caption: {
            vi: "Khi vượt ngưỡng, function gọi AWS Config remediation rule.",
            en: "When the threshold is crossed, the function invokes an AWS Config remediation rule.",
          },
        },
        {
          mark: "lambda",
          tone: "bad",
          badge: { vi: "tự viết", en: "custom" },
          caption: {
            vi: "Phải xây dựng và duy trì logic tuỳ biến ở từng tài khoản và tự phân tích dữ liệu chi phí: tốn công vận hành, khó mở rộng.",
            en: "Custom logic has to be built and maintained in every account, parsing cost data by hand: operationally heavy and hard to scale.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "AWS Budgets làm được việc này sẵn, ít công sức hơn.",
          en: "AWS Budgets does this natively with less effort.",
        },
      },
    },
    {
      option: "c",
      hide: ["role", "budgets", "ce", "config"],
      steps: [
        {
          flow: ["dev", "sc", "res"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "Service Catalog buộc developer dùng template chuẩn, nhưng không ngăn được chi phí phát sinh khi tài nguyên scale hoặc chạy tải nặng.",
            en: "Service Catalog keeps developers to standard templates, but it does not stop spend from scaling or intensive workloads.",
          },
        },
        {
          flow: ["lambda", "res"],
          tone: "warn",
          badge: { vi: "tắt/bật", en: "stop/start" },
          caption: {
            vi: "Lambda theo lịch tắt tài nguyên cuối ngày giúp giảm chi phí nhàn rỗi, nhưng không chặn việc chi vượt ngân sách, và mỗi tài khoản cần một function riêng.",
            en: "A scheduled Lambda that stops resources at night cuts idle cost, but it does not prevent overspending, and each account needs its own function.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không cưỡng chế được hạn mức ngân sách.",
          en: "It does not enforce budget limits.",
        },
      },
    },
    {
      option: "d",
      hide: ["sc", "budgets", "lambda", "config"],
      steps: [
        {
          flow: ["res", "ce", "dev"],
          back: true,
          badge: "email",
          caption: {
            vi: "Cost Explorer gửi báo cáo hằng ngày và hiển thị dashboard; developer phải tự theo dõi.",
            en: "Cost Explorer sends daily reports and shows dashboards; developers must watch them themselves.",
          },
        },
        {
          flow: ["dev", "role", "res"],
          times: 3,
          tone: "bad",
          caption: {
            vi: "Cost Explorer chỉ giám sát thụ động: không có cách tích hợp sẵn để tự động chặn khi vượt ngân sách.",
            en: "Cost Explorer is passive monitoring: there is no built-in way to automatically restrict actions when a budget is exceeded.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không có phản hồi tự động khi chi vượt mức.",
          en: "No automatic response to overspending.",
        },
      },
    },
  ],
};

export default spec;
