import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

// Four IAM habits that decide whether ShopViet's account stays safe: no root access
// keys, groups instead of per-user policies, MFA + CloudTrail, and permissions
// boundaries against privilege escalation.

const SCENARIOS: CaseScenario[] = [
  {
    name: "Mở account mới: root user",
    request: "aws s3 rb s3://shopviet-orders --force",
    from: "từ người lấy được thông tin root",
    nodes: [
      { id: "bad", x: 20, y: 97, w: 80, l1: "Người lạ", user: true },
      { id: "root", x: 250, y: 97, w: 200, l1: "Root user", l2: "toàn quyền account" },
      { id: "acct", x: 600, y: 97, w: 190, l1: "Bucket đơn hàng" },
    ],
    links: [{ a: "bad", b: "root" }, { a: "root", b: "acct" }],
    start: "bad",
    choices: { label: "Root user", options: ["Có access key để dùng CLI", "Không access key, có MFA"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, steps: [
            { at: "root", state: "change", tag: "LỘ KEY", msg: "Access key của root bị lộ trong một file cấu hình." },
            { at: "acct", state: "change", tag: "ĐÃ XÓA", msg: "Root làm được mọi việc trong account." },
          ],
          ok: false, result: "Mất dữ liệu. Root không bao giờ cần access key." }
      : { steps: [{ at: "root", state: "block", flash: "MFA", msg: "Không có access key để dùng. Đăng nhập console cần mật khẩu mạnh **và MFA**." }],
          ok: true, result: "Root được khóa kỹ. Email của root nên là alias tới hộp thư nhóm quản trị theo dõi." },
  },
  {
    name: "Cấp quyền cho 50 nhân viên kho",
    request: "Cho phép đọc bảng inventory",
    from: "cho 50 user mới",
    nodes: [
      { id: "admin", x: 20, y: 97, w: 80, l1: "Quản trị viên", user: true },
      { id: "grp", x: 240, y: 97, w: 180, l1: "IAM group Kho", l2: "1 policy" },
      { id: "users", x: 580, y: 97, w: 200, l1: "50 IAM user", l2: "nhân viên kho" },
    ],
    links: [{ a: "admin", b: "grp" }, { a: "grp", b: "users" }, { id: "direct", a: "admin", b: "users", via: [[60, 200], [680, 200]], dashed: true, label: "gắn từng người", lx: 370, ly: 194 }],
    start: "admin",
    choices: { label: "Cách làm", options: ["Gắn policy cho từng user", "IAM group"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["grp"], back: false, steps: [
            { at: "users", via: [[60, 200], [680, 200]], state: "change", tag: "x50", msg: "Gắn policy 50 lần. Sau này đổi một quyền lại phải sửa 50 chỗ." },
          ],
          ok: false, result: "Chạy được nhưng chậm và dễ sót." }
      : { hide: ["direct"], back: false, steps: [
            { at: "grp", state: "pass", msg: "Gắn policy một lần vào group." },
            { at: "users", state: "pass", msg: "Thêm 50 user vào group, tất cả nhận quyền ngay." },
          ],
          ok: true, result: "Nhanh nhất, và đổi quyền chỉ cần sửa một chỗ." },
  },
  {
    name: "Ai đã xóa IAM user lúc 2 giờ sáng?",
    request: "iam:DeleteUser kho-07",
    from: "từ một tài khoản quản trị",
    nodes: [
      { id: "who", x: 20, y: 97, w: 80, l1: "Ai đó", user: true },
      { id: "mfa", x: 170, y: 97, w: 140, l1: "Đăng nhập", l2: "mật khẩu + MFA" },
      { id: "iam", x: 380, y: 97, w: 160, l1: "IAM", l2: "xóa user kho-07" },
      { id: "trail", x: 620, y: 97, w: 170, l1: "CloudTrail", l2: "nhật ký API" },
    ],
    links: [{ a: "who", b: "mfa" }, { a: "mfa", b: "iam" }, { a: "iam", b: "trail" }],
    start: "who",
    choices: { label: "Thiết lập", options: ["Không MFA, không CloudTrail", "MFA + CloudTrail"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, marks: { trail: "skip" }, steps: [
            { at: "mfa", state: "pass", msg: "Chỉ cần mật khẩu, mà mật khẩu có thể đã lộ." },
            { at: "iam", state: "change", tag: "ĐÃ XÓA", msg: "User bị xóa." },
            { at: "trail", state: "block", flash: "?", msg: "CloudTrail chưa bật: không có log nào." },
          ],
          ok: false, result: "Không biết ai làm, lúc nào, từ đâu." }
      : { back: false, steps: [
            { at: "mfa", state: "pass", msg: "Người dùng đặc quyền phải qua **MFA**." },
            { at: "iam", state: "change", tag: "ĐÃ XÓA", msg: "User bị xóa." },
            { at: "trail", state: "pass", msg: "CloudTrail ghi lại: ai gọi, lúc nào, từ IP nào." },
          ],
          ok: true, result: "Khó bị mạo danh hơn, và mọi hành động IAM đều truy vết được." },
  },
  {
    name: "Developer tự nâng quyền",
    request: "iam:AttachUserPolicy AdministratorAccess",
    from: "developer tự gắn cho mình",
    nodes: [
      { id: "dev", x: 20, y: 97, w: 80, l1: "Developer", user: true },
      { id: "iam", x: 160, y: 97, w: 170, l1: "IAM policy", l2: "được tự gắn policy" },
      { id: "bound", x: 390, y: 97, w: 170, l1: "Permissions boundary", l2: "trần cho developer" },
      { id: "prod", x: 620, y: 97, w: 170, l1: "RDS production", l2: "DeleteDBInstance" },
    ],
    links: [{ a: "dev", b: "iam" }, { a: "iam", b: "bound" }, { a: "bound", b: "prod" }],
    start: "dev",
    choices: { label: "Developer", options: ["Không có boundary", "Có permissions boundary"], initial: 0 },
    run: (v) => v === 0
      ? { marks: { bound: "skip" }, back: false, steps: [
            { at: "iam", state: "change", tag: "ADMIN", msg: "Developer tự gắn AdministratorAccess." },
            { at: "bound", state: "skip", msg: "Không có boundary nào giới hạn." },
            { at: "prod", state: "change", tag: "LỠ TAY", msg: "Lỡ tay xóa được database production." },
          ],
          ok: false, result: "Leo thang đặc quyền: được tự gắn policy nghĩa là tự cho mình mọi quyền." }
      : { steps: [
            { at: "iam", state: "change", tag: "ADMIN", msg: "Developer vẫn gắn được AdministratorAccess." },
            { at: "bound", state: "block", msg: "Quyền hiệu lực = phần giao của identity policy và **boundary**. Boundary không cho xóa RDS." },
          ],
          ok: true, result: "Developer vẫn tự phục vụ được, nhưng không vượt quá trần mà quản trị viên đặt." },
  },
];

export default function IamMythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Bốn thói quen IAM giữ an toàn cho account ShopViet" action="Chạy thử" />;
}
