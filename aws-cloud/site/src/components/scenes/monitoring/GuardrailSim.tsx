import PacketSim, { type PScenario } from "../elb/PacketSim";

// Guardrails around ShopViet's accounts. An SCP keeps the mandatory CloudTrail trail
// running even for a developer who is root in their own account. An AWS Config managed
// rule warns 30 days before an imported certificate expires. A Config rule finds SSH
// opened to the internet and a remediation runbook closes it.

const SCENARIOS: PScenario[] = [
  {
    name: "Dev muốn tắt CloudTrail",
    request: "cloudtrail:StopLogging  (root user của account dev-an)",
    toggle: { label: "SCP chặn sửa CloudTrail, gắn vào OU Developers", initial: false },
    layout: {
      viewBox: "0 40 820 200",
      aria: "Lời gọi tắt CloudTrail đi qua SCP của AWS Organizations rồi tới quyền IAM trong account",
      boxes: [{ x: 200, y: 56, w: 600, h: 168, label: "Account dev-an (thành viên của AWS Organizations)" }],
      nodes: [
        { id: "dev", x: 80, y: 150, l1: "Dev An", l2: "đăng nhập root", user: true },
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
          result: "Trail vẫn ghi. Dev vẫn toàn quyền làm việc khác trong account của mình. IAM policy không gắn được vào root, nên chỉ SCP mới chặn được root." }
      : { steps: [
            { at: "scp", state: "skip", msg: "Chưa có SCP nào giới hạn CloudTrail." },
            { at: "iam", state: "pass", msg: "Root có toàn quyền trong account." },
            { at: "trail", state: "change", tag: "NGỪNG GHI", relabel: { l2: "đã tắt" }, msg: "Trail ngừng ghi. Từ giờ không còn dấu vết thao tác trong account này." }],
          ok: false,
          result: "Quy định bắt buộc bị vô hiệu chỉ bằng một lời gọi API. Gắn **SCP** chặn mọi hành động sửa CloudTrail vào OU của developer." },
  },
  {
    name: "Chứng chỉ import sắp hết hạn",
    action: "Chạy kiểm tra hằng ngày",
    request: "Chứng chỉ của pay.shopviet.vn mua ngoài, import vào ACM, còn 25 ngày",
    toggle: { label: "Bật Config rule acm-certificate-expiration-check (30 ngày)", initial: false },
    layout: {
      viewBox: "0 96 820 104",
      aria: "AWS Config kiểm tra chứng chỉ trong ACM rồi báo qua EventBridge và SNS",
      nodes: [
        { id: "acm", x: 90, y: 140, w: 150, l1: "ACM", l2: "chứng chỉ import" },
        { id: "config", x: 270, y: 140, w: 160, l1: "AWS Config", l2: "managed rule" },
        { id: "eb", x: 450, y: 140, w: 140, l1: "EventBridge", l2: "compliance đổi" },
        { id: "sns", x: 610, y: 140, w: 110, l1: "SNS", l2: "email" },
        { id: "team", x: 750, y: 140, l1: "Đội bảo mật", user: true },
      ],
      links: [["acm", "config"], ["config", "eb"], ["eb", "sns"], ["sns", "team"]],
    },
    run: (rule) => rule
      ? { steps: [
            { at: "acm", jump: true, state: "wait", tag: "25 NGÀY", msg: "Chứng chỉ **import** từ bên ngoài: ACM **không tự gia hạn**. Chứng chỉ do ACM cấp thì ACM tự gia hạn." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "< 30 ngày", msg: "Rule `acm-certificate-expiration-check` với `daysToExpiration = 30` đánh dấu chứng chỉ NON_COMPLIANT." },
            { at: "eb", state: "pass", msg: "Event \"Config Rules Compliance Change\" khớp rule của EventBridge." },
            { at: "sns", state: "pass", msg: "Gửi email tới topic của đội bảo mật." },
            { at: "team", state: "pass", msg: "Còn gần một tháng để mua và import chứng chỉ mới." }],
          ok: true, back: false,
          result: "Không viết script, không có server nào phải bảo trì. Managed rule có sẵn, chỉ cần đặt số ngày." }
      : { steps: [
            { at: "acm", jump: true, state: "wait", tag: "25 NGÀY", msg: "Chứng chỉ import không tự gia hạn. Không ai theo dõi ngày hết hạn." },
            { at: "config", state: "skip", msg: "Chưa có rule nào kiểm tra." }],
          ok: false, back: false,
          result: "25 ngày sau trang thanh toán báo lỗi chứng chỉ, khách không trả tiền được." },
  },
  {
    name: "Ai đó mở SSH ra Internet",
    action: "Đổi cấu hình",
    request: "sg-web: thêm inbound 22/tcp từ 0.0.0.0/0",
    toggle: { label: "Bật auto remediation cho rule", initial: false },
    layout: {
      viewBox: "0 100 820 80",
      aria: "AWS Config phát hiện security group mở SSH ra Internet và Systems Manager Automation sửa lại",
      nodes: [
        { id: "sg", x: 110, y: 140, w: 150, l1: "sg-web", l2: "security group" },
        { id: "config", x: 340, y: 140, w: 170, l1: "AWS Config", l2: "rule restricted-ssh" },
        { id: "ssm", x: 590, y: 140, w: 250, l1: "SSM Automation runbook", l2: "AWS-DisablePublicAccessForSecurityGroup" },
      ],
      links: [["sg", "config"], ["config", "ssm"]],
    },
    run: (fix) => fix
      ? { steps: [
            { at: "sg", jump: true, state: "change", tag: "ĐỔI", msg: "Cấu hình mới được ghi lại thành một configuration item." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 mở", msg: "Rule `restricted-ssh` thấy cổng 22 mở cho 0.0.0.0/0." },
            { at: "ssm", state: "pass", msg: "**Remediation action** chạy runbook, gỡ rule SSH mở ra Internet." },
            { at: "sg", from: "ssm", state: "pass", tag: "COMPLIANT", relabel: { l2: "đã đóng cổng 22" }, msg: "Security group trở lại đúng chuẩn." }],
          ok: true, back: false,
          result: "Cổng 22 chỉ mở vài phút. Config giữ cả lịch sử: lúc nào mở, lúc nào đóng." }
      : { steps: [
            { at: "sg", jump: true, state: "change", tag: "ĐỔI", msg: "Cấu hình mới được ghi lại." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 mở", msg: "Rule đánh dấu NON_COMPLIANT trên dashboard." },
            { at: "ssm", state: "skip", msg: "Chưa gắn remediation, chỉ có cảnh báo." }],
          ok: false, back: false,
          result: "Config phát hiện được, nhưng cổng vẫn mở tới khi có người vào sửa. Gắn **remediation** để tự sửa." },
  },
];

export default function GuardrailSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống, bật hoặc tắt công tắc rồi bấm nút chạy." />;
}
