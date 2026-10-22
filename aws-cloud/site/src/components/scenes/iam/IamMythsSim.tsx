import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

// Four IAM habits that decide whether ShopViet's account stays safe: no root access
// keys, groups instead of per-user policies, MFA + CloudTrail, and permissions
// boundaries against privilege escalation.

const SCENARIOS: CaseScenario[] = [
  {
    name: "Account mới: bảo vệ root user",
    request: "aws s3 rb s3://shopviet-orders --force",
    from: "từ bên thứ ba có được thông tin root",
    nodes: [
      { id: "bad", x: 20, y: 97, w: 80, l1: "Bên thứ ba", user: true },
      { id: "root", x: 250, y: 97, w: 200, l1: "Root user", l2: "toàn quyền trong account" },
      { id: "acct", x: 600, y: 97, w: 190, l1: "Bucket đơn hàng" },
    ],
    links: [{ a: "bad", b: "root" }, { a: "root", b: "acct" }],
    start: "bad",
    choices: { label: "Root user", options: ["Có access key để dùng CLI", "Không có access key, có MFA"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, steps: [
            { at: "root", state: "change", tag: "LỘ KEY", msg: "Access key của root user bị lộ trong một file cấu hình." },
            { at: "acct", state: "change", tag: "ĐÃ XÓA", msg: "Root user thực hiện được mọi thao tác trong account." },
          ],
          ok: false, result: "Dữ liệu bị mất. Root user không bao giờ cần access key." }
      : { steps: [{ at: "root", state: "block", flash: "MFA", msg: "Không có access key để sử dụng. Đăng nhập console yêu cầu mật khẩu mạnh **và MFA**." }],
          ok: true, result: "Root user được bảo vệ chặt chẽ. Email của root user nên là alias tới hộp thư do nhóm quản trị theo dõi." },
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
    links: [{ a: "admin", b: "grp" }, { a: "grp", b: "users" }, { id: "direct", a: "admin", b: "users", via: [[60, 200], [680, 200]], dashed: true, label: "gắn cho từng user", lx: 370, ly: 194 }],
    start: "admin",
    choices: { label: "Phương án", options: ["Gắn policy cho từng user", "IAM group"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["grp"], back: false, steps: [
            { at: "users", via: [[60, 200], [680, 200]], state: "change", tag: "x50", msg: "Gắn policy 50 lần. Khi thay đổi một quyền, phải sửa tại 50 vị trí." },
          ],
          ok: false, result: "Hoạt động được nhưng tốn thời gian và dễ bỏ sót." }
      : { hide: ["direct"], back: false, steps: [
            { at: "grp", state: "pass", msg: "Gắn policy một lần vào group." },
            { at: "users", state: "pass", msg: "Thêm 50 user vào group; tất cả được cấp quyền ngay lập tức." },
          ],
          ok: true, result: "Nhanh nhất, và thay đổi quyền chỉ cần sửa tại một vị trí." },
  },
  {
    name: "Truy vết thao tác xóa IAM user lúc 2 giờ sáng",
    request: "iam:DeleteUser kho-07",
    from: "từ một tài khoản quản trị",
    nodes: [
      { id: "who", x: 20, y: 97, w: 80, l1: "Người thực hiện", user: true },
      { id: "mfa", x: 170, y: 97, w: 140, l1: "Đăng nhập", l2: "mật khẩu + MFA" },
      { id: "iam", x: 380, y: 97, w: 160, l1: "IAM", l2: "xóa user kho-07" },
      { id: "trail", x: 620, y: 97, w: 170, l1: "CloudTrail", l2: "nhật ký API" },
    ],
    links: [{ a: "who", b: "mfa" }, { a: "mfa", b: "iam" }, { a: "iam", b: "trail" }],
    start: "who",
    choices: { label: "Thiết lập", options: ["Không MFA, chưa tạo trail", "MFA + trail CloudTrail"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, marks: { trail: "skip" }, steps: [
            { at: "mfa", state: "pass", msg: "Chỉ yêu cầu mật khẩu, trong khi mật khẩu có thể đã bị lộ." },
            { at: "iam", state: "change", tag: "ĐÃ XÓA", msg: "User bị xóa." },
            { at: "trail", state: "change", tag: "90 NGÀY", msg: "Chưa tạo trail. **Event history** của CloudTrail (bật mặc định) chỉ lưu management event của 90 ngày gần nhất." },
          ],
          ok: false, result: "Mật khẩu bị lộ là đủ để thực hiện thao tác đặc quyền. Sau 90 ngày, sự kiện không còn trong Event history nên không truy vết được." }
      : { back: false, steps: [
            { at: "mfa", state: "pass", msg: "Người dùng đặc quyền phải xác thực **MFA**." },
            { at: "iam", state: "change", tag: "ĐÃ XÓA", msg: "User bị xóa." },
            { at: "trail", state: "pass", msg: "Trail ghi lại bên gọi, thời điểm và địa chỉ IP nguồn, đồng thời lưu log vào S3 để lưu trữ lâu dài." },
          ],
          ok: true, result: "Giảm nguy cơ mạo danh, và mọi thao tác IAM đều truy vết được." },
  },
  {
    name: "Developer tự nâng quyền",
    request: "iam:AttachUserPolicy AdministratorAccess",
    from: "developer tự gắn policy cho chính mình",
    nodes: [
      { id: "dev", x: 20, y: 97, w: 80, l1: "Developer", user: true },
      { id: "iam", x: 160, y: 97, w: 170, l1: "IAM policy", l2: "cho phép tự gắn policy" },
      { id: "bound", x: 390, y: 97, w: 170, l1: "Permissions boundary", l2: "giới hạn cho developer" },
      { id: "prod", x: 620, y: 97, w: 170, l1: "RDS production", l2: "DeleteDBInstance" },
    ],
    links: [{ a: "dev", b: "iam" }, { a: "iam", b: "bound" }, { a: "bound", b: "prod" }],
    start: "dev",
    choices: { label: "Developer", options: ["Không có boundary", "Có permissions boundary"], initial: 0 },
    run: (v) => v === 0
      ? { marks: { bound: "skip" }, back: false, steps: [
            { at: "iam", state: "change", tag: "ADMIN", msg: "Developer tự gắn AdministratorAccess." },
            { at: "bound", state: "skip", msg: "Không có permissions boundary giới hạn." },
            { at: "prod", state: "change", tag: "XÓA NHẦM", msg: "Database production bị xóa do thao tác nhầm." },
          ],
          ok: false, result: "Leo thang đặc quyền: quyền tự gắn policy đồng nghĩa với khả năng tự cấp mọi quyền." }
      : { steps: [
            { at: "iam", state: "change", tag: "ADMIN", msg: "Developer vẫn gắn được AdministratorAccess." },
            { at: "bound", state: "block", msg: "Quyền hiệu lực = phần giao của identity policy và **boundary**. Boundary không cho phép xóa RDS." },
          ],
          ok: true, result: "Developer vẫn tự phục vụ được, nhưng không vượt quá giới hạn do quản trị viên thiết lập." },
  },
];

export default function IamMythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Bốn nguyên tắc IAM bảo vệ account ShopViet" action="Chạy mô phỏng" />;
}
