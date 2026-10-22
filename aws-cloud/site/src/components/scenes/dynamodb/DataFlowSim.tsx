import PacketSim, { type PScenario } from "../elb/PacketSim";

// Data flowing into and out of ShopViet's DynamoDB tables: feedback kept one year
// with TTL, a welcome email from DynamoDB Streams + Lambda, card numbers removed
// before they are written (Kinesis Data Streams + Lambda), and warehouse scanners
// that need SQS + Lambda because Firehose cannot write to DynamoDB.

const VB = "0 40 820 222";

const SCENARIOS: PScenario[] = [
  {
    name: "Phản hồi của khách giữ đúng 1 năm",
    request: "POST /feedback  { text: \"Giao nhanh, đóng gói kỹ\" }",
    toggle: { label: "Bật TTL trên attribute expireAt", initial: false },
    action: "Gửi phản hồi",
    layout: (ttl) => ({
      viewBox: VB,
      aria: "Phản hồi đi qua API Gateway, SQS, Lambda gọi Comprehend rồi lưu vào DynamoDB",
      nodes: [
        { id: "user", x: 50, y: 120, l1: "Khách", user: true },
        { id: "api", x: 185, y: 120, w: 120, l1: "API Gateway" },
        { id: "sqs", x: 335, y: 120, w: 110, l1: "SQS", l2: "đệm lúc dồn dập" },
        { id: "fn", x: 495, y: 120, w: 140, l1: "Lambda", l2: "gọi Comprehend" },
        { id: "ddb", x: 690, y: 120, w: 160, l1: "DynamoDB", l2: ttl ? "TTL: expireAt" : "table Feedback" },
        ...(ttl ? [] : [{ id: "clean", x: 690, y: 222, w: 190, l1: "Lambda dọn dẹp", l2: "Scan + Delete mỗi đêm" }]),
      ],
      links: [["user", "api"], ["api", "sqs"], ["sqs", "fn"], ["fn", "ddb"], ...(ttl ? [] : [["clean", "ddb"] as [string, string]])],
    }),
    run: (ttl) => ({
      steps: [
        { at: "api", state: "pass", msg: "Nhận phản hồi, trả lời khách ngay." },
        { at: "sqs", state: "pass", msg: "Lúc ra mắt sản phẩm, phản hồi đổ về hàng nghìn mỗi giờ. Hàng đợi giữ lại, không rơi cái nào." },
        { at: "fn", state: "change", tag: "PHÂN TÍCH", msg: "Lambda đọc theo batch, gọi **Amazon Comprehend** chấm điểm cảm xúc: tích cực." },
        { at: "ddb", state: "pass", msg: "Lưu phản hồi kèm điểm cảm xúc." },
        ttl
          ? { at: "ddb", jump: true, state: "change", tag: "TTL", msg: "Item có `expireAt` = lúc gửi + 365 × 86.400 (Unix epoch, đơn vị giây). Hết hạn thì DynamoDB tự xóa, **không tốn WCU**." }
          : { at: "clean", jump: true, state: "wait", tag: "TỐN", msg: "Mỗi đêm Lambda Scan cả bảng tìm item quá 1 năm rồi xóa từng cái: tốn RCU, WCU và phải tự bảo trì code." },
      ],
      ok: ttl,
      result: ttl
        ? "Không cần job dọn dẹp. TTL xóa trong vòng vài ngày sau khi hết hạn; nếu cần chặt hơn thì lọc `expireAt` khi đọc."
        : "Chạy được nhưng tốn tiền và công. Bật TTL để DynamoDB tự xóa item cũ.",
    }),
  },
  {
    name: "Gửi email chào khách mới",
    request: "PutItem Customers  { id: \"KH#9012\", email: \"lan@…\" }",
    toggle: { label: "Bật DynamoDB Streams + Lambda", initial: false },
    action: "Khách đăng ký",
    layout: (on) => ({
      viewBox: VB,
      aria: "Item mới trong DynamoDB đi qua DynamoDB Streams tới Lambda rồi Amazon SES",
      nodes: [
        { id: "user", x: 60, y: 150, l1: "Khách đăng ký", user: true },
        { id: "ddb", x: 220, y: 150, w: 130, l1: "DynamoDB", l2: "table Customers" },
        { id: "stream", x: 390, y: 150, w: 150, l1: "DynamoDB Streams", l2: on ? "NEW_IMAGE" : "(chưa bật)" },
        { id: "fn", x: 560, y: 150, w: 120, l1: "Lambda", l2: "soạn email" },
        { id: "ses", x: 720, y: 150, w: 120, l1: "Amazon SES" },
      ],
      links: [["user", "ddb"], ["ddb", "stream"], ["stream", "fn"], ["fn", "ses"]],
    }),
    run: (on) => on
      ? { steps: [
            { at: "ddb", state: "pass", msg: "Lưu khách mới." },
            { at: "stream", state: "pass", msg: "Ghi lại thay đổi `INSERT` kèm item mới, đúng thứ tự, giữ trong **24 giờ**." },
            { at: "fn", state: "pass", msg: "Lambda được gọi với batch bản ghi từ stream." },
            { at: "ses", state: "pass", flash: "email", msg: "Gửi email chào mừng." },
          ], ok: true, back: false, result: "Streams ghi lại sự kiện, Lambda mới là thứ xử lý. Hai thứ này luôn đi cặp khi muốn \"có thay đổi thì làm gì đó\"." }
      : { steps: [
            { at: "ddb", state: "pass", msg: "Lưu khách mới." },
            { at: "stream", state: "skip", msg: "Chưa bật Streams. Không có gì báo ra ngoài là vừa có item mới." },
          ], ok: false, back: false, result: "Không ai biết có khách mới. Bật Streams (view type NEW_IMAGE) và gắn Lambda làm trigger." },
  },
  {
    name: "Giao dịch có số thẻ",
    request: "{ orderId: 88, card: \"4111 1111 1111 1111\", amount: 450000 }",
    toggle: { label: "Làm sạch trước khi ghi: Kinesis Data Streams → Lambda", initial: false },
    action: "Gửi giao dịch",
    layout: (clean) => clean
      ? {
          viewBox: VB,
          aria: "Giao dịch vào Kinesis Data Streams, Lambda bỏ số thẻ rồi ghi DynamoDB, ứng dụng nội bộ đọc cùng stream",
          nodes: [
            { id: "pay", x: 70, y: 110, w: 120, l1: "Cổng thanh toán" },
            { id: "kds", x: 260, y: 110, w: 160, l1: "Kinesis Data Streams" },
            { id: "fn", x: 460, y: 110, w: 130, l1: "Lambda", l2: "bỏ số thẻ" },
            { id: "ddb", x: 680, y: 110, w: 160, l1: "DynamoDB", l2: "giao dịch đã làm sạch" },
            { id: "apps", x: 460, y: 222, w: 180, l1: "Ứng dụng nội bộ", l2: "đối soát, chống gian lận" },
          ],
          links: [["pay", "kds"], ["kds", "fn"], ["fn", "ddb"], ["kds", "apps"]],
        }
      : {
          viewBox: VB,
          aria: "Giao dịch thô được ghi thẳng vào DynamoDB",
          nodes: [
            { id: "pay", x: 90, y: 150, w: 130, l1: "Cổng thanh toán" },
            { id: "ddb", x: 380, y: 150, w: 170, l1: "DynamoDB", l2: "giao dịch thô" },
            { id: "rule", x: 650, y: 150, w: 200, l1: "\"Rule tự xóa số thẻ\"", l2: "không tồn tại" },
          ],
          links: [["pay", "ddb"], ["ddb", "rule"]],
        },
    run: (clean) => clean
      ? { steps: [
            { at: "kds", state: "pass", msg: "Hàng trăm nghìn giao dịch đi vào stream gần thời gian thực." },
            { at: "fn", state: "change", tag: "LÀM SẠCH", msg: "Lambda bỏ trường `card` trước khi lưu." },
            { at: "ddb", state: "pass", msg: "Chỉ giao dịch đã làm sạch nằm trong bảng, đọc nhanh theo `orderId`." },
            { at: "apps", from: "kds", state: "pass", msg: "Các ứng dụng khác cùng đọc stream, mỗi ứng dụng một consumer." },
          ], ok: true, back: false, result: "Số thẻ không bao giờ nằm trong bảng DynamoDB, DynamoDB Streams hay backup của bảng." }
      : { steps: [
            { at: "ddb", state: "change", tag: "LỘ", msg: "Số thẻ được lưu nguyên văn." },
            { at: "rule", state: "block", msg: "DynamoDB không có \"rule\" tự sửa item sau khi ghi. Streams chỉ báo thay đổi, không sửa gì." },
          ], ok: false, back: false, result: "Dữ liệu nhạy cảm đã nằm trong bảng, trong stream và trong backup. Phải làm sạch **trước khi ghi**." },
  },
  {
    name: "Máy quét ở kho gửi dữ liệu liên tục",
    request: "scan { sku: \"AO-THUN-M\", kho: \"HCM-2\", qty: -1 }",
    toggle: { label: "Đổi sang SQS + Lambda", initial: false },
    action: "Gửi dữ liệu",
    layout: (sqs) => ({
      viewBox: VB,
      aria: "Dữ liệu từ máy quét đi vào DynamoDB qua Firehose hoặc qua SQS và Lambda",
      nodes: [
        { id: "dev", x: 80, y: 150, w: 130, l1: "Máy quét mã vạch", l2: "hàng nghìn máy" },
        ...(sqs
          ? [
              { id: "sqs", x: 280, y: 150, w: 120, l1: "SQS", l2: "standard queue" },
              { id: "fn", x: 470, y: 150, w: 140, l1: "Lambda", l2: "đọc theo batch" },
            ]
          : [{ id: "fh", x: 370, y: 150, w: 170, l1: "Data Firehose", l2: "đích: S3, Redshift, …" }]),
        { id: "ddb", x: 690, y: 150, w: 160, l1: "DynamoDB", l2: "on-demand" },
      ],
      links: sqs ? [["dev", "sqs"], ["sqs", "fn"], ["fn", "ddb"]] : [["dev", "fh"], ["fh", "ddb"]],
    }),
    run: (sqs) => sqs
      ? { steps: [
            { at: "sqs", state: "pass", msg: "Hàng đợi nhận mọi lượt quét, không cần đặt trước capacity." },
            { at: "fn", state: "pass", msg: "Lambda tự poll hàng đợi, tự tăng số bản chạy khi hàng đợi dài ra." },
            { at: "ddb", state: "pass", msg: "Ghi tồn kho. Bảng on-demand tự co giãn theo lượng ghi." },
          ], ok: true, back: false, result: "Toàn bộ là serverless, không có server hay shard nào phải chỉnh tay khi lượng dữ liệu thay đổi." }
      : { steps: [
            { at: "fh", state: "pass", msg: "Firehose nhận dữ liệu." },
            { at: "ddb", state: "block", msg: "DynamoDB không phải đích của Firehose. Firehose giao tới S3, Redshift, OpenSearch, HTTP endpoint…" },
          ], ok: false, back: false, result: "Không ghi được. Muốn đưa dữ liệu vào DynamoDB mà không quản lý server: SQS → Lambda → DynamoDB." },
  },
];

export default function DataFlowSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một luồng dữ liệu của ShopViet, chạy thử, rồi bật công tắc để sửa và chạy lại." />;
}
