import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Six ShopViet events and the service that should carry each one: SNS fan-out to
// several SQS queues, an EventBridge partner event bus for a SaaS CRM, EventBridge
// Scheduler starting a long Fargate job, Step Functions retrying an AWS Batch step,
// Amazon MQ for an app that speaks AMQP, and AWS Config + SNS for an expiring cert.

const VB = "0 40 820 215";
const Y = 148;

const SCENARIOS: PScenario[] = [
  {
    name: "Một sự kiện đơn hàng, ba dịch vụ nhận",
    action: "Tạo đơn hàng",
    request: "Đơn #2045 đã thanh toán",
    toggle: { label: "Sử dụng SNS topic + SQS (fan-out)", initial: false },
    layout: (fan): PLayout => fan
      ? {
          viewBox: VB,
          aria: "Dịch vụ đơn hàng publish một lần lên SNS topic, topic phân phối tới ba SQS queue, mỗi queue có một dịch vụ tiêu thụ",
          nodes: [
            { id: "web", x: 75, y: Y, w: 120, l1: "Dịch vụ đơn hàng" },
            { id: "sns", x: 245, y: Y, w: 130, l1: "SNS topic", l2: "don-hang-moi" },
            { id: "q1", x: 450, y: 78, w: 130, l1: "SQS email" },
            { id: "q2", x: 450, y: Y, w: 130, l1: "SQS kho" },
            { id: "q3", x: 450, y: 218, w: 130, l1: "SQS phân tích" },
            { id: "s1", x: 690, y: 78, w: 140, l1: "Dịch vụ email" },
            { id: "s2", x: 690, y: Y, w: 140, l1: "Dịch vụ kho", l2: "đang bảo trì" },
            { id: "s3", x: 690, y: 218, w: 140, l1: "Dịch vụ phân tích" },
          ],
          links: [["web", "sns"], ["sns", "q1"], ["sns", "q2"], ["sns", "q3"], ["q1", "s1"], ["q2", "s2"], ["q3", "s3"]],
        }
      : {
          viewBox: VB,
          aria: "Dịch vụ đơn hàng gọi trực tiếp ba dịch vụ khác",
          nodes: [
            { id: "web", x: 110, y: Y, w: 140, l1: "Dịch vụ đơn hàng" },
            { id: "s1", x: 650, y: 78, w: 160, l1: "Dịch vụ email" },
            { id: "s2", x: 650, y: Y, w: 160, l1: "Dịch vụ kho", l2: "đang bảo trì" },
            { id: "s3", x: 650, y: 218, w: 160, l1: "Dịch vụ phân tích" },
          ],
          links: [["web", "s1"], ["web", "s2"], ["web", "s3"]],
        },
    run: (fan) => fan
      ? { back: false, steps: [
            { at: "sns", state: "pass", msg: "Publish **một lần** lên topic. Dịch vụ đơn hàng không cần biết các subscriber." },
            { at: "q1", state: "pass", msg: "Topic gửi một bản sao vào queue email." },
            { at: "s1", state: "pass", msg: "Email xác nhận được gửi." },
            { at: "q2", from: "sns", state: "pass", msg: "Một bản sao được gửi vào queue kho." },
            { at: "s2", state: "wait", msg: "Dịch vụ kho đang bảo trì. Message được lưu giữ trong queue và sẽ được xử lý khi dịch vụ hoạt động trở lại." },
            { at: "q3", from: "sns", state: "pass", msg: "Một bản sao được gửi vào queue phân tích." },
            { at: "s3", state: "pass", msg: "Báo cáo doanh thu được cập nhật." },
          ], ok: true,
          result: "Fan-out: **SNS topic → nhiều SQS queue**. Mỗi dịch vụ đọc theo tốc độ riêng; sự cố tại một dịch vụ không làm đơn hàng thất bại. Bổ sung dịch vụ thứ tư chỉ cần thêm một subscription." }
      : { steps: [
            { at: "s1", state: "pass", roundTrip: true, msg: "Gọi API email và chờ phản hồi: OK." },
            { at: "s2", state: "block", flash: "503", msg: "Dịch vụ kho đang bảo trì; lệnh gọi trực tiếp trả về lỗi." },
          ], ok: false,
          result: "Dịch vụ đơn hàng phải gọi và chờ từng dịch vụ; lỗi tại một dịch vụ làm toàn bộ đơn hàng thất bại. Bổ sung dịch vụ mới đòi hỏi thay đổi mã nguồn." },
  },
  {
    name: "CRM phát sự kiện khách hàng mới",
    action: "Đăng ký khách hàng",
    request: "CRM (SaaS): khách hàng mới đăng ký",
    toggle: { label: "Sử dụng EventBridge (partner event source)", initial: false },
    layout: (eb): PLayout => ({
      viewBox: VB,
      aria: "Sự kiện từ phần mềm CRM được chuyển tới ShopViet qua EventBridge hoặc qua script tự phát triển",
      nodes: [
        { id: "crm", x: 80, y: Y, w: 120, l1: "CRM (SaaS)", l2: "đối tác" },
        { id: "mid", x: 280, y: Y, w: 170, l1: eb ? "EventBridge" : "Script trên EC2", l2: eb ? "partner event bus" : "poll API CRM mỗi 5 phút" },
        { id: "rule", x: 480, y: Y, w: 150, l1: "Rule", l2: eb ? "khớp event pattern" : "(logic if/else tự viết)" },
        { id: "fn", x: 700, y: 92, w: 170, l1: "Lambda", l2: "tặng voucher" },
        { id: "q", x: 700, y: 205, w: 170, l1: "SQS", l2: "email chào mừng" },
      ],
      links: [["crm", "mid"], ["mid", "rule"], ["rule", "fn"], ["rule", "q"]],
    }),
    run: (eb) => eb
      ? { back: false, steps: [
            { at: "mid", state: "pass", msg: "CRM là **đối tác SaaS** của EventBridge: sự kiện được chuyển trực tiếp vào partner event bus, không cần phát triển mã nguồn để lấy dữ liệu." },
            { at: "rule", state: "pass", msg: "Rule đối chiếu event pattern JSON (`detail-type: Khách hàng mới`) và định tuyến tới hai target." },
            { at: "fn", state: "pass", msg: "Voucher được cấp ngay lập tức." },
            { at: "q", from: "rule", state: "pass", msg: "Sự kiện được đưa vào queue gửi email." },
          ], ok: true,
          result: "Sự kiện từ ứng dụng SaaS hoặc từ dịch vụ AWS: **EventBridge**. Rule lọc theo nội dung sự kiện; mỗi rule có thể định tuyến tới nhiều target." }
      : { back: false, steps: [
            { at: "mid", state: "wait", msg: "Script poll API CRM mỗi 5 phút và tự xử lý token, retry, phân trang." },
            { at: "rule", state: "change", tag: "TỰ VIẾT", msg: "Logic định tuyến cho từng loại sự kiện phải tự phát triển." },
            { at: "fn", state: "pass", msg: "Voucher được cấp với độ trễ vài phút." },
          ], ok: false,
          result: "Giải pháp hoạt động nhưng có độ trễ cao, đồng thời phát sinh thêm một EC2 instance và một lượng lớn mã nguồn phải tự vận hành." },
  },
  {
    name: "Tác vụ đối soát 30 phút mỗi đêm",
    action: "Kích hoạt lúc 2h",
    request: "cron(0 2 * * ? *) · script đối soát thực thi ~30 phút",
    toggle: { label: "Thực thi tác vụ trên Fargate (thay vì Lambda)", initial: false },
    layout: (fg): PLayout => ({
      viewBox: VB,
      aria: "EventBridge Scheduler kích hoạt tác vụ đối soát theo lịch",
      nodes: [
        { id: "sch", x: 120, y: Y, w: 180, l1: "EventBridge Scheduler", l2: "2h hằng đêm" },
        { id: "job", x: 420, y: Y, w: 200, l1: fg ? "ECS task trên Fargate" : "Lambda", l2: fg ? "container chứa script" : "script đối soát" },
        { id: "db", x: 700, y: Y, w: 160, l1: "Database đơn hàng" },
      ],
      links: [["sch", "job"], ["job", "db"]],
    }),
    run: (fg) => fg
      ? { steps: [
            { at: "job", state: "pass", msg: "Scheduler khởi chạy ECS task trên **Fargate**: sử dụng nguyên container của script, không bị giới hạn 15 phút, không cần quản lý EC2 instance." },
            { at: "db", state: "pass", flash: "30 phút", msg: "Đối soát hoàn tất." },
          ], ok: true,
          result: "Tác vụ định kỳ ngắn (vài phút): EventBridge kích hoạt Lambda. Tác vụ dài hơn 15 phút: EventBridge Scheduler khởi chạy Fargate task." }
      : { steps: [
            { at: "job", state: "block", flash: "15 phút", msg: "Timeout tối đa của một Lambda function tiêu chuẩn là **900 giây (15 phút)**. Script 30 phút bị dừng giữa chừng." },
          ], ok: false,
          result: "Lịch thực thi phù hợp nhưng môi trường thực thi không phù hợp. Tác vụ dài cần chạy container trên Fargate." },
  },
  {
    name: "Xử lý video sản phẩm nhiều bước",
    action: "Tải video lên",
    request: "s3://shopviet-video/ao-khoac.mov",
    toggle: { label: "Cấu hình Retry cho bước chuyển mã trong state machine", initial: false },
    layout: {
      viewBox: VB,
      aria: "Step Functions điều phối: kiểm tra, chuyển mã bằng AWS Batch, lưu S3, thông báo",
      boxes: [{ x: 170, y: 92, w: 640, h: 112, label: "AWS Step Functions · state machine" }],
      nodes: [
        { id: "s3", x: 80, y: Y, w: 120, l1: "S3", l2: "video gốc" },
        { id: "check", x: 255, y: Y + 6, w: 130, l1: "Kiểm tra", l2: "Lambda" },
        { id: "batch", x: 410, y: Y + 6, w: 140, l1: "Chuyển mã", l2: "AWS Batch" },
        { id: "save", x: 565, y: Y + 6, w: 130, l1: "Lưu kết quả", l2: "S3" },
        { id: "notify", x: 720, y: Y + 6, w: 130, l1: "Thông báo", l2: "SNS" },
      ],
      links: [["s3", "check"], ["check", "batch"], ["batch", "save"], ["save", "notify"]],
    },
    run: (retry) => retry
      ? { back: false, steps: [
            { at: "check", state: "pass", msg: "Video hợp lệ." },
            { at: "batch", state: "change", tag: "THỬ LẠI", flash: "lỗi", msg: "Lần thực thi 1 thất bại: Spot Instance của AWS Batch compute environment bị interrupt (Spot Instance interruption). Bước này được cấu hình **Retry** (2 lần, backoff tăng dần) nên được thực thi lại." },
            { at: "batch", state: "pass", jump: true, msg: "Lần thực thi 2 thành công. Step Functions chờ Batch job kết thúc trước khi chuyển sang bước tiếp theo." },
            { at: "save", state: "pass", msg: "Video đã chuyển mã được lưu trữ." },
            { at: "notify", state: "pass", msg: "Người bán nhận thông báo video đã sẵn sàng." },
          ], ok: true,
          result: "**Step Functions** lưu trạng thái từng bước, tự động retry, gọi AWS Batch và chờ job hoàn tất. Không cần tự phát triển logic điều phối hay quản lý máy chủ." }
      : { back: false, steps: [
            { at: "check", state: "pass", msg: "Video hợp lệ." },
            { at: "batch", state: "block", flash: "Failed", msg: "Spot Instance của AWS Batch compute environment bị interrupt. Do không cấu hình Retry, toàn bộ execution kết thúc ở trạng thái **Failed**." },
          ], ok: false,
          result: "Một lỗi tạm thời làm toàn bộ quy trình thất bại. Cần bổ sung Retry (và Catch cho lỗi không thể phục hồi) vào state machine." },
  },
  {
    name: "Ứng dụng kho cũ sử dụng RabbitMQ",
    action: "Gửi message",
    request: "AMQP publish → exchange giao-van",
    toggle: { label: "Chuyển broker sang Amazon MQ", initial: false },
    layout: (mq): PLayout => ({
      viewBox: VB,
      aria: "Ứng dụng kho gửi message qua broker tới ứng dụng giao vận",
      nodes: [
        { id: "app", x: 110, y: Y, w: 150, l1: "Ứng dụng kho", l2: "giao thức AMQP" },
        { id: "broker", x: 410, y: Y, w: 200, l1: mq ? "Amazon MQ" : "Amazon SQS", l2: mq ? "broker RabbitMQ do AWS quản lý" : "API riêng của SQS" },
        { id: "cons", x: 700, y: Y, w: 150, l1: "Ứng dụng giao vận", l2: "giao thức AMQP" },
      ],
      links: [["app", "broker"], ["broker", "cons"]],
    }),
    run: (mq) => mq
      ? { steps: [
            { at: "broker", state: "pass", msg: "**Amazon MQ** là dịch vụ message broker được quản lý cho Apache ActiveMQ Classic và RabbitMQ, sử dụng các API và giao thức chuẩn như JMS, NMS, AMQP, STOMP, MQTT và WebSocket." },
            { at: "cons", state: "pass", msg: "Ứng dụng giao vận nhận message như trước." },
          ], ok: true,
          result: "Trong hầu hết trường hợp, không phải viết lại mã xử lý message khi di chuyển lên AWS; Amazon MQ thực hiện bảo trì và nâng cấp phiên bản broker trong maintenance window đã lên lịch. Amazon MQ phù hợp nhất cho việc di chuyển từ message broker truyền thống." }
      : { steps: [
            { at: "broker", state: "block", flash: "AMQP?", msg: "SQS không hỗ trợ AMQP. Cả hai ứng dụng phải được viết lại bằng SDK của SQS." },
          ], ok: false,
          result: "SQS có chi phí thấp và đơn giản nhưng không hỗ trợ giao thức hiện có. Để hạn chế thay đổi mã nguồn: Amazon MQ." },
  },
  {
    name: "Chứng chỉ import sắp hết hạn",
    action: "Chạy đánh giá",
    request: "Chứng chỉ của shopviet.vn còn hiệu lực 29 ngày",
    toggle: { label: "Kích hoạt AWS Config managed rule (daysToExpiration = 30) + SNS", initial: false },
    layout: {
      viewBox: VB,
      aria: "AWS Config đánh giá chứng chỉ trong ACM và gửi thông báo qua SNS tới đội bảo mật",
      nodes: [
        { id: "cert", x: 90, y: Y, w: 140, l1: "Chứng chỉ SSL/TLS", l2: "import vào ACM" },
        { id: "cfg", x: 330, y: Y, w: 220, l1: "AWS Config rule", l2: "acm-certificate-expiration-check" },
        { id: "sns", x: 560, y: Y, w: 120, l1: "SNS topic" },
        { id: "team", x: 740, y: Y, l1: "Đội bảo mật", user: true },
      ],
      links: [["cert", "cfg"], ["cfg", "sns"], ["sns", "team"]],
    },
    run: (on) => on
      ? { back: false, steps: [
            { at: "cfg", state: "change", tag: "NON_COMPLIANT", msg: "Managed rule đánh giá chứng chỉ là NON_COMPLIANT vì còn hiệu lực dưới 30 ngày. Tham số `daysToExpiration` có giá trị mặc định 14; ShopViet đã cấu hình thành 30." },
            { at: "sns", state: "pass", msg: "Kết quả đánh giá được gửi tới SNS topic." },
            { at: "team", state: "pass", msg: "Đội bảo mật nhận email thông báo, còn khoảng một tháng để thay thế chứng chỉ." },
          ], ok: true,
          result: "Không cần phát triển script. ACM tự động gia hạn chứng chỉ **do ACM cấp**; với chứng chỉ **import từ bên ngoài**, việc theo dõi phải được thiết lập như trên." }
      : { back: false, steps: [
            { at: "cfg", state: "skip", msg: "Chưa có rule nào giám sát. ACM không tự động gia hạn chứng chỉ import từ bên ngoài." },
            { at: "team", state: "block", flash: "hết hạn", msg: "Không có thông báo nào được gửi. Khi chứng chỉ hết hạn, trình duyệt hiển thị cảnh báo cho người dùng." },
          ], ok: false,
          result: "Cần kích hoạt managed rule của AWS Config và gửi kết quả đánh giá qua SNS." },
  },
];

