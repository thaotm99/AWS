import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// Four IAM habits that decide whether ShopViet's account stays safe: no root access
// keys, groups instead of per-user policies, MFA + CloudTrail, and permissions
// boundaries against privilege escalation.

function scenarios(L: Lang): CaseScenario[] {
return [
  {
    name: L({ vi: "Account mới: bảo vệ root user", en: "New account: protecting the root user" }),
    request: "aws s3 rb s3://shopviet-orders --force",
    from: L({ vi: "từ bên thứ ba có được thông tin root", en: "from a third party holding the root credentials" }),
    nodes: [
      { id: "bad", x: 20, y: 97, w: 80, l1: L({ vi: "Bên thứ ba", en: "Third party" }), user: true },
      { id: "root", x: 250, y: 97, w: 200, l1: "Root user", l2: L({ vi: "toàn quyền trong account", en: "full access in the account" }) },
      { id: "acct", x: 600, y: 97, w: 190, l1: L({ vi: "Bucket đơn hàng", en: "Orders bucket" }) },
    ],
    links: [{ a: "bad", b: "root" }, { a: "root", b: "acct" }],
    start: "bad",
    choices: { label: "Root user", options: [L({ vi: "Có access key để dùng CLI", en: "Has an access key for the CLI" }), L({ vi: "Không có access key, có MFA", en: "No access key, MFA enabled" })], initial: 0 },
    run: (v) => v === 0
      ? { back: false, steps: [
            { at: "root", state: "change", tag: L({ vi: "LỘ KEY", en: "KEY LEAKED" }), msg: L({ vi: "Access key của root user bị lộ trong một file cấu hình.", en: "The root user's access key leaks in a configuration file." }) },
            { at: "acct", state: "change", tag: L({ vi: "ĐÃ XÓA", en: "DELETED" }), msg: L({ vi: "Root user thực hiện được mọi thao tác trong account.", en: "The root user can perform every action in the account." }) },
          ],
          ok: false, result: L({ vi: "Dữ liệu bị mất. Root user không bao giờ cần access key.", en: "The data is lost. The root user never needs an access key." }) }
      : { steps: [{ at: "root", state: "block", flash: "MFA", msg: L({ vi: "Không có access key để sử dụng. Đăng nhập console yêu cầu mật khẩu mạnh **và MFA**.", en: "There is no access key to use. Console sign-in requires a strong password **and MFA**." }) }],
          ok: true, result: L({ vi: "Root user được bảo vệ chặt chẽ. Email của root user nên là alias tới hộp thư do nhóm quản trị theo dõi.", en: "The root user is tightly protected. The root user's email should be an alias to a mailbox monitored by the admin team." }) },
  },
  {
    name: L({ vi: "Cấp quyền cho 50 nhân viên kho", en: "Grant permissions to 50 warehouse staff" }),
    request: L({ vi: "Cho phép đọc bảng inventory", en: "Allow reading the inventory table" }),
    from: L({ vi: "cho 50 user mới", en: "for 50 new users" }),
    nodes: [
      { id: "admin", x: 20, y: 97, w: 80, l1: L({ vi: "Quản trị viên", en: "Administrator" }), user: true },
      { id: "grp", x: 240, y: 97, w: 180, l1: L({ vi: "IAM group Kho", en: "IAM group Warehouse" }), l2: "1 policy" },
      { id: "users", x: 580, y: 97, w: 200, l1: L({ vi: "50 IAM user", en: "50 IAM users" }), l2: L({ vi: "nhân viên kho", en: "warehouse staff" }) },
    ],
    links: [{ a: "admin", b: "grp" }, { a: "grp", b: "users" }, { id: "direct", a: "admin", b: "users", via: [[60, 200], [680, 200]], dashed: true, label: L({ vi: "gắn cho từng user", en: "attach to each user" }), lx: 370, ly: 194 }],
    start: "admin",
    choices: { label: L({ vi: "Phương án", en: "Option" }), options: [L({ vi: "Gắn policy cho từng user", en: "Attach policy to each user" }), "IAM group"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["grp"], back: false, steps: [
            { at: "users", via: [[60, 200], [680, 200]], state: "change", tag: "x50", msg: L({ vi: "Gắn policy 50 lần. Khi thay đổi một quyền, phải sửa tại 50 vị trí.", en: "Attach the policy 50 times. To change a permission, you must edit it in 50 places." }) },
          ],
          ok: false, result: L({ vi: "Hoạt động được nhưng tốn thời gian và dễ bỏ sót.", en: "It works but is time-consuming and easy to miss things." }) }
      : { hide: ["direct"], back: false, steps: [
            { at: "grp", state: "pass", msg: L({ vi: "Gắn policy một lần vào group.", en: "Attach the policy to the group once." }) },
            { at: "users", state: "pass", msg: L({ vi: "Thêm 50 user vào group; tất cả được cấp quyền ngay lập tức.", en: "Add the 50 users to the group; all of them get the permissions immediately." }) },
          ],
          ok: true, result: L({ vi: "Nhanh nhất, và thay đổi quyền chỉ cần sửa tại một vị trí.", en: "Fastest, and changing a permission needs an edit in only one place." }) },
  },
  {
    name: L({ vi: "Truy vết thao tác xóa IAM user lúc 2 giờ sáng", en: "Trace an IAM user deletion at 2 a.m." }),
    request: "iam:DeleteUser kho-07",
    from: L({ vi: "từ một tài khoản quản trị", en: "from an admin account" }),
    nodes: [
      { id: "who", x: 20, y: 97, w: 80, l1: L({ vi: "Người thực hiện", en: "Actor" }), user: true },
      { id: "mfa", x: 170, y: 97, w: 140, l1: L({ vi: "Đăng nhập", en: "Sign-in" }), l2: L({ vi: "mật khẩu + MFA", en: "password + MFA" }) },
      { id: "iam", x: 380, y: 97, w: 160, l1: "IAM", l2: L({ vi: "xóa user kho-07", en: "deletes user kho-07" }) },
      { id: "trail", x: 620, y: 97, w: 170, l1: "CloudTrail", l2: L({ vi: "nhật ký API", en: "API log" }) },
    ],
    links: [{ a: "who", b: "mfa" }, { a: "mfa", b: "iam" }, { a: "iam", b: "trail" }],
    start: "who",
    choices: { label: L({ vi: "Thiết lập", en: "Setup" }), options: [L({ vi: "Không MFA, chưa tạo trail", en: "No MFA, no trail" }), L({ vi: "MFA + trail CloudTrail", en: "MFA + CloudTrail trail" })], initial: 0 },
    run: (v) => v === 0
      ? { back: false, marks: { trail: "skip" }, steps: [
            { at: "mfa", state: "pass", msg: L({ vi: "Chỉ yêu cầu mật khẩu, trong khi mật khẩu có thể đã bị lộ.", en: "Only a password is required, and the password may have leaked." }) },
            { at: "iam", state: "change", tag: L({ vi: "ĐÃ XÓA", en: "DELETED" }), msg: L({ vi: "User bị xóa.", en: "The user is deleted." }) },
            { at: "trail", state: "change", tag: L({ vi: "90 NGÀY", en: "90 DAYS" }), msg: L({ vi: "Chưa tạo trail. **Event history** của CloudTrail (bật mặc định) chỉ lưu management event của 90 ngày gần nhất.", en: "No trail has been created. CloudTrail **Event history** (on by default) keeps only the last 90 days of management events." }) },
          ],
          ok: false, result: L({ vi: "Mật khẩu bị lộ là đủ để thực hiện thao tác đặc quyền. Sau 90 ngày, sự kiện không còn trong Event history nên không truy vết được.", en: "A leaked password is enough to perform privileged actions. After 90 days, the event is no longer in Event history, so it cannot be traced." }) }
      : { back: false, steps: [
            { at: "mfa", state: "pass", msg: L({ vi: "Người dùng đặc quyền phải xác thực **MFA**.", en: "Privileged users must authenticate with **MFA**." }) },
            { at: "iam", state: "change", tag: L({ vi: "ĐÃ XÓA", en: "DELETED" }), msg: L({ vi: "User bị xóa.", en: "The user is deleted." }) },
            { at: "trail", state: "pass", msg: L({ vi: "Trail ghi lại bên gọi, thời điểm và địa chỉ IP nguồn, đồng thời lưu log vào S3 để lưu trữ lâu dài.", en: "The trail records the caller, the time and the source IP address, and stores the logs in S3 for long-term retention." }) },
          ],
          ok: true, result: L({ vi: "Giảm nguy cơ mạo danh, và mọi thao tác IAM đều truy vết được.", en: "The risk of impersonation is reduced, and every IAM action can be traced." }) },
  },
  {
    name: L({ vi: "Developer tự nâng quyền", en: "A developer escalates their own permissions" }),
    request: "iam:AttachUserPolicy AdministratorAccess",
    from: L({ vi: "developer tự gắn policy cho chính mình", en: "a developer attaches a policy to themselves" }),
    nodes: [
      { id: "dev", x: 20, y: 97, w: 80, l1: "Developer", user: true },
      { id: "iam", x: 160, y: 97, w: 170, l1: "IAM policy", l2: L({ vi: "cho phép tự gắn policy", en: "allows self-attaching policies" }) },
      { id: "bound", x: 390, y: 97, w: 170, l1: "Permissions boundary", l2: L({ vi: "giới hạn cho developer", en: "limit for developers" }) },
      { id: "prod", x: 620, y: 97, w: 170, l1: "RDS production", l2: "DeleteDBInstance" },
    ],
    links: [{ a: "dev", b: "iam" }, { a: "iam", b: "bound" }, { a: "bound", b: "prod" }],
    start: "dev",
    choices: { label: "Developer", options: [L({ vi: "Không có boundary", en: "No boundary" }), L({ vi: "Có permissions boundary", en: "With permissions boundary" })], initial: 0 },
    run: (v) => v === 0
      ? { marks: { bound: "skip" }, back: false, steps: [
            { at: "iam", state: "change", tag: "ADMIN", msg: L({ vi: "Developer tự gắn AdministratorAccess.", en: "The developer attaches AdministratorAccess to themselves." }) },
            { at: "bound", state: "skip", msg: L({ vi: "Không có permissions boundary giới hạn.", en: "No permissions boundary limits it." }) },
            { at: "prod", state: "change", tag: L({ vi: "XÓA NHẦM", en: "DELETED BY MISTAKE" }), msg: L({ vi: "Database production bị xóa do thao tác nhầm.", en: "The production database is deleted by mistake." }) },
          ],
          ok: false, result: L({ vi: "Leo thang đặc quyền: quyền tự gắn policy đồng nghĩa với khả năng tự cấp mọi quyền.", en: "Privilege escalation: permission to attach policies to yourself means being able to grant yourself any permission." }) }
      : { steps: [
            { at: "iam", state: "change", tag: "ADMIN", msg: L({ vi: "Developer vẫn gắn được AdministratorAccess.", en: "The developer can still attach AdministratorAccess." }) },
            { at: "bound", state: "block", msg: L({ vi: "Quyền hiệu lực = phần giao của identity policy và **boundary**. Boundary không cho phép xóa RDS.", en: "Effective permissions = the intersection of the identity policy and the **boundary**. The boundary does not allow deleting RDS." }) },
          ],
          ok: true, result: L({ vi: "Developer vẫn tự phục vụ được, nhưng không vượt quá giới hạn do quản trị viên thiết lập.", en: "Developers can still help themselves, but cannot exceed the limit the administrators set." }) },
  },
];
}

export default function IamMythsSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Bốn nguyên tắc IAM bảo vệ account ShopViet", en: "Four IAM principles that protect ShopViet's account" })} action={L({ vi: "Chạy mô phỏng", en: "Run simulation" })} />;
}
