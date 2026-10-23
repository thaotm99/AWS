import { useLang } from "../../../lib/lang";
import HopSim, { type HopScenario } from "../security/HopSim";

type Lang = ReturnType<typeof useLang>;

// Data of ShopViet at rest (KMS on RDS and EBS) and in transit (SSL/TLS, ACM certificates).
// Practice-test sources (build-time only): exam2_q40, exam4_q31, exam2_q45, exam5_q40, exam5_q15, exam2_q9.

function scenarios(L: Lang): HopScenario[] {
return [
  {
    name: L({ vi: "Ứng dụng đọc đơn hàng từ RDS DB instance", en: "The application reads orders from the RDS DB instance" }),
    story: L({ vi: "RDS DB instance của ShopViet đã được mã hoá bằng KMS. Câu hỏi đặt ra: dữ liệu **khi truyền** từ ứng dụng tới DB instance có được bảo vệ không?", en: "ShopViet's RDS DB instance is already encrypted with KMS. The question: is data **in transit** from the application to the DB instance protected?" }),
    request: "SELECT * FROM don_hang",
    toggle: { label: L({ vi: "Kết nối bằng SSL/TLS", en: "Connect with SSL/TLS" }), initial: false },
    start: "app",
    nodes: [
      { id: "app", x: 100, y: 120, label: "App ShopViet", sub: "EC2", kind: "app" },
      { id: "spy", x: 380, y: 215, label: L({ vi: "Bên nghe lén mạng", en: "Network eavesdropper" }), kind: "bad" },
      { id: "rds", x: 420, y: 70, label: "RDS", sub: L({ vi: "mã hoá at rest", en: "encrypted at rest" }), kind: "store" },
      { id: "kms", x: 690, y: 70, label: "AWS KMS", sub: L({ vi: "key của RDS", en: "RDS key" }), kind: "key" },
    ],
    run: (on) => ({ hops: [
      { to: "spy", state: on ? "block" : "alert", tag: on ? L({ vi: "DỮ LIỆU MÃ HOÁ", en: "ENCRYPTED DATA" }) : L({ vi: "ĐỌC ĐƯỢC", en: "READABLE" }),
        msg: on ? L({ vi: "Gói tin đã được mã hoá bằng TLS, không đọc được.", en: "The packets are encrypted with TLS and cannot be read." }) : L({ vi: "Gói tin truyền ở dạng plaintext: lộ tên và số điện thoại khách hàng.", en: "The packets travel in plaintext: customer names and phone numbers are exposed." }) },
      { from: "app", to: "rds", state: on ? "pass" : "alert", tag: on ? "TLS" : L({ vi: "KHÔNG TLS", en: "NO TLS" }),
        msg: on ? L({ vi: "Kết nối SSL/TLS tới endpoint của RDS.", en: "SSL/TLS connection to the RDS endpoint." }) : L({ vi: "Kết nối không mã hoá.", en: "Unencrypted connection." }) },
      { to: "kms", state: "change", tag: "AT REST", msg: L({ vi: "Storage của DB instance, automated backup và snapshot được mã hoá bằng KMS key.", en: "The DB instance storage, automated backups and snapshots are encrypted with the KMS key." }) },
    ], ok: on, result: on
      ? L({ vi: "Đủ hai lớp bảo vệ: **at rest** bằng KMS, **in transit** bằng SSL/TLS.", en: "Both layers of protection: **at rest** with KMS, **in transit** with SSL/TLS." })
      : L({ vi: "KMS chỉ bảo vệ dữ liệu khi lưu trữ. Dữ liệu khi truyền cần **SSL/TLS** giữa ứng dụng và DB instance.", en: "KMS protects only data at rest. Data in transit needs **SSL/TLS** between the application and the DB instance." }) }),
  },
  {
    name: L({ vi: "DB instance hiện có chưa mã hoá", en: "An existing DB instance is not encrypted" }),
    story: L({ vi: "Đợt rà soát bảo mật phát hiện một RDS DB instance được tạo từ năm trước **chưa bật encryption**. DB instance này cần được mã hoá.", en: "A security review finds an RDS DB instance created last year **without encryption**. This DB instance must be encrypted." }),
    request: L({ vi: "Mã hoá DB instance shop-db-cu", en: "Encrypt DB instance shop-db-cu" }),
    toggle: { label: L({ vi: "Sử dụng quy trình snapshot", en: "Use the snapshot procedure" }), initial: false },
    start: "ops",
    nodes: [
      { id: "ops", x: 90, y: 60, label: L({ vi: "Kỹ sư ShopViet", en: "ShopViet engineer" }), kind: "user" },
      { id: "rds", x: 90, y: 190, label: L({ vi: "DB instance hiện có", en: "Existing DB instance" }), sub: L({ vi: "chưa mã hoá", en: "unencrypted" }), kind: "store" },
      { id: "snap", x: 300, y: 190, label: "Snapshot", sub: L({ vi: "chưa mã hoá", en: "unencrypted" }), kind: "store" },
      { id: "copy", x: 520, y: 190, label: L({ vi: "Bản copy của snapshot", en: "Snapshot copy" }), sub: L({ vi: "mã hoá bằng KMS key", en: "encrypted with KMS key" }), kind: "key" },
      { id: "new", x: 720, y: 190, w: 120, label: L({ vi: "DB instance mới", en: "New DB instance" }), sub: L({ vi: "đã mã hoá", en: "encrypted" }), kind: "store" },
      { id: "app", x: 720, y: 60, w: 120, label: "App ShopViet", kind: "app" },
    ],
    hidden: (on) => (on ? [] : ["snap", "copy", "new"]),
    run: (on) => on
      ? { hops: [
          { from: "rds", to: "snap", state: "pass", tag: "1", msg: L({ vi: "Tạo DB snapshot của DB instance hiện có.", en: "Create a DB snapshot of the existing DB instance." }) },
          { to: "copy", state: "change", tag: "2", msg: L({ vi: "Copy snapshot và **bật encryption** với KMS key.", en: "Copy the snapshot and **enable encryption** with a KMS key." }) },
          { to: "new", state: "pass", tag: "3", msg: L({ vi: "Restore bản copy thành một DB instance mới, đã mã hoá.", en: "Restore the copy to a new, encrypted DB instance." }) },
          { from: "app", to: "new", state: "pass", tag: "4", msg: L({ vi: "Chuyển ứng dụng sang endpoint của DB instance mới.", en: "Point the application to the endpoint of the new DB instance." }) },
        ], ok: true, result: L({ vi: "Quy trình được tài liệu RDS mô tả: snapshot → copy có encryption → restore. Không thể bật encryption trực tiếp trên instance đã tạo.", en: "The procedure described in the RDS documentation: snapshot → encrypted copy → restore. Encryption cannot be turned on directly for an existing instance." }) }
      : { hops: [
          { to: "rds", state: "block", tag: L({ vi: "KHÔNG ĐƯỢC", en: "NOT ALLOWED" }), flash: "✕", msg: L({ vi: "RDS không cho bật encryption trên DB instance hiện có chưa mã hoá.", en: "RDS does not allow turning on encryption for an existing unencrypted DB instance." }) },
        ], ok: false, result: L({ vi: "Encryption chỉ được chọn khi tạo instance. Bật tuỳ chọn để sử dụng quy trình snapshot.", en: "Encryption can be chosen only when the instance is created. Turn on the option to use the snapshot procedure." }) },
  },
  {
    name: L({ vi: "Chuyển SQL Server lên AWS", en: "Moving SQL Server to AWS" }),
    story: L({ vi: "ShopViet chuyển database SQL Server của bộ phận kế toán lên AWS. Yêu cầu: mã hoá at rest, **tối thiểu tác vụ quản trị**.", en: "ShopViet moves the accounting department's SQL Server database to AWS. Requirements: encryption at rest, **minimal administrative tasks**." }),
    request: "Migrate SQL Server",
    toggle: { label: L({ vi: "Sử dụng Amazon RDS (tắt: tự cài đặt trên EC2 instance)", en: "Use Amazon RDS (off: self-install on an EC2 instance)" }), initial: false },
    start: "dc",
    nodes: [
      { id: "dc", x: 100, y: 130, label: "SQL Server", sub: L({ vi: "server tại văn phòng", en: "server at the office" }), kind: "user" },
      { id: "rds", x: 400, y: 70, label: "RDS for SQL Server", sub: L({ vi: "Multi-AZ, mã hoá KMS", en: "Multi-AZ, KMS-encrypted" }), kind: "store" },
      { id: "stb", x: 680, y: 70, label: L({ vi: "Standby instance", en: "Standby instance" }), sub: L({ vi: "AZ khác", en: "another AZ" }), kind: "store" },
      { id: "ec2", x: 400, y: 200, label: L({ vi: "SQL Server trên EC2", en: "SQL Server on EC2" }), sub: L({ vi: "tự cài đặt, tự vá lỗi", en: "self-installed, self-patched" }), kind: "app" },
      { id: "ops", x: 680, y: 200, label: L({ vi: "Kỹ sư ShopViet", en: "ShopViet engineer" }), kind: "user" },
    ],
    hidden: (on) => (on ? ["ec2", "ops"] : ["rds", "stb"]),
    run: (on) => on
      ? { hops: [
          { to: "rds", state: "change", tag: "KMS", msg: L({ vi: "Bật encryption khi tạo instance, key nằm trong KMS.", en: "Encryption is enabled when the instance is created, with the key in KMS." }) },
          { to: "stb", state: "pass", tag: L({ vi: "AWS QUẢN LÝ", en: "AWS MANAGED" }), msg: L({ vi: "AWS quản lý bản standby, backup và vá lỗi.", en: "AWS manages the standby, backups and patching." }) },
        ], ok: true, result: L({ vi: "Mã hoá at rest có sẵn, phần vận hành do AWS đảm nhận.", en: "Encryption at rest is built in, and AWS handles operations." }) }
      : { hops: [
          { to: "ec2", state: "change", tag: L({ vi: "TỰ VẬN HÀNH", en: "SELF-MANAGED" }), msg: L({ vi: "Tự cài đặt SQL Server, tự mã hoá EBS volume.", en: "Install SQL Server and encrypt the EBS volumes yourself." }) },
          { to: "ops", state: "alert", tag: L({ vi: "THÊM TÁC VỤ", en: "MORE TASKS" }), msg: L({ vi: "Backup, vá lỗi và failover đều do ShopViet đảm nhận.", en: "Backups, patching and failover are all ShopViet's job." }) },
        ], ok: false, result: L({ vi: "Hoạt động được nhưng phát sinh nhiều tác vụ quản trị. Sử dụng RDS for SQL Server Multi-AZ, mã hoá bằng KMS.", en: "It works but adds many administrative tasks. Use RDS for SQL Server Multi-AZ, encrypted with KMS." }) },
  },
  {
    name: L({ vi: "Phạm vi bảo vệ của EBS encryption", en: "What EBS encryption protects" }),
    story: L({ vi: "EC2 instance xử lý đơn hàng sử dụng một EBS volume đã bật encryption. Mô phỏng dưới đây cho thấy các vị trí dữ liệu được bảo vệ.", en: "The order-processing EC2 instance uses an EBS volume with encryption turned on. The simulation below shows where data is protected." }),
    request: L({ vi: "Ghi file đơn hàng xuống EBS", en: "Write an order file to EBS" }),
    start: "ec2",
    nodes: [
      { id: "ec2", x: 100, y: 130, label: "EC2", sub: L({ vi: "instance xử lý đơn hàng", en: "order-processing instance" }), kind: "app" },
      { id: "ebs", x: 380, y: 130, label: "EBS volume", sub: "encrypted", kind: "store" },
      { id: "kms", x: 650, y: 60, label: "AWS KMS", sub: L({ vi: "key của volume", en: "volume key" }), kind: "key" },
      { id: "snap", x: 650, y: 200, label: "EBS snapshot", kind: "store" },
    ],
    run: () => ({ hops: [
      { to: "ebs", state: "change", tag: "1", msg: L({ vi: "Dữ liệu truyền giữa instance và volume được mã hoá.", en: "Data moving between the instance and the volume is encrypted." }) },
      { to: "kms", state: "change", tag: "2", msg: L({ vi: "Dữ liệu lưu trên volume được mã hoá bằng KMS key.", en: "Data stored on the volume is encrypted with the KMS key." }) },
      { from: "ebs", to: "snap", state: "change", tag: "3", msg: L({ vi: "Snapshot tạo từ volume cũng được mã hoá.", en: "Snapshots created from the volume are encrypted too." }) },
    ], ok: true, result: L({ vi: "Một tuỳ chọn encryption trên volume bảo vệ cả ba: dữ liệu at rest, snapshot, và dữ liệu truyền giữa volume với instance.", en: "One encryption option on the volume protects all three: data at rest, snapshots, and data moving between the volume and the instance." }) }),
  },
  {
    name: L({ vi: "HTTPS cho shopviet.vn trên CloudFront", en: "HTTPS for shopviet.vn on CloudFront" }),
    story: L({ vi: "ShopViet cấu hình tên miền **shopviet.vn** cho CloudFront. Origin đặt tại Singapore.", en: "ShopViet configures the domain **shopviet.vn** for CloudFront. The origin is in Singapore." }),
    request: "GET https://shopviet.vn/",
    toggle: { label: L({ vi: "Chứng chỉ ACM tạo tại us-east-1", en: "ACM certificate created in us-east-1" }), initial: false },
    start: "user",
    nodes: [
      { id: "user", x: 90, y: 130, label: L({ vi: "Người dùng", en: "Users" }), kind: "user" },
      { id: "cf", x: 360, y: 130, label: "CloudFront", sub: "shopviet.vn", kind: "svc" },
      { id: "acm", x: 360, y: 220, label: "ACM", sub: L({ vi: "chứng chỉ TLS", en: "TLS certificate" }), kind: "key" },
      { id: "origin", x: 660, y: 130, label: "Origin", sub: "ap-southeast-1", kind: "store" },
    ],
    run: (on) => on
      ? { hops: [
          { from: "acm", to: "cf", state: "pass", tag: "us-east-1", msg: L({ vi: "Chứng chỉ tại **us-east-1** được liên kết với distribution.", en: "A certificate in **us-east-1** is associated with the distribution." }) },
          { from: "user", to: "cf", state: "pass", tag: "TLS", msg: L({ vi: "Trình duyệt nhận chứng chỉ hợp lệ của shopviet.vn.", en: "The browser receives a valid certificate for shopviet.vn." }) },
          { to: "origin", state: "pass", msg: L({ vi: "Request được chuyển tới origin.", en: "The request is forwarded to the origin." }) },
          { to: "user", state: "pass", packet: "pkt-back", tag: "200", msg: L({ vi: "Trang chủ được phục vụ qua HTTPS.", en: "The home page is served over HTTPS." }) },
        ], ok: true, result: L({ vi: "CloudFront chỉ sử dụng chứng chỉ ACM tại **us-east-1** (N. Virginia), không phụ thuộc Region của origin.", en: "CloudFront uses only ACM certificates in **us-east-1** (N. Virginia), regardless of the origin's Region." }) }
      : { hops: [
          { from: "acm", to: "cf", state: "block", tag: L({ vi: "SAI REGION", en: "WRONG REGION" }), msg: L({ vi: "Chứng chỉ được tạo tại ap-southeast-1; CloudFront không truy cập được chứng chỉ này.", en: "The certificate was created in ap-southeast-1; CloudFront cannot access it." }) },
          { from: "user", to: "cf", state: "block", tag: L({ vi: "LỖI", en: "ERROR" }), flash: "!", msg: L({ vi: "Trình duyệt báo lỗi chứng chỉ.", en: "The browser reports a certificate error." }) },
        ], ok: false, result: L({ vi: "Cần tạo chứng chỉ ACM tại us-east-1 và liên kết với distribution.", en: "An ACM certificate must be created in us-east-1 and associated with the distribution." }) },
  },
  {
    name: L({ vi: "Chứng chỉ import sắp hết hạn", en: "An imported certificate is about to expire" }),
    story: L({ vi: "Một chứng chỉ mua từ bên ngoài được **import** vào ACM. ACM không tự động gia hạn loại chứng chỉ này. ShopViet cần nhận cảnh báo trước 30 ngày, với lượng script tối thiểu.", en: "A certificate bought from a third party is **imported** into ACM. ACM does not renew this kind of certificate automatically. ShopViet needs an alert 30 days ahead, with minimal scripting." }),
    request: L({ vi: "Chứng chỉ còn 30 ngày", en: "Certificate has 30 days left" }),
    toggle: { label: L({ vi: "Kích hoạt AWS Config rule + SNS", en: "Enable AWS Config rule + SNS" }), initial: false },
    start: "acm",
    nodes: [
      { id: "acm", x: 100, y: 120, label: "ACM", sub: L({ vi: "chứng chỉ import", en: "imported certificate" }), kind: "key" },
      { id: "cfg", x: 330, y: 60, label: "AWS Config", sub: "managed rule", kind: "svc" },
      { id: "sns", x: 540, y: 60, label: "Amazon SNS", kind: "svc" },
      { id: "team", x: 720, y: 60, w: 110, label: L({ vi: "Đội vận hành", en: "Operations team" }), kind: "user" },
      { id: "user", x: 540, y: 200, label: L({ vi: "Người dùng", en: "Users" }), kind: "user" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "cfg", state: "change", tag: L({ vi: "KIỂM TRA", en: "CHECK" }), msg: L({ vi: "Rule `acm-certificate-expiration-check` với tham số `daysToExpiration` = 30 (mặc định 14) phát hiện chứng chỉ còn 30 ngày.", en: "The `acm-certificate-expiration-check` rule with the parameter `daysToExpiration` = 30 (default 14) detects that the certificate has 30 days left." }) },
          { to: "sns", state: "pass", tag: L({ vi: "GỬI", en: "SENT" }), msg: L({ vi: "Thông báo được gửi tới SNS topic.", en: "A notification is sent to the SNS topic." }) },
          { to: "team", state: "pass", tag: L({ vi: "NHẬN", en: "RECEIVED" }), msg: L({ vi: "Đội vận hành nhận email và gia hạn kịp thời.", en: "The operations team gets the email and renews in time." }) },
        ], ok: true, result: L({ vi: "Không cần viết script: managed rule của AWS Config theo dõi thời hạn, SNS gửi cảnh báo. Phương án khác: ACM tự phát sự kiện EventBridge **ACM Certificate Approaching Expiration** hằng ngày, mặc định bắt đầu từ 45 ngày trước khi chứng chỉ import hết hạn.", en: "No scripting needed: an AWS Config managed rule tracks expiration, and SNS sends the alert. Another option: ACM emits the EventBridge event **ACM Certificate Approaching Expiration** daily, by default starting 45 days before an imported certificate expires." }) }
      : { hops: [
          { to: "user", state: "block", tag: L({ vi: "HẾT HẠN", en: "EXPIRED" }), flash: "!", msg: L({ vi: "Không có cảnh báo. Sau 30 ngày, trình duyệt báo lỗi chứng chỉ.", en: "No alert. After 30 days, the browser reports a certificate error." }) },
        ], ok: false, result: L({ vi: "ACM không tự động gia hạn chứng chỉ import. Sử dụng AWS Config managed rule + SNS, hoặc rule EventBridge cho sự kiện hết hạn của ACM, để nhận cảnh báo trước.", en: "ACM does not renew imported certificates automatically. Use an AWS Config managed rule + SNS, or an EventBridge rule for ACM's expiration event, to get an alert in advance." }) },
  },
];
}

export default function DataGuardSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Chạy", en: "Run" })} height={250}
    label={L({ vi: "Dữ liệu của ShopViet khi truyền và khi lưu trữ: TLS, KMS, snapshot và chứng chỉ ACM", en: "ShopViet's data in transit and at rest: TLS, KMS, snapshots and ACM certificates" })} />;
}
