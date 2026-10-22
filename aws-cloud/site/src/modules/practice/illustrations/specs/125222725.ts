// Practice test 1, question 50: SNS deliveries to Lambda throttled by the account concurrency quota.
// Captions follow the question's explanation. Additional source:
// - Concurrent executions: default quota 1,000, can be increased:
//   https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
import type { Bilingual, IllustrationSpec, ScenarioSpec, StepSpec } from "../types";

const peak: StepSpec[] = [
  { flow: ["site", "sns"], times: 4, badge: "~5000/s", caption: { vi: "Mùa giải cao điểm: khoảng 5000 request mỗi giây vào Amazon SNS.", en: "Peak season: about 5000 requests per second into Amazon SNS." } },
  {
    flow: ["sns", "lam"],
    times: 3,
    caption: {
      vi: "Lambda mặc định hỗ trợ 1000 concurrent execution mỗi tài khoản mỗi Region; khi SNS giao vượt quota này, việc giao message tới Lambda bị throttle.",
      en: "Lambda supports 1000 concurrent executions per account per Region by default; when SNS deliveries push past this quota, deliveries to Lambda are throttled.",
    },
  },
  { mark: "lam", tone: "bad", badge: "throttled", caption: { vi: "Nhiều thông báo không tới được người dùng cuối.", en: "Many notifications never reach end users." } },
];

const wrong = (option: string, mark: string, badge: Bilingual, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: ["quota"],
  steps: [...peak, { mark, tone: "bad", badge, caption }],
  verdict: { works: false, caption: { vi: "Giới hạn nằm ở concurrency của Lambda.", en: "The limit is Lambda's concurrency." } },
});

const serverless: Bilingual = {
  vi: "Cả AWS Lambda và Amazon SNS đều serverless, được quản lý hoàn toàn; nhóm kỹ thuật không thể tự cấp thêm máy chủ cho các dịch vụ này.",
  en: "AWS Lambda and Amazon SNS are both serverless and fully managed; the team cannot provision more servers for them.",
};

const spec: IllustrationSpec = {
  questionId: 125222725,
  cols: 4.4,
  rows: 2.4,
  nodes: [
    { id: "site", label: "Website", sub: { vi: "sự kiện thông báo", en: "notification events" }, kind: "actor", at: [0, 0.2] },
    { id: "sns", label: "Amazon SNS", at: [1.15, 0.2] },
    { id: "lam", label: "AWS Lambda", sub: { vi: "quota concurrency", en: "concurrency quota" }, at: [2.3, 0.2] },
    { id: "users", label: { vi: "Người dùng cuối", en: "End users" }, kind: "actor", at: [3.4, 0.2] },
    { id: "quota", label: { vi: "Tăng quota", en: "Quota increase" }, sub: "AWS Support", at: [2.3, 1.4] },
  ],
  scenarios: [
    {
      option: "b",
      steps: [
        ...peak,
        {
          flow: ["quota", "lam"],
          badge: { vi: "nâng giới hạn", en: "limit raised" },
          caption: { vi: "Liên hệ AWS Support để nâng giới hạn concurrency của tài khoản.", en: "Contact AWS Support to raise the account's concurrency limit." },
        },
        { mark: "lam", tone: "ok", badge: { vi: "đủ concurrency", en: "enough concurrency" }, caption: { vi: "Lambda xử lý được lưu lượng cao điểm.", en: "Lambda keeps up with the peak." } },
        { flow: ["lam", "users"], times: 3, caption: { vi: "Thông báo tới được người dùng cuối.", en: "Notifications reach end users." } },
      ],
      verdict: { works: true, caption: { vi: "Nâng quota concurrency của Lambda.", en: "Raise the Lambda concurrency quota." } },
    },
    wrong("a", "sns", { vi: "tự mở rộng", en: "scales itself" }, {
      vi: "SNS tự mở rộng theo ứng dụng, không cần liên hệ AWS Support; điểm nghẽn là quota concurrency của Lambda.",
      en: "SNS scales dynamically with the application, so no support case is needed; the bottleneck is Lambda's concurrency quota.",
    }),
    wrong("c", "sns", { vi: "không có máy chủ", en: "no servers" }, serverless),
    wrong("d", "lam", { vi: "không có máy chủ", en: "no servers" }, serverless),
  ],
};

export default spec;
