import HopSim, { type HopScenario } from "../security/HopSim";

// Data of ShopViet at rest (KMS on RDS and EBS) and in transit (SSL/TLS, ACM certificates).
// Practice-test sources (build-time only): exam2_q40, exam4_q31, exam2_q45, exam5_q40, exam5_q15, exam2_q9.

const SCENARIOS: HopScenario[] = [
  {
    name: "Ứng dụng đọc đơn hàng từ database",
    story: "Database RDS của ShopViet đã được mã hoá bằng KMS. Câu hỏi đặt ra: dữ liệu **khi truyền** từ ứng dụng tới database có được bảo vệ không?",
    request: "SELECT * FROM don_hang",
    toggle: { label: "Kết nối bằng SSL/TLS", initial: false },
    start: "app",
    nodes: [
      { id: "app", x: 100, y: 120, label: "App ShopViet", sub: "EC2", kind: "app" },
      { id: "spy", x: 380, y: 215, label: "Bên nghe lén mạng", kind: "bad" },
      { id: "rds", x: 420, y: 70, label: "RDS", sub: "mã hoá at rest", kind: "store" },
      { id: "kms", x: 690, y: 70, label: "AWS KMS", sub: "key của RDS", kind: "key" },
    ],
    run: (on) => ({ hops: [
      { to: "spy", state: on ? "block" : "alert", tag: on ? "DỮ LIỆU MÃ HOÁ" : "ĐỌC ĐƯỢC",
        msg: on ? "Gói tin đã được mã hoá bằng TLS, không đọc được." : "Gói tin truyền ở dạng plaintext: lộ tên và số điện thoại khách hàng." },
      { from: "app", to: "rds", state: on ? "pass" : "alert", tag: on ? "TLS" : "KHÔNG TLS",
        msg: on ? "Kết nối SSL/TLS tới endpoint của RDS." : "Kết nối không mã hoá." },
      { to: "kms", state: "change", tag: "AT REST", msg: "Dữ liệu trên đĩa, backup và snapshot được mã hoá bằng KMS key." },
    ], ok: on, result: on
      ? "Đủ hai lớp bảo vệ: **at rest** bằng KMS, **in transit** bằng SSL/TLS."
      : "KMS chỉ bảo vệ dữ liệu khi lưu trữ. Dữ liệu khi truyền cần **SSL/TLS** giữa ứng dụng và database." }),
  },
  {
    name: "Database hiện có chưa mã hoá",
    story: "Đợt rà soát bảo mật phát hiện một RDS được tạo từ năm trước **chưa bật encryption**. Database này cần được mã hoá.",
    request: "Mã hoá RDS shop-db-cu",
    toggle: { label: "Sử dụng quy trình snapshot", initial: false },
    start: "ops",
    nodes: [
      { id: "ops", x: 90, y: 60, label: "Kỹ sư ShopViet", kind: "user" },
      { id: "rds", x: 90, y: 190, label: "RDS hiện có", sub: "chưa mã hoá", kind: "store" },
      { id: "snap", x: 300, y: 190, label: "Snapshot", sub: "chưa mã hoá", kind: "store" },
      { id: "copy", x: 520, y: 190, label: "Bản copy snapshot", sub: "mã hoá bằng KMS key", kind: "key" },
      { id: "new", x: 720, y: 190, w: 120, label: "RDS mới", sub: "đã mã hoá", kind: "store" },
      { id: "app", x: 720, y: 60, w: 120, label: "App ShopViet", kind: "app" },
    ],
    hidden: (on) => (on ? [] : ["snap", "copy", "new"]),
    run: (on) => on
      ? { hops: [
          { from: "rds", to: "snap", state: "pass", tag: "1", msg: "Tạo snapshot của RDS hiện có." },
          { to: "copy", state: "change", tag: "2", msg: "Copy snapshot và **bật encryption** với KMS key." },
          { to: "new", state: "pass", tag: "3", msg: "Restore bản copy thành một RDS mới, đã mã hoá." },
          { from: "app", to: "new", state: "pass", tag: "4", msg: "Chuyển endpoint của ứng dụng sang RDS mới." },
        ], ok: true, result: "Đây là phương án duy nhất: snapshot → copy có encryption → restore. Không thể bật encryption trực tiếp trên instance." }
      : { hops: [
          { to: "rds", state: "block", tag: "KHÔNG ĐƯỢC", flash: "✕", msg: "RDS không cho bật encryption trên instance đang chạy." },
        ], ok: false, result: "Encryption chỉ được chọn khi tạo instance. Bật tuỳ chọn để sử dụng quy trình snapshot." },
  },
  {
    name: "Chuyển SQL Server lên AWS",
    story: "ShopViet chuyển database SQL Server của bộ phận kế toán lên AWS. Yêu cầu: mã hoá at rest, **tối thiểu tác vụ quản trị**.",
    request: "Migrate SQL Server",
    toggle: { label: "Sử dụng Amazon RDS (tắt: tự cài đặt trên EC2)", initial: false },
    start: "dc",
    nodes: [
      { id: "dc", x: 100, y: 130, label: "SQL Server", sub: "server tại văn phòng", kind: "user" },
      { id: "rds", x: 400, y: 70, label: "RDS for SQL Server", sub: "Multi-AZ, mã hoá KMS", kind: "store" },
      { id: "stb", x: 680, y: 70, label: "Bản standby", sub: "AZ khác", kind: "store" },
      { id: "ec2", x: 400, y: 200, label: "SQL Server trên EC2", sub: "tự cài đặt, tự vá lỗi", kind: "app" },
      { id: "ops", x: 680, y: 200, label: "Kỹ sư ShopViet", kind: "user" },
    ],
    hidden: (on) => (on ? ["ec2", "ops"] : ["rds", "stb"]),
    run: (on) => on
      ? { hops: [
          { to: "rds", state: "change", tag: "KMS", msg: "Bật encryption khi tạo instance, key nằm trong KMS." },
          { to: "stb", state: "pass", tag: "AWS QUẢN LÝ", msg: "AWS quản lý bản standby, backup và vá lỗi." },
        ], ok: true, result: "Mã hoá at rest có sẵn, phần vận hành do AWS đảm nhận." }
      : { hops: [
          { to: "ec2", state: "change", tag: "TỰ VẬN HÀNH", msg: "Tự cài đặt SQL Server, tự mã hoá ổ đĩa." },
          { to: "ops", state: "alert", tag: "THÊM TÁC VỤ", msg: "Backup, vá lỗi và failover đều do ShopViet đảm nhận." },
        ], ok: false, result: "Hoạt động được nhưng phát sinh nhiều tác vụ quản trị. Sử dụng RDS for SQL Server Multi-AZ, mã hoá bằng KMS." },
  },
  {
    name: "Phạm vi bảo vệ của EBS encryption",
    story: "Server xử lý đơn hàng sử dụng một EBS volume đã bật encryption. Mô phỏng dưới đây cho thấy các vị trí dữ liệu được bảo vệ.",
    request: "Ghi file đơn hàng xuống EBS",
    start: "ec2",
    nodes: [
      { id: "ec2", x: 100, y: 130, label: "EC2", sub: "server đơn hàng", kind: "app" },
      { id: "ebs", x: 380, y: 130, label: "EBS volume", sub: "encrypted", kind: "store" },
      { id: "kms", x: 650, y: 60, label: "AWS KMS", sub: "key của volume", kind: "key" },
      { id: "snap", x: 650, y: 200, label: "EBS snapshot", kind: "store" },
    ],
    run: () => ({ hops: [
      { to: "ebs", state: "change", tag: "1", msg: "Dữ liệu truyền giữa instance và volume được mã hoá." },
      { to: "kms", state: "change", tag: "2", msg: "Dữ liệu lưu trên volume được mã hoá bằng KMS key." },
      { from: "ebs", to: "snap", state: "change", tag: "3", msg: "Snapshot tạo từ volume cũng được mã hoá." },
    ], ok: true, result: "Một tuỳ chọn encryption trên volume bảo vệ cả ba: dữ liệu at rest, snapshot, và dữ liệu truyền giữa volume với instance." }),
  },
  {
    name: "HTTPS cho shopviet.vn trên CloudFront",
    story: "ShopViet cấu hình tên miền **shopviet.vn** cho CloudFront. Origin đặt tại Singapore.",
    request: "GET https://shopviet.vn/",
    toggle: { label: "Chứng chỉ ACM tạo tại us-east-1", initial: false },
    start: "user",
    nodes: [
      { id: "user", x: 90, y: 130, label: "Người dùng", kind: "user" },
      { id: "cf", x: 360, y: 130, label: "CloudFront", sub: "shopviet.vn", kind: "svc" },
      { id: "acm", x: 360, y: 220, label: "ACM", sub: "chứng chỉ TLS", kind: "key" },
      { id: "origin", x: 660, y: 130, label: "Origin", sub: "ap-southeast-1", kind: "store" },
    ],
    run: (on) => on
      ? { hops: [
          { from: "acm", to: "cf", state: "pass", tag: "us-east-1", msg: "Chứng chỉ tại **us-east-1** được liên kết với distribution." },
          { from: "user", to: "cf", state: "pass", tag: "TLS", msg: "Trình duyệt nhận chứng chỉ hợp lệ của shopviet.vn." },
          { to: "origin", state: "pass", msg: "Request được chuyển tới origin." },
          { to: "user", state: "pass", packet: "pkt-back", tag: "200", msg: "Trang chủ được phục vụ qua HTTPS." },
        ], ok: true, result: "CloudFront chỉ sử dụng chứng chỉ ACM tại **us-east-1** (N. Virginia), không phụ thuộc Region của origin." }
      : { hops: [
          { from: "acm", to: "cf", state: "block", tag: "SAI REGION", msg: "Chứng chỉ được tạo tại ap-southeast-1; CloudFront không truy cập được chứng chỉ này." },
          { from: "user", to: "cf", state: "block", tag: "LỖI", flash: "!", msg: "Trình duyệt báo lỗi chứng chỉ." },
        ], ok: false, result: "Cần tạo chứng chỉ ACM tại us-east-1 và liên kết với distribution." },
  },
  {
    name: "Chứng chỉ import sắp hết hạn",
    story: "Một chứng chỉ mua từ bên ngoài được **import** vào ACM. ACM không tự động gia hạn loại chứng chỉ này. ShopViet cần nhận cảnh báo trước 30 ngày, với lượng script tối thiểu.",
    request: "Chứng chỉ còn 30 ngày",
    toggle: { label: "Kích hoạt AWS Config rule + SNS", initial: false },
    start: "acm",
    nodes: [
      { id: "acm", x: 100, y: 120, label: "ACM", sub: "chứng chỉ import", kind: "key" },
      { id: "cfg", x: 330, y: 60, label: "AWS Config", sub: "managed rule", kind: "svc" },
      { id: "sns", x: 540, y: 60, label: "Amazon SNS", kind: "svc" },
      { id: "team", x: 720, y: 60, w: 110, label: "Đội vận hành", kind: "user" },
      { id: "user", x: 540, y: 200, label: "Người dùng", kind: "user" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "cfg", state: "change", tag: "KIỂM TRA", msg: "Rule `acm-certificate-expiration-check` phát hiện chứng chỉ còn 30 ngày." },
          { to: "sns", state: "pass", tag: "GỬI", msg: "Thông báo được gửi tới SNS topic." },
          { to: "team", state: "pass", tag: "NHẬN", msg: "Đội vận hành nhận email và gia hạn kịp thời." },
        ], ok: true, result: "Không cần viết script: managed rule của AWS Config theo dõi thời hạn, SNS gửi cảnh báo." }
      : { hops: [
          { to: "user", state: "block", tag: "HẾT HẠN", flash: "!", msg: "Không có cảnh báo. Sau 30 ngày, trình duyệt báo lỗi chứng chỉ." },
        ], ok: false, result: "Chứng chỉ import phải được tự theo dõi thời hạn. Sử dụng AWS Config managed rule + SNS để nhận cảnh báo trước." },
  },
];

export default function DataGuardSim() {
  return <HopSim scenarios={SCENARIOS} action="Chạy" height={250}
    label="Dữ liệu của ShopViet khi truyền và khi lưu trữ: TLS, KMS, snapshot và chứng chỉ ACM" />;
}
