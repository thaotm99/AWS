import HopSim, { type HopScenario } from "./HopSim";

// Six incidents at ShopViet, each one handled by the security service built for it:
// Shield Advanced, GuardDuty, Inspector, Macie, Firewall Manager and Security Lake.
// Practice-test sources (build-time only): exam3_q58, exam6_q4, exam1_q36, exam3_q1, exam6_q14, exam2_q44.

const TEAM = { id: "team", label: "Đội vận hành", kind: "user" as const };

const SCENARIOS: HopScenario[] = [
  {
    name: "DDoS giữa đợt sale",
    story: "Đêm sale 11/11, một botnet bắn hàng triệu request vào ShopViet. Ban giám đốc muốn có **người của AWS hỗ trợ** khi bị tấn công và **báo cáo** sau đó.",
    request: "Hàng triệu request / giây",
    toggle: { label: "Đăng ký AWS Shield Advanced", initial: false },
    start: "bot",
    nodes: [
      { id: "bot", x: 85, y: 130, label: "Botnet", sub: "DDoS lớp 3, 4 và 7", kind: "bad" },
      { id: "std", x: 310, y: 130, label: "AWS Shield Standard", sub: "có sẵn, miễn phí", kind: "svc" },
      { id: "adv", x: 310, y: 130, label: "AWS Shield Advanced", sub: "trả phí", kind: "svc" },
      { id: "srt", x: 310, y: 225, label: "Shield Response Team", sub: "đội của AWS, 24/7", kind: "aws" },
      { id: "cf", x: 540, y: 130, label: "CloudFront + ALB", kind: "svc" },
      { id: "app", x: 725, y: 130, w: 110, label: "Web ShopViet", kind: "app" },
    ],
    hidden: (on) => (on ? ["std"] : ["adv", "srt"]),
    run: (on) => on
      ? { hops: [
          { to: "adv", state: "change", times: 4, tag: "PHÁT HIỆN", msg: "Phát hiện tấn công lớn, cả lớp mạng lẫn lớp ứng dụng." },
          { from: "srt", to: "adv", state: "pass", tag: "HỖ TRỢ", msg: "Đội Shield Response Team (trước gọi là DRT) thêm rule WAF chặn nguồn tấn công." },
          { from: "adv", to: "cf", state: "pass", msg: "Chỉ traffic sạch đi tiếp." },
          { to: "app", state: "pass", msg: "Web vẫn nhận đơn." },
        ], ok: true, result: "Shield Advanced: có đội AWS hỗ trợ, báo cáo và log chi tiết về cuộc tấn công, và được bảo vệ chi phí khi hệ thống phải scale vì DDoS." }
      : { hops: [
          { to: "std", state: "change", times: 4, tag: "LỌC MỘT PHẦN", msg: "Chặn các kiểu tấn công lớp mạng phổ biến." },
          { to: "cf", state: "alert", times: 2, tag: "LỌT", msg: "Đợt tấn công lớn ở lớp ứng dụng vẫn đi qua." },
          { to: "app", state: "alert", tag: "CHẬM", flash: "503", msg: "Web chậm, khách bỏ giỏ hàng." },
        ], ok: false, result: "Shield Standard có sẵn và miễn phí, nhưng không có đội hỗ trợ, không có báo cáo chi tiết. Cần **AWS Shield Advanced**." },
  },
  {
    name: "Server bị cài phần mềm đào coin",
    story: "Một EC2 của ShopViet bị chiếm quyền và cài phần mềm đào tiền mã hoá. CPU luôn ở 100%, nhưng chưa ai để ý.",
    request: "EC2 kết nối tới pool.mining.example",
    toggle: { label: "Bật Amazon GuardDuty", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 100, y: 75, label: "EC2 web", sub: "đã bị chiếm", kind: "app" },
      { id: "pool", x: 100, y: 205, label: "Mining pool", sub: "ngoài Internet", kind: "bad" },
      { id: "logs", x: 360, y: 75, label: "Log của account", sub: "CloudTrail, VPC Flow Logs, DNS", kind: "log" },
      { id: "gd", x: 590, y: 75, label: "Amazon GuardDuty", kind: "svc" },
      { ...TEAM, x: 590, y: 205 },
    ],
    hidden: (on) => (on ? [] : ["gd"]),
    run: (on) => ({ hops: [
      { to: "pool", state: "alert", tag: "ĐÀO COIN", msg: "EC2 liên tục gửi kết quả tới mining pool." },
      { from: "ec2", to: "logs", state: "change", tag: "CÓ LOG", msg: "Kết nối và truy vấn DNS đều nằm trong log." },
      ...(on ? [
        { to: "gd", state: "alert" as const, tag: "FINDING", flash: "!", msg: "Finding `CryptoCurrency:EC2/BitcoinTool.B!DNS`." },
        { to: "team", state: "pass" as const, tag: "BÁO", msg: "Cảnh báo tới đội vận hành qua EventBridge." },
      ] : []),
    ], ok: on, result: on
      ? "GuardDuty tự đọc log, không cần cài agent hay viết rule. Nó tìm ra hành vi độc hại như đào coin, gọi tới IP xấu, đăng nhập lạ."
      : "Log có đủ, nhưng không ai đọc. Bật **Amazon GuardDuty** để phát hiện mối đe doạ từ log." }),
  },
  {
    name: "Thư viện cũ có lỗ hổng",
    story: "Server web của ShopViet vẫn chạy một bản OpenSSL cũ có lỗ hổng đã công bố. Đội dev không biết.",
    request: "Quét EC2 web-01",
    toggle: { label: "Bật Amazon Inspector", initial: false },
    start: "ins",
    nodes: [
      { id: "ins", x: 120, y: 75, label: "Amazon Inspector", kind: "svc" },
      { id: "ec2", x: 400, y: 130, label: "EC2 web-01", sub: "openssl bản cũ", kind: "app" },
      { id: "att", x: 680, y: 130, w: 120, label: "Kẻ tấn công", kind: "bad" },
      { ...TEAM, x: 120, y: 205 },
    ],
    hidden: (on) => (on ? [] : ["ins"]),
    run: (on) => on
      ? { hops: [
          { to: "ec2", state: "change", tag: "QUÉT", msg: "Quét gói phần mềm và cổng mạng đang mở trên EC2." },
          { to: "ins", state: "alert", tag: "CVE", flash: "!", msg: "Tìm thấy lỗ hổng mức **Critical** trong gói openssl.", packet: "pkt-bad" },
          { to: "team", state: "pass", tag: "VÁ", msg: "Đội dev nhận danh sách lỗ hổng xếp theo mức độ và vá trước." },
          { from: "att", to: "ec2", state: "block", tag: "THẤT BẠI", msg: "Lỗ hổng đã vá, khai thác không thành." },
        ], ok: true, result: "Inspector quét liên tục lỗ hổng phần mềm và mức độ phơi nhiễm mạng của EC2, container image và Lambda." }
      : { hops: [
          { from: "att", to: "ec2", state: "alert", tag: "KHAI THÁC", flash: "!", msg: "Kẻ tấn công tìm ra lỗ hổng trước ShopViet." },
        ], ok: false, result: "Không ai quét thì không ai biết. Bật **Amazon Inspector** để tìm lỗ hổng trên EC2." },
  },
  {
    name: "File khách hàng nằm sai chỗ",
    story: "Một bạn dev xuất danh sách khách hàng ra CSV để test rồi để quên trong một bucket S3. File có số điện thoại và số CCCD.",
    request: "PUT exports/khach-hang.csv",
    toggle: { label: "Bật Amazon Macie", initial: false },
    start: "dev",
    nodes: [
      { id: "dev", x: 100, y: 130, label: "Dev ShopViet", kind: "user" },
      { id: "s3", x: 360, y: 130, label: "S3 bucket", sub: "exports/", kind: "store" },
      { id: "macie", x: 620, y: 70, label: "Amazon Macie", kind: "svc" },
      { ...TEAM, x: 620, y: 200 },
    ],
    hidden: (on) => (on ? [] : ["macie"]),
    run: (on) => ({ hops: [
      { to: "s3", state: "pass", tag: "UPLOAD", msg: "File CSV có dữ liệu cá nhân nằm trong bucket." },
      ...(on ? [
        { from: "macie", to: "s3", state: "change" as const, tag: "QUÉT", msg: "Macie quét object bằng machine learning và mẫu nhận dạng." },
        { to: "macie", state: "alert" as const, tag: "PII", flash: "PII", msg: "Phát hiện số điện thoại và số giấy tờ tuỳ thân.", packet: "pkt-bad" as const },
        { to: "team", state: "pass" as const, tag: "BÁO", msg: "Finding gửi tới đội vận hành để xoá hoặc khoá file." },
      ] : []),
    ], ok: on, result: on
      ? "Macie tìm và phân loại dữ liệu nhạy cảm trong S3. Muốn phát hiện **hoạt động độc hại** trên S3 (truy cập lạ, tải hàng loạt) thì dùng thêm GuardDuty."
      : "Không ai biết bucket đang chứa dữ liệu nhạy cảm. Bật **Amazon Macie**." }),
  },
  {
    name: "Thêm 3 account mới",
    story: "ShopViet mở thêm 3 AWS account cho các đội mới. Mọi ALB ở mọi account phải có cùng bộ rule WAF.",
    request: "Áp web ACL chuẩn cho mọi account",
    toggle: { label: "Dùng AWS Firewall Manager", initial: false },
    start: "sec",
    nodes: [
      { id: "sec", x: 100, y: 130, label: "Account bảo mật", kind: "user" },
      { id: "fm", x: 340, y: 130, label: "Firewall Manager", sub: "trong Organizations", kind: "svc" },
      { id: "a1", x: 640, y: 50, label: "Account Thanh toán", sub: "ALB + WAF", kind: "store" },
      { id: "a2", x: 640, y: 130, label: "Account Kho hàng", sub: "ALB + WAF", kind: "store" },
      { id: "a3", x: 640, y: 210, label: "Account mới tạo", sub: "ALB + WAF", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["fm"]),
    run: (on) => on
      ? { hops: [
          { to: "fm", state: "change", tag: "POLICY", msg: "Viết một policy: mọi ALB phải có web ACL chuẩn của ShopViet." },
          { to: "a1", state: "pass", tag: "ÁP", msg: "Áp tự động." },
          { from: "fm", to: "a2", state: "pass", tag: "ÁP", msg: "Áp tự động." },
          { from: "fm", to: "a3", state: "pass", tag: "ÁP", msg: "Account vừa tạo cũng được áp ngay." },
        ], ok: true, result: "Firewall Manager quản lý tập trung rule AWS WAF, Shield Advanced và security group cho cả Organizations." }
      : { hops: [
          { to: "a1", state: "change", tag: "LÀM TAY", msg: "Vào từng account cấu hình WAF." },
          { from: "sec", to: "a2", state: "change", tag: "LÀM TAY", msg: "Lặp lại ở account thứ hai." },
          { from: "sec", to: "a3", state: "alert", tag: "QUÊN", flash: "!", msg: "Account mới bị quên, ALB không có WAF." },
        ], ok: false, result: "Càng nhiều account càng dễ sót. Dùng **AWS Firewall Manager**." },
  },
  {
    name: "Gom log bảo mật về một chỗ",
    story: "Đội bảo mật muốn phân tích log từ mọi account và mọi nguồn ở một nơi, viết càng ít code càng tốt.",
    request: "Gom CloudTrail, VPC Flow Logs, DNS logs",
    toggle: { label: "Dùng Amazon Security Lake", initial: false },
    start: "ct",
    nodes: [
      { id: "ct", x: 110, y: 50, label: "CloudTrail", kind: "log" },
      { id: "flow", x: 110, y: 130, label: "VPC Flow Logs", kind: "log" },
      { id: "dns", x: 110, y: 210, label: "Route 53 Resolver logs", kind: "log" },
      { id: "lake", x: 420, y: 130, label: "Amazon Security Lake", sub: "data lake trên S3", kind: "svc" },
      { id: "ops", x: 420, y: 130, label: "Script tự viết", sub: "mỗi account, mỗi nguồn", kind: "bad" },
      { id: "ana", x: 690, y: 130, w: 120, label: "Công cụ phân tích", kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["lake"]),
    run: (on) => {
      const mid = on ? "lake" : "ops";
      return { hops: [
        { to: mid, state: on ? "pass" : "alert", tag: on ? "TỰ GOM" : "TỰ VIẾT", msg: on ? "Security Lake tự thu thập." : "Phải viết và bảo trì script." },
        { from: "flow", to: mid, state: on ? "pass" : "alert", tag: on ? "TỰ GOM" : "TỰ VIẾT", msg: on ? "Chuẩn hoá về một định dạng chung (OCSF)." : "Mỗi nguồn một định dạng." },
        { from: "dns", to: mid, state: on ? "pass" : "alert", tag: on ? "TỰ GOM" : "TỰ VIẾT", msg: on ? "Từ mọi account trong Organizations." : "Thêm account là thêm việc." },
        { from: mid, to: "ana", state: on ? "pass" : "change", tag: on ? "SẴN SÀNG" : "CHẬM", msg: on ? "Truy vấn ngay trên S3." : "Dữ liệu tới muộn và thiếu." },
      ], ok: on, result: on
        ? "Security Lake tự gom log và sự kiện bảo mật thành data lake trên S3 của chính ShopViet."
        : "Tốn công và dễ thiếu. Dùng **Amazon Security Lake**." };
    },
  },
];

export default function IncidentSim() {
  return <HopSim scenarios={SCENARIOS} action="Cho sự cố xảy ra" height={250}
    label="Sáu sự cố bảo mật của ShopViet và dịch vụ AWS phát hiện hoặc chặn từng sự cố" />;
}
