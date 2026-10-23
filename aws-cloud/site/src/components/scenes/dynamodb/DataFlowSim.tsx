import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Data flowing into and out of MFTech's DynamoDB tables: feedback kept one year
// with TTL, a welcome email from DynamoDB Streams + Lambda, card numbers removed
// before they are written (Kinesis Data Streams + Lambda), and warehouse scanners
// that need SQS + Lambda because Firehose cannot write to DynamoDB.

const VB = "0 40 820 222";
type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): PScenario[] => [
  {
    name: L({ vi: "Lưu giữ phản hồi người dùng đúng 1 năm", en: "Keep user feedback for exactly 1 year" }),
    request: L({ vi: "POST /feedback  { text: \"Giao nhanh, đóng gói kỹ\" }", en: "POST /feedback  { text: \"Fast delivery, well packed\" }" }),
    toggle: { label: L({ vi: "Bật TTL trên attribute expireAt", en: "Enable TTL on the expireAt attribute" }), initial: false },
    action: L({ vi: "Gửi phản hồi", en: "Send feedback" }),
    layout: (ttl) => ({
      viewBox: VB,
      aria: L({ vi: "Phản hồi đi qua API Gateway, SQS, Lambda gọi Comprehend rồi được lưu vào DynamoDB", en: "Feedback passes through API Gateway and SQS to a Lambda function that calls Comprehend, then is stored in DynamoDB" }),
      nodes: [
        { id: "user", x: 50, y: 120, l1: L({ vi: "Người dùng", en: "User" }), user: true },
        { id: "api", x: 185, y: 120, w: 120, l1: "API Gateway" },
        { id: "sqs", x: 335, y: 120, w: 110, l1: "SQS", l2: L({ vi: "đệm khi tải cao", en: "buffers peaks" }) },
        { id: "fn", x: 495, y: 120, w: 140, l1: "Lambda", l2: L({ vi: "gọi Comprehend", en: "calls Comprehend" }) },
        { id: "ddb", x: 690, y: 120, w: 160, l1: "DynamoDB", l2: ttl ? "TTL: expireAt" : "table Feedback" },
        ...(ttl ? [] : [{ id: "clean", x: 690, y: 222, w: 190, l1: L({ vi: "Lambda dọn dẹp", en: "Cleanup Lambda" }), l2: L({ vi: "Scan + Delete mỗi đêm", en: "Scan + Delete nightly" }) }]),
      ],
      links: [["user", "api"], ["api", "sqs"], ["sqs", "fn"], ["fn", "ddb"], ...(ttl ? [] : [["clean", "ddb"] as [string, string]])],
    }),
    run: (ttl) => ({
      steps: [
        { at: "api", state: "pass", msg: L({ vi: "Tiếp nhận phản hồi và trả kết quả cho người dùng ngay.", en: "Accepts the feedback and responds to the user immediately." }) },
        { at: "sqs", state: "pass", msg: L({ vi: "Khi ra mắt sản phẩm, lượng phản hồi lên tới hàng nghìn mỗi giờ. Hàng đợi lưu giữ toàn bộ message, không thất thoát message nào.", en: "At a product launch, feedback reaches thousands of messages an hour. The queue keeps every message; none are lost." }) },
        { at: "fn", state: "change", tag: L({ vi: "PHÂN TÍCH", en: "ANALYZE" }), msg: L({ vi: "Lambda đọc theo batch và gọi **Amazon Comprehend** để phân tích cảm xúc: tích cực.", en: "Lambda reads in batches and calls **Amazon Comprehend** for sentiment analysis: positive." }) },
        { at: "ddb", state: "pass", msg: L({ vi: "Lưu phản hồi kèm kết quả phân tích cảm xúc.", en: "Stores the feedback with the sentiment result." }) },
        ttl
          ? { at: "ddb", jump: true, state: "change", tag: "TTL", msg: L({ vi: "Item có `expireAt` = thời điểm gửi + 365 × 86.400 (Unix epoch, đơn vị giây). Khi hết hạn, DynamoDB tự động xoá item, **không tiêu tốn WCU**.", en: "The item has `expireAt` = submission time + 365 × 86,400 (Unix epoch, in seconds). When it expires, DynamoDB deletes the item automatically, **consuming no WCUs**." }) }
          : { at: "clean", jump: true, state: "wait", tag: L({ vi: "TỐN", en: "COST" }), msg: L({ vi: "Hằng đêm, Lambda Scan toàn bộ bảng để tìm item quá 1 năm rồi xoá từng item: tiêu tốn RCU, WCU và phải tự bảo trì code.", en: "Every night, a Lambda function scans the whole table for items older than 1 year and deletes them one by one: it consumes RCUs and WCUs, and you must maintain the code yourself." }) },
      ],
      ok: ttl,
      result: ttl
        ? L({ vi: "Không cần job dọn dẹp. TTL xoá item trong vòng vài ngày sau khi hết hạn; nếu cần kiểm soát chặt chẽ hơn, lọc theo `expireAt` khi đọc.", en: "No cleanup job is needed. TTL deletes items within a few days after they expire; if you need tighter control, filter on `expireAt` when reading." })
        : L({ vi: "Giải pháp hoạt động nhưng tốn chi phí và công sức vận hành. Bật TTL để DynamoDB tự động xoá item cũ.", en: "The solution works but costs money and operational effort. Enable TTL so DynamoDB deletes old items automatically." }),
    }),
  },
  {
    name: L({ vi: "Gửi email chào mừng người dùng mới", en: "Send new users a welcome email" }),
    request: "PutItem Customers  { id: \"KH#9012\", email: \"lan@…\" }",
    toggle: { label: L({ vi: "Bật DynamoDB Streams + Lambda", en: "Enable DynamoDB Streams + Lambda" }), initial: false },
    action: L({ vi: "Người dùng đăng ký", en: "User signs up" }),
    layout: (on) => ({
      viewBox: VB,
      aria: L({ vi: "Item mới trong DynamoDB đi qua DynamoDB Streams tới Lambda rồi Amazon SES", en: "A new DynamoDB item flows through DynamoDB Streams to Lambda and then Amazon SES" }),
      nodes: [
        { id: "user", x: 60, y: 150, l1: L({ vi: "Người dùng đăng ký", en: "New user" }), user: true },
        { id: "ddb", x: 220, y: 150, w: 130, l1: "DynamoDB", l2: "table Customers" },
        { id: "stream", x: 390, y: 150, w: 150, l1: "DynamoDB Streams", l2: on ? "NEW_IMAGE" : L({ vi: "(chưa bật)", en: "(not enabled)" }) },
        { id: "fn", x: 560, y: 150, w: 120, l1: "Lambda", l2: L({ vi: "soạn email", en: "writes email" }) },
        { id: "ses", x: 720, y: 150, w: 120, l1: "Amazon SES" },
      ],
      links: [["user", "ddb"], ["ddb", "stream"], ["stream", "fn"], ["fn", "ses"]],
    }),
    run: (on) => on
      ? { steps: [
            { at: "ddb", state: "pass", msg: L({ vi: "Lưu người dùng mới.", en: "Stores the new user." }) },
            { at: "stream", state: "pass", msg: L({ vi: "Ghi lại thay đổi `INSERT` kèm item mới, đúng thứ tự, lưu giữ trong **24 giờ**.", en: "Records the `INSERT` change with the new item, in order, retained for **24 hours**." }) },
            { at: "fn", state: "pass", msg: L({ vi: "Lambda được gọi với một batch bản ghi từ stream.", en: "Lambda is invoked with a batch of stream records." }) },
            { at: "ses", state: "pass", flash: "email", msg: L({ vi: "Gửi email chào mừng.", en: "Sends the welcome email." }) },
          ], ok: true, back: false, result: L({ vi: "Streams ghi lại sự kiện; Lambda đảm nhận việc xử lý. Hai thành phần này luôn được kết hợp khi cần xử lý theo sự kiện thay đổi dữ liệu.", en: "Streams records the event; Lambda does the processing. These two are always combined when you need to act on data change events." }) }
      : { steps: [
            { at: "ddb", state: "pass", msg: L({ vi: "Lưu người dùng mới.", en: "Stores the new user." }) },
            { at: "stream", state: "skip", msg: L({ vi: "Streams chưa được bật. Không có thông báo nào ra bên ngoài khi có item mới.", en: "Streams is not enabled. Nothing outside the table is notified of the new item." }) },
          ], ok: false, back: false, result: L({ vi: "Không thành phần nào nhận biết có người dùng mới. Bật Streams (view type NEW_IMAGE) và gắn Lambda làm trigger.", en: "No component knows there is a new user. Enable Streams (view type NEW_IMAGE) and attach Lambda as a trigger." }) },
  },
  {
    name: L({ vi: "Giao dịch chứa số thẻ", en: "Transactions with card numbers" }),
    request: "{ orderId: 88, card: \"4111 1111 1111 1111\", amount: 450000 }",
    toggle: { label: L({ vi: "Làm sạch trước khi ghi: Kinesis Data Streams → Lambda", en: "Sanitize before writing: Kinesis Data Streams → Lambda" }), initial: false },
    action: L({ vi: "Gửi giao dịch", en: "Send transaction" }),
    layout: (clean) => clean
      ? {
          viewBox: VB,
          aria: L({ vi: "Giao dịch đi vào Kinesis Data Streams, Lambda loại bỏ số thẻ rồi ghi DynamoDB, ứng dụng nội bộ đọc cùng stream", en: "Transactions enter Kinesis Data Streams, Lambda removes the card number and writes to DynamoDB, and internal applications read the same stream" }),
          nodes: [
            { id: "pay", x: 70, y: 110, w: 120, l1: L({ vi: "Cổng thanh toán", en: "Payment gateway" }) },
            { id: "kds", x: 260, y: 110, w: 160, l1: "Kinesis Data Streams" },
            { id: "fn", x: 460, y: 110, w: 130, l1: "Lambda", l2: L({ vi: "loại bỏ số thẻ", en: "removes card no." }) },
            { id: "ddb", x: 680, y: 110, w: 160, l1: "DynamoDB", l2: L({ vi: "giao dịch đã làm sạch", en: "sanitized transactions" }) },
            { id: "apps", x: 460, y: 222, w: 180, l1: L({ vi: "Ứng dụng nội bộ", en: "Internal applications" }), l2: L({ vi: "đối soát, chống gian lận", en: "reconciliation, anti-fraud" }) },
          ],
          links: [["pay", "kds"], ["kds", "fn"], ["fn", "ddb"], ["kds", "apps"]],
        }
      : {
          viewBox: VB,
          aria: L({ vi: "Giao dịch thô được ghi trực tiếp vào DynamoDB", en: "Raw transactions are written directly to DynamoDB" }),
          nodes: [
            { id: "pay", x: 90, y: 150, w: 130, l1: L({ vi: "Cổng thanh toán", en: "Payment gateway" }) },
            { id: "ddb", x: 380, y: 150, w: 170, l1: "DynamoDB", l2: L({ vi: "giao dịch thô", en: "raw transactions" }) },
            { id: "rule", x: 650, y: 150, w: 200, l1: L({ vi: "\"Rule tự xóa số thẻ\"", en: "\"Card-scrubbing rule\"" }), l2: L({ vi: "không tồn tại", en: "does not exist" }) },
          ],
          links: [["pay", "ddb"], ["ddb", "rule"]],
        },
    run: (clean) => clean
      ? { steps: [
            { at: "kds", state: "pass", msg: L({ vi: "Hàng trăm nghìn giao dịch được đưa vào stream gần thời gian thực.", en: "Hundreds of thousands of transactions enter the stream in near real time." }) },
            { at: "fn", state: "change", tag: L({ vi: "LÀM SẠCH", en: "SANITIZE" }), msg: L({ vi: "Lambda loại bỏ trường `card` trước khi lưu.", en: "Lambda removes the `card` field before storing." }) },
            { at: "ddb", state: "pass", msg: L({ vi: "Bảng chỉ chứa giao dịch đã làm sạch, truy xuất nhanh theo `orderId`.", en: "The table holds only sanitized transactions, retrieved quickly by `orderId`." }) },
            { at: "apps", from: "kds", state: "pass", msg: L({ vi: "Các ứng dụng khác cùng đọc stream, mỗi ứng dụng là một consumer.", en: "Other applications read the same stream, each as its own consumer." }) },
          ], ok: true, back: false, result: L({ vi: "Số thẻ không bao giờ xuất hiện trong bảng DynamoDB, DynamoDB Streams hay backup của bảng.", en: "The card number never appears in the DynamoDB table, in DynamoDB Streams or in the table’s backups." }) }
      : { steps: [
            { at: "ddb", state: "change", tag: L({ vi: "LỘ", en: "EXPOSED" }), msg: L({ vi: "Số thẻ được lưu ở dạng nguyên bản.", en: "The card number is stored as is." }) },
            { at: "rule", state: "block", msg: L({ vi: "DynamoDB không có \"rule\" tự động sửa item sau khi ghi. Streams chỉ ghi nhận thay đổi, không chỉnh sửa dữ liệu.", en: "DynamoDB has no \"rule\" that edits items automatically after they are written. Streams only records changes; it does not modify data." }) },
          ], ok: false, back: false, result: L({ vi: "Dữ liệu nhạy cảm đã tồn tại trong bảng, trong stream và trong backup. Dữ liệu phải được làm sạch **trước khi ghi**.", en: "The sensitive data now exists in the table, the stream and the backups. Data must be sanitized **before it is written**." }) },
  },
  {
    name: L({ vi: "Máy quét tại kho gửi dữ liệu liên tục", en: "Warehouse scanners send data nonstop" }),
    request: "scan { sku: \"AO-THUN-M\", kho: \"HCM-2\", qty: -1 }",
    toggle: { label: L({ vi: "Chuyển sang SQS + Lambda", en: "Switch to SQS + Lambda" }), initial: false },
    action: L({ vi: "Gửi dữ liệu", en: "Send data" }),
    layout: (sqs) => ({
      viewBox: VB,
      aria: L({ vi: "Dữ liệu từ máy quét được đưa vào DynamoDB qua Firehose hoặc qua SQS và Lambda", en: "Scanner data goes into DynamoDB through Firehose or through SQS and Lambda" }),
      nodes: [
        { id: "dev", x: 80, y: 150, w: 130, l1: L({ vi: "Máy quét mã vạch", en: "Barcode scanners" }), l2: L({ vi: "hàng nghìn máy", en: "thousands of units" }) },
        ...(sqs
          ? [
              { id: "sqs", x: 280, y: 150, w: 120, l1: "SQS", l2: "standard queue" },
              { id: "fn", x: 470, y: 150, w: 140, l1: "Lambda", l2: L({ vi: "đọc theo batch", en: "reads in batches" }) },
            ]
          : [{ id: "fh", x: 370, y: 150, w: 170, l1: "Data Firehose", l2: L({ vi: "đích: S3, Redshift, …", en: "targets: S3, Redshift, …" }) }]),
        { id: "ddb", x: 690, y: 150, w: 160, l1: "DynamoDB", l2: "on-demand" },
      ],
      links: sqs ? [["dev", "sqs"], ["sqs", "fn"], ["fn", "ddb"]] : [["dev", "fh"], ["fh", "ddb"]],
    }),
    run: (sqs) => sqs
      ? { steps: [
            { at: "sqs", state: "pass", msg: L({ vi: "Hàng đợi tiếp nhận mọi lượt quét, không cần cấp phát trước capacity.", en: "The queue accepts every scan with no capacity to provision in advance." }) },
            { at: "fn", state: "pass", msg: L({ vi: "Lambda tự động poll hàng đợi và tăng số lượng thực thi đồng thời khi hàng đợi dài ra.", en: "Lambda polls the queue automatically and scales up concurrent executions as the queue grows." }) },
            { at: "ddb", state: "pass", msg: L({ vi: "Ghi dữ liệu tồn kho. Bảng on-demand tự động co giãn theo lượng ghi.", en: "Writes the inventory data. The on-demand table scales automatically with the write volume." }) },
          ], ok: true, back: false, result: L({ vi: "Toàn bộ kiến trúc là serverless, không có server hay shard nào cần điều chỉnh thủ công khi lượng dữ liệu thay đổi.", en: "The whole architecture is serverless; there are no servers or shards to adjust manually when the data volume changes." }) }
      : { steps: [
            { at: "fh", state: "pass", msg: L({ vi: "Firehose tiếp nhận dữ liệu.", en: "Firehose receives the data." }) },
            { at: "ddb", state: "block", msg: L({ vi: "DynamoDB không phải là đích được Firehose hỗ trợ. Firehose phân phối tới S3, Redshift, OpenSearch, HTTP endpoint…", en: "DynamoDB is not a destination that Firehose supports. Firehose delivers to S3, Redshift, OpenSearch, HTTP endpoints and so on." }) },
          ], ok: false, back: false, result: L({ vi: "Ghi dữ liệu thất bại. Để đưa dữ liệu vào DynamoDB mà không quản lý server: SQS → Lambda → DynamoDB.", en: "The write fails. To get data into DynamoDB without managing servers: SQS → Lambda → DynamoDB." }) },
  },
];

export default function DataFlowSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} hint={L({ vi: "Chọn một luồng dữ liệu của MFTech và chạy mô phỏng, sau đó bật tuỳ chọn cấu hình để khắc phục và chạy lại.", en: "Choose a MFTech data flow and run the simulation, then turn on the configuration option that fixes it and run again." })} />;
}
