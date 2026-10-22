import CaseSim, { type CaseBox, type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

// ShopViet now runs several AWS accounts in one Organization. Each situation is a
// governance problem; pick a tool and watch what happens: SCP, tag policy,
// Budgets actions, IAM Access Analyzer, StackSets, Control Tower.

type P = [number, number];

// Layout shared by the "a request goes through the Organization" situations.
const GATE_BOXES: CaseBox[] = [
  { x: 130, y: 16, w: 230, h: 208, label: "AWS Organizations · OU Dev" },
  { x: 390, y: 16, w: 410, h: 208, label: "Account dev" },
];
const gateNodes = (who: string, svc: string, svc2: string): CaseNode[] => [
  { id: "user", x: 20, y: 97, w: 80, l1: who, user: true },
  { id: "scp", x: 165, y: 97, w: 160, l1: "SCP", l2: "trần cho cả account" },
  { id: "iam", x: 420, y: 97, w: 160, l1: "IAM policy", l2: "AdministratorAccess" },
  { id: "svc", x: 630, y: 97, w: 150, l1: svc, l2: svc2 },
];
const GATE_LINKS: CaseLink[] = [{ a: "user", b: "scp" }, { a: "scp", b: "iam" }, { a: "iam", b: "svc" }];

const fan = (x: number, y: number): P[] => [[x, 120], [x, y]];

const SCENARIOS: CaseScenario[] = [
  {
    name: "Admin account dev định tắt CloudTrail",
    request: "cloudtrail:StopLogging",
    from: "từ admin của account dev",
    boxes: GATE_BOXES,
    nodes: gateNodes("Admin dev", "CloudTrail", "log kiểm toán"),
    links: GATE_LINKS,
    start: "user",
    choices: { label: "Bảo vệ bằng", options: ["Chỉ IAM policy", "SCP chặn sửa CloudTrail"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "scp", state: "skip", msg: "Chưa có SCP nào nhắc tới CloudTrail." },
            { at: "iam", state: "pass", msg: "Admin có AdministratorAccess, nên được phép." },
            { at: "svc", state: "change", tag: "ĐÃ TẮT", msg: "CloudTrail ngừng ghi log." },
          ],
          ok: false, result: "Admin trong account làm được mọi thứ IAM cho phép. Muốn giới hạn cả admin: dùng SCP." }
      : { steps: [{ at: "scp", state: "block", msg: "SCP **Deny** `cloudtrail:StopLogging` cho cả OU Dev, áp dụng cho mọi principal, kể cả root của member account." }],
          ok: true, result: "CloudTrail vẫn chạy. IAM policy cho phép cũng không vượt được trần của SCP." },
  },
  {
    name: "Tạo EC2 thiếu tag phân loại dữ liệu",
    request: "ec2:RunInstances (không có tag dataClassification)",
    from: "từ developer",
    boxes: GATE_BOXES,
    nodes: gateNodes("Developer", "EC2", "instance mới"),
    links: GATE_LINKS,
    start: "user",
    choices: { label: "Quy định bằng", options: ["Chỉ tag policy", "Tag policy + SCP"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "scp", state: "skip", msg: "Tag policy chuẩn hóa **giá trị** tag, nhưng không chặn request thiếu tag." },
            { at: "iam", state: "pass", msg: "Developer có quyền RunInstances." },
            { at: "svc", state: "change", tag: "THIẾU TAG", msg: "Instance được tạo mà không có tag." },
          ],
          ok: false, result: "Không ai biết instance này chứa dữ liệu loại gì." }
      : { steps: [{ at: "scp", state: "block", msg: "SCP từ chối `ec2:RunInstances` khi thiếu `aws:RequestTag/dataClassification`, và từ chối xóa tag." }],
          ok: true, result: "Muốn tạo instance phải gắn tag. Tag policy giữ giá trị hợp lệ, SCP bắt buộc phải có tag." },
  },
  {
    name: "Developer tiêu vượt ngân sách",
    request: "Chi phí tháng: 120% ngân sách",
    from: "account sandbox",
    nodes: [
      { id: "bud", x: 20, y: 97, w: 160, l1: "AWS Budgets", l2: "ngưỡng 100%" },
      { id: "mail", x: 250, y: 20, w: 170, l1: "Email cảnh báo" },
      { id: "act", x: 250, y: 170, w: 170, l1: "Budgets action", l2: "áp policy hạn chế" },
      { id: "dev", x: 490, y: 97, w: 130, l1: "Role developer" },
      { id: "ec2", x: 670, y: 97, w: 130, l1: "EC2 mới" },
    ],
    links: [
      { a: "bud", b: "mail", via: [[100, 43]] }, { a: "bud", b: "act", via: [[100, 193]] },
      { a: "mail", b: "dev", via: [[555, 43]] }, { a: "act", b: "dev", via: [[555, 193]] }, { a: "dev", b: "ec2" },
    ],
    start: "bud",
    choices: { label: "Khi vượt ngưỡng", options: ["Chỉ gửi email", "Budgets action"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["act"], back: false, steps: [
            { at: "mail", via: [[100, 43]], state: "change", tag: "EMAIL", msg: "Email tới lúc 2 giờ sáng, không ai đọc." },
            { at: "dev", via: [[555, 43]], state: "pass", msg: "Developer vẫn còn nguyên quyền." },
            { at: "ec2", state: "change", tag: "TỐN THÊM", msg: "Thêm instance lớn được tạo, hóa đơn tiếp tục tăng." },
          ],
          ok: false, result: "Cảnh báo có, nhưng không ai phản ứng kịp." }
      : { hide: ["mail"], back: false, steps: [
            { at: "act", via: [[100, 193]], state: "change", tag: "TỰ ĐỘNG", msg: "Vượt ngưỡng (thực tế hoặc dự báo), Budgets action tự chạy." },
            { at: "dev", via: [[555, 193]], state: "change", tag: "HẠN CHẾ", msg: "Gắn IAM policy (hoặc SCP) cấm tạo thêm tài nguyên." },
            { at: "ec2", state: "block", msg: "`ec2:RunInstances` bị từ chối." },
          ],
          ok: true, result: "Chi phí dừng tăng mà không cần ai thức dậy." },
  },
  {
    name: "Bucket nào đang mở cho người ngoài?",
    request: "Rà soát 300 bucket",
    from: "của đội bảo mật",
    nodes: [
      { id: "sec", x: 20, y: 97, w: 80, l1: "Đội bảo mật", user: true },
      { id: "aa", x: 190, y: 97, w: 180, l1: "IAM Access Analyzer", l2: "vùng tin cậy: Organization" },
      { id: "b1", x: 470, y: 20, w: 170, l1: "shopviet-images" },
      { id: "b2", x: 470, y: 97, w: 170, l1: "shopviet-reports" },
      { id: "b3", x: 470, y: 174, w: 170, l1: "shopviet-backup" },
      { id: "ext", x: 690, y: 97, w: 110, l1: "Account lạ", l2: "ngoài Organization" },
    ],
    links: [
      { a: "sec", b: "aa" }, { a: "aa", b: "b1", via: fan(420, 43) }, { a: "aa", b: "b2" }, { a: "aa", b: "b3", via: fan(420, 197) },
      { a: "b2", b: "ext", dashed: true },
    ],
    start: "sec",
    choices: { label: "Cách rà soát", options: ["Đọc tay từng bucket policy", "IAM Access Analyzer"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["aa"], back: false, steps: [
            { at: "b1", state: "skip", tag: "ĐỌC TAY", msg: "Mở policy, đọc từng statement." },
            { at: "b3", state: "skip", tag: "ĐỌC TAY", msg: "Còn 297 bucket nữa, chưa kể KMS key, IAM role, Lambda…" },
          ],
          ok: false, result: "Chậm và dễ sót. Bucket shopviet-reports vẫn đang mở cho account lạ mà chưa ai thấy." }
      : { steps: [
            { at: "aa", state: "pass", msg: "Phân tích mọi resource policy theo vùng tin cậy là cả Organization." },
            { at: "b2", state: "change", tag: "FINDING", msg: "Bucket policy cho một account **ngoài Organization** đọc." },
          ],
          ok: true, result: "Access Analyzer chỉ ra đúng đường truy cập ngoài ý muốn để bạn đóng lại." },
  },
  {
    name: "Triển khai một template ra 20 account",
    request: "deploy guardrails.yaml",
    from: "từ account quản trị",
    nodes: [
      { id: "admin", x: 20, y: 97, w: 80, l1: "Quản trị viên", user: true },
      { id: "ss", x: 180, y: 97, w: 190, l1: "CloudFormation", l2: "StackSets" },
      { id: "a1", x: 520, y: 20, w: 200, l1: "Account dev", l2: "ap-southeast-1" },
      { id: "a2", x: 520, y: 97, w: 200, l1: "Account staging", l2: "ap-southeast-1" },
      { id: "a3", x: 520, y: 174, w: 200, l1: "Account prod", l2: "ap-southeast-1, us-east-1" },
    ],
    links: [{ a: "admin", b: "ss" }, { a: "ss", b: "a1", via: fan(450, 43) }, { a: "ss", b: "a2" }, { a: "ss", b: "a3", via: fan(450, 197) }],
    start: "admin",
    choices: { label: "Cách làm", options: ["Đăng nhập từng account", "CloudFormation StackSets"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["ss"], back: false, steps: [
            { at: "a1", state: "change", tag: "1/20", msg: "Đăng nhập, tạo stack." },
            { at: "a2", state: "change", tag: "2/20", msg: "Đăng nhập account khác, tạo lại stack." },
            { at: "a3", state: "change", tag: "3/20", msg: "Còn 17 account và nhiều Region nữa." },
          ],
          ok: false, result: "Mất cả buổi, và mỗi account dễ lệch một chút." }
      : { back: false, steps: [
            { at: "ss", state: "pass", msg: "Một thao tác chọn danh sách account và Region." },
            { at: "a1", via: fan(450, 43), state: "pass", msg: "Stack được tạo." },
            { at: "a2", via: [[450, 43], [450, 120]], state: "pass", msg: "Stack được tạo." },
            { at: "a3", via: [[450, 120], [450, 197]], state: "pass", msg: "Stack được tạo ở cả hai Region." },
          ],
          ok: true, result: "Cùng một template, cùng lúc, ở mọi account và Region." },
  },
  {
    name: "Mở account mới cho team marketing",
    request: "Tạo account marketing",
    from: "từ quản trị viên",
    nodes: [
      { id: "admin", x: 20, y: 97, w: 80, l1: "Quản trị viên", user: true },
      { id: "ct", x: 190, y: 97, w: 200, l1: "AWS Control Tower", l2: "landing zone" },
      { id: "acc", x: 560, y: 97, w: 220, l1: "Account marketing" },
    ],
    links: [{ a: "admin", b: "ct" }, { a: "ct", b: "acc" }, { id: "manual", a: "admin", b: "acc", via: [[60, 200], [670, 200]], dashed: true, label: "tạo tay", lx: 365, ly: 194 }],
    start: "admin",
    choices: { label: "Cách làm", options: ["Tạo tay rồi cấu hình", "AWS Control Tower"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["ct"], back: false, steps: [
            { at: "acc", via: [[60, 200], [670, 200]], state: "change", tag: "THIẾU", msg: "Quên bật CloudTrail, quên đưa vào OU có SCP, chưa nối mạng dùng chung." },
          ],
          ok: false, result: "Mỗi account một kiểu, khó quản trị khi số account tăng." }
      : { hide: ["manual"], back: false, steps: [
            { at: "ct", state: "pass", msg: "Account Factory tạo account theo landing zone." },
            { at: "acc", state: "pass", msg: "Có sẵn guardrail, CloudTrail, đăng nhập tập trung. Mạng dùng chung qua AWS RAM." },
          ],
          ok: true, result: "Account mới theo chuẩn ngay từ đầu, ít việc vận hành." },
  },
];

export default function OrgGuardSim() {
  return <CaseSim scenarios={SCENARIOS} label="Quản trị nhiều account của ShopViet bằng Organizations" action="Chạy thử" />;
}
