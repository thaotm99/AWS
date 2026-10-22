import HopSim, { type HopScenario } from "./HopSim";

// Six incidents at ShopViet, each one handled by the security service built for it:
// Shield Advanced, GuardDuty, Inspector, Macie, Firewall Manager and Security Lake.
// Practice-test sources (build-time only): exam3_q58, exam6_q4, exam1_q36, exam3_q1, exam6_q14, exam2_q44.

const TEAM = { id: "team", label: "Đội vận hành", kind: "user" as const };

const SCENARIOS: HopScenario[] = [
  {
    name: "DDoS trong đợt khuyến mãi",
    story: "Trong đợt khuyến mãi 11/11, một botnet gửi hàng triệu request tới ShopViet. Ban giám đốc yêu cầu có **đội ngũ AWS hỗ trợ** khi bị tấn công và **báo cáo** sau sự cố.",
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
          { to: "adv", state: "change", times: 4, tag: "PHÁT HIỆN", msg: "Phát hiện tấn công quy mô lớn ở cả tầng mạng lẫn tầng ứng dụng." },
          { from: "srt", to: "adv", state: "pass", tag: "HỖ TRỢ", msg: "Shield Response Team (SRT) hỗ trợ bổ sung rule WAF chặn nguồn tấn công; sử dụng SRT yêu cầu gói Business Support hoặc Enterprise Support." },
          { from: "adv", to: "cf", state: "pass", msg: "Chỉ traffic hợp lệ được chuyển tiếp." },
          { to: "app", state: "pass", msg: "Hệ thống vẫn tiếp nhận đơn hàng." },
        ], ok: true, result: "Shield Advanced: có đội ngũ AWS hỗ trợ, báo cáo và log chi tiết về cuộc tấn công, và cost protection dưới dạng service credit khi chi phí tăng đột biến do DDoS." }
      : { hops: [
          { to: "std", state: "change", times: 4, tag: "LỌC MỘT PHẦN", msg: "Chặn các kiểu tấn công tầng mạng phổ biến." },
          { to: "cf", state: "alert", times: 2, tag: "LỌT QUA", msg: "Đợt tấn công quy mô lớn ở tầng ứng dụng vẫn đi qua." },
          { to: "app", state: "alert", tag: "CHẬM", flash: "503", msg: "Hệ thống phản hồi chậm, người dùng bỏ giỏ hàng." },
        ], ok: false, result: "Shield Standard có sẵn và miễn phí, nhưng không có đội ngũ hỗ trợ và báo cáo chi tiết. Cần **AWS Shield Advanced**." },
  },
  {
    name: "Server bị cài phần mềm đào tiền mã hoá",
    story: "Một EC2 của ShopViet bị chiếm quyền và bị cài phần mềm đào tiền mã hoá. CPU luôn ở mức 100% nhưng chưa được phát hiện.",
    request: "EC2 kết nối tới pool.mining.example",
    toggle: { label: "Kích hoạt Amazon GuardDuty", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 100, y: 75, label: "EC2 web", sub: "đã bị chiếm quyền", kind: "app" },
      { id: "pool", x: 100, y: 205, label: "Mining pool", sub: "ngoài Internet", kind: "bad" },
      { id: "logs", x: 360, y: 75, label: "Log của account", sub: "CloudTrail, VPC Flow Logs, DNS", kind: "log" },
      { id: "gd", x: 590, y: 75, label: "Amazon GuardDuty", kind: "svc" },
      { ...TEAM, x: 590, y: 205 },
    ],
    hidden: (on) => (on ? [] : ["gd"]),
    run: (on) => ({ hops: [
      { to: "pool", state: "alert", tag: "CRYPTO MINING", msg: "EC2 liên tục gửi kết quả tới mining pool." },
      { from: "ec2", to: "logs", state: "change", tag: "CÓ LOG", msg: "Kết nối và truy vấn DNS đều được ghi trong log." },
      ...(on ? [
        { to: "gd", state: "alert" as const, tag: "FINDING", flash: "!", msg: "Finding `CryptoCurrency:EC2/BitcoinTool.B!DNS`." },
        { to: "team", state: "pass" as const, tag: "CẢNH BÁO", msg: "Cảnh báo được gửi tới đội vận hành qua EventBridge." },
      ] : []),
    ], ok: on, result: on
      ? "Với các foundational data source (CloudTrail management events, VPC Flow Logs, DNS logs), GuardDuty tự động phân tích ngay khi được kích hoạt, không cần cài agent hay viết rule. Tính năng Runtime Monitoring (EKS, ECS, EC2) mới sử dụng GuardDuty security agent. Dịch vụ phát hiện các hành vi độc hại như đào tiền mã hoá, kết nối tới IP độc hại, đăng nhập bất thường."
      : "Log đầy đủ nhưng không được phân tích. Kích hoạt **Amazon GuardDuty** để phát hiện mối đe doạ từ log." }),
  },
  {
    name: "Thư viện phiên bản cũ có lỗ hổng",
    story: "Server web của ShopViet vẫn chạy một phiên bản OpenSSL cũ có lỗ hổng đã được công bố. Đội phát triển chưa nắm được thông tin này.",
    request: "Quét EC2 web-01",
    toggle: { label: "Kích hoạt Amazon Inspector", initial: false },
    start: "ins",
    nodes: [
      { id: "ins", x: 120, y: 75, label: "Amazon Inspector", kind: "svc" },
      { id: "ec2", x: 400, y: 130, label: "EC2 web-01", sub: "openssl phiên bản cũ", kind: "app" },
      { id: "att", x: 680, y: 130, w: 120, label: "Bên tấn công", kind: "bad" },
      { ...TEAM, x: 120, y: 205 },
    ],
    hidden: (on) => (on ? [] : ["ins"]),
    run: (on) => on
      ? { hops: [
          { to: "ec2", state: "change", tag: "QUÉT", msg: "Quét gói phần mềm và cổng mạng đang mở trên EC2." },
          { to: "ins", state: "alert", tag: "CVE", flash: "!", msg: "Phát hiện lỗ hổng mức **Critical** trong gói openssl.", packet: "pkt-bad" },
          { to: "team", state: "pass", tag: "VÁ", msg: "Đội phát triển nhận danh sách lỗ hổng sắp xếp theo mức độ nghiêm trọng và vá lỗi chủ động." },
          { from: "att", to: "ec2", state: "block", tag: "THẤT BẠI", msg: "Lỗ hổng đã được vá, khai thác thất bại." },
        ], ok: true, result: "Inspector quét liên tục lỗ hổng phần mềm và mức độ phơi nhiễm mạng của EC2, container image và Lambda." }
      : { hops: [
          { from: "att", to: "ec2", state: "alert", tag: "KHAI THÁC", flash: "!", msg: "Bên tấn công phát hiện lỗ hổng trước ShopViet." },
        ], ok: false, result: "Khi không quét, lỗ hổng không được phát hiện. Kích hoạt **Amazon Inspector** để phát hiện lỗ hổng trên EC2." },
  },
  {
    name: "Tệp dữ liệu khách hàng lưu sai vị trí",
    story: "Một developer xuất danh sách khách hàng ra tệp CSV để kiểm thử và để lại trong một bucket S3. Tệp chứa số điện thoại và số CCCD.",
    request: "PUT exports/khach-hang.csv",
    toggle: { label: "Kích hoạt Amazon Macie", initial: false },
    start: "dev",
    nodes: [
      { id: "dev", x: 100, y: 130, label: "Dev ShopViet", kind: "user" },
      { id: "s3", x: 360, y: 130, label: "S3 bucket", sub: "exports/", kind: "store" },
      { id: "macie", x: 620, y: 70, label: "Amazon Macie", kind: "svc" },
      { ...TEAM, x: 620, y: 200 },
    ],
    hidden: (on) => (on ? [] : ["macie"]),
    run: (on) => ({ hops: [
      { to: "s3", state: "pass", tag: "UPLOAD", msg: "Tệp CSV chứa dữ liệu cá nhân được lưu trong bucket." },
      ...(on ? [
        { from: "macie", to: "s3", state: "change" as const, tag: "QUÉT", msg: "Macie quét object bằng machine learning và mẫu nhận dạng." },
        { to: "macie", state: "alert" as const, tag: "PII", flash: "PII", msg: "Phát hiện số điện thoại và số giấy tờ tuỳ thân.", packet: "pkt-bad" as const },
        { to: "team", state: "pass" as const, tag: "CẢNH BÁO", msg: "Finding được gửi tới đội vận hành để xoá hoặc hạn chế truy cập tệp." },
      ] : []),
    ], ok: on, result: on
      ? "Macie phát hiện và phân loại dữ liệu nhạy cảm trong S3. Để phát hiện **hoạt động độc hại** trên S3 (truy cập bất thường, tải xuống hàng loạt), sử dụng thêm GuardDuty."
      : "Không xác định được bucket nào đang chứa dữ liệu nhạy cảm. Kích hoạt **Amazon Macie**." }),
  },
  {
    name: "Bổ sung 3 account mới",
    story: "ShopViet tạo thêm 3 AWS account cho các đội mới. Mọi ALB tại mọi account phải có cùng bộ rule WAF.",
    request: "Áp dụng web ACL chuẩn cho mọi account",
    toggle: { label: "Sử dụng AWS Firewall Manager", initial: false },
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
          { to: "fm", state: "change", tag: "POLICY", msg: "Định nghĩa một policy: mọi ALB phải có web ACL chuẩn của ShopViet." },
          { to: "a1", state: "pass", tag: "ÁP DỤNG", msg: "Áp dụng tự động." },
          { from: "fm", to: "a2", state: "pass", tag: "ÁP DỤNG", msg: "Áp dụng tự động." },
          { from: "fm", to: "a3", state: "pass", tag: "ÁP DỤNG", msg: "Account vừa tạo cũng được áp dụng ngay." },
        ], ok: true, result: "Firewall Manager quản lý tập trung AWS WAF, Shield Advanced, Security Group và network ACL, AWS Network Firewall, Route 53 Resolver DNS Firewall cho các account trong AWS Organizations." }
      : { hops: [
          { to: "a1", state: "change", tag: "THỦ CÔNG", msg: "Cấu hình WAF tại từng account." },
          { from: "sec", to: "a2", state: "change", tag: "THỦ CÔNG", msg: "Lặp lại tại account thứ hai." },
          { from: "sec", to: "a3", state: "alert", tag: "BỎ SÓT", flash: "!", msg: "Account mới bị bỏ sót, ALB không có WAF." },
        ], ok: false, result: "Số lượng account càng lớn, nguy cơ bỏ sót càng cao. Sử dụng **AWS Firewall Manager**." },
  },
  {
    name: "Tập trung log bảo mật",
    story: "Đội bảo mật cần phân tích log từ mọi account và mọi nguồn tại một vị trí tập trung, với lượng mã nguồn tối thiểu.",
    request: "Tập trung CloudTrail, VPC Flow Logs, DNS logs",
    toggle: { label: "Sử dụng Amazon Security Lake", initial: false },
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
        { to: mid, state: on ? "pass" : "alert", tag: on ? "TỰ ĐỘNG" : "THỦ CÔNG", msg: on ? "Security Lake tự động thu thập." : "Phải viết và bảo trì script." },
        { from: "flow", to: mid, state: on ? "pass" : "alert", tag: on ? "TỰ ĐỘNG" : "THỦ CÔNG", msg: on ? "Chuẩn hoá về một định dạng chung (OCSF)." : "Mỗi nguồn sử dụng một định dạng riêng." },
        { from: "dns", to: mid, state: on ? "pass" : "alert", tag: on ? "TỰ ĐỘNG" : "THỦ CÔNG", msg: on ? "Thu thập từ mọi account trong Organizations." : "Mỗi account mới phát sinh thêm tác vụ." },
        { from: mid, to: "ana", state: on ? "pass" : "change", tag: on ? "SẴN SÀNG" : "CHẬM", msg: on ? "Truy vấn trực tiếp trên S3." : "Dữ liệu đến chậm và không đầy đủ." },
      ], ok: on, result: on
        ? "Security Lake tự động tập trung log và sự kiện bảo mật thành data lake trên S3 thuộc account của ShopViet."
        : "Tốn công sức và dễ thiếu dữ liệu. Sử dụng **Amazon Security Lake**." };
    },
  },
];

export default function IncidentSim() {
  return <HopSim scenarios={SCENARIOS} action="Mô phỏng sự cố" height={250}
    label="Sáu sự cố bảo mật của ShopViet và dịch vụ AWS phát hiện hoặc chặn từng sự cố" />;
}
