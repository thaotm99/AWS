import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

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
            { at: "scp", state: "block", flash: "Deny", msg: "`Deny cloudtrail:StopLogging, DeleteTrail, UpdateTrail, PutEventSelectors`. SCP ảnh hưởng tới **mọi** user và role trong account được gắn, kể cả **root user** của account thành viên (SCP không ảnh hưởng tới management account)." }],
          ok: true,
          result: "Trail vẫn tiếp tục ghi. Developer vẫn có toàn quyền với các thao tác khác trong account của mình. Identity-based policy không thể gắn vào root user; SCP giới hạn được root user của account thành viên." }
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
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "< 30 ngày", msg: "Rule `acm-certificate-expiration-check` với `daysToExpiration = 30` (giá trị mặc định là 14, ShopViet đã cấu hình thành 30) đánh dấu chứng chỉ NON_COMPLIANT." },
            { at: "eb", state: "pass", msg: "Event \"Config Rules Compliance Change\" khớp rule của EventBridge." },
            { at: "sns", state: "pass", msg: "Email được gửi qua topic của đội bảo mật." },
            { at: "team", state: "pass", msg: "Còn gần một tháng để mua và import chứng chỉ mới." }],
          ok: true, back: false,
          result: "Không cần viết script hay vận hành EC2 instance để chạy script. Managed rule đã có sẵn; tham số `daysToExpiration` mặc định 14 ngày và có thể cấu hình lại." }
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
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 mở", msg: "Rule `restricted-ssh` (identifier `INCOMING_SSH_DISABLED`) đánh giá NON_COMPLIANT vì SSH được mở cho 0.0.0.0/0." },
            { at: "ssm", state: "pass", msg: "**Remediation action** thực thi runbook, gỡ rule SSH mở ra Internet." },
            { at: "sg", from: "ssm", state: "pass", tag: "COMPLIANT", relabel: { l2: "đã đóng port 22" }, msg: "Security group trở lại trạng thái tuân thủ." }],
          ok: true, back: false,
          result: "Cổng 22 chỉ bị mở trong vài phút. Config lưu toàn bộ lịch sử: thời điểm mở và thời điểm đóng." }
      : { steps: [
            { at: "sg", jump: true, state: "change", tag: "THAY ĐỔI", msg: "Cấu hình mới được ghi lại." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 mở", msg: "Rule đánh dấu NON_COMPLIANT trên dashboard." },
            { at: "ssm", state: "skip", msg: "Chưa cấu hình remediation, chỉ có cảnh báo." }],
          ok: false, back: false,
          result: "Config phát hiện được vi phạm, nhưng port 22 vẫn mở cho tới khi được khắc phục thủ công. Cần cấu hình **remediation** để tự động khắc phục." },
  },
];

