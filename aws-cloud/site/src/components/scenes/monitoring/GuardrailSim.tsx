import PacketSim, { type PScenario } from "../elb/PacketSim";

// Guardrails around ShopViet's accounts. An SCP keeps the mandatory CloudTrail trail
// running even for a developer who is root in their own account. An AWS Config managed
// rule warns 30 days before an imported certificate expires. A Config rule finds SSH
// opened to the internet and a remediation runbook closes it.

const SCENARIOS: PScenario[] = [
  {
    name: "Developer vô hiệu hoá CloudTrail",
    request: "cloudtrail:StopLogging  (root user của account dev-an)",
    toggle: { label: "SCP chặn sửa đổi CloudTrail, gắn vào OU Developers", initial: false },
    layout: {
      viewBox: "0 40 820 200",
      aria: "Lệnh gọi vô hiệu hoá CloudTrail được đánh giá qua SCP của AWS Organizations, sau đó tới quyền IAM trong account",
      boxes: [{ x: 200, y: 56, w: 600, h: 168, label: "Account dev-an (thành viên của AWS Organizations)" }],
      nodes: [
        { id: "dev", x: 80, y: 150, l1: "Developer An", l2: "đăng nhập root", user: true },
        { id: "scp", x: 310, y: 150, w: 160, l1: "SCP", l2: "giới hạn của Organizations" },
        { id: "iam", x: 500, y: 150, w: 150, l1: "Quyền trong account", l2: "root: toàn quyền" },
        { id: "trail", x: 700, y: 150, w: 150, l1: "Trail bắt buộc", l2: "org-audit-trail" },
      ],
      links: [["dev", "scp"], ["scp", "iam"], ["iam", "trail"]],
    },
    run: (scp) => scp
      ? { steps: [
            { at: "scp", state: "block", flash: "Deny", msg: "`Deny cloudtrail:StopLogging, DeleteTrail, UpdateTrail, PutEventSelectors`. SCP áp dụng cho **mọi** user, role và cả **root user** của account thành viên." }],
          ok: true,
          result: "Trail vẫn tiếp tục ghi. Developer vẫn có toàn quyền với các thao tác khác trong account của mình. IAM policy không thể gắn vào root user, do đó chỉ SCP mới giới hạn được root." }
      : { steps: [
            { at: "scp", state: "skip", msg: "Chưa có SCP nào giới hạn thao tác trên CloudTrail." },
            { at: "iam", state: "pass", msg: "Root có toàn quyền trong account." },
            { at: "trail", state: "change", tag: "NGỪNG GHI", relabel: { l2: "đã tắt" }, msg: "Trail ngừng ghi. Kể từ thời điểm này, thao tác trong account không còn được ghi nhận." }],
          ok: false,
          result: "Quy định bắt buộc bị vô hiệu hoá chỉ bằng một lệnh gọi API. Cần gắn **SCP** chặn mọi hành động sửa đổi CloudTrail vào OU của developer." },
  },
  {
    name: "Chứng chỉ import sắp hết hạn",
    action: "Chạy đánh giá hằng ngày",
    request: "Chứng chỉ của pay.shopviet.vn mua từ bên ngoài, import vào ACM, còn hiệu lực 25 ngày",
    toggle: { label: "Kích hoạt Config rule acm-certificate-expiration-check (30 ngày)", initial: false },
    layout: {
      viewBox: "0 96 820 104",
      aria: "AWS Config đánh giá chứng chỉ trong ACM và gửi thông báo qua EventBridge và SNS",
      nodes: [
        { id: "acm", x: 90, y: 140, w: 150, l1: "ACM", l2: "chứng chỉ import" },
        { id: "config", x: 270, y: 140, w: 160, l1: "AWS Config", l2: "managed rule" },
        { id: "eb", x: 450, y: 140, w: 140, l1: "EventBridge", l2: "compliance thay đổi" },
        { id: "sns", x: 610, y: 140, w: 110, l1: "SNS", l2: "email" },
        { id: "team", x: 750, y: 140, l1: "Đội bảo mật", user: true },
      ],
      links: [["acm", "config"], ["config", "eb"], ["eb", "sns"], ["sns", "team"]],
    },
    run: (rule) => rule
      ? { steps: [
            { at: "acm", jump: true, state: "wait", tag: "25 NGÀY", msg: "Chứng chỉ **import** từ bên ngoài: ACM **không tự động gia hạn**. Chứng chỉ do ACM cấp được ACM tự động gia hạn." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "< 30 ngày", msg: "Rule `acm-certificate-expiration-check` với `daysToExpiration = 30` đánh dấu chứng chỉ NON_COMPLIANT." },
            { at: "eb", state: "pass", msg: "Event \"Config Rules Compliance Change\" khớp rule của EventBridge." },
            { at: "sns", state: "pass", msg: "Email được gửi qua topic của đội bảo mật." },
            { at: "team", state: "pass", msg: "Còn gần một tháng để mua và import chứng chỉ mới." }],
          ok: true, back: false,
          result: "Không cần viết script hay bảo trì máy chủ. Managed rule đã có sẵn, chỉ cần cấu hình số ngày." }
      : { steps: [
            { at: "acm", jump: true, state: "wait", tag: "25 NGÀY", msg: "Chứng chỉ import không được tự động gia hạn và ngày hết hạn không được giám sát." },
            { at: "config", state: "skip", msg: "Chưa có rule nào đánh giá." }],
          ok: false, back: false,
          result: "Sau 25 ngày, trang thanh toán báo lỗi chứng chỉ và người dùng không thể thanh toán." },
  },
  {
    name: "SSH bị mở ra Internet",
    action: "Thay đổi cấu hình",
    request: "sg-web: thêm inbound 22/tcp từ 0.0.0.0/0",
    toggle: { label: "Kích hoạt auto remediation cho rule", initial: false },
    layout: {
      viewBox: "0 100 820 80",
      aria: "AWS Config phát hiện security group mở SSH ra Internet và Systems Manager Automation khắc phục",
      nodes: [
        { id: "sg", x: 110, y: 140, w: 150, l1: "sg-web", l2: "security group" },
        { id: "config", x: 340, y: 140, w: 170, l1: "AWS Config", l2: "rule restricted-ssh" },
        { id: "ssm", x: 590, y: 140, w: 250, l1: "SSM Automation runbook", l2: "AWS-DisablePublicAccessForSecurityGroup" },
      ],
      links: [["sg", "config"], ["config", "ssm"]],
    },
    run: (fix) => fix
      ? { steps: [
            { at: "sg", jump: true, state: "change", tag: "THAY ĐỔI", msg: "Cấu hình mới được ghi lại thành một configuration item." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 mở", msg: "Rule `restricted-ssh` phát hiện cổng 22 được mở cho 0.0.0.0/0." },
            { at: "ssm", state: "pass", msg: "**Remediation action** thực thi runbook, gỡ rule SSH mở ra Internet." },
            { at: "sg", from: "ssm", state: "pass", tag: "COMPLIANT", relabel: { l2: "đã đóng cổng 22" }, msg: "Security group trở lại trạng thái tuân thủ." }],
          ok: true, back: false,
          result: "Cổng 22 chỉ bị mở trong vài phút. Config lưu toàn bộ lịch sử: thời điểm mở và thời điểm đóng." }
      : { steps: [
            { at: "sg", jump: true, state: "change", tag: "THAY ĐỔI", msg: "Cấu hình mới được ghi lại." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 mở", msg: "Rule đánh dấu NON_COMPLIANT trên dashboard." },
            { at: "ssm", state: "skip", msg: "Chưa cấu hình remediation, chỉ có cảnh báo." }],
          ok: false, back: false,
          result: "Config phát hiện được vi phạm, nhưng cổng vẫn mở cho tới khi được khắc phục thủ công. Cần cấu hình **remediation** để tự động khắc phục." },
  },
];

export default function GuardrailSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống, thay đổi cấu hình, sau đó chọn nút chạy." />;
}
