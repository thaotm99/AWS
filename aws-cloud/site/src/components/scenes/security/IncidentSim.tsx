import { useLang } from "../../../lib/lang";
import HopSim, { type HopScenario } from "./HopSim";

type Lang = ReturnType<typeof useLang>;

// Six incidents at ShopViet, each one handled by the security service built for it:
// Shield Advanced, GuardDuty, Inspector, Macie, Firewall Manager and Security Lake.
// Practice-test sources (build-time only): exam3_q58, exam6_q4, exam1_q36, exam3_q1, exam6_q14, exam2_q44.

function scenarios(L: Lang): HopScenario[] {
const TEAM = { id: "team", label: L({ vi: "Đội vận hành", en: "Operations team" }), kind: "user" as const };

return [
  {
    name: L({ vi: "DDoS trong đợt khuyến mãi", en: "DDoS during a sale" }),
    story: L({ vi: "Trong đợt khuyến mãi 11/11, một botnet gửi hàng triệu request tới ShopViet. Ban giám đốc yêu cầu có **đội ngũ AWS hỗ trợ** khi bị tấn công và **báo cáo** sau sự cố.", en: "During the 11/11 sale, a botnet sends millions of requests to ShopViet. Management requires **support from the AWS team** during an attack and a **report** after the incident." }),
    request: L({ vi: "Hàng triệu request / giây", en: "Millions of requests / second" }),
    toggle: { label: L({ vi: "Đăng ký AWS Shield Advanced", en: "Subscribe to AWS Shield Advanced" }), initial: false },
    start: "bot",
    nodes: [
      { id: "bot", x: 85, y: 130, label: "Botnet", sub: L({ vi: "DDoS lớp 3, 4 và 7", en: "DDoS at layers 3, 4 and 7" }), kind: "bad" },
      { id: "std", x: 310, y: 130, label: "AWS Shield Standard", sub: L({ vi: "có sẵn, miễn phí", en: "built in, free" }), kind: "svc" },
      { id: "adv", x: 310, y: 130, label: "AWS Shield Advanced", sub: L({ vi: "trả phí", en: "paid" }), kind: "svc" },
      { id: "srt", x: 310, y: 225, label: "Shield Response Team", sub: L({ vi: "đội của AWS, 24/7", en: "AWS team, 24/7" }), kind: "aws" },
      { id: "cf", x: 540, y: 130, label: "CloudFront + ALB", kind: "svc" },
      { id: "app", x: 725, y: 130, w: 110, label: "Web ShopViet", kind: "app" },
    ],
    hidden: (on) => (on ? ["std"] : ["adv", "srt"]),
    run: (on) => on
      ? { hops: [
          { to: "adv", state: "change", times: 4, tag: L({ vi: "PHÁT HIỆN", en: "DETECTED" }), msg: L({ vi: "Phát hiện tấn công quy mô lớn ở cả tầng mạng lẫn tầng ứng dụng.", en: "Detects a large-scale attack at both the network and the application layer." }) },
          { from: "srt", to: "adv", state: "pass", tag: L({ vi: "HỖ TRỢ", en: "SUPPORT" }), msg: L({ vi: "Shield Response Team (SRT) hỗ trợ bổ sung rule WAF chặn nguồn tấn công; sử dụng SRT yêu cầu gói Business Support hoặc Enterprise Support.", en: "The Shield Response Team (SRT) helps add WAF rules that block the attack sources; using the SRT requires a Business Support or Enterprise Support plan." }) },
          { from: "adv", to: "cf", state: "pass", msg: L({ vi: "Chỉ traffic hợp lệ được chuyển tiếp.", en: "Only legitimate traffic is forwarded." }) },
          { to: "app", state: "pass", msg: L({ vi: "Hệ thống vẫn tiếp nhận đơn hàng.", en: "The system keeps taking orders." }) },
        ], ok: true, result: L({ vi: "Shield Advanced: có đội ngũ AWS hỗ trợ, báo cáo và log chi tiết về cuộc tấn công, và cost protection dưới dạng service credit khi chi phí tăng đột biến do DDoS.", en: "Shield Advanced: support from the AWS team, detailed reports and logs on the attack, and cost protection in the form of service credits when costs spike because of DDoS." }) }
      : { hops: [
          { to: "std", state: "change", times: 4, tag: L({ vi: "LỌC MỘT PHẦN", en: "PARTLY FILTERED" }), msg: L({ vi: "Chặn các kiểu tấn công tầng mạng phổ biến.", en: "Blocks common network-layer attacks." }) },
          { to: "cf", state: "alert", times: 2, tag: L({ vi: "LỌT QUA", en: "GETS THROUGH" }), msg: L({ vi: "Đợt tấn công quy mô lớn ở tầng ứng dụng vẫn đi qua.", en: "The large-scale application-layer attack still gets through." }) },
          { to: "app", state: "alert", tag: L({ vi: "CHẬM", en: "SLOW" }), flash: "503", msg: L({ vi: "Hệ thống phản hồi chậm, người dùng bỏ giỏ hàng.", en: "The system responds slowly, and users abandon their carts." }) },
        ], ok: false, result: L({ vi: "Shield Standard có sẵn và miễn phí, nhưng không có đội ngũ hỗ trợ và báo cáo chi tiết. Cần **AWS Shield Advanced**.", en: "Shield Standard is built in and free, but has no support team and no detailed reports. **AWS Shield Advanced** is needed." }) },
  },
  {
    name: L({ vi: "Server bị cài phần mềm đào tiền mã hoá", en: "A server is infected with crypto mining software" }),
    story: L({ vi: "Một EC2 của ShopViet bị chiếm quyền và bị cài phần mềm đào tiền mã hoá. CPU luôn ở mức 100% nhưng chưa được phát hiện.", en: "One of ShopViet's EC2 instances is compromised and has cryptocurrency mining software installed. CPU is always at 100%, but nobody has noticed." }),
    request: L({ vi: "EC2 kết nối tới pool.mining.example", en: "EC2 connects to pool.mining.example" }),
    toggle: { label: L({ vi: "Kích hoạt Amazon GuardDuty", en: "Enable Amazon GuardDuty" }), initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 100, y: 75, label: "EC2 web", sub: L({ vi: "đã bị chiếm quyền", en: "compromised" }), kind: "app" },
      { id: "pool", x: 100, y: 205, label: "Mining pool", sub: L({ vi: "ngoài Internet", en: "on the internet" }), kind: "bad" },
      { id: "logs", x: 360, y: 75, label: L({ vi: "Log của account", en: "Account logs" }), sub: "CloudTrail, VPC Flow Logs, DNS", kind: "log" },
      { id: "gd", x: 590, y: 75, label: "Amazon GuardDuty", kind: "svc" },
      { ...TEAM, x: 590, y: 205 },
    ],
    hidden: (on) => (on ? [] : ["gd"]),
    run: (on) => ({ hops: [
      { to: "pool", state: "alert", tag: "CRYPTO MINING", msg: L({ vi: "EC2 liên tục gửi kết quả tới mining pool.", en: "The EC2 instance keeps sending results to the mining pool." }) },
      { from: "ec2", to: "logs", state: "change", tag: L({ vi: "CÓ LOG", en: "LOGGED" }), msg: L({ vi: "Kết nối và truy vấn DNS đều được ghi trong log.", en: "The connections and DNS queries are all recorded in the logs." }) },
      ...(on ? [
        { to: "gd", state: "alert" as const, tag: "FINDING", flash: "!", msg: "Finding `CryptoCurrency:EC2/BitcoinTool.B!DNS`." },
        { to: "team", state: "pass" as const, tag: L({ vi: "CẢNH BÁO", en: "ALERT" }), msg: L({ vi: "Cảnh báo được gửi tới đội vận hành qua EventBridge.", en: "An alert is sent to the operations team through EventBridge." }) },
      ] : []),
    ], ok: on, result: on
      ? L({ vi: "Với các foundational data source (CloudTrail management events, VPC Flow Logs, DNS logs), GuardDuty tự động phân tích ngay khi được kích hoạt, không cần cài agent hay viết rule. Tính năng Runtime Monitoring (EKS, ECS, EC2) mới sử dụng GuardDuty security agent. Dịch vụ phát hiện các hành vi độc hại như đào tiền mã hoá, kết nối tới IP độc hại, đăng nhập bất thường.", en: "For the foundational data sources (CloudTrail management events, VPC Flow Logs, DNS logs), GuardDuty analyzes automatically as soon as it is enabled, with no agent to install and no rules to write. Only the Runtime Monitoring feature (EKS, ECS, EC2) uses the GuardDuty security agent. The service detects malicious behavior such as cryptocurrency mining, connections to malicious IPs and unusual sign-ins." })
      : L({ vi: "Log đầy đủ nhưng không được phân tích. Kích hoạt **Amazon GuardDuty** để phát hiện mối đe doạ từ log.", en: "The logs are complete but nobody analyzes them. Enable **Amazon GuardDuty** to detect threats from the logs." }) }),
  },
  {
    name: L({ vi: "Thư viện phiên bản cũ có lỗ hổng", en: "An outdated library with a vulnerability" }),
    story: L({ vi: "Server web của ShopViet vẫn chạy một phiên bản OpenSSL cũ có lỗ hổng đã được công bố. Đội phát triển chưa nắm được thông tin này.", en: "ShopViet's web server still runs an old OpenSSL version with a published vulnerability. The development team is not aware of it." }),
    request: L({ vi: "Quét EC2 web-01", en: "Scan EC2 web-01" }),
    toggle: { label: L({ vi: "Kích hoạt Amazon Inspector", en: "Enable Amazon Inspector" }), initial: false },
    start: "ins",
    nodes: [
      { id: "ins", x: 120, y: 75, label: "Amazon Inspector", kind: "svc" },
      { id: "ec2", x: 400, y: 130, label: "EC2 web-01", sub: L({ vi: "openssl phiên bản cũ", en: "old openssl version" }), kind: "app" },
      { id: "att", x: 680, y: 130, w: 120, label: L({ vi: "Bên tấn công", en: "Attacker" }), kind: "bad" },
      { ...TEAM, x: 120, y: 205 },
    ],
    hidden: (on) => (on ? [] : ["ins"]),
    run: (on) => on
      ? { hops: [
          { to: "ec2", state: "change", tag: L({ vi: "QUÉT", en: "SCAN" }), msg: L({ vi: "Quét gói phần mềm và cổng mạng đang mở trên EC2.", en: "Scans the software packages and open network ports on EC2." }) },
          { to: "ins", state: "alert", tag: "CVE", flash: "!", msg: L({ vi: "Phát hiện lỗ hổng mức **Critical** trong gói openssl.", en: "Finds a **Critical** vulnerability in the openssl package." }), packet: "pkt-bad" },
          { to: "team", state: "pass", tag: L({ vi: "VÁ", en: "PATCH" }), msg: L({ vi: "Đội phát triển nhận danh sách lỗ hổng sắp xếp theo mức độ nghiêm trọng và vá lỗi chủ động.", en: "The development team gets a list of vulnerabilities sorted by severity and patches proactively." }) },
          { from: "att", to: "ec2", state: "block", tag: L({ vi: "THẤT BẠI", en: "FAILED" }), msg: L({ vi: "Lỗ hổng đã được vá, khai thác thất bại.", en: "The vulnerability has been patched, so the exploit fails." }) },
        ], ok: true, result: L({ vi: "Inspector quét liên tục lỗ hổng phần mềm và mức độ phơi nhiễm mạng của EC2, container image và Lambda.", en: "Inspector continuously scans EC2, container images and Lambda for software vulnerabilities and network exposure." }) }
      : { hops: [
          { from: "att", to: "ec2", state: "alert", tag: L({ vi: "KHAI THÁC", en: "EXPLOITED" }), flash: "!", msg: L({ vi: "Bên tấn công phát hiện lỗ hổng trước ShopViet.", en: "The attacker finds the vulnerability before ShopViet does." }) },
        ], ok: false, result: L({ vi: "Khi không quét, lỗ hổng không được phát hiện. Kích hoạt **Amazon Inspector** để phát hiện lỗ hổng trên EC2.", en: "Without scanning, the vulnerability goes undetected. Enable **Amazon Inspector** to find vulnerabilities on EC2." }) },
  },
  {
    name: L({ vi: "Tệp dữ liệu khách hàng lưu sai vị trí", en: "A customer data file stored in the wrong place" }),
    story: L({ vi: "Một developer xuất danh sách khách hàng ra tệp CSV để kiểm thử và để lại trong một bucket S3. Tệp chứa số điện thoại và số CCCD.", en: "A developer exports the customer list to a CSV file for testing and leaves it in an S3 bucket. The file contains phone numbers and national ID numbers." }),
    request: "PUT exports/khach-hang.csv",
    toggle: { label: L({ vi: "Kích hoạt Amazon Macie", en: "Enable Amazon Macie" }), initial: false },
    start: "dev",
    nodes: [
      { id: "dev", x: 100, y: 130, label: "Dev ShopViet", kind: "user" },
      { id: "s3", x: 360, y: 130, label: "S3 bucket", sub: "exports/", kind: "store" },
      { id: "macie", x: 620, y: 70, label: "Amazon Macie", kind: "svc" },
      { ...TEAM, x: 620, y: 200 },
    ],
    hidden: (on) => (on ? [] : ["macie"]),
    run: (on) => ({ hops: [
      { to: "s3", state: "pass", tag: "UPLOAD", msg: L({ vi: "Tệp CSV chứa dữ liệu cá nhân được lưu trong bucket.", en: "A CSV file containing personal data is stored in the bucket." }) },
      ...(on ? [
        { from: "macie", to: "s3", state: "change" as const, tag: L({ vi: "QUÉT", en: "SCAN" }), msg: L({ vi: "Macie quét object bằng machine learning và mẫu nhận dạng.", en: "Macie scans the objects with machine learning and pattern matching." }) },
        { to: "macie", state: "alert" as const, tag: "PII", flash: "PII", msg: L({ vi: "Phát hiện số điện thoại và số giấy tờ tuỳ thân.", en: "Finds phone numbers and identity document numbers." }), packet: "pkt-bad" as const },
        { to: "team", state: "pass" as const, tag: L({ vi: "CẢNH BÁO", en: "ALERT" }), msg: L({ vi: "Finding được gửi tới đội vận hành để xoá hoặc hạn chế truy cập tệp.", en: "The finding is sent to the operations team to delete the file or restrict access to it." }) },
      ] : []),
    ], ok: on, result: on
      ? L({ vi: "Macie phát hiện và phân loại dữ liệu nhạy cảm trong S3. Để phát hiện **hoạt động độc hại** trên S3 (truy cập bất thường, tải xuống hàng loạt), sử dụng thêm GuardDuty.", en: "Macie discovers and classifies sensitive data in S3. To detect **malicious activity** on S3 (unusual access, mass downloads), add GuardDuty." })
      : L({ vi: "Không xác định được bucket nào đang chứa dữ liệu nhạy cảm. Kích hoạt **Amazon Macie**.", en: "There is no way to tell which buckets contain sensitive data. Enable **Amazon Macie**." }) }),
  },
  {
    name: L({ vi: "Bổ sung 3 account mới", en: "Adding 3 new accounts" }),
    story: L({ vi: "ShopViet tạo thêm 3 AWS account cho các đội mới. Mọi ALB tại mọi account phải có cùng bộ rule WAF.", en: "ShopViet creates 3 more AWS accounts for new teams. Every ALB in every account must have the same set of WAF rules." }),
    request: L({ vi: "Áp dụng web ACL chuẩn cho mọi account", en: "Apply the standard web ACL to every account" }),
    toggle: { label: L({ vi: "Sử dụng AWS Firewall Manager", en: "Use AWS Firewall Manager" }), initial: false },
    start: "sec",
    nodes: [
      { id: "sec", x: 100, y: 130, label: L({ vi: "Account bảo mật", en: "Security account" }), kind: "user" },
      { id: "fm", x: 340, y: 130, label: "Firewall Manager", sub: L({ vi: "trong Organizations", en: "in Organizations" }), kind: "svc" },
      { id: "a1", x: 640, y: 50, label: L({ vi: "Account Thanh toán", en: "Payments account" }), sub: "ALB + WAF", kind: "store" },
      { id: "a2", x: 640, y: 130, label: L({ vi: "Account Kho hàng", en: "Warehouse account" }), sub: "ALB + WAF", kind: "store" },
      { id: "a3", x: 640, y: 210, label: L({ vi: "Account mới tạo", en: "Newly created account" }), sub: "ALB + WAF", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["fm"]),
    run: (on) => on
      ? { hops: [
          { to: "fm", state: "change", tag: "POLICY", msg: L({ vi: "Định nghĩa một policy: mọi ALB phải có web ACL chuẩn của ShopViet.", en: "Define one policy: every ALB must have ShopViet's standard web ACL." }) },
          { to: "a1", state: "pass", tag: L({ vi: "ÁP DỤNG", en: "APPLIED" }), msg: L({ vi: "Áp dụng tự động.", en: "Applied automatically." }) },
          { from: "fm", to: "a2", state: "pass", tag: L({ vi: "ÁP DỤNG", en: "APPLIED" }), msg: L({ vi: "Áp dụng tự động.", en: "Applied automatically." }) },
          { from: "fm", to: "a3", state: "pass", tag: L({ vi: "ÁP DỤNG", en: "APPLIED" }), msg: L({ vi: "Account vừa tạo cũng được áp dụng ngay.", en: "The newly created account gets it right away too." }) },
        ], ok: true, result: L({ vi: "Firewall Manager quản lý tập trung AWS WAF, Shield Advanced, Security Group và network ACL, AWS Network Firewall, Route 53 Resolver DNS Firewall cho các account trong AWS Organizations.", en: "Firewall Manager centrally manages AWS WAF, Shield Advanced, security groups and network ACLs, AWS Network Firewall, and Route 53 Resolver DNS Firewall for the accounts in AWS Organizations." }) }
      : { hops: [
          { to: "a1", state: "change", tag: L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: L({ vi: "Cấu hình WAF tại từng account.", en: "Configure WAF in each account." }) },
          { from: "sec", to: "a2", state: "change", tag: L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: L({ vi: "Lặp lại tại account thứ hai.", en: "Repeat in the second account." }) },
          { from: "sec", to: "a3", state: "alert", tag: L({ vi: "BỎ SÓT", en: "MISSED" }), flash: "!", msg: L({ vi: "Account mới bị bỏ sót, ALB không có WAF.", en: "The new account is missed, and its ALB has no WAF." }) },
        ], ok: false, result: L({ vi: "Số lượng account càng lớn, nguy cơ bỏ sót càng cao. Sử dụng **AWS Firewall Manager**.", en: "The more accounts there are, the higher the risk of missing one. Use **AWS Firewall Manager**." }) },
  },
  {
    name: L({ vi: "Tập trung log bảo mật", en: "Centralizing security logs" }),
    story: L({ vi: "Đội bảo mật cần phân tích log từ mọi account và mọi nguồn tại một vị trí tập trung, với lượng mã nguồn tối thiểu.", en: "The security team needs to analyze logs from every account and every source in one central place, with minimal code." }),
    request: L({ vi: "Tập trung CloudTrail, VPC Flow Logs, DNS logs", en: "Centralize CloudTrail, VPC Flow Logs, DNS logs" }),
    toggle: { label: L({ vi: "Sử dụng Amazon Security Lake", en: "Use Amazon Security Lake" }), initial: false },
    start: "ct",
    nodes: [
      { id: "ct", x: 110, y: 50, label: "CloudTrail", kind: "log" },
      { id: "flow", x: 110, y: 130, label: "VPC Flow Logs", kind: "log" },
      { id: "dns", x: 110, y: 210, label: "Route 53 Resolver logs", kind: "log" },
      { id: "lake", x: 420, y: 130, label: "Amazon Security Lake", sub: L({ vi: "data lake trên S3", en: "data lake on S3" }), kind: "svc" },
      { id: "ops", x: 420, y: 130, label: L({ vi: "Script tự viết", en: "Custom scripts" }), sub: L({ vi: "mỗi account, mỗi nguồn", en: "per account, per source" }), kind: "bad" },
      { id: "ana", x: 690, y: 130, w: 120, label: L({ vi: "Công cụ phân tích", en: "Analytics tool" }), kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["lake"]),
    run: (on) => {
      const mid = on ? "lake" : "ops";
      return { hops: [
        { to: mid, state: on ? "pass" : "alert", tag: on ? L({ vi: "TỰ ĐỘNG", en: "AUTOMATIC" }) : L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: on ? L({ vi: "Security Lake tự động thu thập.", en: "Security Lake collects automatically." }) : L({ vi: "Phải viết và bảo trì script.", en: "Scripts must be written and maintained." }) },
        { from: "flow", to: mid, state: on ? "pass" : "alert", tag: on ? L({ vi: "TỰ ĐỘNG", en: "AUTOMATIC" }) : L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: on ? L({ vi: "Chuẩn hoá về một định dạng chung (OCSF).", en: "Normalized to one common format (OCSF)." }) : L({ vi: "Mỗi nguồn sử dụng một định dạng riêng.", en: "Each source uses its own format." }) },
        { from: "dns", to: mid, state: on ? "pass" : "alert", tag: on ? L({ vi: "TỰ ĐỘNG", en: "AUTOMATIC" }) : L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: on ? L({ vi: "Thu thập từ mọi account trong Organizations.", en: "Collects from every account in Organizations." }) : L({ vi: "Mỗi account mới phát sinh thêm tác vụ.", en: "Each new account adds more work." }) },
        { from: mid, to: "ana", state: on ? "pass" : "change", tag: on ? L({ vi: "SẴN SÀNG", en: "READY" }) : L({ vi: "CHẬM", en: "SLOW" }), msg: on ? L({ vi: "Truy vấn trực tiếp trên S3.", en: "Query directly on S3." }) : L({ vi: "Dữ liệu đến chậm và không đầy đủ.", en: "Data arrives late and incomplete." }) },
      ], ok: on, result: on
        ? L({ vi: "Security Lake tự động tập trung log và sự kiện bảo mật thành data lake trên S3 thuộc account của ShopViet.", en: "Security Lake automatically centralizes security logs and events into a data lake on S3 in ShopViet's account." })
        : L({ vi: "Tốn công sức và dễ thiếu dữ liệu. Sử dụng **Amazon Security Lake**.", en: "Laborious and prone to missing data. Use **Amazon Security Lake**." }) };
    },
  },
];
}

export default function IncidentSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Mô phỏng sự cố", en: "Simulate incident" })} height={250}
    label={L({ vi: "Sáu sự cố bảo mật của ShopViet và dịch vụ AWS phát hiện hoặc chặn từng sự cố", en: "Six ShopViet security incidents and the AWS service that detects or blocks each one" })} />;
}
