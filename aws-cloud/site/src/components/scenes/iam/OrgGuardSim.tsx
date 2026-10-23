import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseBox, type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// MFTECH now runs several AWS accounts in one Organization. Each situation is a
// governance problem; pick a tool and watch what happens: SCP, tag policy,
// Budgets actions, IAM Access Analyzer, StackSets, Control Tower.

type P = [number, number];

const fan = (x: number, y: number): P[] => [[x, 120], [x, y]];

function scenarios(L: Lang): CaseScenario[] {
// Layout shared by the "a request goes through the Organization" situations.
const GATE_BOXES: CaseBox[] = [
  { x: 130, y: 16, w: 230, h: 208, label: "AWS Organizations · OU Dev" },
  { x: 390, y: 16, w: 410, h: 208, label: L({ vi: "Account dev", en: "Dev account" }) },
];
const gateNodes = (who: string, svc: string, svc2: string): CaseNode[] => [
  { id: "user", x: 20, y: 97, w: 80, l1: who, user: true },
  { id: "scp", x: 165, y: 97, w: 160, l1: "SCP", l2: L({ vi: "giới hạn toàn account", en: "limits whole account" }) },
  { id: "iam", x: 420, y: 97, w: 160, l1: "IAM policy", l2: "AdministratorAccess" },
  { id: "svc", x: 630, y: 97, w: 150, l1: svc, l2: svc2 },
];
const GATE_LINKS: CaseLink[] = [{ a: "user", b: "scp" }, { a: "scp", b: "iam" }, { a: "iam", b: "svc" }];

return [
  {
    name: L({ vi: "Admin account dev tắt CloudTrail", en: "Dev account admin turns off CloudTrail" }),
    request: "cloudtrail:StopLogging",
    from: L({ vi: "từ admin của account dev", en: "from the dev account admin" }),
    boxes: GATE_BOXES,
    nodes: gateNodes("Admin dev", "CloudTrail", L({ vi: "log kiểm toán", en: "audit log" })),
    links: GATE_LINKS,
    start: "user",
    choices: { label: L({ vi: "Cơ chế bảo vệ", en: "Protection" }), options: [L({ vi: "Chỉ IAM policy", en: "IAM policy only" }), L({ vi: "SCP chặn thay đổi CloudTrail", en: "SCP blocks CloudTrail changes" })], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "scp", state: "skip", msg: L({ vi: "Không có SCP nào đề cập tới CloudTrail.", en: "No SCP mentions CloudTrail." }) },
            { at: "iam", state: "pass", msg: L({ vi: "Admin có AdministratorAccess nên được phép.", en: "The admin has AdministratorAccess, so it is allowed." }) },
            { at: "svc", state: "change", tag: L({ vi: "ĐÃ TẮT", en: "STOPPED" }), msg: L({ vi: "CloudTrail ngừng ghi log.", en: "CloudTrail stops logging." }) },
          ],
          ok: false, result: L({ vi: "Admin trong account thực hiện được mọi thao tác IAM cho phép. Để giới hạn cả admin: sử dụng SCP.", en: "An admin in the account can perform every action IAM allows. To restrict even admins: use an SCP." }) }
      : { steps: [{ at: "scp", state: "block", msg: L({ vi: "SCP **Deny** `cloudtrail:StopLogging` cho toàn bộ OU Dev, áp dụng cho mọi principal, kể cả root user của member account.", en: "An SCP **denies** `cloudtrail:StopLogging` for the whole Dev OU, applying to every principal, including the root user of a member account." }) }],
          ok: true, result: L({ vi: "CloudTrail tiếp tục hoạt động. IAM policy cho phép cũng không vượt được giới hạn của SCP.", en: "CloudTrail keeps running. An IAM policy that allows the action cannot exceed the SCP's limit." }) },
  },
  {
    name: L({ vi: "Khởi chạy EC2 instance thiếu tag phân loại dữ liệu", en: "Launch an EC2 instance without a data classification tag" }),
    request: L({ vi: "ec2:RunInstances (không có tag dataClassification)", en: "ec2:RunInstances (no dataClassification tag)" }),
    from: L({ vi: "từ developer", en: "from a developer" }),
    boxes: GATE_BOXES,
    nodes: gateNodes("Developer", "EC2", L({ vi: "instance mới", en: "new instance" })),
    links: GATE_LINKS,
    start: "user",
    choices: { label: L({ vi: "Cơ chế kiểm soát", en: "Control" }), options: [L({ vi: "Chỉ tag policy", en: "Tag policy only" }), "Tag policy + SCP"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "scp", state: "skip", msg: L({ vi: "Tag policy chuẩn hóa **giá trị** tag, nhưng không chặn request thiếu tag.", en: "A tag policy standardizes tag **values** but does not block requests that lack the tag." }) },
            { at: "iam", state: "pass", msg: L({ vi: "Developer có quyền RunInstances.", en: "The developer has RunInstances permission." }) },
            { at: "svc", state: "change", tag: L({ vi: "THIẾU TAG", en: "NO TAG" }), msg: L({ vi: "Instance được tạo mà không có tag.", en: "The instance is created without the tag." }) },
          ],
          ok: false, result: L({ vi: "Không xác định được loại dữ liệu mà instance này chứa.", en: "There is no way to tell what kind of data this instance holds." }) }
      : { steps: [{ at: "scp", state: "block", msg: L({ vi: "SCP từ chối `ec2:RunInstances` khi thiếu `aws:RequestTag/dataClassification`, đồng thời từ chối thao tác xóa tag.", en: "The SCP denies `ec2:RunInstances` when `aws:RequestTag/dataClassification` is missing, and also denies removing the tag." }) }],
          ok: true, result: L({ vi: "Instance chỉ được tạo khi có tag. Tag policy đảm bảo giá trị hợp lệ, SCP bắt buộc tag phải tồn tại.", en: "Instances are created only with the tag. The tag policy ensures valid values; the SCP makes the tag mandatory." }) },
  },
  {
    name: L({ vi: "Chi phí vượt ngân sách", en: "Costs exceed the budget" }),
    request: L({ vi: "Chi phí tháng: 120% ngân sách", en: "Monthly cost: 120% of budget" }),
    from: L({ vi: "account sandbox", en: "sandbox account" }),
    nodes: [
      { id: "bud", x: 20, y: 97, w: 160, l1: "AWS Budgets", l2: L({ vi: "ngưỡng 100%", en: "100% threshold" }) },
      { id: "mail", x: 250, y: 20, w: 170, l1: L({ vi: "Email cảnh báo", en: "Alert email" }) },
      { id: "act", x: 250, y: 170, w: 170, l1: "Budgets action", l2: L({ vi: "áp policy hạn chế", en: "applies a restrictive policy" }) },
      { id: "dev", x: 490, y: 97, w: 130, l1: L({ vi: "Role developer", en: "Developer role" }) },
      { id: "ec2", x: 670, y: 97, w: 130, l1: L({ vi: "EC2 instance mới", en: "New EC2 instance" }) },
    ],
    links: [
      { a: "bud", b: "mail", via: [[100, 43]] }, { a: "bud", b: "act", via: [[100, 193]] },
      { a: "mail", b: "dev", via: [[555, 43]] }, { a: "act", b: "dev", via: [[555, 193]] }, { a: "dev", b: "ec2" },
    ],
    start: "bud",
    choices: { label: L({ vi: "Phản ứng khi vượt ngưỡng", en: "Response at the threshold" }), options: [L({ vi: "Chỉ gửi email", en: "Email only" }), "Budgets action"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["act"], back: false, steps: [
            { at: "mail", via: [[100, 43]], state: "change", tag: "EMAIL", msg: L({ vi: "Email được gửi lúc 2 giờ sáng và không có người xử lý.", en: "The email is sent at 2 a.m. and nobody acts on it." }) },
            { at: "dev", via: [[555, 43]], state: "pass", msg: L({ vi: "Developer vẫn giữ nguyên quyền.", en: "The developer keeps the same permissions." }) },
            { at: "ec2", state: "change", tag: L({ vi: "TỐN THÊM", en: "MORE COST" }), msg: L({ vi: "Instance cấu hình lớn tiếp tục được tạo, chi phí tiếp tục tăng.", en: "Large instances keep being created, and costs keep rising." }) },
          ],
          ok: false, result: L({ vi: "Cảnh báo được gửi nhưng không có phản ứng kịp thời.", en: "The alert is sent, but there is no timely response." }) }
      : { hide: ["mail"], back: false, steps: [
            { at: "act", via: [[100, 193]], state: "change", tag: L({ vi: "TỰ ĐỘNG", en: "AUTOMATIC" }), msg: L({ vi: "Khi vượt ngưỡng (thực tế hoặc dự báo), budget action của AWS Budgets tự động thực thi.", en: "When the threshold is exceeded (actual or forecasted), the AWS Budgets budget action runs automatically." }) },
            { at: "dev", via: [[555, 193]], state: "change", tag: L({ vi: "HẠN CHẾ", en: "RESTRICTED" }), msg: L({ vi: "Gắn IAM policy (hoặc SCP) cấm tạo thêm tài nguyên.", en: "Attaches an IAM policy (or SCP) that forbids creating more resources." }) },
            { at: "ec2", state: "block", msg: L({ vi: "`ec2:RunInstances` bị từ chối.", en: "`ec2:RunInstances` is denied." }) },
          ],
          ok: true, result: L({ vi: "Chi phí ngừng tăng mà không cần can thiệp thủ công.", en: "Costs stop rising without manual intervention." }) },
  },
  {
    name: L({ vi: "Bucket nào đang được chia sẻ ra bên ngoài?", en: "Which buckets are shared externally?" }),
    request: L({ vi: "Rà soát 300 bucket", en: "Review 300 buckets" }),
    from: L({ vi: "của đội bảo mật", en: "by the security team" }),
    nodes: [
      { id: "sec", x: 20, y: 97, w: 80, l1: L({ vi: "Đội bảo mật", en: "Security team" }), user: true },
      { id: "aa", x: 190, y: 97, w: 180, l1: "IAM Access Analyzer", l2: "zone of trust: Organization" },
      { id: "b1", x: 470, y: 20, w: 170, l1: "mftech-images" },
      { id: "b2", x: 470, y: 97, w: 170, l1: "mftech-reports" },
      { id: "b3", x: 470, y: 174, w: 170, l1: "mftech-backup" },
      { id: "ext", x: 690, y: 97, w: 110, l1: L({ vi: "Account bên ngoài", en: "External account" }), l2: L({ vi: "ngoài Organization", en: "outside the organization" }) },
    ],
    links: [
      { a: "sec", b: "aa" }, { a: "aa", b: "b1", via: fan(420, 43) }, { a: "aa", b: "b2" }, { a: "aa", b: "b3", via: fan(420, 197) },
      { a: "b2", b: "ext", dashed: true },
    ],
    start: "sec",
    choices: { label: L({ vi: "Phương pháp rà soát", en: "Review method" }), options: [L({ vi: "Rà soát thủ công từng bucket policy", en: "Review each bucket policy by hand" }), "IAM Access Analyzer"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["aa"], back: false, steps: [
            { at: "b1", state: "skip", tag: L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: L({ vi: "Mở policy và đọc từng statement.", en: "Open the policy and read each statement." }) },
            { at: "b3", state: "skip", tag: L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: L({ vi: "Còn 297 bucket, chưa kể KMS key, IAM role, Lambda…", en: "297 buckets left, not counting KMS keys, IAM roles, Lambda…" }) },
          ],
          ok: false, result: L({ vi: "Tốn thời gian và dễ bỏ sót. Bucket mftech-reports vẫn đang chia sẻ cho account bên ngoài mà chưa được phát hiện.", en: "Time-consuming and easy to miss things. The mftech-reports bucket is still shared with an external account and has not been found." }) }
      : { steps: [
            { at: "aa", state: "pass", msg: L({ vi: "Phân tích mọi resource policy với zone of trust là toàn bộ Organization.", en: "Analyzes every resource policy, with the whole organization as the zone of trust." }) },
            { at: "b2", state: "change", tag: "FINDING", msg: L({ vi: "Bucket policy cấp quyền đọc cho một account **ngoài Organization**.", en: "The bucket policy grants read access to an account **outside the organization**." }) },
          ],
          ok: true, result: L({ vi: "Access Analyzer xác định chính xác quyền truy cập ngoài ý muốn để khắc phục.", en: "Access Analyzer pinpoints the unintended access so it can be fixed." }) },
  },
  {
    name: L({ vi: "Triển khai một template tới 20 account", en: "Deploy one template to 20 accounts" }),
    request: "deploy guardrails.yaml",
    from: L({ vi: "từ account quản trị", en: "from the management account" }),
    nodes: [
      { id: "admin", x: 20, y: 97, w: 80, l1: L({ vi: "Quản trị viên", en: "Administrator" }), user: true },
      { id: "ss", x: 180, y: 97, w: 190, l1: "CloudFormation", l2: "StackSets" },
      { id: "a1", x: 520, y: 20, w: 200, l1: L({ vi: "Account dev", en: "Dev account" }), l2: "ap-southeast-1" },
      { id: "a2", x: 520, y: 97, w: 200, l1: L({ vi: "Account staging", en: "Staging account" }), l2: "ap-southeast-1" },
      { id: "a3", x: 520, y: 174, w: 200, l1: L({ vi: "Account prod", en: "Prod account" }), l2: "ap-southeast-1, us-east-1" },
    ],
    links: [{ a: "admin", b: "ss" }, { a: "ss", b: "a1", via: fan(450, 43) }, { a: "ss", b: "a2" }, { a: "ss", b: "a3", via: fan(450, 197) }],
    start: "admin",
    choices: { label: L({ vi: "Phương án", en: "Option" }), options: [L({ vi: "Đăng nhập từng account", en: "Sign in to each account" }), "CloudFormation StackSets"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["ss"], back: false, steps: [
            { at: "a1", state: "change", tag: "1/20", msg: L({ vi: "Đăng nhập và tạo stack.", en: "Sign in and create the stack." }) },
            { at: "a2", state: "change", tag: "2/20", msg: L({ vi: "Đăng nhập account khác và tạo lại stack.", en: "Sign in to another account and create the stack again." }) },
            { at: "a3", state: "change", tag: "3/20", msg: L({ vi: "Còn 17 account và nhiều Region khác.", en: "17 accounts and several more Regions to go." }) },
          ],
          ok: false, result: L({ vi: "Tốn nhiều thời gian, và cấu hình giữa các account dễ sai lệch.", en: "Time-consuming, and configurations easily drift between accounts." }) }
      : { back: false, steps: [
            { at: "ss", state: "pass", msg: L({ vi: "Một thao tác duy nhất chọn danh sách account và Region.", en: "A single operation selects the list of accounts and Regions." }) },
            { at: "a1", via: fan(450, 43), state: "pass", msg: L({ vi: "Stack được tạo.", en: "The stack is created." }) },
            { at: "a2", via: [[450, 43], [450, 120]], state: "pass", msg: L({ vi: "Stack được tạo.", en: "The stack is created." }) },
            { at: "a3", via: [[450, 120], [450, 197]], state: "pass", msg: L({ vi: "Stack được tạo tại cả hai Region.", en: "The stack is created in both Regions." }) },
          ],
          ok: true, result: L({ vi: "Cùng một template được triển khai đồng thời tới mọi account và Region.", en: "The same template is deployed to every account and Region at once." }) },
  },
  {
    name: L({ vi: "Tạo account mới cho team marketing", en: "Create a new account for the marketing team" }),
    request: L({ vi: "Tạo account marketing", en: "Create marketing account" }),
    from: L({ vi: "từ quản trị viên", en: "from the administrator" }),
    nodes: [
      { id: "admin", x: 20, y: 97, w: 80, l1: L({ vi: "Quản trị viên", en: "Administrator" }), user: true },
      { id: "ct", x: 190, y: 97, w: 200, l1: "AWS Control Tower", l2: "landing zone" },
      { id: "acc", x: 560, y: 97, w: 220, l1: L({ vi: "Account marketing", en: "Marketing account" }) },
    ],
    links: [{ a: "admin", b: "ct" }, { a: "ct", b: "acc" }, { id: "manual", a: "admin", b: "acc", via: [[60, 200], [670, 200]], dashed: true, label: L({ vi: "tạo thủ công", en: "created by hand" }), lx: 365, ly: 194 }],
    start: "admin",
    choices: { label: L({ vi: "Phương án", en: "Option" }), options: [L({ vi: "Tạo thủ công rồi cấu hình", en: "Create by hand, then configure" }), "AWS Control Tower"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["ct"], back: false, steps: [
            { at: "acc", via: [[60, 200], [670, 200]], state: "change", tag: L({ vi: "THIẾU", en: "MISSING" }), msg: L({ vi: "CloudTrail chưa được bật, account chưa được đưa vào OU có SCP, chưa kết nối mạng dùng chung.", en: "CloudTrail is not enabled, the account is not placed in an OU with SCPs, and it is not connected to the shared network." }) },
          ],
          ok: false, result: L({ vi: "Cấu hình không đồng nhất giữa các account, khó quản trị khi số lượng account tăng.", en: "Configurations are inconsistent across accounts and hard to govern as the number of accounts grows." }) }
      : { hide: ["manual"], back: false, steps: [
            { at: "ct", state: "pass", msg: L({ vi: "Account Factory tạo account theo landing zone.", en: "Account Factory creates the account according to the landing zone." }) },
            { at: "acc", state: "pass", msg: L({ vi: "Có sẵn control (trước đây gọi là guardrail), CloudTrail và đăng nhập tập trung. Mạng dùng chung qua AWS RAM.", en: "Controls (formerly called guardrails), CloudTrail and centralized sign-in are in place. The shared network comes through AWS RAM." }) },
          ],
          ok: true, result: L({ vi: "Account mới tuân thủ tiêu chuẩn ngay từ đầu, giảm khối lượng vận hành.", en: "The new account complies with the standard from the start, reducing operational work." }) },
  },
];
}

export default function OrgGuardSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Quản lý nhiều AWS account của MFTECH bằng AWS Organizations", en: "Managing MFTECH's AWS accounts with AWS Organizations" })} action={L({ vi: "Chạy mô phỏng", en: "Run simulation" })} />;
}
