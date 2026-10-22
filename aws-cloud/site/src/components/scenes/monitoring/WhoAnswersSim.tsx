import PacketSim, { type PLayout, type PScenario, type PStep } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Questions the ShopViet team really asks after an incident, and which of the three
// services can answer each one: CloudWatch (numbers over time), CloudTrail (who called
// which API) or AWS Config (what a resource looked like, and does it follow the rules).

const LAYOUT: PLayout = {
  viewBox: "0 30 820 240",
  aria: "Câu hỏi của đội ShopViet được gửi tới CloudWatch, CloudTrail hoặc AWS Config",
  nodes: [
    { id: "team", x: 80, y: 150, l1: "Đội ShopViet", user: true },
    { id: "cw", x: 420, y: 70, w: 230, l1: "CloudWatch", l2: "metric, log, alarm: trạng thái hệ thống" },
    { id: "trail", x: 420, y: 150, w: 230, l1: "CloudTrail", l2: "API call: ai thao tác gì, khi nào" },
    { id: "config", x: 420, y: 230, w: 230, l1: "AWS Config", l2: "cấu hình và mức tuân thủ" },
  ],
  links: [["team", "cw"], ["team", "trail"], ["team", "config"]],
};

type Svc = "cw" | "trail" | "config";
const NOT: Record<Svc, string> = {
  cw: "Lưu metric, log và alarm; thông tin ai đã gọi API nào do CloudTrail ghi nhận.",
  trail: "Ghi nhận lệnh gọi API, nhưng không lưu snapshot cấu hình theo thời gian và không đánh giá tuân thủ.",
  config: "Lưu cấu hình và mức tuân thủ, không có metric hiệu năng.",
};

function ask(name: string, request: string, svc: Svc, flash: string, msg: string, result: string, not: Record<Svc, string> = NOT): PScenario {
  const others = (["cw", "trail", "config"] as Svc[]).filter((s) => s !== svc);
  const steps: PStep[] = [
    ...others.map((s): PStep => ({ at: s, jump: true, state: "skip", msg: not[s] })),
    { at: svc, state: "pass", flash, roundTrip: true, msg },
  ];
  return { name, request, run: () => ({ steps, ok: true, back: false, result }) };
}

const SCENARIOS: PScenario[] = [
  ask("Ai đã xoá security group?", "sg-payment bị xoá lúc 02:13. Ai thực hiện?", "trail", "event",
    "Event `DeleteSecurityGroup`: user `dev-tam`, IP 113.161.x.x, lúc 02:13:07.",
    "**CloudTrail** ghi API call trong account thành event: danh tính, API được gọi, nguồn, thời điểm. Trail ghi management event (như `DeleteSecurityGroup`) theo mặc định. Đây là nhật ký phục vụ audit."),
  ask("Admin mới thao tác gì trên IAM?", "Ghi lại mọi thao tác IAM của tài khoản admin mới", "trail", "IAM",
    "Trail ghi `CreateUser`, `AttachUserPolicy`, `CreateAccessKey`… của từng người dùng.",
    "Thao tác IAM là **management event**, được **CloudTrail** trail ghi theo mặc định. Nên tạo trail ngay từ đầu, cùng với **MFA** cho người dùng có đặc quyền cao."),
  ask("Tuần trước sg-web mở cổng nào?", "Vào thứ Hai tuần trước, sg-web có những inbound rule nào?", "config", "lịch sử",
    "**Configuration history** của sg-web: bản ghi cấu hình tại mỗi lần thay đổi, có thể xem lại tại từng thời điểm.",
    "**AWS Config** ghi lại cấu hình mỗi khi tài nguyên thay đổi, kèm quan hệ với tài nguyên khác (instance nào đang sử dụng sg-web)."),
  ask("Có bucket nào đang public?", "Toàn bộ S3 bucket có tuân thủ tiêu chuẩn \"không public\" không?", "config", "3 vi phạm",
    "Config rule `s3-bucket-public-read-prohibited`: 3 bucket NON_COMPLIANT.",
    "**Config rule** đánh giá từng tài nguyên là COMPLIANT hay NON_COMPLIANT so với tiêu chuẩn của công ty."),
  ask("CPU lúc 20h là bao nhiêu?", "Tối qua, tại thời điểm mở bán, CPU của nhóm web đạt mức cao nhất là bao nhiêu?", "cw", "92%",
    "Metric `CPUUtilization`: đỉnh 92% lúc 20:04.",
    "**CloudWatch** lưu metric theo thời gian, cung cấp dashboard và alarm."),
];

