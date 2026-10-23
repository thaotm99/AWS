import HopSim, { type HopScenario } from "../security/HopSim";
import { useLang } from "../../../lib/lang";

// Things that go wrong with a MFTech server and the EC2 feature that handles each:
// alarm recover / reboot, instance store vs EBS on stop, Hibernate, a single instance that
// keeps its Elastic IP through an Auto Scaling group, and detailed monitoring.
// Practice-test sources (build-time only): exam1_q43, exam5_q43, exam5_q52, exam6_q42,
// exam3_q38, exam3_q57, exam5_q19, exam5_q20, exam5_q31, exam6_q56, exam6_q11, exam2_q51.

type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): HopScenario[] => [
  {
    name: L({ vi: "Lỗi phần cứng của host vật lý", en: "Physical host hardware failure" }),
    story: L({ vi: "Lúc 3 giờ sáng, phần cứng bên dưới instance **shop-api** gặp lỗi. Instance sử dụng EBS và có Elastic IP đã được đối tác đưa vào allow list. Simplified automatic recovery mặc định của instance này đã bị tắt.",
      en: "At 3 a.m., the hardware under the **shop-api** instance fails. The instance uses EBS and has an Elastic IP that a partner has added to its allow list. This instance's default simplified automatic recovery has been turned off." }),
    request: "StatusCheckFailed_System = 1",
    toggle: { label: L({ vi: "CloudWatch alarm với action recover", en: "CloudWatch alarm with recover action" }), initial: false },
    start: "h1",
    nodes: [
      { id: "h1", x: 100, y: 60, label: L({ vi: "Host vật lý A", en: "Physical host A" }), sub: L({ vi: "lỗi", en: "failed" }), kind: "bad" },
      { id: "ec2", x: 380, y: 60, label: "shop-api", sub: "EBS, Elastic IP 13.2.x.x", kind: "app" },
      { id: "cw", x: 660, y: 60, label: "CloudWatch alarm", kind: "svc" },
      { id: "h2", x: 380, y: 200, label: L({ vi: "Host vật lý B", en: "Physical host B" }), sub: L({ vi: "hoạt động", en: "healthy" }), kind: "aws" },
      { id: "ops", x: 660, y: 200, label: L({ vi: "Kỹ sư trực", en: "On-call engineer" }), kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["h2"]),
    run: (on) => on
      ? { hops: [
          { to: "ec2", state: "alert", tag: L({ vi: "LỖI", en: "FAILED" }), flash: "✕", msg: L({ vi: "System status check thất bại.", en: "The system status check fails." }) },
          { to: "cw", state: "alert", tag: "ALARM", msg: L({ vi: "Alarm chuyển sang trạng thái ALARM.", en: "The alarm goes into the ALARM state." }) },
          { to: "h2", state: "change", tag: "RECOVER", msg: L({ vi: "Action **recover** chuyển instance sang host hoạt động bình thường.", en: "The **recover** action moves the instance to a healthy host." }) },
          { to: "ec2", state: "pass", tag: L({ vi: "KHÔI PHỤC", en: "RECOVERED" }), packet: "pkt-back", msg: L({ vi: "Instance hoạt động trở lại sau vài phút.", en: "The instance is back up after a few minutes." }) },
        ], ok: true, result: L({ vi: "Instance được khôi phục và **giữ nguyên** instance ID, địa chỉ IP (public, private, Elastic IP), metadata và EBS volume. Dữ liệu trong RAM bị mất. Simplified automatic recovery được bật mặc định trên instance được hỗ trợ; CloudWatch alarm action recover là cơ chế cấu hình thêm. Recovery chỉ áp dụng cho instance đang gặp lỗi system status check; instance đã **terminate** thì không thể recover.",
          en: "The instance is recovered and **keeps** its instance ID, IP addresses (public, private, Elastic IP), metadata and EBS volumes. Data in RAM is lost. Simplified automatic recovery is on by default for supported instances; the CloudWatch recover alarm action is an additional mechanism you configure. Recovery applies to an instance with a failed system status check; a **terminated** instance cannot be recovered." }) }
      : { hops: [
          { to: "ec2", state: "alert", tag: L({ vi: "LỖI", en: "FAILED" }), flash: "✕", msg: L({ vi: "System status check thất bại.", en: "The system status check fails." }) },
          { from: "ec2", to: "ops", state: "alert", tag: L({ vi: "CHỜ", en: "WAITING" }), msg: L({ vi: "Sự cố chỉ được xử lý khi người dùng báo lỗi.", en: "The failure is handled only once users report it." }) },
        ], ok: false, result: L({ vi: "Downtime kéo dài cho tới khi có người xử lý. Giải pháp: bật lại automatic recovery hoặc tạo CloudWatch alarm trên StatusCheckFailed_System với action recover.",
          en: "Downtime lasts until someone steps in. Solution: turn automatic recovery back on, or create a CloudWatch alarm on StatusCheckFailed_System with the recover action." }) },
  },
  {
    name: L({ vi: "Ứng dụng không phản hồi, khắc phục bằng reboot", en: "Unresponsive app, fixed by reboot" }),
    story: L({ vi: "Lỗi rò rỉ bộ nhớ khiến ứng dụng ngừng phản hồi vài ngày một lần; reboot khôi phục được hoạt động. Trong thời gian đội phát triển khắc phục lỗi, cần tự động hoá tạm thời.",
      en: "A memory leak makes the application stop responding every few days; a reboot restores it. While the development team fixes the bug, a temporary automation is needed." }),
    request: "StatusCheckFailed_Instance = 1",
    toggle: { label: L({ vi: "CloudWatch alarm với action reboot", en: "CloudWatch alarm with reboot action" }), initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 120, y: 130, label: "shop-web", sub: L({ vi: "ứng dụng không phản hồi", en: "app not responding" }), kind: "app" },
      { id: "cw", x: 420, y: 60, label: "CloudWatch alarm", kind: "svc" },
      { id: "ops", x: 420, y: 205, label: L({ vi: "Kỹ sư trực", en: "On-call engineer" }), kind: "user" },
      { id: "user", x: 690, y: 130, w: 110, label: L({ vi: "Người dùng", en: "Users" }), kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["cw"]),
    run: (on) => on
      ? { hops: [
          { to: "cw", state: "alert", tag: "ALARM", msg: L({ vi: "Instance status check thất bại.", en: "The instance status check fails." }) },
          { to: "ec2", state: "change", tag: "REBOOT", packet: "pkt-edge", msg: L({ vi: "Action **reboot** khởi động lại instance.", en: "The **reboot** action restarts the instance." }) },
          { to: "user", state: "pass", tag: "200", msg: L({ vi: "Website hoạt động trở lại sau một phút.", en: "The website is back up after a minute." }) },
        ], ok: true, result: L({ vi: "Alarm + reboot: không cần nhân sự trực trong thời gian chờ bản sửa lỗi.", en: "Alarm + reboot: no one needs to be on call while waiting for the fix." }) }
      : { hops: [
          { to: "user", state: "alert", tag: L({ vi: "LỖI", en: "ERROR" }), flash: "502", msg: L({ vi: "Người dùng nhận lỗi.", en: "Users get errors." }) },
          { from: "ec2", to: "ops", state: "alert", tag: L({ vi: "CHỜ", en: "WAITING" }), msg: L({ vi: "Cần nhân sự reboot thủ công.", en: "Someone has to reboot it manually." }) },
        ], ok: false, result: L({ vi: "Giải pháp: tạo CloudWatch alarm theo instance status check với action reboot.", en: "Solution: create a CloudWatch alarm on the instance status check with the reboot action." }) },
  },
  {
    name: L({ vi: "Stop instance để thay đổi instance type", en: "Stop an instance to change its type" }),
    story: L({ vi: "EC2 instance xử lý video cần instance type lớn hơn. Kỹ sư **stop** instance, thay đổi instance type rồi start lại. Tệp video đang xử lý dở nằm trên một volume gắn với instance.",
      en: "The video processing EC2 instance needs a larger instance type. An engineer **stops** the instance, changes the instance type and starts it again. The partly processed video files are on a volume attached to the instance." }),
    request: "aws ec2 stop-instances",
    toggle: { label: L({ vi: "File nằm trên EBS (tắt: instance store)", en: "Files on EBS (off: instance store)" }), initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 110, y: 130, label: L({ vi: "Instance xử lý video", en: "Video instance" }), kind: "app" },
      { id: "ebs", x: 400, y: 130, label: "EBS volume", sub: L({ vi: "gắn qua mạng, bền vững", en: "network-attached, durable" }), kind: "store" },
      { id: "is", x: 400, y: 130, label: "Instance store", sub: L({ vi: "ổ gắn với host", en: "disk tied to the host" }), kind: "store" },
      { id: "new", x: 680, y: 130, w: 130, label: L({ vi: "Instance sau khi start", en: "Instance after start" }), sub: L({ vi: "host khác", en: "different host" }), kind: "app" },
    ],
    hidden: (on) => (on ? ["is"] : ["ebs"]),
    run: (on) => on
      ? { hops: [
          { to: "ebs", state: "pass", tag: L({ vi: "GIỮ NGUYÊN", en: "PRESERVED" }), msg: L({ vi: "Volume được tách khỏi host cũ, dữ liệu được giữ nguyên.", en: "The volume is detached from the old host; the data is preserved." }) },
          { to: "new", state: "pass", tag: L({ vi: "GẮN LẠI", en: "REATTACHED" }), msg: L({ vi: "Volume được gắn vào instance trên host mới; quá trình xử lý tiếp tục.", en: "The volume is attached to the instance on the new host; processing continues." }) },
        ], ok: true, result: L({ vi: "Dữ liệu EBS được duy trì qua stop/start. Instance store đã bao gồm trong giá instance và phù hợp cho dữ liệu **tạm** (buffer, cache, scratch): sau khi xử lý, kết quả được đẩy lên S3.",
          en: "EBS data persists through stop/start. Instance store is included in the instance price and suits **temporary** data (buffers, caches, scratch): after processing, results are pushed to S3." }) }
      : { hops: [
          { to: "is", state: "alert", tag: L({ vi: "MẤT DỮ LIỆU", en: "DATA LOST" }), flash: "✕", msg: L({ vi: "Khi stop, mọi block của instance store volume bị xoá bằng mã hoá (cryptographically erased).", en: "On stop, every block of the instance store volume is cryptographically erased." }) },
          { to: "new", state: "alert", tag: L({ vi: "TRỐNG", en: "EMPTY" }), msg: L({ vi: "Instance khởi động lại với instance store volume trống.", en: "The instance starts again with an empty instance store volume." }) },
        ], ok: false, result: L({ vi: "Instance store mất dữ liệu khi stop, hibernate hoặc terminate (giữ dữ liệu khi reboot) và không thể tách ra để gắn sang instance khác. Chỉ phù hợp cho tệp tạm hoặc dữ liệu đã có bản sao ở nơi khác.",
          en: "Instance store loses data on stop, hibernate or terminate (data survives a reboot) and cannot be detached and attached to another instance. It suits only temporary files or data that has a copy elsewhere." }) },
  },
  {
    name: L({ vi: "Dừng instance ban đêm, khởi động nhanh buổi sáng", en: "Stop at night, start fast in the morning" }),
    story: L({ vi: "EC2 instance phân tích chỉ cần chạy trong giờ hành chính. Mỗi sáng, ứng dụng mất 10 phút để nạp dữ liệu vào RAM.",
      en: "The analytics EC2 instance only needs to run during business hours. Every morning, the application takes 10 minutes to load data into RAM." }),
    request: L({ vi: "Stop lúc 19:00, start lúc 8:00", en: "Stop at 19:00, start at 8:00" }),
    toggle: { label: L({ vi: "Kích hoạt EC2 Hibernate", en: "Enable EC2 Hibernate" }), initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 110, y: 130, label: L({ vi: "Instance phân tích", en: "Analytics instance" }), sub: L({ vi: "RAM đã nạp dữ liệu", en: "data loaded in RAM" }), kind: "app" },
      { id: "root", x: 400, y: 130, label: "EBS root volume", sub: L({ vi: "mã hoá", en: "encrypted" }), kind: "store" },
      { id: "am", x: 680, y: 130, w: 120, label: L({ vi: "8:00 sáng", en: "8:00 a.m." }), kind: "user" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "root", state: "change", tag: L({ vi: "LƯU RAM", en: "SAVE RAM" }), msg: L({ vi: "Nội dung RAM được ghi xuống EBS root volume.", en: "The RAM contents are written to the EBS root volume." }) },
          { to: "am", state: "pass", tag: L({ vi: "TIẾP TỤC", en: "RESUMED" }), msg: L({ vi: "Khi start lại, RAM được nạp lại từ EBS root volume; ứng dụng tiếp tục hoạt động ngay.", en: "On start, RAM is restored from the EBS root volume; the application resumes immediately." }) },
        ], ok: true, result: L({ vi: "**Hibernate**: dừng và khởi động lại instance mà không phải khởi động ứng dụng từ đầu. Khi instance ở trạng thái hibernated, không tính phí sử dụng instance; vẫn tính phí lưu trữ EBS (kể cả phần chứa nội dung RAM) và Elastic IP nếu có.",
          en: "**Hibernate**: stop and restart the instance without starting the application from scratch. While the instance is hibernated, you are not charged for instance usage; you are still charged for EBS storage (including the RAM contents) and for any Elastic IP." }) }
      : { hops: [
          { to: "root", state: "skip", tag: L({ vi: "MẤT RAM", en: "RAM LOST" }), msg: L({ vi: "Stop thông thường: nội dung RAM bị xoá.", en: "Normal stop: the RAM contents are cleared." }) },
          { to: "am", state: "alert", tag: L({ vi: "10 PHÚT", en: "10 MINUTES" }), msg: L({ vi: "Mỗi buổi sáng phải chờ ứng dụng nạp lại dữ liệu.", en: "Every morning you wait for the application to reload its data." }) },
        ], ok: false, result: L({ vi: "Giải pháp: kích hoạt Hibernate (yêu cầu EBS root volume được mã hoá và đủ dung lượng chứa nội dung RAM).",
          en: "Solution: enable Hibernate (requires an encrypted EBS root volume large enough to hold the RAM contents)." }) },
  },
  {
    name: L({ vi: "Một instance duy nhất, IP cố định", en: "A single instance with a fixed IP" }),
    story: L({ vi: "Một dịch vụ legacy chỉ chạy được trên **một** instance. Đối tác đã đưa IP của instance vào allow list. Khi instance lỗi, instance mới phải được tạo tự động với cùng IP.",
      en: "A legacy service can run on only **one** instance. A partner has added the instance's IP to its allow list. When the instance fails, a new instance must be created automatically with the same IP." }),
    request: L({ vi: "Instance ở AZ a bị terminate", en: "Instance in AZ a is terminated" }),
    toggle: { label: L({ vi: "Auto Scaling group min = max = 1 trên 2 AZ + Elastic IP gắn bằng user data", en: "Auto Scaling group min = max = 1 across 2 AZs + Elastic IP attached by user data" }), initial: false },
    start: "old",
    boxes: [
      { x: 20, y: 28, w: 300, h: 200, label: "AZ a" },
      { x: 360, y: 28, w: 300, h: 200, label: "AZ b" },
    ],
    nodes: [
      { id: "old", x: 170, y: 90, label: L({ vi: "Instance cũ", en: "Old instance" }), sub: L({ vi: "lỗi", en: "failed" }), kind: "bad" },
      { id: "asg", x: 170, y: 180, label: "Auto Scaling group", sub: "min 1, max 1", kind: "svc" },
      { id: "new", x: 510, y: 90, label: L({ vi: "Instance mới", en: "New instance" }), sub: L({ vi: "user data + instance role", en: "user data + instance role" }), kind: "app" },
      { id: "eip", x: 740, y: 90, w: 110, label: "Elastic IP", sub: "13.2.x.x", kind: "key" },
      { id: "ptn", x: 740, y: 190, w: 110, label: L({ vi: "Đối tác", en: "Partner" }), kind: "user" },
    ],
    hidden: (on) => (on ? [] : ["asg", "new"]),
    run: (on) => on
      ? { hops: [
          { to: "asg", state: "alert", tag: L({ vi: "THIẾU 1", en: "1 MISSING" }), msg: L({ vi: "Auto Scaling group phát hiện số instance giảm xuống 0.", en: "The Auto Scaling group detects that the instance count has dropped to 0." }) },
          { to: "new", state: "pass", tag: "LAUNCH", msg: L({ vi: "Launch instance mới tại AZ còn hoạt động.", en: "Launches a new instance in the AZ that is still healthy." }) },
          { to: "eip", state: "change", tag: L({ vi: "GẮN IP", en: "ATTACH IP" }), msg: L({ vi: "User data gọi `AssociateAddress`; instance role cho phép gọi API này.", en: "User data calls `AssociateAddress`; the instance role allows this API call." }) },
          { from: "ptn", to: "eip", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Đối tác tiếp tục kết nối tới IP cũ.", en: "The partner keeps connecting to the same IP." }) },
        ], ok: true, result: L({ vi: "Auto Scaling group thay thế instance lỗi; user data tự động gắn lại Elastic IP. Không cần can thiệp thủ công.",
          en: "The Auto Scaling group replaces the failed instance; user data reattaches the Elastic IP automatically. No manual intervention is needed." }) }
      : { hops: [
          { from: "ptn", to: "eip", state: "alert", tag: L({ vi: "MẤT KẾT NỐI", en: "DISCONNECTED" }), msg: L({ vi: "Elastic IP không còn gắn với instance nào.", en: "The Elastic IP is no longer attached to any instance." }) },
        ], ok: false, result: L({ vi: "Không có cơ chế tự động thay thế instance. Giải pháp: Auto Scaling group min = max = 1 trên 2 AZ, kết hợp user data gắn lại Elastic IP.",
          en: "There is no mechanism to replace the instance automatically. Solution: an Auto Scaling group with min = max = 1 across 2 AZs, with user data that reattaches the Elastic IP." }) },
  },
  {
    name: L({ vi: "Yêu cầu metric chu kỳ 1 phút", en: "1-minute metrics required" }),
    story: L({ vi: "Trong đợt khuyến mãi, MFTech cần theo dõi CPU với độ chi tiết **1 phút** để scale kịp thời, không cần phát triển agent.",
      en: "During a sale, MFTech needs to monitor CPU at **1-minute** granularity to scale in time, without developing an agent." }),
    request: L({ vi: "Gửi metric CPUUtilization", en: "Send CPUUtilization metric" }),
    toggle: { label: L({ vi: "Kích hoạt detailed monitoring", en: "Enable detailed monitoring" }), initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 130, y: 130, label: "shop-web", kind: "app" },
      { id: "cw", x: 450, y: 130, label: "CloudWatch", kind: "svc" },
      { id: "dash", x: 700, y: 130, w: 120, label: "Dashboard", kind: "user" },
    ],
    run: (on) => ({ hops: [
      { to: "cw", state: on ? "pass" : "skip", times: on ? 5 : 1, tag: on ? L({ vi: "MỖI 1 PHÚT", en: "EVERY 1 MIN" }) : L({ vi: "MỖI 5 PHÚT", en: "EVERY 5 MIN" }), msg: on ? L({ vi: "5 điểm dữ liệu trong 5 phút.", en: "5 data points in 5 minutes." }) : L({ vi: "1 điểm dữ liệu trong 5 phút.", en: "1 data point in 5 minutes." }) },
      { to: "dash", state: on ? "pass" : "alert", tag: on ? L({ vi: "KỊP THỜI", en: "TIMELY" }) : L({ vi: "CHẬM", en: "DELAYED" }), msg: on ? L({ vi: "Phát hiện CPU tăng ngay lập tức.", en: "CPU spikes are detected immediately." }) : L({ vi: "Đỉnh tải có thể không được ghi nhận.", en: "Load peaks may go unrecorded." }) },
    ], ok: on, result: on
      ? L({ vi: "Detailed monitoring cung cấp metric theo chu kỳ 1 phút; chỉ cần kích hoạt (có tính phí), không cần cài đặt agent.",
        en: "Detailed monitoring provides metrics at a 1-minute period; you only need to enable it (for a charge), with no agent to install." })
      : L({ vi: "Basic monitoring (mặc định, miễn phí): metric như CPUUtilization theo chu kỳ 5 phút, riêng status check theo chu kỳ 1 phút. Kích hoạt detailed monitoring để có metric chu kỳ 1 phút.",
        en: "Basic monitoring (default, free): metrics such as CPUUtilization at a 5-minute period, except status checks at a 1-minute period. Enable detailed monitoring to get 1-minute metrics." }) }),
  },
];

export default function Ec2OpsSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Mô phỏng sự cố", en: "Simulate failure" })} height={250}
    label={L({ vi: "Các sự cố của instance MFTech và tính năng EC2 xử lý từng sự cố", en: "MFTech instance failures and the EC2 feature that handles each one" })} />;
}
