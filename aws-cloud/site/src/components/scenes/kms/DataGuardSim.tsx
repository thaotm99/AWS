import HopSim, { type HopScenario } from "../security/HopSim";

// Data of ShopViet at rest (KMS on RDS and EBS) and in transit (SSL/TLS, ACM certificates).
// Practice-test sources (build-time only): exam2_q40, exam4_q31, exam2_q45, exam5_q40, exam5_q15, exam2_q9.

const SCENARIOS: HopScenario[] = [
  {
    name: "App đọc đơn hàng từ database",
    story: "Database RDS của ShopViet đã mã hoá bằng KMS. Một kỹ sư hỏi: vậy dữ liệu **trên đường** từ app tới database có an toàn không?",
    request: "SELECT * FROM don_hang",
    toggle: { label: "Kết nối bằng SSL/TLS", initial: false },
    start: "app",
    nodes: [
      { id: "app", x: 100, y: 120, label: "App ShopViet", sub: "EC2", kind: "app" },
      { id: "spy", x: 380, y: 215, label: "Kẻ nghe lén mạng", kind: "bad" },
      { id: "rds", x: 420, y: 70, label: "RDS", sub: "mã hoá at rest", kind: "store" },
      { id: "kms", x: 690, y: 70, label: "AWS KMS", sub: "key của RDS", kind: "key" },
    ],
    run: (on) => ({ hops: [
      { to: "spy", state: on ? "block" : "alert", tag: on ? "CHỈ THẤY RÁC" : "ĐỌC ĐƯỢC",
        msg: on ? "Gói tin đã mã hoá bằng TLS, không đọc được." : "Gói tin đi dạng rõ: thấy tên, số điện thoại khách." },
      { from: "app", to: "rds", state: on ? "pass" : "alert", tag: on ? "TLS" : "KHÔNG TLS",
        msg: on ? "Kết nối SSL/TLS tới endpoint của RDS." : "Kết nối không mã hoá." },
      { to: "kms", state: "change", tag: "AT REST", msg: "Dữ liệu trên đĩa, backup, snapshot mã hoá bằng KMS key." },
    ], ok: on, result: on
      ? "Đủ hai lớp: **at rest** bằng KMS, **in transit** bằng SSL/TLS."
      : "KMS chỉ bảo vệ dữ liệu nằm trên đĩa. Dữ liệu đang truyền cần **SSL/TLS** giữa app và database." }),
  },
  {
    name: "Database cũ chưa mã hoá",
    story: "Rà soát bảo mật phát hiện một RDS tạo từ năm ngoái **chưa bật encryption**. Phải mã hoá nó.",
    request: "Mã hoá RDS shop-db-cu",
    toggle: { label: "Đi đường snapshot", initial: false },
    start: "ops",
    nodes: [
      { id: "ops", x: 90, y: 60, label: "Kỹ sư ShopViet", kind: "user" },
      { id: "rds", x: 90, y: 190, label: "RDS cũ", sub: "chưa mã hoá", kind: "store" },
      { id: "snap", x: 300, y: 190, label: "Snapshot", sub: "chưa mã hoá", kind: "store" },
      { id: "copy", x: 520, y: 190, label: "Bản copy snapshot", sub: "mã hoá bằng KMS key", kind: "key" },
      { id: "new", x: 720, y: 190, w: 120, label: "RDS mới", sub: "đã mã hoá", kind: "store" },
      { id: "app", x: 720, y: 60, w: 120, label: "App ShopViet", kind: "app" },
    ],
    hidden: (on) => (on ? [] : ["snap", "copy", "new"]),
    run: (on) => on
      ? { hops: [
          { from: "rds", to: "snap", state: "pass", tag: "1", msg: "Tạo snapshot của RDS cũ." },
          { to: "copy", state: "change", tag: "2", msg: "Copy snapshot và **bật encryption** với KMS key." },
          { to: "new", state: "pass", tag: "3", msg: "Restore bản copy thành một RDS mới, đã mã hoá." },
          { from: "app", to: "new", state: "pass", tag: "4", msg: "Đổi endpoint của app sang RDS mới." },
        ], ok: true, result: "Đây là cách duy nhất: snapshot → copy có encryption → restore. Không bật encryption tại chỗ được." }
      : { hops: [
          { to: "rds", state: "block", tag: "KHÔNG ĐƯỢC", flash: "✕", msg: "RDS không cho bật encryption trên instance đang chạy." },
        ], ok: false, result: "Encryption chỉ chọn được lúc tạo instance. Bật công tắc để đi đường snapshot." },
  },
  {
    name: "Đưa SQL Server lên AWS",
    story: "ShopViet chuyển database SQL Server của kế toán lên AWS. Yêu cầu: mã hoá at rest, **ít việc quản trị** nhất.",
    request: "Migrate SQL Server",
    toggle: { label: "Dùng Amazon RDS (tắt: tự cài trên EC2)", initial: false },
    start: "dc",
    nodes: [
      { id: "dc", x: 100, y: 130, label: "SQL Server", sub: "server ở văn phòng", kind: "user" },
      { id: "rds", x: 400, y: 70, label: "RDS for SQL Server", sub: "Multi-AZ, mã hoá KMS", kind: "store" },
      { id: "stb", x: 680, y: 70, label: "Bản standby", sub: "AZ khác", kind: "store" },
      { id: "ec2", x: 400, y: 200, label: "SQL Server trên EC2", sub: "tự cài, tự vá", kind: "app" },
      { id: "ops", x: 680, y: 200, label: "Kỹ sư ShopViet", kind: "user" },
    ],
    hidden: (on) => (on ? ["ec2", "ops"] : ["rds", "stb"]),
    run: (on) => on
      ? { hops: [
          { to: "rds", state: "change", tag: "KMS", msg: "Bật encryption khi tạo instance, key nằm trong KMS." },
          { to: "stb", state: "pass", tag: "AWS LO", msg: "AWS lo bản standby, backup, vá lỗi." },
        ], ok: true, result: "Mã hoá at rest có sẵn, phần vận hành để AWS lo." }
      : { hops: [
          { to: "ec2", state: "change", tag: "TỰ LÀM", msg: "Tự cài SQL Server, tự mã hoá ổ đĩa." },
          { to: "ops", state: "alert", tag: "THÊM VIỆC", msg: "Backup, vá lỗi, failover đều là việc của ShopViet." },
        ], ok: false, result: "Chạy được nhưng nhiều việc quản trị. Dùng RDS for SQL Server Multi-AZ, mã hoá bằng KMS." },
  },
  {
    name: "Ổ EBS mã hoá bảo vệ những gì?",
    story: "Server xử lý đơn hàng dùng một EBS volume đã bật encryption. Thử xem dữ liệu được bảo vệ ở những chỗ nào.",
    request: "Ghi file đơn hàng xuống EBS",
    start: "ec2",
    nodes: [
      { id: "ec2", x: 100, y: 130, label: "EC2", sub: "server đơn hàng", kind: "app" },
      { id: "ebs", x: 380, y: 130, label: "EBS volume", sub: "encrypted", kind: "store" },
      { id: "kms", x: 650, y: 60, label: "AWS KMS", sub: "key của volume", kind: "key" },
      { id: "snap", x: 650, y: 200, label: "EBS snapshot", kind: "store" },
    ],
    run: () => ({ hops: [
      { to: "ebs", state: "change", tag: "1", msg: "Dữ liệu đi giữa instance và volume được mã hoá." },
      { to: "kms", state: "change", tag: "2", msg: "Dữ liệu nằm trên volume mã hoá bằng KMS key." },
      { from: "ebs", to: "snap", state: "change", tag: "3", msg: "Snapshot tạo từ volume cũng được mã hoá." },
    ], ok: true, result: "Một công tắc encryption trên volume bảo vệ cả ba: dữ liệu at rest, snapshot, và dữ liệu đi giữa volume với instance." }),
  },
  {
    name: "HTTPS cho shopviet.vn trên CloudFront",
    story: "ShopViet gắn tên miền **shopviet.vn** cho CloudFront. Origin nằm ở Singapore.",
    request: "GET https://shopviet.vn/",
    toggle: { label: "Chứng chỉ ACM tạo ở us-east-1", initial: false },
    start: "user",
    nodes: [
      { id: "user", x: 90, y: 130, label: "Khách", kind: "user" },
      { id: "cf", x: 360, y: 130, label: "CloudFront", sub: "shopviet.vn", kind: "svc" },
      { id: "acm", x: 360, y: 220, label: "ACM", sub: "chứng chỉ TLS", kind: "key" },
      { id: "origin", x: 660, y: 130, label: "Origin", sub: "ap-southeast-1", kind: "store" },
    ],
    run: (on) => on
      ? { hops: [
          { from: "acm", to: "cf", state: "pass", tag: "us-east-1", msg: "Chứng chỉ ở **us-east-1** gắn được vào distribution." },
          { from: "user", to: "cf", state: "pass", tag: "TLS", msg: "Trình duyệt thấy chứng chỉ hợp lệ của shopviet.vn." },
          { to: "origin", state: "pass", msg: "Request tới origin." },
          { to: "user", state: "pass", packet: "pkt-back", tag: "200", msg: "Trang chủ chạy HTTPS." },
        ], ok: true, result: "CloudFront chỉ dùng chứng chỉ ACM ở **us-east-1** (N. Virginia), dù origin ở Region nào." }
      : { hops: [
          { from: "acm", to: "cf", state: "block", tag: "SAI REGION", msg: "Chứng chỉ tạo ở ap-southeast-1, CloudFront không nhìn thấy." },
          { from: "user", to: "cf", state: "block", tag: "LỖI", flash: "!", msg: "Trình duyệt báo lỗi chứng chỉ." },
        ], ok: false, result: "Tạo lại chứng chỉ ACM ở us-east-1 rồi gắn vào distribution." },
  },
  {
    name: "Chứng chỉ import sắp hết hạn",
    story: "Một chứng chỉ mua ngoài được **import** vào ACM. ACM không tự gia hạn loại này. ShopViet muốn được báo trước 30 ngày, viết ít script nhất.",
    request: "Chứng chỉ còn 30 ngày",
    toggle: { label: "Bật AWS Config rule + SNS", initial: false },
    start: "acm",
    nodes: [
      { id: "acm", x: 100, y: 120, label: "ACM", sub: "chứng chỉ import", kind: "key" },
      { id: "cfg", x: 330, y: 60, label: "AWS Config", sub: "managed rule", kind: "svc" },
      { id: "sns", x: 540, y: 60, label: "Amazon SNS", kind: "svc" },
      { id: "team", x: 720, y: 60, w: 110, label: "Đội vận hành", kind: "user" },
      { id: "user", x: 540, y: 200, label: "Khách", kind: "user" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "cfg", state: "change", tag: "KIỂM TRA", msg: "Rule `acm-certificate-expiration-check` thấy chứng chỉ còn 30 ngày." },
          { to: "sns", state: "pass", tag: "GỬI", msg: "Gửi thông báo tới topic SNS." },
          { to: "team", state: "pass", tag: "NHẬN", msg: "Đội vận hành nhận email và gia hạn kịp." },
        ], ok: true, result: "Không phải viết script: managed rule của AWS Config theo dõi hạn, SNS gửi cảnh báo." }
      : { hops: [
          { to: "user", state: "block", tag: "HẾT HẠN", flash: "!", msg: "Không ai được báo. 30 ngày sau trình duyệt báo lỗi chứng chỉ." },
        ], ok: false, result: "Chứng chỉ import phải tự theo dõi hạn. Dùng AWS Config managed rule + SNS để được báo trước." },
  },
];

export default function DataGuardSim() {
  return <HopSim scenarios={SCENARIOS} action="Chạy" height={250}
    label="Dữ liệu của ShopViet trên đường truyền và lúc nằm trên đĩa: TLS, KMS, snapshot và chứng chỉ ACM" />;
}
