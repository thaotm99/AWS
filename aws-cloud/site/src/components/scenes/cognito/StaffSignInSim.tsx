import HopSim, { type HopScenario } from "../security/HopSim";

// How ShopViet staff and partners sign in: IAM Identity Center with permission sets,
// AD Connector, AWS Managed Microsoft AD, FSx for Windows File Server joined to AD,
// and Transfer Family with a custom identity provider.
// Practice-test sources (build-time only): exam6_q10, exam4_q4, exam1_q10, exam3_q28, exam6_q44, exam3_q5, exam2_q4.

const ONPREM = { x: 20, y: 150, w: 210, h: 92, label: "Văn phòng ShopViet", tone: "onprem" as const };

const SCENARIOS: HopScenario[] = [
  {
    name: "Truy cập nhiều AWS account",
    story: "Nhân viên Lan thuộc nhóm Kho cần truy cập tài nguyên tại account **Kho hàng** và **Báo cáo**, nhưng không được truy cập account **Thanh toán**. ShopViet có 40 nhân viên với yêu cầu tương tự.",
    request: "Lan đăng nhập AWS",
    toggle: { label: "Sử dụng IAM Identity Center", initial: false },
    start: "lan",
    nodes: [
      { id: "lan", x: 90, y: 130, label: "Nhân viên Lan", sub: "nhóm Kho", kind: "user" },
      { id: "ic", x: 340, y: 130, label: "IAM Identity Center", sub: "permission sets", kind: "svc" },
      { id: "a1", x: 650, y: 50, label: "Account Kho hàng", kind: "store" },
      { id: "a2", x: 650, y: 130, label: "Account Báo cáo", kind: "store" },
      { id: "a3", x: 650, y: 210, label: "Account Thanh toán", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["ic"]),
    run: (on) => on
      ? { hops: [
          { to: "ic", state: "pass", tag: "SSO", msg: "Xác thực **một lần** tại AWS access portal." },
          { to: "a1", state: "pass", tag: "TRUY CẬP", msg: "Áp dụng permission set `Kho-ReadWrite` của nhóm Kho." },
          { from: "ic", to: "a2", state: "pass", tag: "TRUY CẬP", msg: "Áp dụng permission set `BaoCao-ReadOnly`." },
          { from: "ic", to: "a3", state: "block", tag: "KHÔNG ĐƯỢC GÁN", msg: "Nhóm Kho không được gán quyền truy cập account này." },
        ], ok: true, result: "Quyền được gán theo **nhóm** và theo **account**, tuân thủ nguyên tắc least privilege. Khi nhân viên nghỉ việc, chỉ cần thu hồi danh tính tại một nơi duy nhất." }
      : { hops: [
          { to: "a1", state: "change", tag: "IAM USER", msg: "Một IAM user với mật khẩu riêng." },
          { from: "lan", to: "a2", state: "change", tag: "IAM USER", msg: "Thêm một IAM user khác với mật khẩu khác." },
          { from: "lan", to: "a3", state: "alert", tag: "VƯỢT QUYỀN", msg: "Quyền tại account Thanh toán bị cấp nhầm mà không được phát hiện." },
        ], ok: false, result: "40 người × nhiều account = hàng trăm IAM user phải quản lý thủ công. Giải pháp phù hợp: **IAM Identity Center** với permission sets." },
  },
  {
    name: "Tái sử dụng tài khoản Active Directory",
    story: "Nhân viên đã có tài khoản trong Active Directory on-premises. Yêu cầu: sử dụng chính tài khoản đó để truy cập AWS và **không lưu trữ dữ liệu thư mục trên AWS**.",
    request: "Đăng nhập bằng lan@shopviet.local",
    toggle: { label: "Sử dụng AD Connector (tắt: tạo lại user trên AWS)", initial: false },
    start: "lan",
    boxes: [ONPREM],
    nodes: [
      { id: "lan", x: 90, y: 60, label: "Nhân viên Lan", kind: "user" },
      { id: "ad", x: 125, y: 205, label: "Active Directory", sub: "on-premises", kind: "store" },
      { id: "ic", x: 380, y: 60, label: "IAM Identity Center", kind: "svc" },
      { id: "conn", x: 400, y: 205, label: "AD Connector", sub: "proxy, không lưu dữ liệu", kind: "svc" },
      { id: "copy", x: 400, y: 205, label: "Thư mục thứ hai trên AWS", sub: "sao chép user thủ công", kind: "bad" },
      { id: "acc", x: 680, y: 60, w: 120, label: "AWS accounts", kind: "store" },
    ],
    hidden: (on) => (on ? ["copy"] : ["conn"]),
    run: (on) => on
      ? { hops: [
          { to: "ic", state: "pass", tag: "ĐĂNG NHẬP", msg: "Đăng nhập bằng tài khoản AD hiện có." },
          { to: "conn", state: "pass", tag: "NGUỒN", msg: "IAM Identity Center sử dụng AD Connector làm identity source." },
          { to: "ad", state: "change", tag: "XÁC THỰC", msg: "AD Connector chuyển tiếp yêu cầu xác thực tới AD on-premises." },
          { from: "ic", to: "acc", state: "pass", tag: "TRUY CẬP", msg: "Quyền truy cập account được xác định theo nhóm AD của Lan." },
        ], ok: true, result: "**AD Connector** là directory gateway: chuyển tiếp yêu cầu tới AD on-premises mà không lưu cache thông tin trên AWS và không cần đồng bộ thư mục." }
      : { hops: [
          { to: "ic", state: "pass", tag: "ĐĂNG NHẬP", msg: "Lan sử dụng một mật khẩu mới." },
          { to: "copy", state: "alert", tag: "TRÙNG LẶP", msg: "User được sao chép lên AWS; thay đổi mật khẩu tại AD không được đồng bộ sang AWS." },
          { from: "ic", to: "acc", state: "pass", tag: "TRUY CẬP", msg: "Truy cập thành công, nhưng dữ liệu thư mục được lưu trên AWS." },
        ], ok: false, result: "Vi phạm yêu cầu không lưu trữ thư mục trên AWS, đồng thời hai nguồn user sẽ mất đồng bộ. Giải pháp phù hợp: **AD Connector**." },
  },
  {
    name: "Ứng dụng kế toán cần AD trên AWS",
    story: "Ứng dụng kế toán chạy trên EC2 Windows, phải **join domain** và xác thực Kerberos trên AWS. Domain mới cần thiết lập **trust** với AD on-premises.",
    request: "EC2 join domain corp.shopviet",
    toggle: { label: "AWS Managed Microsoft AD (tắt: AD Connector)", initial: false },
    start: "app",
    boxes: [ONPREM],
    nodes: [
      { id: "app", x: 400, y: 60, label: "Ứng dụng kế toán", sub: "EC2 Windows", kind: "app" },
      { id: "mad", x: 400, y: 200, label: "AWS Managed Microsoft AD", sub: "AD đầy đủ, AWS vận hành", kind: "svc" },
      { id: "conn", x: 400, y: 200, label: "AD Connector", sub: "chỉ là proxy", kind: "svc" },
      { id: "ad", x: 125, y: 205, label: "Active Directory", sub: "on-premises", kind: "store" },
      { id: "users", x: 690, y: 60, w: 120, label: "Kế toán viên", kind: "user" },
    ],
    hidden: (on) => (on ? ["conn"] : ["mad"]),
    run: (on) => on
      ? { hops: [
          { to: "mad", state: "pass", tag: "JOIN", msg: "EC2 join domain; xác thực Kerberos được thực hiện trong AWS." },
          { to: "ad", state: "change", tag: "TRUST", msg: "Thiết lập trust relationship với domain on-premises." },
          { from: "users", to: "app", state: "pass", tag: "TRUY CẬP", msg: "Kế toán viên sử dụng tài khoản on-premises để truy cập ứng dụng." },
        ], ok: true, result: "**AWS Managed Microsoft AD** là Active Directory đầy đủ do AWS vận hành: hỗ trợ workload phụ thuộc AD và thiết lập trust." }
      : { hops: [
          { to: "conn", state: "block", tag: "KHÔNG HỖ TRỢ", msg: "AD Connector chỉ chuyển tiếp yêu cầu tới domain on-premises; không tạo domain mới trên AWS và không hỗ trợ transitive trust." },
        ], ok: false, result: "AD Connector chỉ chuyển tiếp yêu cầu xác thực. Domain chạy trên AWS và có trust với AD on-premises cần sử dụng **AWS Managed Microsoft AD**." },
  },
  {
    name: "File share cho Windows và Linux",
    story: "Phòng thiết kế sử dụng máy Windows, máy render chạy Linux. Cả hai cần truy cập chung một file share và **duy trì quyền NTFS** theo nhóm trong AD.",
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
          { to: "fsx", state: "pass", tag: "SMB", msg: "Truy cập file share qua giao thức SMB như ổ mạng thông thường." },
          { to: "ad", state: "change", tag: "PHÂN QUYỀN", msg: "FSx join domain và kiểm tra quyền NTFS theo nhóm AD." },
          { from: "lin", to: "fsx", state: "pass", tag: "SMB", msg: "Máy Linux mount cùng file share qua SMB." },
        ], ok: true, result: "FSx for Windows File Server hỗ trợ SMB, NTFS ACL và Active Directory." }
      : { hops: [
          { to: "efs", state: "block", tag: "KHÔNG PHÙ HỢP", msg: "EFS sử dụng NFS cho Linux, không hỗ trợ NTFS ACL hay phân quyền theo nhóm AD." },
          { from: "lin", to: "efs", state: "pass", tag: "NFS", msg: "Chỉ máy Linux mount được." },
        ], ok: false, result: "Yêu cầu quyền NTFS và tích hợp AD: sử dụng **FSx for Windows File Server**." },
  },
  {
    name: "Đối tác truyền tệp qua SFTP",
    story: "Nhà cung cấp gửi bảng giá cho ShopViet qua SFTP hằng đêm. Tệp phải được lưu vào S3; xác thực được thực hiện bởi **identity provider riêng** của ShopViet.",
    request: "sftp> put bang-gia.csv",
    toggle: { label: "Transfer Family + custom identity provider", initial: false },
    start: "ptn",
    nodes: [
      { id: "ptn", x: 90, y: 130, label: "Nhà cung cấp", kind: "user" },
      { id: "tf", x: 330, y: 130, label: "AWS Transfer Family", sub: "endpoint SFTP", kind: "svc" },
      { id: "ec2", x: 330, y: 130, label: "Máy chủ SFTP tự triển khai", sub: "EC2, tự vá lỗi, tự scale", kind: "bad" },
      { id: "idp", x: 330, y: 220, label: "IdP riêng (qua Lambda)", sub: "ví dụ Cognito, Okta", kind: "key" },
      { id: "s3", x: 650, y: 130, w: 120, label: "S3 bucket", sub: "bang-gia/", kind: "store" },
    ],
    hidden: (on) => (on ? ["ec2"] : ["tf", "idp"]),
    run: (on) => on
      ? { hops: [
          { to: "tf", state: "pass", tag: "SFTP", msg: "Đối tác tiếp tục sử dụng SFTP client hiện có." },
          { to: "idp", state: "change", tag: "XÁC THỰC", msg: "Transfer Family gọi Lambda function (có thể qua API Gateway); Lambda xác thực tên đăng nhập và mật khẩu tại identity provider của ShopViet." },
          { from: "tf", to: "s3", state: "pass", tag: "GHI", msg: "Tệp được ghi vào S3 bằng quyền của một IAM role." },
        ], ok: true, result: "Transfer Family đảm nhận giao thức SFTP; danh tính được quản lý tại IdP riêng (ví dụ Amazon Cognito), tích hợp qua Lambda function; quyền ghi S3 được định nghĩa trong IAM role." }
      : { hops: [
          { to: "ec2", state: "alert", tag: "TỰ VẬN HÀNH", msg: "Phải tự cài đặt SFTP, tự quản lý user và tự vá lỗi." },
          { to: "s3", state: "pass", tag: "GHI", msg: "Script tự phát triển tải tệp lên S3." },
        ], ok: false, result: "Giải pháp hoạt động nhưng phát sinh nhiều công việc vận hành. Giải pháp phù hợp: **AWS Transfer Family** với custom identity provider." },
  },
];

export default function StaffSignInSim() {
  return <HopSim scenarios={SCENARIOS} action="Đăng nhập" height={250}
    label="Nhân viên và đối tác của ShopViet đăng nhập qua IAM Identity Center, Active Directory hoặc Transfer Family" />;
}
