import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Five things that go wrong when MFTECH's Lambda functions meet real traffic:
// no NAT gateway after joining a VPC, cold starts at peak, the account concurrency
// quota, a hard-coded database password, and reading a bucket in another account.

const VB = "0 40 820 215";

type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): PScenario[] => {
  const CALL = L({ vi: "Gọi Lambda", en: "Invoke Lambda" });
  return [
  {
    name: L({ vi: "Gọi API giao hàng sau khi gắn VPC", en: "Call delivery API after joining a VPC" }),
    request: "POST https://api.giaohang.vn/orders",
    toggle: { label: L({ vi: "Subnet có route 0.0.0.0/0 qua NAT gateway", en: "Subnet has a 0.0.0.0/0 route via a NAT gateway" }), initial: false },
    action: CALL,
    layout: (nat) => ({
      viewBox: VB,
      aria: L({ vi: "Lambda trong private subnet gọi API bên ngoài qua route table và NAT gateway", en: "Lambda in a private subnet calls an external API through the route table and a NAT gateway" }),
      boxes: [{ x: 30, y: 54, w: 520, h: 188, label: L({ vi: "VPC của MFTECH", en: "MFTECH VPC" }) }],
      nodes: [
        { id: "fn", x: 120, y: 148, w: 140, l1: "Lambda", l2: "private subnet" },
        { id: "rt", x: 300, y: 148, w: 130, l1: "Route table", l2: nat ? "0.0.0.0/0 → NAT" : L({ vi: "chỉ có route local", en: "local route only" }) },
        { id: "nat", x: 460, y: 148, w: 130, l1: "NAT gateway", l2: nat ? "public subnet" : L({ vi: "(chưa cấu hình)", en: "(not configured)" }) },
        { id: "api", x: 700, y: 148, w: 170, l1: L({ vi: "API giao hàng", en: "Delivery API" }), l2: L({ vi: "trên Internet", en: "on the internet" }) },
      ],
      links: [["fn", "rt"], ["rt", "nat"], ["nat", "api"]],
    }),
    run: (nat) => nat
      ? { steps: [
            { at: "rt", state: "pass", msg: L({ vi: "Route table có route ra Internet qua NAT gateway.", en: "The route table has a route to the internet through the NAT gateway." }) },
            { at: "nat", state: "change", tag: "NAT", msg: L({ vi: "NAT gateway thay địa chỉ nguồn private bằng địa chỉ public của NAT gateway.", en: "The NAT gateway replaces the private source address with the NAT gateway's public address." }) },
            { at: "api", state: "pass", msg: L({ vi: "Đơn giao hàng được tạo thành công.", en: "The delivery order is created successfully." }) },
          ], ok: true, result: L({ vi: "200 OK: Lambda vừa truy cập được database trong VPC, vừa gọi được API bên ngoài.", en: "200 OK: Lambda can reach the database in the VPC and also call the external API." }) }
      : { steps: [
            { at: "rt", state: "block", flash: "timeout", msg: L({ vi: "Lambda gắn vào VPC không có public IP (kể cả khi đặt trong public subnet). Subnet không có route ra Internet nên request bị treo cho tới khi timeout.", en: "A Lambda function attached to a VPC has no public IP (even in a public subnet). The subnet has no route to the internet, so the request hangs until it times out." }) },
          ], ok: false, result: L({ vi: "Trước khi gắn VPC, lời gọi thành công; sau khi gắn VPC thì thất bại. Lambda trong VPC cần NAT gateway để truy cập Internet.", en: "The call succeeded before the function joined the VPC and fails after. Lambda in a VPC needs a NAT gateway to reach the internet." }) },
  },
  {
    name: L({ vi: "Giờ cao điểm: độ trễ tăng cao", en: "Peak hour: latency spikes" }),
    request: L({ vi: "GET /api/cart  (20h, lưu lượng truy cập tăng gấp 5)", en: "GET /api/cart  (20:00, traffic up 5x)" }),
    toggle: { label: L({ vi: "Kích hoạt provisioned concurrency", en: "Enable provisioned concurrency" }), initial: false },
    layout: (pc) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng gọi API Gateway, API Gateway gọi Lambda", en: "The app calls API Gateway, and API Gateway invokes Lambda" }),
      nodes: [
        { id: "app", x: 70, y: 148, l1: L({ vi: "Ứng dụng MFTECH", en: "MFTECH app" }), user: true },
        { id: "apigw", x: 320, y: 148, w: 150, l1: "API Gateway" },
        { id: "fn", x: 620, y: 148, w: 200, l1: L({ vi: "Lambda giỏ hàng", en: "Cart Lambda" }), l2: pc ? L({ vi: "50 môi trường khởi tạo sẵn", en: "50 pre-initialized environments" }) : L({ vi: "chưa có môi trường khởi tạo sẵn", en: "no pre-initialized environments" }) },
      ],
      links: [["app", "apigw"], ["apigw", "fn"]],
    }),
    run: (pc) => pc
      ? { steps: [
            { at: "apigw", state: "pass", msg: L({ vi: "Chuyển tiếp request tới Lambda.", en: "Forwards the request to Lambda." }) },
            { at: "fn", state: "pass", flash: "40 ms", msg: L({ vi: "**Provisioned concurrency** duy trì sẵn các execution environment đã khởi tạo; request được xử lý ngay.", en: "**Provisioned concurrency** keeps initialized execution environments ready; the request is handled immediately." }) },
          ], ok: true, result: L({ vi: "Độ trễ ổn định kể cả vào giờ cao điểm.", en: "Latency stays steady even at peak hours." }) }
      : { steps: [
            { at: "apigw", state: "pass", msg: L({ vi: "Chuyển tiếp request tới Lambda.", en: "Forwards the request to Lambda." }) },
            { at: "fn", state: "wait", flash: L({ vi: "1,8 s", en: "1.8 s" }), tag: "COLD START", msg: L({ vi: "Phải tạo execution environment mới: tải mã, khởi động runtime, chạy phần mã khởi tạo.", en: "A new execution environment must be created: download the code, start the runtime, run the initialization code." }) },
          ], ok: false, result: L({ vi: "Nhiều người dùng phải chờ gần 2 giây ở lần gọi đầu tiên. Giải pháp: kích hoạt provisioned concurrency cho giờ cao điểm.", en: "Many users wait almost 2 seconds on the first call. Solution: enable provisioned concurrency for peak hours." }) },
  },
  {
    name: L({ vi: "Gửi đồng thời 5.000 thông báo", en: "Send 5,000 notifications at once" }),
    request: L({ vi: "SNS: thông báo khuyến mãi tới 5.000 người dùng", en: "SNS: sale notification to 5,000 users" }),
    toggle: { label: L({ vi: "Đã yêu cầu tăng concurrency quota", en: "Concurrency quota increase requested" }), initial: false },
    action: L({ vi: "Gửi thông báo", en: "Send notifications" }),
    layout: () => ({
      viewBox: VB,
      aria: L({ vi: "SNS gọi Lambda nhiều lần đồng thời, CloudWatch theo dõi số lần thực thi đồng thời", en: "SNS invokes Lambda many times concurrently, and CloudWatch tracks concurrent executions" }),
      nodes: [
        { id: "sns", x: 110, y: 148, w: 150, l1: "Amazon SNS", l2: L({ vi: "5.000 message", en: "5,000 messages" }) },
        { id: "fn", x: 410, y: 148, w: 190, l1: L({ vi: "Lambda gửi thông báo", en: "Notification Lambda" }), l2: L({ vi: "thực thi đồng thời", en: "concurrent executions" }) },
        { id: "cw", x: 700, y: 148, w: 180, l1: "CloudWatch alarm", l2: "ConcurrentExecutions" },
      ],
      links: [["sns", "fn"], ["fn", "cw"]],
    }),
    run: (raised) => raised
      ? { steps: [
            { at: "fn", state: "pass", msg: L({ vi: "Quota sau khi tăng đáp ứng được đợt gửi lớn nhất.", en: "The raised quota covers the largest send." }) },
            { at: "cw", state: "pass", msg: L({ vi: "Alarm theo dõi **ConcurrentExecutions** cảnh báo sớm khi sắp chạm quota.", en: "An alarm on **ConcurrentExecutions** warns early when the quota is close." }) },
          ], ok: true, result: L({ vi: "Mọi thông báo đều được chuyển tới Lambda.", en: "Every notification reaches Lambda." }) }
      : { steps: [
            { at: "fn", state: "block", flash: "429", tag: "THROTTLE", msg: L({ vi: "Vượt **concurrency quota** của account trong Region (mặc định 1.000; account mới có thể thấp hơn). Các lời gọi vượt quota bị throttle; với lời gọi bất đồng bộ từ SNS, Lambda đưa sự kiện trở lại hàng đợi và thử lại tối đa 6 giờ (mặc định).", en: "Exceeds the account's **concurrency quota** in the Region (1,000 by default; new accounts may have less). Invocations over the quota are throttled; for asynchronous invocations from SNS, Lambda returns the event to the queue and retries for up to 6 hours (default)." }) },
            { at: "cw", from: "fn", state: "change", tag: L({ vi: "CẢNH BÁO", en: "ALERT" }), msg: L({ vi: "Alarm trên ConcurrentExecutions chuyển sang trạng thái ALARM.", en: "The alarm on ConcurrentExecutions goes into the ALARM state." }) },
          ], ok: false, back: false, result: L({ vi: "Thông báo bị gửi chậm; sự kiện hết hạn hoặc thất bại sau mọi lần thử lại sẽ bị Lambda loại bỏ (cấu hình destination hoặc DLQ để giữ lại). Cần yêu cầu tăng quota và cấu hình alarm để cảnh báo sớm.", en: "Notifications are delayed; events that expire or fail after all retries are discarded by Lambda (configure a destination or a DLQ to keep them). Request a quota increase and configure an alarm for early warning." }) },
  },
  {
    name: L({ vi: "Kết nối RDS không lưu mật khẩu", en: "Connect to RDS without a password" }),
    request: L({ vi: "Lambda báo cáo đọc RDS MySQL", en: "Reporting Lambda reads RDS MySQL" }),
    toggle: { label: L({ vi: "Sử dụng IAM database authentication", en: "Use IAM database authentication" }), initial: false },
    action: CALL,
    layout: (iam) => ({
      viewBox: VB,
      aria: L({ vi: "Lambda lấy thông tin xác thực và kết nối tới RDS", en: "Lambda gets credentials and connects to RDS" }),
      nodes: [
        { id: "fn", x: 110, y: 148, w: 150, l1: L({ vi: "Lambda báo cáo", en: "Reporting Lambda" }) },
        { id: "cred", x: 400, y: 148, w: 200, l1: iam ? "Execution role" : L({ vi: "Environment variable", en: "Environment variable" }), l2: iam ? L({ vi: "yêu cầu auth token 15 phút", en: "requests a 15-minute auth token" }) : "DB_PASSWORD=..." },
        { id: "rds", x: 700, y: 148, w: 150, l1: "RDS MySQL" },
      ],
      links: [["fn", "cred"], ["cred", "rds"]],
    }),
    run: (iam) => iam
      ? { steps: [
            { at: "cred", state: "change", tag: "TOKEN", msg: L({ vi: "Execution role có quyền `rds-db:connect`. Lambda yêu cầu một **auth token** ngắn hạn.", en: "The execution role has the `rds-db:connect` permission. Lambda requests a short-lived **auth token**." }) },
            { at: "rds", state: "pass", msg: L({ vi: "RDS chấp nhận token (hiệu lực 15 phút) thay cho mật khẩu.", en: "RDS accepts the token (valid for 15 minutes) instead of a password." }) },
          ], ok: true, result: L({ vi: "Không còn mật khẩu lưu trong mã nguồn hay cấu hình.", en: "No password is stored in source code or configuration anymore." }) }
      : { steps: [
            { at: "cred", state: "change", tag: L({ vi: "LỘ THÔNG TIN", en: "EXPOSED" }), msg: L({ vi: "Mật khẩu lưu trong environment variable; bất kỳ ai có quyền xem cấu hình function đều đọc được.", en: "The password is stored in an environment variable; anyone allowed to view the function configuration can read it." }) },
            { at: "rds", state: "pass", msg: L({ vi: "Kết nối thành công.", en: "The connection succeeds." }) },
          ], ok: false, result: L({ vi: "Giải pháp hoạt động nhưng mật khẩu dễ bị lộ và khó xoay vòng. Giải pháp phù hợp: IAM database authentication với execution role.", en: "This works, but the password is easily exposed and hard to rotate. The right solution: IAM database authentication with the execution role." }) },
  },
  {
    name: L({ vi: "Đọc bucket ở account khác", en: "Read a bucket in another account" }),
    request: "GET s3://kho-doi-tac (account B)",
    toggle: { label: L({ vi: "Bucket policy của B cho phép role này", en: "B's bucket policy allows this role" }), initial: false },
    action: CALL,
    layout: () => ({
      viewBox: VB,
      aria: L({ vi: "Lambda ở account A dùng execution role để đọc bucket S3 ở account B", en: "Lambda in account A uses its execution role to read an S3 bucket in account B" }),
      boxes: [{ x: 30, y: 54, w: 400, h: 188, label: "Account A · MFTECH" }, { x: 470, y: 54, w: 330, h: 188, label: L({ vi: "Account B · đối tác", en: "Account B · partner" }) }],
      nodes: [
        { id: "fn", x: 130, y: 148, w: 150, l1: L({ vi: "Lambda nhập kho", en: "Stock-in Lambda" }) },
        { id: "role", x: 320, y: 148, w: 160, l1: "Execution role", l2: L({ vi: "cho phép s3:GetObject", en: "allows s3:GetObject" }) },
        { id: "pol", x: 560, y: 148, w: 130, l1: "Bucket policy" },
        { id: "s3", x: 720, y: 148, w: 120, l1: "S3 kho-doi-tac" },
      ],
      links: [["fn", "role"], ["role", "pol"], ["pol", "s3"]],
    }),
    run: (ok) => ok
      ? { steps: [
            { at: "role", state: "pass", msg: L({ vi: "Phía A: role cho phép đọc bucket của B.", en: "Side A: the role allows reading B's bucket." }) },
            { at: "pol", state: "pass", msg: L({ vi: "Phía B: bucket policy cho phép đúng ARN của role đó.", en: "Side B: the bucket policy allows that role's exact ARN." }) },
            { at: "s3", state: "pass", msg: L({ vi: "Đọc thành công tệp tồn kho.", en: "The inventory file is read successfully." }) },
          ], ok: true, result: L({ vi: "Với request cross-account, AWS chỉ cho phép khi đánh giá policy ở **cả hai account** đều cho phép.", en: "For a cross-account request, AWS allows it only when the policies in **both accounts** allow it." }) }
      : { steps: [
            { at: "role", state: "pass", msg: L({ vi: "Phía A: role cho phép đọc bucket của B.", en: "Side A: the role allows reading B's bucket." }) },
            { at: "pol", state: "block", flash: "403", msg: L({ vi: "Phía B chưa cho phép. Chỉ riêng quyền của role tại A là chưa đủ.", en: "Side B does not allow it yet. The role's permissions in A alone are not enough." }) },
          ], ok: false, result: L({ vi: "AccessDenied. Đối tác cần thêm role của Lambda vào bucket policy.", en: "AccessDenied. The partner must add the Lambda role to the bucket policy." }) },
  },
  ];
};

export default function LambdaRunSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)}
    hint={L({ vi: "Chọn một tình huống vận hành Lambda của MFTECH và chạy thử; sau đó bật tuỳ chọn khắc phục và chạy lại.", en: "Pick a MFTECH Lambda operations scenario and try it; then turn on the fix and run again." })} />;
}