const SCENARIOS_EN: PScenario[] = [
  {
    name: "Developer disables CloudTrail",
    request: "cloudtrail:StopLogging  (root user of account dev-an)",
    toggle: { label: "SCP that blocks CloudTrail changes, attached to the Developers OU", initial: false },
    layout: {
      viewBox: "0 40 820 200",
      aria: "A call to disable CloudTrail is evaluated against the AWS Organizations SCP, then against IAM permissions in the account",
      boxes: [{ x: 200, y: 56, w: 600, h: 168, label: "Account dev-an (member of AWS Organizations)" }],
      nodes: [
        { id: "dev", x: 80, y: 150, l1: "Developer An", l2: "signed in as root", user: true },
        { id: "scp", x: 310, y: 150, w: 160, l1: "SCP", l2: "Organizations guardrail" },
        { id: "iam", x: 500, y: 150, w: 150, l1: "Account permissions", l2: "root: full access" },
        { id: "trail", x: 700, y: 150, w: 150, l1: "Mandatory trail", l2: "org-audit-trail" },
      ],
      links: [["dev", "scp"], ["scp", "iam"], ["iam", "trail"]],
    },
    run: (scp) => scp
      ? { steps: [
            { at: "scp", state: "block", flash: "Deny", msg: "`Deny cloudtrail:StopLogging, DeleteTrail, UpdateTrail, PutEventSelectors`. An SCP affects **every** user and role in the account it is attached to, including the **root user** of a member account (SCPs do not affect the management account)." }],
          ok: true,
          result: "The trail keeps logging. The developer still has full access to other actions in their own account. Identity-based policies cannot be attached to the root user; an SCP can restrict the root user of a member account." }
      : { steps: [
            { at: "scp", state: "skip", msg: "No SCP restricts CloudTrail actions yet." },
            { at: "iam", state: "pass", msg: "Root has full access in the account." },
            { at: "trail", state: "change", tag: "STOPPED", relabel: { l2: "turned off" }, msg: "The trail stops logging. From this point on, actions in the account are no longer recorded." }],
          ok: false,
          result: "A mandatory control is disabled with a single API call. Attach an **SCP** that blocks every action that modifies CloudTrail to the developers' OU." },
  },
  {
    name: "Imported certificate about to expire",
    action: "Run daily evaluation",
    request: "The pay.shopviet.vn certificate, bought externally and imported into ACM, is valid for 25 more days",
    toggle: { label: "Enable the acm-certificate-expiration-check Config rule (30 days)", initial: false },
    layout: {
      viewBox: "0 96 820 104",
      aria: "AWS Config evaluates the certificate in ACM and sends a notification through EventBridge and SNS",
      nodes: [
        { id: "acm", x: 90, y: 140, w: 150, l1: "ACM", l2: "imported certificate" },
        { id: "config", x: 270, y: 140, w: 160, l1: "AWS Config", l2: "managed rule" },
        { id: "eb", x: 450, y: 140, w: 140, l1: "EventBridge", l2: "compliance change" },
        { id: "sns", x: 610, y: 140, w: 110, l1: "SNS", l2: "email" },
        { id: "team", x: 750, y: 140, l1: "Security team", user: true },
      ],
      links: [["acm", "config"], ["config", "eb"], ["eb", "sns"], ["sns", "team"]],
    },
    run: (rule) => rule
      ? { steps: [
            { at: "acm", jump: true, state: "wait", tag: "25 DAYS", msg: "An externally **imported** certificate: ACM **does not renew it automatically**. Certificates issued by ACM are renewed automatically by ACM." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "< 30 days", msg: "The `acm-certificate-expiration-check` rule with `daysToExpiration = 30` (the default is 14; ShopViet has set it to 30) marks the certificate NON_COMPLIANT." },
            { at: "eb", state: "pass", msg: "The \"Config Rules Compliance Change\" event matches an EventBridge rule." },
            { at: "sns", state: "pass", msg: "An email is sent through the security team's topic." },
            { at: "team", state: "pass", msg: "There is almost a month left to buy and import a new certificate." }],
          ok: true, back: false,
          result: "No script to write and no EC2 instance to run it on. The managed rule is ready to use; the `daysToExpiration` parameter defaults to 14 days and can be reconfigured." }
      : { steps: [
            { at: "acm", jump: true, state: "wait", tag: "25 DAYS", msg: "The imported certificate is not renewed automatically, and its expiration date is not monitored." },
            { at: "config", state: "skip", msg: "No rule is evaluating yet." }],
          ok: false, back: false,
          result: "After 25 days, the payment page shows a certificate error and users cannot pay." },
  },
  {
    name: "SSH open to the internet",
    action: "Change configuration",
    request: "sg-web: add inbound 22/tcp from 0.0.0.0/0",
    toggle: { label: "Enable automatic remediation for the rule", initial: false },
    layout: {
      viewBox: "0 100 820 80",
      aria: "AWS Config detects a security group with SSH open to the internet, and Systems Manager Automation remediates it",
      nodes: [
        { id: "sg", x: 110, y: 140, w: 150, l1: "sg-web", l2: "security group" },
        { id: "config", x: 340, y: 140, w: 170, l1: "AWS Config", l2: "rule restricted-ssh" },
        { id: "ssm", x: 590, y: 140, w: 250, l1: "SSM Automation runbook", l2: "AWS-DisablePublicAccessForSecurityGroup" },
      ],
      links: [["sg", "config"], ["config", "ssm"]],
    },
    run: (fix) => fix
      ? { steps: [
            { at: "sg", jump: true, state: "change", tag: "CHANGE", msg: "The new configuration is recorded as a configuration item." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 open", msg: "The `restricted-ssh` rule (identifier `INCOMING_SSH_DISABLED`) evaluates NON_COMPLIANT because SSH is open to 0.0.0.0/0." },
            { at: "ssm", state: "pass", msg: "The **remediation action** runs the runbook and removes the SSH rule open to the internet." },
            { at: "sg", from: "ssm", state: "pass", tag: "COMPLIANT", relabel: { l2: "port 22 closed" }, msg: "The security group is compliant again." }],
          ok: true, back: false,
          result: "Port 22 is open for only a few minutes. Config keeps the full history: when it was opened and when it was closed." }
      : { steps: [
            { at: "sg", jump: true, state: "change", tag: "CHANGE", msg: "The new configuration is recorded." },
            { at: "config", state: "change", tag: "NON_COMPLIANT", flash: "22 open", msg: "The rule shows NON_COMPLIANT on the dashboard." },
            { at: "ssm", state: "skip", msg: "No remediation configured, only an alert." }],
          ok: false, back: false,
          result: "Config detects the violation, but the port stays open until someone fixes it manually. Configure **remediation** to fix it automatically." },
  },
];

export default function GuardrailSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} action={L({ vi: "Gửi request", en: "Send request" })} hint={L({ vi: "Chọn một tình huống, thay đổi cấu hình, sau đó chọn nút chạy.", en: "Choose a scenario, change the setting, then choose the run button." })} />;
}
