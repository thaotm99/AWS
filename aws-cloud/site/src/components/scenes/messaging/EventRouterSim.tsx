import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

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
          result: "Giải pháp hoạt động nhưng có độ trễ cao, đồng thời phát sinh thêm một máy chủ và một lượng lớn mã nguồn phải tự vận hành." },
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
            { at: "job", state: "pass", msg: "Scheduler khởi chạy ECS task trên **Fargate**: sử dụng nguyên container của script, không bị giới hạn 15 phút, không cần quản lý máy chủ." },
            { at: "db", state: "pass", flash: "30 phút", msg: "Đối soát hoàn tất." },
          ], ok: true,
          result: "Tác vụ định kỳ ngắn (vài phút): EventBridge kích hoạt Lambda. Tác vụ dài hơn 15 phút: EventBridge Scheduler khởi chạy Fargate task." }
      : { steps: [
            { at: "job", state: "block", flash: "15 phút", msg: "Thời gian thực thi tối đa của một lần gọi Lambda là **15 phút**. Script 30 phút bị dừng giữa chừng." },
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
            { at: "batch", state: "change", tag: "THỬ LẠI", flash: "lỗi", msg: "Lần thực thi 1 thất bại: Spot Instance của Batch bị thu hồi. Bước này được cấu hình **Retry** (2 lần, backoff tăng dần) nên được thực thi lại." },
            { at: "batch", state: "pass", jump: true, msg: "Lần thực thi 2 thành công. Step Functions chờ Batch job kết thúc trước khi chuyển sang bước tiếp theo." },
            { at: "save", state: "pass", msg: "Video đã chuyển mã được lưu trữ." },
            { at: "notify", state: "pass", msg: "Người bán nhận thông báo video đã sẵn sàng." },
          ], ok: true,
          result: "**Step Functions** lưu trạng thái từng bước, tự động retry, gọi AWS Batch và chờ job hoàn tất. Không cần tự phát triển logic điều phối hay quản lý máy chủ." }
      : { back: false, steps: [
            { at: "check", state: "pass", msg: "Video hợp lệ." },
            { at: "batch", state: "block", flash: "Failed", msg: "Spot Instance của Batch bị thu hồi. Do không cấu hình Retry, toàn bộ execution kết thúc ở trạng thái **Failed**." },
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
            { at: "broker", state: "pass", msg: "**Amazon MQ** vận hành broker ActiveMQ hoặc RabbitMQ do AWS quản lý, hỗ trợ các giao thức chuẩn: AMQP, MQTT, STOMP, JMS…" },
            { at: "cons", state: "pass", msg: "Ứng dụng giao vận nhận message như trước." },
          ], ok: true,
          result: "Di chuyển lên cloud gần như không cần thay đổi mã nguồn; AWS chịu trách nhiệm vá lỗi và vận hành broker. Với ứng dụng phát triển mới, SQS và SNS vẫn là lựa chọn được khuyến nghị." }
      : { steps: [
            { at: "broker", state: "block", flash: "AMQP?", msg: "SQS không hỗ trợ AMQP. Cả hai ứng dụng phải được viết lại bằng SDK của SQS." },
          ], ok: false,
          result: "SQS có chi phí thấp và đơn giản nhưng không hỗ trợ giao thức hiện có. Để hạn chế thay đổi mã nguồn: Amazon MQ." },
  },
  {
    name: "Chứng chỉ import sắp hết hạn",
    action: "Chạy đánh giá",
    request: "Chứng chỉ của shopviet.vn còn hiệu lực 29 ngày",
    toggle: { label: "Kích hoạt AWS Config managed rule + SNS", initial: false },
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
            { at: "cfg", state: "change", tag: "KHÔNG ĐẠT", msg: "Managed rule phát hiện chứng chỉ còn hiệu lực dưới 30 ngày (tham số `daysToExpiration` = 30)." },
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

export default function EventRouterSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn tình huống, sau đó chọn nút để phát sự kiện. Thay đổi cấu hình và chạy lại để so sánh." />;
}
