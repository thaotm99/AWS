import HopSim, { type HopScenario } from "../security/HopSim";

// How ShopViet staff and partners sign in: IAM Identity Center with permission sets,
// AD Connector, AWS Managed Microsoft AD, FSx for Windows File Server joined to AD,
// and Transfer Family with a custom identity provider.
// Practice-test sources (build-time only): exam6_q10, exam4_q4, exam1_q10, exam3_q28, exam6_q44, exam3_q5, exam2_q4.

const ONPREM = { x: 20, y: 150, w: 210, h: 92, label: "Văn phòng ShopViet", tone: "onprem" as const };

const SCENARIOS: HopScenario[] = [
  {
    name: "Nhân viên vào nhiều AWS account",
    story: "Chị Lan ở đội kho cần xem tài nguyên ở account **Kho hàng** và **Báo cáo**, nhưng không được đụng tới account **Thanh toán**. ShopViet có 40 nhân viên như vậy.",
    request: "Lan đăng nhập AWS",
    toggle: { label: "Dùng IAM Identity Center", initial: false },
    start: "lan",
    nodes: [
      { id: "lan", x: 90, y: 130, label: "Chị Lan", sub: "nhóm Kho", kind: "user" },
      { id: "ic", x: 340, y: 130, label: "IAM Identity Center", sub: "permission sets", kind: "svc" },
      { id: "a1", x: 650, y: 50, label: "Account Kho hàng", kind: "store" },
      { id: "a2", x: 650, y: 130, label: "Account Báo cáo", kind: "store" },
      { id: "a3", x: 650, y: 210, label: "Account Thanh toán", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["ic"]),
    run: (on) => on
      ? { hops: [
          { to: "ic", state: "pass", tag: "SSO", msg: "Đăng nhập **một lần** ở AWS access portal." },
          { to: "a1", state: "pass", tag: "VÀO", msg: "Permission set `Kho-ReadWrite` của nhóm Kho." },
          { from: "ic", to: "a2", state: "pass", tag: "VÀO", msg: "Permission set `BaoCao-ReadOnly`." },
          { from: "ic", to: "a3", state: "block", tag: "KHÔNG GÁN", msg: "Nhóm Kho không được gán account này." },
        ], ok: true, result: "Quyền gán theo **nhóm** và theo **account**, đúng least privilege. Nhân viên nghỉ việc thì xoá một chỗ là xong." }
      : { hops: [
          { to: "a1", state: "change", tag: "IAM USER", msg: "Một IAM user và mật khẩu riêng." },
          { from: "lan", to: "a2", state: "change", tag: "IAM USER", msg: "Thêm một IAM user nữa, mật khẩu khác." },
          { from: "lan", to: "a3", state: "alert", tag: "QUÁ QUYỀN", msg: "Ai đó cấp nhầm quyền ở account Thanh toán, không ai thấy." },
        ], ok: false, result: "40 người × nhiều account = hàng trăm IAM user phải quản lý tay. Dùng **IAM Identity Center** với permission sets." },
  },
  {
    name: "Dùng tài khoản Active Directory của công ty",
    story: "Nhân viên đã có tài khoản trong Active Directory ở văn phòng. ShopViet muốn họ dùng chính tài khoản đó để vào AWS, và **không lưu dữ liệu thư mục trên AWS**.",
    request: "Đăng nhập bằng lan@shopviet.local",
    toggle: { label: "Dùng AD Connector (tắt: tạo lại user trên AWS)", initial: false },
    start: "lan",
    boxes: [ONPREM],
    nodes: [
      { id: "lan", x: 90, y: 60, label: "Chị Lan", kind: "user" },
      { id: "ad", x: 125, y: 205, label: "Active Directory", sub: "on-premises", kind: "store" },
      { id: "ic", x: 380, y: 60, label: "IAM Identity Center", kind: "svc" },
      { id: "conn", x: 400, y: 205, label: "AD Connector", sub: "proxy, không lưu dữ liệu", kind: "svc" },
      { id: "copy", x: 400, y: 205, label: "Thư mục thứ hai trên AWS", sub: "copy user bằng tay", kind: "bad" },
      { id: "acc", x: 680, y: 60, w: 120, label: "AWS accounts", kind: "store" },
    ],
    hidden: (on) => (on ? ["copy"] : ["conn"]),
    run: (on) => on
      ? { hops: [
          { to: "ic", state: "pass", tag: "ĐĂNG NHẬP", msg: "Gõ tài khoản AD quen thuộc." },
          { to: "conn", state: "pass", tag: "NGUỒN", msg: "Identity Center dùng AD Connector làm nguồn danh tính." },
          { to: "ad", state: "change", tag: "XÁC THỰC", msg: "AD Connector chuyển yêu cầu xác thực về AD ở văn phòng." },
          { from: "ic", to: "acc", state: "pass", tag: "VÀO", msg: "Vào account theo nhóm AD của Lan." },
        ], ok: true, result: "**AD Connector** chỉ là proxy: không chép user nào lên AWS, ít vận hành nhất." }
      : { hops: [
          { to: "ic", state: "pass", tag: "ĐĂNG NHẬP", msg: "Lan dùng một mật khẩu mới." },
          { to: "copy", state: "alert", tag: "HAI NƠI", msg: "User được chép lên AWS. Đổi mật khẩu ở AD thì AWS không biết." },
          { from: "ic", to: "acc", state: "pass", tag: "VÀO", msg: "Vào được, nhưng dữ liệu thư mục nằm trên AWS." },
        ], ok: false, result: "Vi phạm yêu cầu không lưu thư mục trên AWS, và hai nơi lưu user sẽ lệch nhau. Dùng **AD Connector**." },
  },
  {
    name: "App kế toán cần AD chạy trên AWS",
    story: "App kế toán chạy trên EC2 Windows, phải **join domain** và xác thực Kerberos ngay trên AWS. Domain mới cần **trust** với AD ở văn phòng.",
    request: "EC2 join domain corp.shopviet",
    toggle: { label: "AWS Managed Microsoft AD (tắt: AD Connector)", initial: false },
    start: "app",
    boxes: [ONPREM],
    nodes: [
      { id: "app", x: 400, y: 60, label: "App kế toán", sub: "EC2 Windows", kind: "app" },
      { id: "mad", x: 400, y: 200, label: "AWS Managed Microsoft AD", sub: "AD thật, AWS vận hành", kind: "svc" },
      { id: "conn", x: 400, y: 200, label: "AD Connector", sub: "chỉ là proxy", kind: "svc" },
      { id: "ad", x: 125, y: 205, label: "Active Directory", sub: "on-premises", kind: "store" },
      { id: "users", x: 690, y: 60, w: 120, label: "Kế toán viên", kind: "user" },
    ],
    hidden: (on) => (on ? ["conn"] : ["mad"]),
    run: (on) => on
      ? { hops: [
          { to: "mad", state: "pass", tag: "JOIN", msg: "EC2 join domain, xác thực Kerberos ngay trong AWS." },
          { to: "ad", state: "change", tag: "TRUST", msg: "Tạo trust relationship với domain ở văn phòng." },
          { from: "users", to: "app", state: "pass", tag: "VÀO", msg: "Kế toán viên dùng tài khoản văn phòng để mở app." },
        ], ok: true, result: "**AWS Managed Microsoft AD** là một Active Directory thật do AWS vận hành: chạy được workload cần AD và tạo được trust." }
      : { hops: [
          { to: "conn", state: "block", tag: "KHÔNG ĐỦ", msg: "AD Connector không phải domain controller, không tạo được trust." },
        ], ok: false, result: "AD Connector chỉ chuyển tiếp yêu cầu xác thực. Workload cần AD trên AWS phải dùng **AWS Managed Microsoft AD**." },
  },
  {
    name: "Ổ chia sẻ cho Windows và Linux",
    story: "Phòng thiết kế dùng máy Windows, máy render chạy Linux. Cả hai cần chung một ổ chia sẻ, **giữ quyền NTFS** theo nhóm trong AD.",
    request: "Mở \\\\share\\thiet-ke",
    toggle: { label: "FSx for Windows File Server (tắt: Amazon EFS)", initial: false },
    start: "win",
    nodes: [
      { id: "win", x: 100, y: 60, label: "Máy Windows", sub: "phòng thiết kế", kind: "user" },
      { id: "lin", x: 100, y: 200, label: "Máy render Linux", kind: "user" },
      { id: "fsx", x: 400, y: 130, label: "FSx for Windows File Server", sub: "SMB, NTFS ACL", kind: "store" },
      { id: "efs", x: 400, y: 130, label: "Amazon EFS", sub: "NFS", kind: "store" },
      { id: "ad", x: 680, y: 130, w: 120, label: "Active Directory", kind: "svc" },
    ],
    hidden: (on) => (on ? ["efs"] : ["fsx"]),
    run: (on) => on
      ? { hops: [
          { to: "fsx", state: "pass", tag: "SMB", msg: "Mở ổ qua SMB như ổ mạng quen thuộc." },
          { to: "ad", state: "change", tag: "QUYỀN", msg: "FSx join domain, kiểm tra quyền NTFS theo nhóm AD." },
          { from: "lin", to: "fsx", state: "pass", tag: "SMB", msg: "Máy Linux mount cùng ổ qua SMB." },
        ], ok: true, result: "FSx for Windows File Server hỗ trợ SMB, NTFS ACL và Active Directory." }
      : { hops: [
          { to: "efs", state: "block", tag: "KHÔNG HỢP", msg: "EFS dùng NFS cho Linux, không có NTFS ACL hay quyền theo nhóm AD." },
          { from: "lin", to: "efs", state: "pass", tag: "NFS", msg: "Máy Linux thì mount được." },
        ], ok: false, result: "Cần quyền NTFS và AD: dùng **FSx for Windows File Server**." },
  },
  {
    name: "Đối tác gửi file qua SFTP",
    story: "Nhà cung cấp gửi bảng giá cho ShopViet qua SFTP mỗi đêm. File phải vào S3, đăng nhập kiểm tra bằng **nhà cung cấp danh tính riêng** của ShopViet.",
    request: "sftp> put bang-gia.csv",
    toggle: { label: "Transfer Family + custom identity provider", initial: false },
    start: "ptn",
    nodes: [
      { id: "ptn", x: 90, y: 130, label: "Nhà cung cấp", kind: "user" },
      { id: "tf", x: 330, y: 130, label: "AWS Transfer Family", sub: "endpoint SFTP", kind: "svc" },
      { id: "ec2", x: 330, y: 130, label: "Server SFTP tự dựng", sub: "EC2, tự vá, tự scale", kind: "bad" },
      { id: "idp", x: 330, y: 220, label: "Cognito / IdP riêng", sub: "kiểm tra đăng nhập", kind: "key" },
      { id: "s3", x: 650, y: 130, w: 120, label: "S3 bucket", sub: "bang-gia/", kind: "store" },
    ],
    hidden: (on) => (on ? ["ec2"] : ["tf", "idp"]),
    run: (on) => on
      ? { hops: [
          { to: "tf", state: "pass", tag: "SFTP", msg: "Đối tác dùng client SFTP như cũ." },
          { to: "idp", state: "change", tag: "XÁC THỰC", msg: "Tên và mật khẩu được kiểm tra ở nhà cung cấp danh tính của ShopViet." },
          { from: "tf", to: "s3", state: "pass", tag: "GHI", msg: "File ghi vào S3 bằng quyền của một IAM role." },
        ], ok: true, result: "Transfer Family lo phần SFTP, danh tính nằm ở Cognito hoặc IdP riêng, quyền ghi S3 nằm trong IAM role." }
      : { hops: [
          { to: "ec2", state: "alert", tag: "TỰ LO", msg: "Phải tự cài SFTP, tự quản lý user, tự vá lỗi." },
          { to: "s3", state: "pass", tag: "GHI", msg: "Script tự viết đẩy file lên S3." },
        ], ok: false, result: "Chạy được nhưng nhiều việc vận hành. Dùng **AWS Transfer Family** với custom identity provider." },
  },
];

export default function StaffSignInSim() {
  return <HopSim scenarios={SCENARIOS} action="Đăng nhập" height={250}
    label="Nhân viên và đối tác của ShopViet đăng nhập qua IAM Identity Center, Active Directory hoặc Transfer Family" />;
}
