import HopSim, { type HopScenario } from "../security/HopSim";

// Things that go wrong with a ShopViet server and the EC2 feature that handles each:
// alarm recover / reboot, instance store vs EBS on stop, Hibernate, a single instance that
// keeps its Elastic IP through an Auto Scaling group, and detailed monitoring.
// Practice-test sources (build-time only): exam1_q43, exam5_q43, exam5_q52, exam6_q42,
// exam3_q38, exam3_q57, exam5_q19, exam5_q20, exam5_q31, exam6_q56, exam6_q11, exam2_q51.

const SCENARIOS: HopScenario[] = [
  {
    name: "Lỗi máy chủ vật lý",
    story: "Lúc 3 giờ sáng, phần cứng bên dưới instance **shop-api** gặp lỗi. Instance sử dụng EBS và có Elastic IP đã được đối tác đưa vào allow list. Simplified automatic recovery mặc định của instance này đã bị tắt.",
    request: "StatusCheckFailed_System = 1",
    toggle: { label: "CloudWatch alarm với action recover", initial: false },
    start: "h1",
    nodes: [
      { id: "h1", x: 100, y: 60, label: "Host vật lý A", sub: "lỗi", kind: "bad" },
      { id: "ec2", x: 380, y: 60, label: "shop-api", sub: "EBS, Elastic IP 13.2.x.x", kind: "app" },
      { id: "cw", x: 660, y: 60, label: "CloudWatch alarm", kind: "svc" },
      { id: "h2", x: 380, y: 200, label: "Host vật lý B", sub: "hoạt động", kind: "aws" },
      { id: "ops", x: 660, y: 200, label: "Kỹ sư trực", kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["h2"]),
    run: (on) => on
      ? { hops: [
          { to: "ec2", state: "alert", tag: "LỖI", flash: "✕", msg: "System status check thất bại." },
          { to: "cw", state: "alert", tag: "ALARM", msg: "Alarm chuyển sang trạng thái ALARM." },
          { to: "h2", state: "change", tag: "RECOVER", msg: "Action **recover** chuyển instance sang host hoạt động bình thường." },
          { to: "ec2", state: "pass", tag: "KHÔI PHỤC", packet: "pkt-back", msg: "Instance hoạt động trở lại sau vài phút." },
        ], ok: true, result: "Instance được khôi phục và **giữ nguyên** instance ID, địa chỉ IP (public, private, Elastic IP), metadata và EBS volume. Dữ liệu trong RAM bị mất. Simplified automatic recovery được bật mặc định trên instance được hỗ trợ; CloudWatch alarm action recover là cơ chế cấu hình thêm." }
      : { hops: [
          { to: "ec2", state: "alert", tag: "LỖI", flash: "✕", msg: "System status check thất bại." },
          { from: "ec2", to: "ops", state: "alert", tag: "CHỜ", msg: "Sự cố chỉ được xử lý khi người dùng báo lỗi." },
        ], ok: false, result: "Downtime kéo dài cho tới khi có người xử lý. Giải pháp: bật lại automatic recovery hoặc tạo CloudWatch alarm trên StatusCheckFailed_System với action recover." },
  },
  {
    name: "Ứng dụng không phản hồi, khắc phục bằng reboot",
    story: "Lỗi rò rỉ bộ nhớ khiến ứng dụng ngừng phản hồi vài ngày một lần; reboot khôi phục được hoạt động. Trong thời gian đội phát triển khắc phục lỗi, cần tự động hoá tạm thời.",
    request: "StatusCheckFailed_Instance = 1",
    toggle: { label: "CloudWatch alarm với action reboot", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 120, y: 130, label: "shop-web", sub: "ứng dụng không phản hồi", kind: "app" },
      { id: "cw", x: 420, y: 60, label: "CloudWatch alarm", kind: "svc" },
      { id: "ops", x: 420, y: 205, label: "Kỹ sư trực", kind: "user" },
      { id: "user", x: 690, y: 130, w: 110, label: "Người dùng", kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["cw"]),
    run: (on) => on
      ? { hops: [
          { to: "cw", state: "alert", tag: "ALARM", msg: "Instance status check thất bại." },
          { to: "ec2", state: "change", tag: "REBOOT", packet: "pkt-edge", msg: "Action **reboot** khởi động lại instance." },
          { to: "user", state: "pass", tag: "200", msg: "Website hoạt động trở lại sau một phút." },
        ], ok: true, result: "Alarm + reboot: không cần nhân sự trực trong thời gian chờ bản sửa lỗi." }
      : { hops: [
          { to: "user", state: "alert", tag: "LỖI", flash: "502", msg: "Người dùng nhận lỗi." },
          { from: "ec2", to: "ops", state: "alert", tag: "CHỜ", msg: "Cần nhân sự reboot thủ công." },
        ], ok: false, result: "Giải pháp: tạo CloudWatch alarm theo instance status check với action reboot." },
  },
  {
    name: "Stop instance để thay đổi instance type",
    story: "Máy chủ xử lý video cần cấu hình lớn hơn. Kỹ sư **stop** instance, thay đổi instance type rồi start lại. Tệp video đang xử lý dở nằm trên ổ đĩa của instance.",
    request: "aws ec2 stop-instances",
    toggle: { label: "File nằm trên EBS (tắt: instance store)", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 110, y: 130, label: "Máy chủ video", kind: "app" },
      { id: "ebs", x: 400, y: 130, label: "EBS volume", sub: "ổ mạng, bền vững", kind: "store" },
      { id: "is", x: 400, y: 130, label: "Instance store", sub: "ổ gắn với host", kind: "store" },
      { id: "new", x: 680, y: 130, w: 130, label: "Instance sau khi start", sub: "host khác", kind: "app" },
    ],
    hidden: (on) => (on ? ["is"] : ["ebs"]),
    run: (on) => on
      ? { hops: [
          { to: "ebs", state: "pass", tag: "GIỮ NGUYÊN", msg: "Volume được tách khỏi host cũ, dữ liệu được giữ nguyên." },
          { to: "new", state: "pass", tag: "GẮN LẠI", msg: "Volume được gắn vào instance trên host mới; quá trình xử lý tiếp tục." },
        ], ok: true, result: "Dữ liệu EBS được duy trì qua stop/start. Instance store đã bao gồm trong giá instance và phù hợp cho dữ liệu **tạm** (buffer, cache, scratch): sau khi xử lý, kết quả được đẩy lên S3." }
      : { hops: [
          { to: "is", state: "alert", tag: "MẤT DỮ LIỆU", flash: "✕", msg: "Khi stop, mọi block của instance store volume bị xoá bằng mã hoá (cryptographically erased)." },
          { to: "new", state: "alert", tag: "TRỐNG", msg: "Instance khởi động lại với ổ đĩa trống." },
        ], ok: false, result: "Instance store mất dữ liệu khi stop, hibernate hoặc terminate (giữ dữ liệu khi reboot) và không thể tách ra để gắn sang instance khác. Chỉ phù hợp cho tệp tạm hoặc dữ liệu đã có bản sao ở nơi khác." },
  },
  {
    name: "Dừng instance ban đêm, khởi động nhanh buổi sáng",
    story: "Máy chủ phân tích chỉ cần chạy trong giờ hành chính. Mỗi sáng, ứng dụng mất 10 phút để nạp dữ liệu vào RAM.",
    request: "Stop lúc 19:00, start lúc 8:00",
    toggle: { label: "Kích hoạt EC2 Hibernate", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 110, y: 130, label: "Máy chủ phân tích", sub: "RAM đã nạp dữ liệu", kind: "app" },
      { id: "root", x: 400, y: 130, label: "EBS root volume", sub: "mã hoá", kind: "store" },
      { id: "am", x: 680, y: 130, w: 120, label: "8:00 sáng", kind: "user" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "root", state: "change", tag: "LƯU RAM", msg: "Nội dung RAM được ghi xuống EBS root volume." },
          { to: "am", state: "pass", tag: "TIẾP TỤC", msg: "Khi start lại, RAM được nạp từ đĩa; ứng dụng tiếp tục hoạt động ngay." },
        ], ok: true, result: "**Hibernate**: dừng và khởi động lại instance mà không phải khởi động ứng dụng từ đầu. Khi instance ở trạng thái hibernated, không tính phí sử dụng instance; vẫn tính phí lưu trữ EBS (kể cả phần chứa nội dung RAM) và Elastic IP nếu có." }
      : { hops: [
          { to: "root", state: "skip", tag: "MẤT RAM", msg: "Stop thông thường: nội dung RAM bị xoá." },
          { to: "am", state: "alert", tag: "10 PHÚT", msg: "Mỗi buổi sáng phải chờ ứng dụng nạp lại dữ liệu." },
        ], ok: false, result: "Giải pháp: kích hoạt Hibernate (yêu cầu EBS root volume được mã hoá và đủ dung lượng chứa nội dung RAM)." },
  },
  {
    name: "Một instance duy nhất, IP cố định",
    story: "Một dịch vụ legacy chỉ chạy được trên **một** instance. Đối tác đã đưa IP của instance vào allow list. Khi instance lỗi, instance mới phải được tạo tự động với cùng IP.",
    request: "Instance ở AZ a bị terminate",
    toggle: { label: "ASG min = max = 1 trên 2 AZ + Elastic IP gắn bằng user data", initial: false },
    start: "old",
    boxes: [
      { x: 20, y: 28, w: 300, h: 200, label: "AZ a" },
      { x: 360, y: 28, w: 300, h: 200, label: "AZ b" },
    ],
    nodes: [
      { id: "old", x: 170, y: 90, label: "Instance cũ", sub: "lỗi", kind: "bad" },
      { id: "asg", x: 170, y: 180, label: "Auto Scaling group", sub: "min 1, max 1", kind: "svc" },
      { id: "new", x: 510, y: 90, label: "Instance mới", sub: "user data + instance role", kind: "app" },
      { id: "eip", x: 740, y: 90, w: 110, label: "Elastic IP", sub: "13.2.x.x", kind: "key" },
      { id: "ptn", x: 740, y: 190, w: 110, label: "Đối tác", kind: "user" },
    ],
    hidden: (on) => (on ? [] : ["asg", "new"]),
    run: (on) => on
      ? { hops: [
          { to: "asg", state: "alert", tag: "THIẾU 1", msg: "ASG phát hiện số instance giảm xuống 0." },
          { to: "new", state: "pass", tag: "LAUNCH", msg: "Launch instance mới tại AZ còn hoạt động." },
          { to: "eip", state: "change", tag: "GẮN IP", msg: "User data gọi `AssociateAddress`; instance role cho phép gọi API này." },
          { from: "ptn", to: "eip", state: "pass", tag: "TRUY CẬP", msg: "Đối tác tiếp tục kết nối tới IP cũ." },
        ], ok: true, result: "ASG thay thế instance lỗi; user data tự động gắn lại Elastic IP. Không cần can thiệp thủ công." }
      : { hops: [
          { from: "ptn", to: "eip", state: "alert", tag: "MẤT KẾT NỐI", msg: "Elastic IP không còn gắn với instance nào." },
        ], ok: false, result: "Không có cơ chế tự động thay thế instance. Giải pháp: ASG min = max = 1 trên 2 AZ, kết hợp user data gắn lại Elastic IP." },
  },
  {
    name: "Yêu cầu metric chu kỳ 1 phút",
    story: "Trong đợt khuyến mãi, ShopViet cần theo dõi CPU với độ chi tiết **1 phút** để scale kịp thời, không cần phát triển agent.",
    request: "Gửi metric CPUUtilization",
    toggle: { label: "Kích hoạt detailed monitoring", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 130, y: 130, label: "shop-web", kind: "app" },
      { id: "cw", x: 450, y: 130, label: "CloudWatch", kind: "svc" },
      { id: "dash", x: 700, y: 130, w: 120, label: "Dashboard", kind: "user" },
    ],
    run: (on) => ({ hops: [
      { to: "cw", state: on ? "pass" : "skip", times: on ? 5 : 1, tag: on ? "MỖI 1 PHÚT" : "MỖI 5 PHÚT", msg: on ? "5 điểm dữ liệu trong 5 phút." : "1 điểm dữ liệu trong 5 phút." },
      { to: "dash", state: on ? "pass" : "alert", tag: on ? "KỊP THỜI" : "CHẬM", msg: on ? "Phát hiện CPU tăng ngay lập tức." : "Đỉnh tải có thể không được ghi nhận." },
    ], ok: on, result: on
      ? "Detailed monitoring cung cấp metric theo chu kỳ 1 phút; chỉ cần kích hoạt (có tính phí), không cần cài đặt agent."
      : "Basic monitoring (mặc định, miễn phí): metric như CPUUtilization theo chu kỳ 5 phút, riêng status check theo chu kỳ 1 phút. Kích hoạt detailed monitoring để có metric chu kỳ 1 phút." }),
  },
];

export default function Ec2OpsSim() {
  return <HopSim scenarios={SCENARIOS} action="Mô phỏng sự cố" height={250}
    label="Các sự cố của instance ShopViet và tính năng EC2 xử lý từng sự cố" />;
}
