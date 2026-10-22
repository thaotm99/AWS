import HopSim, { type HopScenario } from "../security/HopSim";
import { useLang } from "../../../lib/lang";

// How ShopViet staff and partners sign in: IAM Identity Center with permission sets,
// AD Connector, AWS Managed Microsoft AD, FSx for Windows File Server joined to AD,
// and Transfer Family with a custom identity provider.
// Practice-test sources (build-time only): exam6_q10, exam4_q4, exam1_q10, exam3_q28, exam6_q44, exam3_q5, exam2_q4.

type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): HopScenario[] => {
  const ONPREM = { x: 20, y: 150, w: 210, h: 92, label: L({ vi: "Văn phòng ShopViet", en: "ShopViet office" }), tone: "onprem" as const };
  return [
  {
    name: L({ vi: "Truy cập nhiều AWS account", en: "Access to multiple AWS accounts" }),
    story: L({ vi: "Nhân viên Lan thuộc nhóm Kho cần truy cập tài nguyên tại account **Kho hàng** và **Báo cáo**, nhưng không được truy cập account **Thanh toán**. ShopViet có 40 nhân viên với yêu cầu tương tự.",
      en: "Lan, an employee in the Warehouse group, needs access to resources in the **Warehouse** and **Reporting** accounts, but must not access the **Payments** account. ShopViet has 40 employees with similar requirements." }),
    request: L({ vi: "Lan đăng nhập AWS", en: "Lan signs in to AWS" }),
    toggle: { label: L({ vi: "Sử dụng IAM Identity Center", en: "Use IAM Identity Center" }), initial: false },
    start: "lan",
    nodes: [
      { id: "lan", x: 90, y: 130, label: L({ vi: "Nhân viên Lan", en: "Employee Lan" }), sub: L({ vi: "nhóm Kho", en: "Warehouse group" }), kind: "user" },
      { id: "ic", x: 340, y: 130, label: "IAM Identity Center", sub: "permission sets", kind: "svc" },
      { id: "a1", x: 650, y: 50, label: L({ vi: "Account Kho hàng", en: "Warehouse account" }), kind: "store" },
      { id: "a2", x: 650, y: 130, label: L({ vi: "Account Báo cáo", en: "Reporting account" }), kind: "store" },
      { id: "a3", x: 650, y: 210, label: L({ vi: "Account Thanh toán", en: "Payments account" }), kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["ic"]),
    run: (on) => on
      ? { hops: [
          { to: "ic", state: "pass", tag: "SSO", msg: L({ vi: "Xác thực **một lần** tại AWS access portal.", en: "Authenticates **once** at the AWS access portal." }) },
          { to: "a1", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Áp dụng permission set `Kho-ReadWrite` của nhóm Kho.", en: "Applies the Warehouse group's `Kho-ReadWrite` permission set." }) },
          { from: "ic", to: "a2", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Áp dụng permission set `BaoCao-ReadOnly`.", en: "Applies the `BaoCao-ReadOnly` permission set." }) },
          { from: "ic", to: "a3", state: "block", tag: L({ vi: "KHÔNG ĐƯỢC GÁN", en: "NOT ASSIGNED" }), msg: L({ vi: "Nhóm Kho không được gán quyền truy cập account này.", en: "The Warehouse group is not assigned access to this account." }) },
        ], ok: true, result: L({ vi: "Quyền được gán theo **nhóm** và theo **account**, tuân thủ nguyên tắc least privilege. Khi nhân viên nghỉ việc, chỉ cần thu hồi danh tính tại một nơi duy nhất.",
          en: "Permissions are assigned by **group** and by **account**, following the principle of least privilege. When an employee leaves, the identity is revoked in a single place." }) }
      : { hops: [
          { to: "a1", state: "change", tag: "IAM USER", msg: L({ vi: "Một IAM user với mật khẩu riêng.", en: "One IAM user with its own password." }) },
          { from: "lan", to: "a2", state: "change", tag: "IAM USER", msg: L({ vi: "Thêm một IAM user khác với mật khẩu khác.", en: "Another IAM user with a different password." }) },
          { from: "lan", to: "a3", state: "alert", tag: L({ vi: "VƯỢT QUYỀN", en: "EXCESS ACCESS" }), msg: L({ vi: "Quyền tại account Thanh toán bị cấp nhầm mà không được phát hiện.", en: "Access to the Payments account was granted by mistake and went unnoticed." }) },
        ], ok: false, result: L({ vi: "40 người × nhiều account = hàng trăm IAM user phải quản lý thủ công. Giải pháp phù hợp: **IAM Identity Center** với permission sets.",
          en: "40 people × many accounts = hundreds of IAM users to manage by hand. The right solution: **IAM Identity Center** with permission sets." }) },
  },
  {
    name: L({ vi: "Tái sử dụng tài khoản Active Directory", en: "Reuse Active Directory accounts" }),
    story: L({ vi: "Nhân viên đã có tài khoản trong Active Directory on-premises. Yêu cầu: sử dụng chính tài khoản đó để truy cập AWS và **không lưu trữ dữ liệu thư mục trên AWS**.",
      en: "Employees already have accounts in the on-premises Active Directory. Requirement: use those same accounts to access AWS and **store no directory data on AWS**." }),
    request: L({ vi: "Đăng nhập bằng lan@shopviet.local", en: "Sign in as lan@shopviet.local" }),
    toggle: { label: L({ vi: "Sử dụng AD Connector (tắt: tạo lại user trên AWS)", en: "Use AD Connector (off: recreate users on AWS)" }), initial: false },
    start: "lan",
    boxes: [ONPREM],
    nodes: [
      { id: "lan", x: 90, y: 60, label: L({ vi: "Nhân viên Lan", en: "Employee Lan" }), kind: "user" },
      { id: "ad", x: 125, y: 205, label: "Active Directory", sub: "on-premises", kind: "store" },
      { id: "ic", x: 380, y: 60, label: "IAM Identity Center", kind: "svc" },
      { id: "conn", x: 400, y: 205, label: "AD Connector", sub: L({ vi: "proxy, không lưu dữ liệu", en: "proxy, stores no data" }), kind: "svc" },
      { id: "copy", x: 400, y: 205, label: L({ vi: "Thư mục thứ hai trên AWS", en: "Second directory on AWS" }), sub: L({ vi: "sao chép user thủ công", en: "users copied by hand" }), kind: "bad" },
      { id: "acc", x: 680, y: 60, w: 120, label: "AWS accounts", kind: "store" },
    ],
    hidden: (on) => (on ? ["copy"] : ["conn"]),
    run: (on) => on
      ? { hops: [
          { to: "ic", state: "pass", tag: L({ vi: "ĐĂNG NHẬP", en: "SIGN-IN" }), msg: L({ vi: "Đăng nhập bằng tài khoản AD hiện có.", en: "Signs in with the existing AD account." }) },
          { to: "conn", state: "pass", tag: L({ vi: "NGUỒN", en: "SOURCE" }), msg: L({ vi: "IAM Identity Center sử dụng AD Connector làm identity source.", en: "IAM Identity Center uses AD Connector as its identity source." }) },
          { to: "ad", state: "change", tag: L({ vi: "XÁC THỰC", en: "AUTHN" }), msg: L({ vi: "AD Connector chuyển tiếp yêu cầu xác thực tới AD on-premises.", en: "AD Connector forwards the authentication request to the on-premises AD." }) },
          { from: "ic", to: "acc", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Quyền truy cập account được xác định theo nhóm AD của Lan.", en: "Account access is determined by Lan's AD groups." }) },
        ], ok: true, result: L({ vi: "**AD Connector** là directory gateway: chuyển tiếp yêu cầu tới AD on-premises mà không lưu cache thông tin trên AWS và không cần đồng bộ thư mục.",
          en: "**AD Connector** is a directory gateway: it forwards requests to the on-premises AD without caching any information on AWS and without directory synchronization." }) }
      : { hops: [
          { to: "ic", state: "pass", tag: L({ vi: "ĐĂNG NHẬP", en: "SIGN-IN" }), msg: L({ vi: "Lan sử dụng một mật khẩu mới.", en: "Lan uses a new password." }) },
          { to: "copy", state: "alert", tag: L({ vi: "TRÙNG LẶP", en: "DUPLICATE" }), msg: L({ vi: "User được sao chép lên AWS; thay đổi mật khẩu tại AD không được đồng bộ sang AWS.", en: "Users are copied to AWS; password changes in AD are not synchronized to AWS." }) },
          { from: "ic", to: "acc", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Truy cập thành công, nhưng dữ liệu thư mục được lưu trên AWS.", en: "Access succeeds, but directory data is stored on AWS." }) },
        ], ok: false, result: L({ vi: "Vi phạm yêu cầu không lưu trữ thư mục trên AWS, đồng thời hai nguồn user sẽ mất đồng bộ. Giải pháp phù hợp: **AD Connector**.",
          en: "This violates the requirement to store no directory on AWS, and the two user sources will drift out of sync. The right solution: **AD Connector**." }) },
  },
  {
    name: L({ vi: "Ứng dụng kế toán cần AD trên AWS", en: "Accounting app needs AD on AWS" }),
    story: L({ vi: "Ứng dụng kế toán chạy trên EC2 Windows, phải **join domain** và xác thực Kerberos trên AWS. Domain mới cần thiết lập **trust** với AD on-premises.",
      en: "The accounting application runs on Windows EC2 and must **join a domain** and use Kerberos authentication on AWS. The new domain needs a **trust** with the on-premises AD." }),
    request: L({ vi: "EC2 join domain corp.shopviet", en: "EC2 joins domain corp.shopviet" }),
    toggle: { label: L({ vi: "AWS Managed Microsoft AD (tắt: AD Connector)", en: "AWS Managed Microsoft AD (off: AD Connector)" }), initial: false },
    start: "app",
    boxes: [ONPREM],
    nodes: [
      { id: "app", x: 400, y: 60, label: L({ vi: "Ứng dụng kế toán", en: "Accounting app" }), sub: "EC2 Windows", kind: "app" },
      { id: "mad", x: 400, y: 200, label: "AWS Managed Microsoft AD", sub: L({ vi: "AD đầy đủ, AWS vận hành", en: "full AD, run by AWS" }), kind: "svc" },
      { id: "conn", x: 400, y: 200, label: "AD Connector", sub: L({ vi: "chỉ là proxy", en: "only a proxy" }), kind: "svc" },
      { id: "ad", x: 125, y: 205, label: "Active Directory", sub: "on-premises", kind: "store" },
      { id: "users", x: 690, y: 60, w: 120, label: L({ vi: "Kế toán viên", en: "Accountants" }), kind: "user" },
    ],
    hidden: (on) => (on ? ["conn"] : ["mad"]),
    run: (on) => on
      ? { hops: [
          { to: "mad", state: "pass", tag: "JOIN", msg: L({ vi: "EC2 join domain; xác thực Kerberos được thực hiện trong AWS.", en: "EC2 joins the domain; Kerberos authentication happens inside AWS." }) },
          { to: "ad", state: "change", tag: "TRUST", msg: L({ vi: "Thiết lập trust relationship với domain on-premises.", en: "Sets up a trust relationship with the on-premises domain." }) },
          { from: "users", to: "app", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Kế toán viên sử dụng tài khoản on-premises để truy cập ứng dụng.", en: "Accountants use their on-premises accounts to access the application." }) },
        ], ok: true, result: L({ vi: "**AWS Managed Microsoft AD** là Active Directory đầy đủ do AWS vận hành: hỗ trợ workload phụ thuộc AD và thiết lập trust.",
          en: "**AWS Managed Microsoft AD** is a full Active Directory operated by AWS: it supports AD-dependent workloads and trusts." }) }
      : { hops: [
          { to: "conn", state: "block", tag: L({ vi: "KHÔNG HỖ TRỢ", en: "NOT SUPPORTED" }), msg: L({ vi: "AD Connector chỉ chuyển tiếp yêu cầu tới domain on-premises; không tạo domain mới trên AWS và không hỗ trợ transitive trust.", en: "AD Connector only forwards requests to the on-premises domain; it does not create a new domain on AWS and does not support transitive trusts." }) },
        ], ok: false, result: L({ vi: "AD Connector chỉ chuyển tiếp yêu cầu xác thực. Domain chạy trên AWS và có trust với AD on-premises cần sử dụng **AWS Managed Microsoft AD**.",
          en: "AD Connector only forwards authentication requests. A domain that runs on AWS and trusts the on-premises AD needs **AWS Managed Microsoft AD**." }) },
  },
  {
    name: L({ vi: "File share cho Windows và Linux", en: "File share for Windows and Linux" }),
    story: L({ vi: "Phòng thiết kế sử dụng máy Windows, máy render chạy Linux. Cả hai cần truy cập chung một file share và **duy trì quyền NTFS** theo nhóm trong AD.",
      en: "The design team uses Windows machines; the render machines run Linux. Both need access to the same file share and must **keep NTFS permissions** based on AD groups." }),
    request: L({ vi: "Mở \\\\share\\thiet-ke", en: "Open \\\\share\\thiet-ke" }),
    toggle: { label: L({ vi: "FSx for Windows File Server (tắt: Amazon EFS)", en: "FSx for Windows File Server (off: Amazon EFS)" }), initial: false },
    start: "win",
    nodes: [
      { id: "win", x: 100, y: 60, label: L({ vi: "Máy Windows", en: "Windows PC" }), sub: L({ vi: "phòng thiết kế", en: "design team" }), kind: "user" },
      { id: "lin", x: 100, y: 200, label: L({ vi: "Máy render Linux", en: "Linux render node" }), kind: "user" },
      { id: "fsx", x: 400, y: 130, label: "FSx for Windows File Server", sub: "SMB, NTFS ACL", kind: "store" },
      { id: "efs", x: 400, y: 130, label: "Amazon EFS", sub: "NFS", kind: "store" },
      { id: "ad", x: 680, y: 130, w: 120, label: "Active Directory", kind: "svc" },
    ],
    hidden: (on) => (on ? ["efs"] : ["fsx"]),
    run: (on) => on
      ? { hops: [
          { to: "fsx", state: "pass", tag: "SMB", msg: L({ vi: "Truy cập file share qua giao thức SMB như ổ mạng thông thường.", en: "Accesses the file share over SMB like an ordinary network drive." }) },
          { to: "ad", state: "change", tag: L({ vi: "PHÂN QUYỀN", en: "AUTHZ" }), msg: L({ vi: "FSx join domain và kiểm tra quyền NTFS theo nhóm AD.", en: "FSx joins the domain and checks NTFS permissions by AD group." }) },
          { from: "lin", to: "fsx", state: "pass", tag: "SMB", msg: L({ vi: "Máy Linux mount cùng file share qua SMB.", en: "The Linux machine mounts the same file share over SMB." }) },
        ], ok: true, result: L({ vi: "FSx for Windows File Server hỗ trợ SMB, NTFS ACL và Active Directory.", en: "FSx for Windows File Server supports SMB, NTFS ACLs and Active Directory." }) }
      : { hops: [
          { to: "efs", state: "block", tag: L({ vi: "KHÔNG PHÙ HỢP", en: "NOT SUITABLE" }), msg: L({ vi: "EFS sử dụng NFS cho Linux, không hỗ trợ NTFS ACL hay phân quyền theo nhóm AD.", en: "EFS uses NFS for Linux and does not support NTFS ACLs or permissions by AD group." }) },
          { from: "lin", to: "efs", state: "pass", tag: "NFS", msg: L({ vi: "Chỉ máy Linux mount được.", en: "Only the Linux machine can mount it." }) },
        ], ok: false, result: L({ vi: "Yêu cầu quyền NTFS và tích hợp AD: sử dụng **FSx for Windows File Server**.", en: "NTFS permissions and AD integration required: use **FSx for Windows File Server**." }) },
  },
  {
    name: L({ vi: "Đối tác truyền tệp qua SFTP", en: "Partner file transfer over SFTP" }),
    story: L({ vi: "Nhà cung cấp gửi bảng giá cho ShopViet qua SFTP hằng đêm. Tệp phải được lưu vào S3; xác thực được thực hiện bởi **identity provider riêng** của ShopViet.",
      en: "A supplier sends ShopViet a price list over SFTP every night. The files must be stored in S3; authentication is handled by ShopViet's **own identity provider**." }),
    request: "sftp> put bang-gia.csv",
    toggle: { label: "Transfer Family + custom identity provider", initial: false },
    start: "ptn",
    nodes: [
      { id: "ptn", x: 90, y: 130, label: L({ vi: "Nhà cung cấp", en: "Supplier" }), kind: "user" },
      { id: "tf", x: 330, y: 130, label: "AWS Transfer Family", sub: L({ vi: "endpoint SFTP", en: "SFTP endpoint" }), kind: "svc" },
      { id: "ec2", x: 330, y: 130, label: L({ vi: "Máy chủ SFTP tự triển khai", en: "Self-managed SFTP server" }), sub: L({ vi: "EC2, tự vá lỗi, tự scale", en: "EC2, self-patched, self-scaled" }), kind: "bad" },
      { id: "idp", x: 330, y: 220, label: L({ vi: "IdP riêng (qua Lambda)", en: "Own IdP (via Lambda)" }), sub: L({ vi: "ví dụ Cognito, Okta", en: "e.g. Cognito, Okta" }), kind: "key" },
      { id: "s3", x: 650, y: 130, w: 120, label: "S3 bucket", sub: "bang-gia/", kind: "store" },
    ],
    hidden: (on) => (on ? ["ec2"] : ["tf", "idp"]),
    run: (on) => on
      ? { hops: [
          { to: "tf", state: "pass", tag: "SFTP", msg: L({ vi: "Đối tác tiếp tục sử dụng SFTP client hiện có.", en: "The partner keeps using its existing SFTP client." }) },
          { to: "idp", state: "change", tag: L({ vi: "XÁC THỰC", en: "AUTHN" }), msg: L({ vi: "Transfer Family gọi Lambda function (có thể qua API Gateway); Lambda xác thực tên đăng nhập và mật khẩu tại identity provider của ShopViet.", en: "Transfer Family invokes a Lambda function (optionally through API Gateway); Lambda verifies the user name and password against ShopViet's identity provider." }) },
          { from: "tf", to: "s3", state: "pass", tag: L({ vi: "GHI", en: "WRITE" }), msg: L({ vi: "Tệp được ghi vào S3 bằng quyền của một IAM role.", en: "The file is written to S3 with the permissions of an IAM role." }) },
        ], ok: true, result: L({ vi: "Transfer Family đảm nhận giao thức SFTP; danh tính được quản lý tại IdP riêng (ví dụ Amazon Cognito), tích hợp qua Lambda function; quyền ghi S3 được định nghĩa trong IAM role.",
          en: "Transfer Family handles the SFTP protocol; identities are managed in your own IdP (for example Amazon Cognito), integrated through a Lambda function; S3 write permissions are defined in an IAM role." }) }
      : { hops: [
          { to: "ec2", state: "alert", tag: L({ vi: "TỰ VẬN HÀNH", en: "SELF-MANAGED" }), msg: L({ vi: "Phải tự cài đặt SFTP, tự quản lý user và tự vá lỗi.", en: "You must install SFTP, manage users and apply patches yourself." }) },
          { to: "s3", state: "pass", tag: L({ vi: "GHI", en: "WRITE" }), msg: L({ vi: "Script tự phát triển tải tệp lên S3.", en: "A custom script uploads the files to S3." }) },
        ], ok: false, result: L({ vi: "Giải pháp hoạt động nhưng phát sinh nhiều công việc vận hành. Giải pháp phù hợp: **AWS Transfer Family** với custom identity provider.",
          en: "This works but adds a lot of operational work. The right solution: **AWS Transfer Family** with a custom identity provider." }) },
  },
  ];
};

export default function StaffSignInSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Đăng nhập", en: "Sign in" })} height={250}
    label={L({ vi: "Nhân viên và đối tác của ShopViet đăng nhập qua IAM Identity Center, Active Directory hoặc Transfer Family",
      en: "ShopViet employees and partners sign in through IAM Identity Center, Active Directory or Transfer Family" })} />;
}