const LAYOUT_EN: PLayout = {
  viewBox: "0 30 820 240",
  aria: "Questions from the ShopViet team are sent to CloudWatch, CloudTrail or AWS Config",
  nodes: [
    { id: "team", x: 80, y: 150, l1: "ShopViet team", user: true },
    { id: "cw", x: 420, y: 70, w: 230, l1: "CloudWatch", l2: "metrics, logs, alarms: system state" },
    { id: "trail", x: 420, y: 150, w: 230, l1: "CloudTrail", l2: "API calls: who did what, when" },
    { id: "config", x: 420, y: 230, w: 230, l1: "AWS Config", l2: "configuration and compliance" },
  ],
  links: [["team", "cw"], ["team", "trail"], ["team", "config"]],
};

const NOT_EN: Record<Svc, string> = {
  cw: "Stores metrics, logs and alarms; who called which API is recorded by CloudTrail.",
  trail: "Records API calls, but does not keep configuration snapshots over time and does not evaluate compliance.",
  config: "Stores configuration and compliance, with no performance metrics.",
};

const SCENARIOS_EN: PScenario[] = [
  ask("Who deleted the security group?", "sg-payment was deleted at 02:13. Who did it?", "trail", "event",
    "Event `DeleteSecurityGroup`: user `dev-tam`, IP 113.161.x.x, at 02:13:07.",
    "**CloudTrail** records API calls in the account as events: identity, API called, source, time. A trail records management events (such as `DeleteSecurityGroup`) by default. This is the log that serves audits.", NOT_EN),
  ask("What did the new admin do in IAM?", "Record every IAM action of the new admin account", "trail", "IAM",
    "The trail records each user's `CreateUser`, `AttachUserPolicy`, `CreateAccessKey`…",
    "IAM operations are **management events**, recorded by a **CloudTrail** trail by default. Create the trail from the start, together with **MFA** for highly privileged users.", NOT_EN),
  ask("Which ports did sg-web open last week?", "Last Monday, which inbound rules did sg-web have?", "config", "history",
    "The **configuration history** of sg-web: a configuration record at every change, viewable at each point in time.",
    "**AWS Config** records the configuration every time a resource changes, along with its relationships to other resources (which instances use sg-web).", NOT_EN),
  ask("Is any bucket public?", "Do all S3 buckets comply with the \"not public\" standard?", "config", "3 violations",
    "Config rule `s3-bucket-public-read-prohibited`: 3 buckets NON_COMPLIANT.",
    "A **Config rule** evaluates each resource as COMPLIANT or NON_COMPLIANT against the company's standards.", NOT_EN),
  ask("What was the CPU at 20:00?", "Last night, at the start of the sale, what was the web group's peak CPU?", "cw", "92%",
    "Metric `CPUUtilization`: peak of 92% at 20:04.",
    "**CloudWatch** stores metrics over time and provides dashboards and alarms.", NOT_EN),
];

export default function WhoAnswersSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} layout={L({ vi: LAYOUT, en: LAYOUT_EN })} action={L({ vi: "Hỏi", en: "Ask" })} hint={L({ vi: "Chọn một câu hỏi, sau đó chọn Hỏi để xác định dịch vụ cung cấp câu trả lời.", en: "Choose a question, then choose Ask to find the service that provides the answer." })} />;
}
