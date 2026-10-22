import PacketSim, { type PLayout, type PScenario, type PStep } from "../elb/PacketSim";

// Questions the ShopViet team really asks after an incident, and which of the three
// services can answer each one: CloudWatch (numbers over time), CloudTrail (who called
// which API) or AWS Config (what a resource looked like, and does it follow the rules).

const LAYOUT: PLayout = {
  viewBox: "0 30 820 240",
  aria: "Câu hỏi của đội ShopViet đi tới CloudWatch, CloudTrail hoặc AWS Config",
  nodes: [
    { id: "team", x: 80, y: 150, l1: "Đội ShopViet", user: true },
    { id: "cw", x: 420, y: 70, w: 230, l1: "CloudWatch", l2: "metric, log, alarm: hệ thống chạy ra sao" },
    { id: "trail", x: 420, y: 150, w: 230, l1: "CloudTrail", l2: "API call: ai đã làm gì, lúc nào" },
    { id: "config", x: 420, y: 230, w: 230, l1: "AWS Config", l2: "cấu hình: trông thế nào, có đúng chuẩn" },
  ],
  links: [["team", "cw"], ["team", "trail"], ["team", "config"]],
};

type Svc = "cw" | "trail" | "config";
const NOT: Record<Svc, string> = {
  cw: "Chỉ có số đo và log ứng dụng, không ghi ai đổi cấu hình.",
  trail: "Có lời gọi API, nhưng không giữ ảnh chụp cấu hình theo thời gian hay chấm đúng sai.",
  config: "Có cấu hình và mức tuân thủ, không có số đo hiệu năng.",
};

function ask(name: string, request: string, svc: Svc, flash: string, msg: string, result: string): PScenario {
  const others = (["cw", "trail", "config"] as Svc[]).filter((s) => s !== svc);
  const steps: PStep[] = [
    ...others.map((s): PStep => ({ at: s, jump: true, state: "skip", msg: NOT[s] })),
    { at: svc, state: "pass", flash, roundTrip: true, msg },
  ];
  return { name, request, run: () => ({ steps, ok: true, back: false, result }) };
}

const SCENARIOS: PScenario[] = [
  ask("Ai đã xoá security group?", "sg-payment biến mất lúc 02:13. Ai làm?", "trail", "event",
    "Event `DeleteSecurityGroup`: user `dev-tam`, IP 113.161.x.x, lúc 02:13:07.",
    "**CloudTrail** ghi mọi API call trong account: ai, gọi gì, từ đâu, lúc nào. Đây là nhật ký để audit."),
  ask("Admin mới làm gì với IAM?", "Ghi lại mọi thao tác IAM của tài khoản admin mới", "trail", "IAM",
    "Trail ghi `CreateUser`, `AttachUserPolicy`, `CreateAccessKey`… của từng người.",
    "Bật **CloudTrail** ghi mọi IAM action là việc nên làm ngay từ đầu, cùng với **MFA** cho người có quyền cao."),
  ask("Tuần trước sg-web mở cổng nào?", "Thứ Hai tuần trước, sg-web có những inbound rule nào?", "config", "lịch sử",
    "**Configuration history** của sg-web: bản ghi cấu hình mỗi lần thay đổi, xem lại được từng thời điểm.",
    "**AWS Config** chụp lại cấu hình mỗi khi tài nguyên đổi, kèm quan hệ với tài nguyên khác (instance nào đang dùng sg-web)."),
  ask("Có bucket nào đang public?", "Toàn bộ S3 bucket có đúng chuẩn \"không public\" không?", "config", "3 vi phạm",
    "Config rule `s3-bucket-public-read-prohibited`: 3 bucket NON_COMPLIANT.",
    "**Config rule** chấm từng tài nguyên là COMPLIANT hay NON_COMPLIANT so với chuẩn của công ty."),
  ask("CPU lúc 20h là bao nhiêu?", "Tối qua lúc mở bán, CPU nhóm web lên tới đâu?", "cw", "92%",
    "Metric `CPUUtilization`: đỉnh 92% lúc 20:04.",
    "**CloudWatch** giữ số đo theo thời gian, vẽ dashboard và đặt alarm."),
];

export default function WhoAnswersSim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} action="Hỏi" hint="Chọn một câu hỏi rồi bấm Hỏi để xem dịch vụ nào trả lời được." />;
}