const SCENARIOS_EN: PScenario[] = [
  {
    name: "One order event, three receiving services",
    action: "Create order",
    request: "Order #2045 paid",
    toggle: { label: "Use an SNS topic + SQS (fan-out)", initial: false },
    layout: (fan): PLayout => fan
      ? {
          viewBox: VB,
          aria: "The order service publishes once to an SNS topic; the topic delivers to three SQS queues, each with one consuming service",
          nodes: [
            { id: "web", x: 75, y: Y, w: 120, l1: "Order service" },
            { id: "sns", x: 245, y: Y, w: 130, l1: "SNS topic", l2: "don-hang-moi" },
            { id: "q1", x: 450, y: 78, w: 130, l1: "SQS email" },
            { id: "q2", x: 450, y: Y, w: 130, l1: "SQS inventory" },
            { id: "q3", x: 450, y: 218, w: 130, l1: "SQS analytics" },
            { id: "s1", x: 690, y: 78, w: 140, l1: "Email service" },
            { id: "s2", x: 690, y: Y, w: 140, l1: "Inventory service", l2: "under maintenance" },
            { id: "s3", x: 690, y: 218, w: 140, l1: "Analytics service" },
          ],
          links: [["web", "sns"], ["sns", "q1"], ["sns", "q2"], ["sns", "q3"], ["q1", "s1"], ["q2", "s2"], ["q3", "s3"]],
        }
      : {
          viewBox: VB,
          aria: "The order service calls three other services directly",
          nodes: [
            { id: "web", x: 110, y: Y, w: 140, l1: "Order service" },
            { id: "s1", x: 650, y: 78, w: 160, l1: "Email service" },
            { id: "s2", x: 650, y: Y, w: 160, l1: "Inventory service", l2: "under maintenance" },
            { id: "s3", x: 650, y: 218, w: 160, l1: "Analytics service" },
          ],
          links: [["web", "s1"], ["web", "s2"], ["web", "s3"]],
        },
    run: (fan) => fan
      ? { back: false, steps: [
            { at: "sns", state: "pass", msg: "Publishes **once** to the topic. The order service does not need to know the subscribers." },
            { at: "q1", state: "pass", msg: "The topic sends a copy to the email queue." },
            { at: "s1", state: "pass", msg: "The confirmation email is sent." },
            { at: "q2", from: "sns", state: "pass", msg: "A copy is sent to the inventory queue." },
            { at: "s2", state: "wait", msg: "The inventory service is under maintenance. The message is kept in the queue and will be processed when the service is back." },
            { at: "q3", from: "sns", state: "pass", msg: "A copy is sent to the analytics queue." },
            { at: "s3", state: "pass", msg: "The revenue report is updated." },
          ], ok: true,
          result: "Fan-out: **SNS topic → multiple SQS queues**. Each service reads at its own pace; a failure in one service does not make the order fail. Adding a fourth service only needs one more subscription." }
      : { steps: [
            { at: "s1", state: "pass", roundTrip: true, msg: "Calls the email API and waits for the response: OK." },
            { at: "s2", state: "block", flash: "503", msg: "The inventory service is under maintenance; the direct call returns an error." },
          ], ok: false,
          result: "The order service must call and wait for each service; an error in one service makes the whole order fail. Adding a new service requires code changes." },
  },
  {
    name: "CRM emits a new-customer event",
    action: "Register customer",
    request: "CRM (SaaS): a new customer signs up",
    toggle: { label: "Use EventBridge (partner event source)", initial: false },
    layout: (eb): PLayout => ({
      viewBox: VB,
      aria: "Events from the CRM software reach ShopViet through EventBridge or through a self-developed script",
      nodes: [
        { id: "crm", x: 80, y: Y, w: 120, l1: "CRM (SaaS)", l2: "partner" },
        { id: "mid", x: 280, y: Y, w: 170, l1: eb ? "EventBridge" : "Script on EC2", l2: eb ? "partner event bus" : "polls CRM API every 5 min" },
        { id: "rule", x: 480, y: Y, w: 150, l1: "Rule", l2: eb ? "matches event pattern" : "(hand-written if/else)" },
        { id: "fn", x: 700, y: 92, w: 170, l1: "Lambda", l2: "issues voucher" },
        { id: "q", x: 700, y: 205, w: 170, l1: "SQS", l2: "welcome email" },
      ],
      links: [["crm", "mid"], ["mid", "rule"], ["rule", "fn"], ["rule", "q"]],
    }),
    run: (eb) => eb
      ? { back: false, steps: [
            { at: "mid", state: "pass", msg: "The CRM is an EventBridge **SaaS partner**: events go straight to the partner event bus, with no code to develop for fetching data." },
            { at: "rule", state: "pass", msg: "The rule matches the JSON event pattern (`detail-type: New Customer`) and routes to two targets." },
            { at: "fn", state: "pass", msg: "The voucher is issued immediately." },
            { at: "q", from: "rule", state: "pass", msg: "The event is put into the email queue." },
          ], ok: true,
          result: "Events from a SaaS application or from an AWS service: **EventBridge**. Rules filter on event content; each rule can route to multiple targets." }
      : { back: false, steps: [
            { at: "mid", state: "wait", msg: "The script polls the CRM API every 5 minutes and handles tokens, retries and pagination itself." },
            { at: "rule", state: "change", tag: "CUSTOM", msg: "Routing logic for each event type has to be developed in-house." },
            { at: "fn", state: "pass", msg: "The voucher is issued with a delay of several minutes." },
          ], ok: false,
          result: "The solution works but has high latency, and it adds an EC2 instance and a large amount of code to operate yourself." },
  },
  {
    name: "30-minute reconciliation job every night",
    action: "Trigger at 2:00",
    request: "cron(0 2 * * ? *) · reconciliation script runs ~30 min",
    toggle: { label: "Run the job on Fargate (instead of Lambda)", initial: false },
    layout: (fg): PLayout => ({
      viewBox: VB,
      aria: "EventBridge Scheduler triggers the reconciliation job on a schedule",
      nodes: [
        { id: "sch", x: 120, y: Y, w: 180, l1: "EventBridge Scheduler", l2: "2:00 every night" },
        { id: "job", x: 420, y: Y, w: 200, l1: fg ? "ECS task on Fargate" : "Lambda", l2: fg ? "container with the script" : "reconciliation script" },
        { id: "db", x: 700, y: Y, w: 160, l1: "Order database" },
      ],
      links: [["sch", "job"], ["job", "db"]],
    }),
    run: (fg) => fg
      ? { steps: [
            { at: "job", state: "pass", msg: "Scheduler starts an ECS task on **Fargate**: it uses the script's existing container, is not limited to 15 minutes, and has no EC2 instances to manage." },
            { at: "db", state: "pass", flash: "30 min", msg: "Reconciliation completes." },
          ], ok: true,
          result: "Short scheduled jobs (a few minutes): EventBridge triggers Lambda. Jobs longer than 15 minutes: EventBridge Scheduler starts a Fargate task." }
      : { steps: [
            { at: "job", state: "block", flash: "15 min", msg: "The maximum timeout of a standard Lambda function is **900 seconds (15 minutes)**. The 30-minute script is stopped midway." },
          ], ok: false,
          result: "The schedule is right but the runtime environment is not. Long jobs need to run a container on Fargate." },
  },
  {
    name: "Multi-step product video processing",
    action: "Upload video",
    request: "s3://shopviet-video/ao-khoac.mov",
    toggle: { label: "Configure Retry for the transcoding step in the state machine", initial: false },
    layout: {
      viewBox: VB,
      aria: "Step Functions orchestrates: validate, transcode with AWS Batch, save to S3, notify",
      boxes: [{ x: 170, y: 92, w: 640, h: 112, label: "AWS Step Functions · state machine" }],
      nodes: [
        { id: "s3", x: 80, y: Y, w: 120, l1: "S3", l2: "source video" },
        { id: "check", x: 255, y: Y + 6, w: 130, l1: "Validate", l2: "Lambda" },
        { id: "batch", x: 410, y: Y + 6, w: 140, l1: "Transcode", l2: "AWS Batch" },
        { id: "save", x: 565, y: Y + 6, w: 130, l1: "Save output", l2: "S3" },
        { id: "notify", x: 720, y: Y + 6, w: 130, l1: "Notify", l2: "SNS" },
      ],
      links: [["s3", "check"], ["check", "batch"], ["batch", "save"], ["save", "notify"]],
    },
    run: (retry) => retry
      ? { back: false, steps: [
            { at: "check", state: "pass", msg: "The video is valid." },
            { at: "batch", state: "change", tag: "RETRY", flash: "error", msg: "Attempt 1 fails: a Spot Instance in the AWS Batch compute environment is interrupted (Spot Instance interruption). This step is configured with **Retry** (2 attempts, increasing backoff), so it runs again." },
            { at: "batch", state: "pass", jump: true, msg: "Attempt 2 succeeds. Step Functions waits for the Batch job to finish before moving to the next step." },
            { at: "save", state: "pass", msg: "The transcoded video is stored." },
            { at: "notify", state: "pass", msg: "The seller is notified that the video is ready." },
          ], ok: true,
          result: "**Step Functions** keeps the state of each step, retries automatically, calls AWS Batch and waits for the job to complete. No orchestration logic to develop and no servers to manage." }
      : { back: false, steps: [
            { at: "check", state: "pass", msg: "The video is valid." },
            { at: "batch", state: "block", flash: "Failed", msg: "A Spot Instance in the AWS Batch compute environment is interrupted. Because no Retry is configured, the whole execution ends in the **Failed** state." },
          ], ok: false,
          result: "One transient error makes the whole workflow fail. Add Retry (and Catch for unrecoverable errors) to the state machine." },
  },
  {
    name: "Legacy inventory app uses RabbitMQ",
    action: "Send message",
    request: "AMQP publish → exchange giao-van",
    toggle: { label: "Move the broker to Amazon MQ", initial: false },
    layout: (mq): PLayout => ({
      viewBox: VB,
      aria: "The inventory app sends messages through a broker to the shipping app",
      nodes: [
        { id: "app", x: 110, y: Y, w: 150, l1: "Inventory app", l2: "AMQP protocol" },
        { id: "broker", x: 410, y: Y, w: 200, l1: mq ? "Amazon MQ" : "Amazon SQS", l2: mq ? "AWS-managed RabbitMQ broker" : "SQS-specific API" },
        { id: "cons", x: 700, y: Y, w: 150, l1: "Shipping app", l2: "AMQP protocol" },
      ],
      links: [["app", "broker"], ["broker", "cons"]],
    }),
    run: (mq) => mq
      ? { steps: [
            { at: "broker", state: "pass", msg: "**Amazon MQ** is a managed message broker service for Apache ActiveMQ Classic and RabbitMQ that uses industry-standard APIs and protocols such as JMS, NMS, AMQP, STOMP, MQTT and WebSocket." },
            { at: "cons", state: "pass", msg: "The shipping app receives messages as before." },
          ], ok: true,
          result: "In most cases there is no need to rewrite messaging code when moving to AWS; Amazon MQ performs broker maintenance and version upgrades in a scheduled maintenance window. Amazon MQ is best suited for migrating from traditional message brokers." }
      : { steps: [
            { at: "broker", state: "block", flash: "AMQP?", msg: "SQS does not support AMQP. Both apps would have to be rewritten with the SQS SDK." },
          ], ok: false,
          result: "SQS is low-cost and simple but does not support the existing protocol. To minimize code changes: Amazon MQ." },
  },
  {
    name: "Imported certificate about to expire",
    action: "Run evaluation",
    request: "The shopviet.vn certificate is valid for 29 more days",
    toggle: { label: "Enable an AWS Config managed rule (daysToExpiration = 30) + SNS", initial: false },
    layout: {
      viewBox: VB,
      aria: "AWS Config evaluates the certificate in ACM and sends a notification through SNS to the security team",
      nodes: [
        { id: "cert", x: 90, y: Y, w: 140, l1: "SSL/TLS certificate", l2: "imported into ACM" },
        { id: "cfg", x: 330, y: Y, w: 220, l1: "AWS Config rule", l2: "acm-certificate-expiration-check" },
        { id: "sns", x: 560, y: Y, w: 120, l1: "SNS topic" },
        { id: "team", x: 740, y: Y, l1: "Security team", user: true },
      ],
      links: [["cert", "cfg"], ["cfg", "sns"], ["sns", "team"]],
    },
    run: (on) => on
      ? { back: false, steps: [
            { at: "cfg", state: "change", tag: "NON_COMPLIANT", msg: "The managed rule evaluates the certificate as NON_COMPLIANT because it is valid for fewer than 30 days. The `daysToExpiration` parameter defaults to 14; ShopViet has set it to 30." },
            { at: "sns", state: "pass", msg: "The evaluation result is sent to the SNS topic." },
            { at: "team", state: "pass", msg: "The security team receives an email notification and has about a month to replace the certificate." },
          ], ok: true,
          result: "No script to develop. ACM renews certificates **issued by ACM** automatically; for **imported** certificates, monitoring has to be set up as shown." }
      : { back: false, steps: [
            { at: "cfg", state: "skip", msg: "No rule is monitoring yet. ACM does not renew imported certificates automatically." },
            { at: "team", state: "block", flash: "expired", msg: "No notification is sent. When the certificate expires, browsers show users a warning." },
          ], ok: false,
          result: "Enable the AWS Config managed rule and send the evaluation results through SNS." },
  },
];

export default function EventRouterSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} hint={L({ vi: "Chọn tình huống, sau đó chọn nút để phát sự kiện. Thay đổi cấu hình và chạy lại để so sánh.", en: "Choose a scenario, then choose the button to emit the event. Change the setting and run again to compare." })} />;
}
