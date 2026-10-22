import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// Six ShopViet events and the service that should carry each one: SNS fan-out to
// several SQS queues, an EventBridge partner event bus for a SaaS CRM, EventBridge
// Scheduler starting a long Fargate job, Step Functions retrying an AWS Batch step,
// Amazon MQ for an app that speaks AMQP, and AWS Config + SNS for an expiring cert.

const VB = "0 40 820 215";
const Y = 148;

const SCENARIOS: PScenario[] = [
  {
    name: "Một đơn, ba bộ phận cần biết",
    action: "Đặt đơn",
    request: "Đơn #2045 vừa thanh toán",
    toggle: { label: "Dùng SNS topic + SQS (fan-out)", initial: false },
    layout: (fan): PLayout => fan
      ? {
          viewBox: VB,
          aria: "Dịch vụ đơn hàng publish một lần lên SNS topic, topic gửi tới ba SQS queue, mỗi queue có một dịch vụ đọc",
          nodes: [
            { id: "web", x: 75, y: Y, w: 120, l1: "Dịch vụ đơn hàng" },
            { id: "sns", x: 245, y: Y, w: 130, l1: "SNS topic", l2: "don-hang-moi" },
            { id: "q1", x: 450, y: 78, w: 130, l1: "SQS email" },
            { id: "q2", x: 450, y: Y, w: 130, l1: "SQS kho" },
            { id: "q3", x: 450, y: 218, w: 130, l1: "SQS phân tích" },
            { id: "s1", x: 690, y: 78, w: 140, l1: "Gửi email" },
            { id: "s2", x: 690, y: Y, w: 140, l1: "Kho", l2: "đang bảo trì" },
            { id: "s3", x: 690, y: 218, w: 140, l1: "Phân tích" },
          ],
          links: [["web", "sns"], ["sns", "q1"], ["sns", "q2"], ["sns", "q3"], ["q1", "s1"], ["q2", "s2"], ["q3", "s3"]],
        }
      : {
          viewBox: VB,
          aria: "Dịch vụ đơn hàng gọi thẳng ba dịch vụ khác",
          nodes: [
            { id: "web", x: 110, y: Y, w: 140, l1: "Dịch vụ đơn hàng" },
            { id: "s1", x: 650, y: 78, w: 160, l1: "Gửi email" },
            { id: "s2", x: 650, y: Y, w: 160, l1: "Kho", l2: "đang bảo trì" },
            { id: "s3", x: 650, y: 218, w: 160, l1: "Phân tích" },
          ],
          links: [["web", "s1"], ["web", "s2"], ["web", "s3"]],
        },
    run: (fan) => fan
      ? { back: false, steps: [
            { at: "sns", state: "pass", msg: "Publish **một lần** lên topic. Dịch vụ đơn hàng không cần biết ai đang nghe." },
            { at: "q1", state: "pass", msg: "Topic đẩy một bản sao vào queue email." },
            { at: "s1", state: "pass", msg: "Gửi email xác nhận." },
            { at: "q2", from: "sns", state: "pass", msg: "Một bản sao vào queue kho." },
            { at: "s2", state: "wait", msg: "Kho đang bảo trì. Message nằm an toàn trong queue, kho chạy lại sẽ xử lý." },
            { at: "q3", from: "sns", state: "pass", msg: "Một bản sao vào queue phân tích." },
            { at: "s3", state: "pass", msg: "Cập nhật báo cáo doanh thu." },
          ], ok: true,
          result: "Fan-out: **SNS topic → nhiều SQS queue**. Mỗi bên đọc theo tốc độ của mình, một bên hỏng không kéo đơn hỏng theo. Thêm bên thứ tư chỉ cần thêm một subscription." }
      : { steps: [
            { at: "s1", state: "pass", roundTrip: true, msg: "Gọi API email, chờ trả lời: OK." },
            { at: "s2", state: "block", flash: "503", msg: "Kho đang bảo trì, gọi thẳng thì lỗi." },
          ], ok: false,
          result: "Dịch vụ đơn hàng phải gọi và chờ từng bên; một bên lỗi là cả đơn lỗi. Thêm bên mới là phải sửa code." },
  },
  {
    name: "CRM báo có khách mới",
    action: "Khách đăng ký",
    request: "CRM (SaaS): khách mới đăng ký",
    toggle: { label: "Dùng EventBridge (partner event source)", initial: false },
    layout: (eb): PLayout => ({
      viewBox: VB,
      aria: "Sự kiện từ phần mềm CRM tới ShopViet qua EventBridge hoặc qua script tự viết",
      nodes: [
        { id: "crm", x: 80, y: Y, w: 120, l1: "CRM (SaaS)", l2: "đối tác" },
        { id: "mid", x: 280, y: Y, w: 170, l1: eb ? "EventBridge" : "Script trên EC2", l2: eb ? "partner event bus" : "gọi API CRM 5 phút/lần" },
        { id: "rule", x: 480, y: Y, w: 150, l1: "Rule", l2: eb ? "khớp mẫu sự kiện" : "(tự viết if/else)" },
        { id: "fn", x: 700, y: 92, w: 170, l1: "Lambda", l2: "tặng voucher" },
        { id: "q", x: 700, y: 205, w: 170, l1: "SQS", l2: "email chào mừng" },
      ],
      links: [["crm", "mid"], ["mid", "rule"], ["rule", "fn"], ["rule", "q"]],
    }),
    run: (eb) => eb
      ? { back: false, steps: [
            { at: "mid", state: "pass", msg: "CRM là **đối tác SaaS** của EventBridge: sự kiện tự vào partner event bus, không phải viết code lấy dữ liệu." },
            { at: "rule", state: "pass", msg: "Rule so mẫu JSON (`detail-type: Khách mới`) và gửi tới hai target." },
            { at: "fn", state: "pass", msg: "Tặng voucher ngay." },
            { at: "q", from: "rule", state: "pass", msg: "Đưa vào queue gửi email." },
          ], ok: true,
          result: "Sự kiện từ ứng dụng SaaS hay từ dịch vụ AWS: **EventBridge**. Rule lọc theo nội dung, mỗi rule gửi tới nhiều target." }
      : { back: false, steps: [
            { at: "mid", state: "wait", msg: "Script hỏi API CRM 5 phút một lần, tự lo token, retry, phân trang." },
            { at: "rule", state: "change", tag: "TỰ VIẾT", msg: "Tự viết code chọn nơi gửi cho từng loại sự kiện." },
            { at: "fn", state: "pass", msg: "Voucher tới trễ vài phút." },
          ], ok: false,
          result: "Chạy được nhưng chậm, và có thêm một server cùng một đống code phải tự vận hành." },
  },
  {
    name: "Job đối soát 30 phút mỗi đêm",
    action: "Tới 2h sáng",
    request: "cron(0 2 * * ? *) · script đối soát chạy ~30 phút",
    toggle: { label: "Chạy job trên Fargate (thay vì Lambda)", initial: false },
    layout: (fg): PLayout => ({
      viewBox: VB,
      aria: "EventBridge Scheduler chạy job đối soát theo lịch",
      nodes: [
        { id: "sch", x: 120, y: Y, w: 180, l1: "EventBridge Scheduler", l2: "mỗi đêm 2h" },
        { id: "job", x: 420, y: Y, w: 200, l1: fg ? "ECS task trên Fargate" : "Lambda", l2: fg ? "container chứa script" : "script đối soát" },
        { id: "db", x: 700, y: Y, w: 160, l1: "Database đơn hàng" },
      ],
      links: [["sch", "job"], ["job", "db"]],
    }),
    run: (fg) => fg
      ? { steps: [
            { at: "job", state: "pass", msg: "Scheduler chạy ECS task trên **Fargate**: dùng nguyên container của script, không giới hạn 15 phút, không quản lý server." },
            { at: "db", state: "pass", flash: "30 phút", msg: "Đối soát xong." },
          ], ok: true,
          result: "Việc định kỳ ngắn (vài phút): EventBridge gọi Lambda. Việc dài hơn 15 phút: EventBridge Scheduler chạy Fargate task." }
      : { steps: [
            { at: "job", state: "block", flash: "15 phút", msg: "Một lần chạy Lambda tối đa **15 phút**. Script 30 phút bị dừng giữa chừng." },
          ], ok: false,
          result: "Lịch thì đúng, nơi chạy thì sai. Job dài cần container trên Fargate." },
  },
  {
    name: "Video sản phẩm qua nhiều bước",
    action: "Tải video lên",
    request: "s3://shopviet-video/ao-khoac.mov",
    toggle: { label: "State machine có Retry cho bước chuyển mã", initial: false },
    layout: {
      viewBox: VB,
      aria: "Step Functions điều phối: kiểm tra, chuyển mã bằng AWS Batch, lưu S3, thông báo",
      boxes: [{ x: 170, y: 92, w: 640, h: 112, label: "AWS Step Functions · state machine" }],
      nodes: [
        { id: "s3", x: 80, y: Y, w: 120, l1: "S3", l2: "video gốc" },
        { id: "check", x: 255, y: Y + 6, w: 130, l1: "Kiểm tra", l2: "Lambda" },
        { id: "batch", x: 410, y: Y + 6, w: 140, l1: "Chuyển mã", l2: "AWS Batch" },
        { id: "save", x: 565, y: Y + 6, w: 130, l1: "Lưu kết quả", l2: "S3" },
        { id: "notify", x: 720, y: Y + 6, w: 130, l1: "Báo người bán", l2: "SNS" },
      ],
      links: [["s3", "check"], ["check", "batch"], ["batch", "save"], ["save", "notify"]],
    },
    run: (retry) => retry
      ? { back: false, steps: [
            { at: "check", state: "pass", msg: "Video hợp lệ." },
            { at: "batch", state: "change", tag: "THỬ LẠI", flash: "lỗi", msg: "Lần 1 lỗi: máy Spot của Batch bị thu hồi. Bước này có **Retry** (2 lần, chờ tăng dần) nên chạy lại." },
            { at: "batch", state: "pass", jump: true, msg: "Lần 2 xong. Step Functions chờ Batch job kết thúc rồi mới đi tiếp." },
            { at: "save", state: "pass", msg: "Lưu video đã chuyển mã." },
            { at: "notify", state: "pass", msg: "Báo người bán video đã sẵn sàng." },
          ], ok: true,
          result: "**Step Functions** giữ trạng thái từng bước, tự retry, gọi AWS Batch và chờ job xong. Không phải tự viết code điều phối hay tự quản lý server." }
      : { back: false, steps: [
            { at: "check", state: "pass", msg: "Video hợp lệ." },
            { at: "batch", state: "block", flash: "Failed", msg: "Máy Spot của Batch bị thu hồi. Không có Retry nên cả execution dừng ở trạng thái **Failed**." },
          ], ok: false,
          result: "Một lỗi tạm thời làm hỏng cả luồng. Thêm Retry (và Catch cho lỗi thật) vào state machine." },
  },
  {
    name: "App kho cũ dùng RabbitMQ",
    action: "Gửi message",
    request: "AMQP publish → exchange giao-van",
    toggle: { label: "Chuyển broker sang Amazon MQ", initial: false },
    layout: (mq): PLayout => ({
      viewBox: VB,
      aria: "App kho gửi message qua broker tới app giao vận",
      nodes: [
        { id: "app", x: 110, y: Y, w: 150, l1: "App kho", l2: "nói AMQP" },
        { id: "broker", x: 410, y: Y, w: 200, l1: mq ? "Amazon MQ" : "Amazon SQS", l2: mq ? "broker RabbitMQ do AWS quản lý" : "API riêng của SQS" },
        { id: "cons", x: 700, y: Y, w: 150, l1: "App giao vận", l2: "nói AMQP" },
      ],
      links: [["app", "broker"], ["broker", "cons"]],
    }),
    run: (mq) => mq
      ? { steps: [
            { at: "broker", state: "pass", msg: "**Amazon MQ** chạy broker ActiveMQ hoặc RabbitMQ do AWS quản lý, nói các giao thức chuẩn: AMQP, MQTT, STOMP, JMS…" },
            { at: "cons", state: "pass", msg: "App giao vận nhận như trước." },
          ], ok: true,
          result: "Dời lên cloud mà gần như không sửa code, AWS lo vá và chạy broker. App viết mới thì vẫn nên dùng SQS và SNS." }
      : { steps: [
            { at: "broker", state: "block", flash: "AMQP?", msg: "SQS không nói AMQP. Phải viết lại cả hai app bằng SDK của SQS." },
          ], ok: false,
          result: "SQS rẻ và đơn giản, nhưng không giữ được giao thức cũ. Muốn ít sửa code: Amazon MQ." },
  },
  {
    name: "Chứng chỉ nhập từ ngoài sắp hết hạn",
    action: "Kiểm tra hôm nay",
    request: "Chứng chỉ của shopviet.vn còn 29 ngày",
    toggle: { label: "Bật AWS Config managed rule + SNS", initial: false },
    layout: {
      viewBox: VB,
      aria: "AWS Config kiểm tra chứng chỉ trong ACM rồi báo qua SNS tới đội bảo mật",
      nodes: [
        { id: "cert", x: 90, y: Y, w: 140, l1: "Chứng chỉ SSL", l2: "nhập vào ACM" },
        { id: "cfg", x: 330, y: Y, w: 220, l1: "AWS Config rule", l2: "acm-certificate-expiration-check" },
        { id: "sns", x: 560, y: Y, w: 120, l1: "SNS topic" },
        { id: "team", x: 740, y: Y, l1: "Đội bảo mật", user: true },
      ],
      links: [["cert", "cfg"], ["cfg", "sns"], ["sns", "team"]],
    },
    run: (on) => on
      ? { back: false, steps: [
            { at: "cfg", state: "change", tag: "KHÔNG ĐẠT", msg: "Managed rule thấy chứng chỉ còn dưới 30 ngày (tham số `daysToExpiration` = 30)." },
            { at: "sns", state: "pass", msg: "Kết quả kiểm tra được gửi tới SNS topic." },
            { at: "team", state: "pass", msg: "Email tới đội bảo mật, còn cả tháng để thay." },
          ], ok: true,
          result: "Không viết script nào. ACM tự gia hạn chứng chỉ **do ACM cấp**; chứng chỉ **nhập từ ngoài** thì phải tự theo dõi như thế này." }
      : { back: false, steps: [
            { at: "cfg", state: "skip", msg: "Chưa có rule nào theo dõi. ACM không tự gia hạn chứng chỉ nhập từ ngoài." },
            { at: "team", state: "block", flash: "hết hạn", msg: "Không ai được báo. Tới ngày hết hạn, trình duyệt cảnh báo khách." },
          ], ok: false,
          result: "Bật managed rule của AWS Config và gửi kết quả qua SNS." },
  },
];

export default function EventRouterSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn tình huống, bấm nút để phát sự kiện. Đổi công tắc rồi chạy lại để so sánh." />;
}
