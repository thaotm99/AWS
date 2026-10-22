import HopSim, { type HopScenario } from "../security/HopSim";

// Things that go wrong with a ShopViet server and the EC2 feature that handles each:
// alarm recover / reboot, instance store vs EBS on stop, Hibernate, a single instance that
// keeps its Elastic IP through an Auto Scaling group, and detailed monitoring.
// Practice-test sources (build-time only): exam1_q43, exam5_q43, exam5_q52, exam6_q42,
// exam3_q38, exam3_q57, exam5_q19, exam5_q20, exam5_q31, exam6_q56, exam6_q11, exam2_q51.

const SCENARIOS: HopScenario[] = [
  {
    name: "Máy chủ vật lý hỏng",
    story: "3 giờ sáng, phần cứng dưới server **shop-api** hỏng. Server dùng EBS và có Elastic IP mà đối tác đã whitelist.",
    request: "StatusCheckFailed_System = 1",
    toggle: { label: "CloudWatch alarm với action recover", initial: false },
    start: "h1",
    nodes: [
      { id: "h1", x: 100, y: 60, label: "Host vật lý A", sub: "hỏng", kind: "bad" },
      { id: "ec2", x: 380, y: 60, label: "shop-api", sub: "EBS, Elastic IP 13.2.x.x", kind: "app" },
      { id: "cw", x: 660, y: 60, label: "CloudWatch alarm", kind: "svc" },
      { id: "h2", x: 380, y: 200, label: "Host vật lý B", sub: "khoẻ", kind: "aws" },
      { id: "ops", x: 660, y: 200, label: "Kỹ sư trực", kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["h2"]),
    run: (on) => on
      ? { hops: [
          { to: "ec2", state: "alert", tag: "HỎNG", flash: "✕", msg: "System status check thất bại." },
          { to: "cw", state: "alert", tag: "ALARM", msg: "Alarm chuyển sang trạng thái ALARM." },
          { to: "h2", state: "change", tag: "RECOVER", msg: "Action **recover** chuyển instance sang host khoẻ." },
          { to: "ec2", state: "pass", tag: "CHẠY LẠI", packet: "pkt-back", msg: "Vài phút sau server chạy lại." },
        ], ok: true, result: "Instance được phục hồi **giữ nguyên** instance ID, private IP, Elastic IP và metadata. Chỉ áp dụng cho instance dùng EBS." }
      : { hops: [
          { to: "ec2", state: "alert", tag: "HỎNG", flash: "✕", msg: "System status check thất bại." },
          { from: "ec2", to: "ops", state: "alert", tag: "CHỜ", msg: "Chỉ khi khách phàn nàn mới có người dậy xử lý." },
        ], ok: false, result: "Downtime kéo dài cả giờ. Tạo CloudWatch alarm trên StatusCheckFailed_System với action recover." },
  },
  {
    name: "App treo, khởi động lại là chạy",
    story: "Một lỗi rò bộ nhớ làm app treo vài ngày một lần. Reboot là chạy lại. Đội dev đang sửa, cần tạm thời tự động hoá.",
    request: "StatusCheckFailed_Instance = 1",
    toggle: { label: "CloudWatch alarm với action reboot", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 120, y: 130, label: "shop-web", sub: "app treo", kind: "app" },
      { id: "cw", x: 420, y: 60, label: "CloudWatch alarm", kind: "svc" },
      { id: "ops", x: 420, y: 205, label: "Kỹ sư trực", kind: "user" },
      { id: "user", x: 690, y: 130, w: 110, label: "Khách", kind: "user" },
    ],
    hidden: (on) => (on ? ["ops"] : ["cw"]),
    run: (on) => on
      ? { hops: [
          { to: "cw", state: "alert", tag: "ALARM", msg: "Instance status check thất bại." },
          { to: "ec2", state: "change", tag: "REBOOT", packet: "pkt-edge", msg: "Action **reboot** khởi động lại instance." },
          { to: "user", state: "pass", tag: "200", msg: "Web chạy lại sau một phút." },
        ], ok: true, result: "Alarm + reboot: không cần người trực trong lúc chờ bản sửa." }
      : { hops: [
          { to: "user", state: "alert", tag: "LỖI", flash: "502", msg: "Khách thấy lỗi." },
          { from: "ec2", to: "ops", state: "alert", tag: "CHỜ", msg: "Phải có người reboot tay." },
        ], ok: false, result: "Bật CloudWatch alarm theo instance status check với action reboot." },
  },
  {
    name: "Stop server để đổi instance type",
    story: "Server xử lý video cần lớn hơn. Kỹ sư **stop** nó, đổi instance type rồi start lại. File video đang dở nằm trên ổ của server.",
    request: "aws ec2 stop-instances",
    toggle: { label: "File nằm trên EBS (tắt: instance store)", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 110, y: 130, label: "Server video", kind: "app" },
      { id: "ebs", x: 400, y: 130, label: "EBS volume", sub: "ổ mạng, bền", kind: "store" },
      { id: "is", x: 400, y: 130, label: "Instance store", sub: "ổ gắn liền host", kind: "store" },
      { id: "new", x: 680, y: 130, w: 130, label: "Server sau khi start", sub: "host khác", kind: "app" },
    ],
    hidden: (on) => (on ? ["is"] : ["ebs"]),
    run: (on) => on
      ? { hops: [
          { to: "ebs", state: "pass", tag: "GIỮ", msg: "Volume tách khỏi host cũ, dữ liệu còn nguyên." },
          { to: "new", state: "pass", tag: "GẮN LẠI", msg: "Gắn vào instance trên host mới, làm tiếp." },
        ], ok: true, result: "EBS bền qua stop/start. Instance store thì nhanh nhất và đã tính trong giá, hợp cho file **tạm**: xử lý xong đẩy kết quả lên S3." }
      : { hops: [
          { to: "is", state: "alert", tag: "MẤT", flash: "✕", msg: "Stop là instance store bị xoá sạch." },
          { to: "new", state: "alert", tag: "TRỐNG", msg: "Server mới khởi động với ổ trống." },
        ], ok: false, result: "Instance store mất dữ liệu khi stop hoặc terminate, không tháo ra gắn sang instance khác được, không nằm trong AMI. Chỉ để file tạm hoặc dữ liệu đã có bản sao ở nơi khác." },
  },
  {
    name: "Tắt server ban đêm, sáng mở nhanh",
    story: "Server phân tích chỉ cần chạy giờ hành chính. Mỗi sáng app mất 10 phút để nạp dữ liệu vào RAM.",
    request: "Stop lúc 19:00, start lúc 8:00",
    toggle: { label: "Bật EC2 Hibernate", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 110, y: 130, label: "Server phân tích", sub: "RAM đã nạp dữ liệu", kind: "app" },
      { id: "root", x: 400, y: 130, label: "EBS root volume", sub: "mã hoá", kind: "store" },
      { id: "am", x: 680, y: 130, w: 120, label: "8:00 sáng", kind: "user" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "root", state: "change", tag: "LƯU RAM", msg: "Nội dung RAM được ghi xuống EBS root volume." },
          { to: "am", state: "pass", tag: "TIẾP TỤC", msg: "Start lại: nạp RAM từ đĩa, app chạy tiếp ngay." },
        ], ok: true, result: "**Hibernate**: tắt rồi bật lại mà không phải khởi động app từ đầu. Chỉ trả tiền EBS khi máy tắt." }
      : { hops: [
          { to: "root", state: "skip", tag: "MẤT RAM", msg: "Stop thường: RAM bị xoá." },
          { to: "am", state: "alert", tag: "10 PHÚT", msg: "Sáng nào cũng chờ app nạp lại dữ liệu." },
        ], ok: false, result: "Bật Hibernate (cần EBS root volume được mã hoá và đủ chỗ chứa RAM)." },
  },
  {
    name: "Một server duy nhất, IP không đổi",
    story: "Một dịch vụ cũ chỉ chạy được **một** instance. Đối tác whitelist IP của nó. Server hỏng thì phải tự có server mới, cùng IP.",
    request: "Instance ở AZ a bị terminate",
    toggle: { label: "ASG min = max = 1 trên 2 AZ + Elastic IP gắn bằng user data", initial: false },
    start: "old",
    boxes: [
      { x: 20, y: 28, w: 300, h: 200, label: "AZ a" },
      { x: 360, y: 28, w: 300, h: 200, label: "AZ b" },
    ],
    nodes: [
      { id: "old", x: 170, y: 90, label: "Instance cũ", sub: "hỏng", kind: "bad" },
      { id: "asg", x: 170, y: 180, label: "Auto Scaling group", sub: "min 1, max 1", kind: "svc" },
      { id: "new", x: 510, y: 90, label: "Instance mới", sub: "user data + instance role", kind: "app" },
      { id: "eip", x: 740, y: 90, w: 110, label: "Elastic IP", sub: "13.2.x.x", kind: "key" },
      { id: "ptn", x: 740, y: 190, w: 110, label: "Đối tác", kind: "user" },
    ],
    hidden: (on) => (on ? [] : ["asg", "new"]),
    run: (on) => on
      ? { hops: [
          { to: "asg", state: "alert", tag: "THIẾU 1", msg: "ASG thấy số instance tụt xuống 0." },
          { to: "new", state: "pass", tag: "LAUNCH", msg: "Launch instance mới ở AZ còn khoẻ." },
          { to: "eip", state: "change", tag: "GẮN IP", msg: "User data gọi `AssociateAddress`; instance role cho phép gọi API này." },
          { from: "ptn", to: "eip", state: "pass", tag: "VÀO", msg: "Đối tác vẫn gọi đúng IP cũ." },
        ], ok: true, result: "ASG thay instance hỏng, user data tự gắn lại Elastic IP. Không cần người can thiệp." }
      : { hops: [
          { from: "ptn", to: "eip", state: "alert", tag: "MẤT KẾT NỐI", msg: "Elastic IP không còn gắn với instance nào." },
        ], ok: false, result: "Không có gì tự thay server. Dùng ASG min = max = 1 trải 2 AZ, và user data gắn lại Elastic IP." },
  },
  {
    name: "Cần metric từng phút",
    story: "Đợt sale, ShopViet muốn thấy CPU thay đổi **từng phút** để scale kịp, không phải viết agent.",
    request: "Gửi metric CPUUtilization",
    toggle: { label: "Bật detailed monitoring", initial: false },
    start: "ec2",
    nodes: [
      { id: "ec2", x: 130, y: 130, label: "shop-web", kind: "app" },
      { id: "cw", x: 450, y: 130, label: "CloudWatch", kind: "svc" },
      { id: "dash", x: 700, y: 130, w: 120, label: "Dashboard", kind: "user" },
    ],
    run: (on) => ({ hops: [
      { to: "cw", state: on ? "pass" : "skip", times: on ? 5 : 1, tag: on ? "MỖI 1 PHÚT" : "MỖI 5 PHÚT", msg: on ? "5 điểm dữ liệu trong 5 phút." : "1 điểm dữ liệu trong 5 phút." },
      { to: "dash", state: on ? "pass" : "alert", tag: on ? "KỊP" : "CHẬM", msg: on ? "Thấy CPU tăng ngay." : "Đỉnh tải có thể bị bỏ lỡ." },
    ], ok: on, result: on
      ? "Detailed monitoring gửi metric mỗi 1 phút, chỉ cần bật, không phải cài gì."
      : "Mặc định EC2 gửi metric mỗi 5 phút. Bật detailed monitoring để có metric từng phút." }),
  },
];

export default function Ec2OpsSim() {
  return <HopSim scenarios={SCENARIOS} action="Cho sự cố xảy ra" height={250}
    label="Các sự cố của server ShopViet và tính năng EC2 xử lý từng sự cố" />;
}
