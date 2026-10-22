import PacketSim, { type PScenario } from "../elb/PacketSim";

// Five things that go wrong when ShopViet's Lambda functions meet real traffic:
// no NAT gateway after joining a VPC, cold starts at peak, the account concurrency
// quota, a hard-coded database password, and reading a bucket in another account.

const VB = "0 40 820 215";

const SCENARIOS: PScenario[] = [
  {
    name: "Gọi API giao hàng sau khi gắn VPC",
    request: "POST https://api.giaohang.vn/orders",
    toggle: { label: "Subnet có route 0.0.0.0/0 qua NAT gateway", initial: false },
    action: "Gọi Lambda",
    layout: (nat) => ({
      viewBox: VB,
      aria: "Lambda trong private subnet gọi API bên ngoài qua route table và NAT gateway",
      boxes: [{ x: 30, y: 54, w: 520, h: 188, label: "VPC của ShopViet" }],
      nodes: [
        { id: "fn", x: 120, y: 148, w: 140, l1: "Lambda", l2: "private subnet" },
        { id: "rt", x: 300, y: 148, w: 130, l1: "Route table", l2: nat ? "0.0.0.0/0 → NAT" : "chỉ có local" },
        { id: "nat", x: 460, y: 148, w: 130, l1: "NAT gateway", l2: nat ? "public subnet" : "(chưa có)" },
        { id: "api", x: 700, y: 148, w: 170, l1: "API giao hàng", l2: "trên internet" },
      ],
      links: [["fn", "rt"], ["rt", "nat"], ["nat", "api"]],
    }),
    run: (nat) => nat
      ? { steps: [
            { at: "rt", state: "pass", msg: "Có route ra internet qua NAT gateway." },
            { at: "nat", state: "change", tag: "ĐỔI IP", msg: "NAT gateway thay private IP của Lambda bằng IP public của nó." },
            { at: "api", state: "pass", msg: "Đơn giao hàng được tạo." },
          ], ok: true, result: "200: Lambda vừa đọc được database trong VPC vừa gọi được API bên ngoài." }
      : { steps: [
            { at: "rt", state: "block", flash: "timeout", msg: "Lambda gắn vào VPC chỉ có private IP. Subnet không có route ra internet nên request treo tới hết giờ." },
          ], ok: false, result: "Trước khi gắn VPC thì gọi được, giờ thì không. Lambda trong VPC cần NAT gateway để ra internet." },
  },
  {
    name: "Giờ cao điểm: khách chờ lâu",
    request: "GET /api/cart  (20h, lượng khách tăng gấp 5)",
    toggle: { label: "Bật provisioned concurrency", initial: false },
    layout: (pc) => ({
      viewBox: VB,
      aria: "App gọi API Gateway, API Gateway gọi Lambda",
      nodes: [
        { id: "app", x: 70, y: 148, l1: "App ShopViet", user: true },
        { id: "apigw", x: 320, y: 148, w: 150, l1: "API Gateway" },
        { id: "fn", x: 620, y: 148, w: 200, l1: "Lambda giỏ hàng", l2: pc ? "50 môi trường chạy sẵn" : "chưa có môi trường sẵn" },
      ],
      links: [["app", "apigw"], ["apigw", "fn"]],
    }),
    run: (pc) => pc
      ? { steps: [
            { at: "apigw", state: "pass", msg: "Chuyển request tới Lambda." },
            { at: "fn", state: "pass", flash: "40 ms", msg: "**Provisioned concurrency** giữ sẵn môi trường đã khởi tạo. Xử lý ngay." },
          ], ok: true, result: "Độ trễ ổn định cả lúc cao điểm." }
      : { steps: [
            { at: "apigw", state: "pass", msg: "Chuyển request tới Lambda." },
            { at: "fn", state: "wait", flash: "1,8 s", tag: "COLD START", msg: "Phải tạo môi trường mới: tải code, khởi động runtime, chạy phần khởi tạo." },
          ], ok: false, result: "Nhiều khách chờ gần 2 giây ở lần gọi đầu. Bật provisioned concurrency cho giờ cao điểm." },
  },
  {
    name: "Gửi 5.000 thông báo cùng lúc",
    request: "SNS: khuyến mãi tới 5.000 khách",
    toggle: { label: "Đã xin tăng concurrency quota", initial: false },
    action: "Gửi thông báo",
    layout: () => ({
      viewBox: VB,
      aria: "SNS gọi Lambda nhiều lần cùng lúc, CloudWatch theo dõi số lần chạy đồng thời",
      nodes: [
        { id: "sns", x: 110, y: 148, w: 150, l1: "Amazon SNS", l2: "5.000 message" },
        { id: "fn", x: 410, y: 148, w: 190, l1: "Lambda gửi thông báo", l2: "chạy đồng thời" },
        { id: "cw", x: 700, y: 148, w: 180, l1: "CloudWatch alarm", l2: "ConcurrentExecutions" },
      ],
      links: [["sns", "fn"], ["fn", "cw"]],
    }),
    run: (raised) => raised
      ? { steps: [
            { at: "fn", state: "pass", msg: "Quota đủ cho đợt gửi lớn nhất." },
            { at: "cw", state: "pass", msg: "Alarm theo dõi **ConcurrentExecutions** báo sớm nếu sắp chạm quota." },
          ], ok: true, result: "Mọi thông báo đều tới Lambda." }
      : { steps: [
            { at: "fn", state: "block", flash: "429", tag: "THROTTLE", msg: "Vượt **concurrency quota** của account trong Region (mặc định 1.000). Phần dư bị throttle." },
            { at: "cw", from: "fn", state: "change", tag: "BÁO ĐỘNG", msg: "Alarm trên ConcurrentExecutions kêu." },
          ], ok: false, back: false, result: "Một phần khách không nhận được thông báo. Xin tăng quota và đặt alarm để biết trước." },
  },
  {
    name: "Kết nối RDS không lưu mật khẩu",
    request: "Lambda báo cáo đọc RDS MySQL",
    toggle: { label: "Dùng IAM database authentication", initial: false },
    action: "Gọi Lambda",
    layout: (iam) => ({
      viewBox: VB,
      aria: "Lambda lấy thông tin đăng nhập rồi kết nối RDS",
      nodes: [
        { id: "fn", x: 110, y: 148, w: 150, l1: "Lambda báo cáo" },
        { id: "cred", x: 400, y: 148, w: 200, l1: iam ? "Execution role" : "Biến môi trường", l2: iam ? "xin auth token 15 phút" : "DB_PASSWORD=..." },
        { id: "rds", x: 700, y: 148, w: 150, l1: "RDS MySQL" },
      ],
      links: [["fn", "cred"], ["cred", "rds"]],
    }),
    run: (iam) => iam
      ? { steps: [
            { at: "cred", state: "change", tag: "TOKEN", msg: "Execution role có quyền `rds-db:connect`. Lambda xin một **auth token** ngắn hạn." },
            { at: "rds", state: "pass", msg: "RDS nhận token thay cho mật khẩu." },
          ], ok: true, result: "Không còn mật khẩu nằm trong code hay cấu hình." }
      : { steps: [
            { at: "cred", state: "change", tag: "LỘ", msg: "Mật khẩu nằm trong biến môi trường, ai xem được cấu hình function là thấy." },
            { at: "rds", state: "pass", msg: "Kết nối được." },
          ], ok: false, result: "Chạy được nhưng mật khẩu dễ lộ và khó đổi. Dùng IAM database authentication với execution role." },
  },
  {
    name: "Đọc bucket ở account khác",
    request: "GET s3://kho-doi-tac (account B)",
    toggle: { label: "Bucket policy của B cho phép role này", initial: false },
    action: "Gọi Lambda",
    layout: () => ({
      viewBox: VB,
      aria: "Lambda ở account A dùng execution role để đọc bucket S3 ở account B",
      boxes: [{ x: 30, y: 54, w: 400, h: 188, label: "Account A · ShopViet" }, { x: 470, y: 54, w: 330, h: 188, label: "Account B · đối tác" }],
      nodes: [
        { id: "fn", x: 130, y: 148, w: 150, l1: "Lambda nhập kho" },
        { id: "role", x: 320, y: 148, w: 160, l1: "Execution role", l2: "cho phép s3:GetObject" },
        { id: "pol", x: 560, y: 148, w: 130, l1: "Bucket policy" },
        { id: "s3", x: 720, y: 148, w: 120, l1: "S3 kho-doi-tac" },
      ],
      links: [["fn", "role"], ["role", "pol"], ["pol", "s3"]],
    }),
    run: (ok) => ok
      ? { steps: [
            { at: "role", state: "pass", msg: "Phía A: role cho phép đọc bucket của B." },
            { at: "pol", state: "pass", msg: "Phía B: bucket policy cho phép đúng ARN của role đó." },
            { at: "s3", state: "pass", msg: "Đọc được file tồn kho." },
          ], ok: true, result: "Truy cập chéo account cần **cả hai phía** cho phép." }
      : { steps: [
            { at: "role", state: "pass", msg: "Phía A: role cho phép đọc bucket của B." },
            { at: "pol", state: "block", flash: "403", msg: "Phía B chưa cho phép. Quyền của role ở A thôi là chưa đủ." },
          ], ok: false, result: "AccessDenied. Nhờ đối tác thêm role của Lambda vào bucket policy." },
  },
];

export default function LambdaRunSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một chuyện ShopViet gặp với Lambda, chạy thử, rồi bật công tắc để sửa và chạy lại." />;
}
