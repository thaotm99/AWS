// Practice test 5, question 19: a CloudWatch alarm with the EC2 reboot action restarts an instance that fails its
// instance health check. Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const freeze: StepSpec = {
  mark: "ec2",
  tone: "bad",
  badge: { vi: "treo", en: "frozen" },
  caption: {
    vi: "Do lỗi chưa rõ nguyên nhân, ứng dụng làm instance bị treo và không vượt qua Instance Health Check.",
    en: "An unknown bug freezes the instance, which then fails its Instance Health Check.",
  },
};
const toAlarm: StepSpec = {
  flow: ["ec2", "cw"],
  badge: "ALARM",
  caption: {
    vi: "Amazon CloudWatch alarm theo dõi trạng thái health của instance và chuyển sang trạng thái ALARM.",
    en: "An Amazon CloudWatch alarm monitors the instance's health status and goes into ALARM.",
  },
};
const wasteful: Bilingual = {
  vi: "Kích hoạt Lambda function, trực tiếp hay gián tiếp, qua EventBridge hoặc CloudWatch alarm đều lãng phí tài nguyên; chỉ cần dùng EC2 Reboot alarm action.",
  en: "Triggering a Lambda function, directly or indirectly, from EventBridge or a CloudWatch alarm wastes resources; the EC2 Reboot alarm action is all that is needed.",
};
const lambdaVerdict = {
  works: false,
  caption: {
    vi: "Thêm Lambda function không cần thiết, lãng phí tài nguyên.",
    en: "An unnecessary Lambda function wastes resources.",
  } as Bilingual,
};

const spec: IllustrationSpec = {
  questionId: 119517577,
  cols: 3.4,
  rows: 2.3,
  nodes: [
    { id: "ec2", label: "EC2 instance", sub: "taxi dispatch app", at: [0, 1.3] },
    { id: "cw", label: "CloudWatch alarm", sub: "instance health check", at: [1.3, 1.3] },
    { id: "lambda", label: "AWS Lambda", sub: "EC2 API", at: [1.3, 0.1] },
    { id: "sns", label: "Amazon SNS", sub: "topic", at: [2.4, 0.1] },
    { id: "eb", label: "EventBridge", sub: { vi: "mỗi 5 phút", en: "every 5 minutes" }, at: [2.4, 0.1] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["lambda", "sns", "eb"],
      steps: [
        freeze,
        toAlarm,
        {
          flow: ["cw", "ec2"],
          badge: "Reboot",
          caption: {
            vi: "Alarm action EC2 Reboot tự động khởi động lại instance; reboot action được khuyến nghị cho lỗi Instance Health Check, còn recover action phù hợp với lỗi System Health Check.",
            en: "The EC2 Reboot alarm action restarts the instance automatically; reboot is recommended for Instance Health Check failures, recover for System Health Check failures.",
          },
        },
        {
          mark: "ec2",
          tone: "ok",
          badge: { vi: "đã khởi động lại", en: "rebooted" },
          caption: {
            vi: "Instance chạy lại mà không cần thao tác thủ công và không cần thêm thành phần nào khác.",
            en: "The instance runs again with no manual step and no extra component.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tự động, tiết kiệm chi phí và tài nguyên nhất.",
          en: "Automated, and the most cost- and resource-efficient.",
        },
      },
    },
    {
      option: "a",
      hide: ["eb"],
      steps: [
        freeze,
        toAlarm,
        {
          flow: ["cw", "sns", "lambda", "ec2"],
          tone: "warn",
          badge: "reboot",
          caption: wasteful,
        },
      ],
      verdict: lambdaVerdict,
    },
    {
      option: "b",
      hide: ["cw", "sns"],
      steps: [
        {
          flow: ["eb", "lambda", "ec2"],
          times: 3,
          tone: "warn",
          badge: { vi: "kiểm tra", en: "check" },
          caption: {
            vi: "EventBridge kích hoạt Lambda function mỗi 5 phút để kiểm tra trạng thái instance và reboot khi Instance Health Check lỗi.",
            en: "EventBridge triggers a Lambda function every 5 minutes to check the instance status and reboot it on an Instance Health Check failure.",
          },
        },
        { mark: "lambda", tone: "bad", caption: wasteful },
      ],
      verdict: lambdaVerdict,
    },
    {
      option: "d",
      hide: ["cw", "sns"],
      steps: [
        {
          flow: ["eb", "lambda", "ec2"],
          times: 3,
          tone: "bad",
          badge: "reboot",
          caption: {
            vi: "Lambda function reboot instance mỗi 5 phút theo lịch, không dựa vào trạng thái health của instance.",
            en: "The Lambda function reboots the instance every 5 minutes on a schedule, regardless of its health status.",
          },
        },
        { mark: "lambda", tone: "bad", caption: wasteful },
      ],
      verdict: lambdaVerdict,
    },
  ],
};

export default spec;
