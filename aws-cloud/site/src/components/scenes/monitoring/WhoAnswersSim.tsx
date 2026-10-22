import PacketSim, { type PLayout, type PScenario, type PStep } from "../elb/PacketSim";

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
  cw: "Chỉ lưu metric và log ứng dụng, không ghi nhận ai thay đổi cấu hình.",
  trail: "Ghi nhận lệnh gọi API, nhưng không lưu snapshot cấu hình theo thời gian và không đánh giá tuân thủ.",
  config: "Lưu cấu hình và mức tuân thủ, không có metric hiệu năng.",
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
  ask("Ai đã xoá security group?", "sg-payment bị xoá lúc 02:13. Ai thực hiện?", "trail", "event",
    "Event `DeleteSecurityGroup`: user `dev-tam`, IP 113.161.x.x, lúc 02:13:07.",
    "**CloudTrail** ghi lại mọi API call trong account: danh tính, API được gọi, nguồn, thời điểm. Đây là nhật ký phục vụ audit."),
  ask("Admin mới thao tác gì trên IAM?", "Ghi lại mọi thao tác IAM của tài khoản admin mới", "trail", "IAM",
    "Trail ghi `CreateUser`, `AttachUserPolicy`, `CreateAccessKey`… của từng người dùng.",
    "Bật **CloudTrail** ghi lại mọi IAM action là cấu hình nên áp dụng ngay từ đầu, cùng với **MFA** cho người dùng có đặc quyền cao."),
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

export default function WhoAnswersSim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} action="Hỏi" hint="Chọn một câu hỏi, sau đó chọn Hỏi để xác định dịch vụ cung cấp câu trả lời." />;
}
