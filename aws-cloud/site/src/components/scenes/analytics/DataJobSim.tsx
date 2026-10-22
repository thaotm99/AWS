import PacketSim, { type PScenario } from "../elb/PacketSim";

// ShopViet's data jobs, each with the AWS service that fits it: Athena for SQL straight
// on S3, Glue + Redshift Serverless (+ Redshift ML) for a daily warehouse load, Glue
// DataBrew for code-free cleaning, Transcribe + Athena for call recordings, Kinesis +
// OpenSearch + QuickSight for live search, Neptune for friend graphs, cold warehouse
// data on S3 Standard-IA, and object ownership when Redshift UNLOADs to another account.

const VB = "0 40 820 222";
const Y = 150;

const SCENARIOS: PScenario[] = [
  {
    name: "Kiểm tra nhanh dữ liệu click bằng SQL",
    request: "SELECT count(*) FROM clicks WHERE user_id IS NULL",
    toggle: { label: "Sử dụng Athena truy vấn trực tiếp trên S3", initial: false },
    action: "Chạy query",
    layout: (athena) => ({
      viewBox: VB,
      aria: "Analyst chạy SQL trên dữ liệu click lưu tại S3",
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Kỹ sư dữ liệu", user: true },
        { id: "engine", x: 280, y: Y, w: 190, l1: athena ? "Amazon Athena" : "Redshift / EMR cluster", l2: athena ? "serverless" : "chạy liên tục cả ngày" },
        ...(athena ? [] : [{ id: "load", x: 520, y: 236, w: 170, l1: "Job nạp mỗi giờ", l2: "cần phát triển, giám sát" }]),
        { id: "s3", x: 700, y: Y, w: 160, l1: "S3 raw zone", l2: "tệp JSON click" },
      ],
      links: [["user", "engine"], ["engine", "s3"], ...(athena ? [] : [["load", "s3"] as [string, string]])],
    }),
    run: (athena) => athena
      ? { steps: [
            { at: "engine", state: "pass", msg: "Không cần khởi động cluster. Bảng được định nghĩa trong Glue Data Catalog." },
            { at: "s3", state: "pass", flash: "4 s", msg: "Athena đọc trực tiếp tệp trên S3, chỉ tính phí theo lượng dữ liệu được quét." },
          ], ok: true, result: "Kiểm tra dữ liệu thô bằng SQL chuẩn, không cần nạp dữ liệu, không cluster, không bảo trì." }
      : { steps: [
            { at: "load", jump: true, state: "wait", tag: "VẬN HÀNH", msg: "Trước đó cần một job nạp dữ liệu mới vào cluster mỗi giờ." },
            { at: "engine", state: "pass", msg: "Truy vấn thực thi được trên dữ liệu đã nạp." },
          ], ok: false, result: "Giải pháp hoạt động nhưng phát sinh chi phí cluster cả ngày và tốn công vận hành cho một tác vụ kiểm tra nhỏ." },
  },
  {
    name: "Nạp kho dữ liệu mỗi sáng, analyst xây dựng ML bằng SQL",
    request: "06:00  S3 data lake → kho dữ liệu → dashboard và mô hình dự báo",
    toggle: { label: "Sử dụng dịch vụ serverless", initial: false },
    action: "Chạy job sáng",
    layout: (sl) => ({
      viewBox: VB,
      aria: "Dữ liệu từ S3 được biến đổi rồi nạp vào kho dữ liệu; analyst tạo mô hình bằng SQL",
      nodes: [
        { id: "s3", x: 80, y: Y, w: 130, l1: "S3 data lake", l2: "log giao dịch" },
        { id: "etl", x: 280, y: Y, w: 170, l1: sl ? "AWS Glue job" : "EMR cluster (Spark)", l2: sl ? "ETL serverless" : "tự quản lý node" },
        { id: "dw", x: 500, y: Y, w: 190, l1: sl ? "Redshift Serverless" : "Redshift (provisioned)", l2: "MPP, xử lý song song" },
        { id: "ml", x: 712, y: Y, w: 180, l1: "Redshift ML", l2: "CREATE MODEL bằng SQL" },
      ],
      links: [["s3", "etl"], ["etl", "dw"], ["dw", "ml"]],
    }),
    run: (sl) => sl
      ? { steps: [
            { at: "etl", state: "pass", msg: "Glue đọc, làm sạch và biến đổi dữ liệu. Glue là dịch vụ serverless, không có hạ tầng cần quản lý." },
            { at: "dw", state: "pass", msg: "Nạp vào **Redshift Serverless**: kho dữ liệu MPP, tự động co giãn, không cần quản lý node." },
            { at: "ml", state: "pass", msg: "Analyst viết `CREATE MODEL` bằng SQL, không cần code Python." },
          ], ok: true, back: false, result: "Toàn bộ pipeline là serverless: không có cluster nào cần chọn kích thước, vá lỗi hay bật tắt." }
      : { steps: [
            { at: "etl", state: "change", tag: "VẬN HÀNH", msg: "Phải chọn kích thước cluster, khởi động mỗi sáng và tắt khi hoàn tất." },
            { at: "dw", state: "change", tag: "VẬN HÀNH", msg: "Cluster provisioned: tự chọn số node và tự resize khi dữ liệu tăng." },
            { at: "ml", state: "pass", msg: "Mô hình vẫn tạo được bằng SQL." },
          ], ok: false, back: false, result: "Giải pháp hoạt động nhưng phát sinh nhiều tác vụ vận hành. Kiến trúc serverless: Glue + Redshift Serverless." },
  },
  {
    name: "Analyst tự làm sạch dữ liệu, không viết code",
    request: "Lọc bất thường, chuẩn hoá ngày giờ, gộp theo nhóm người dùng",
    toggle: { label: "Sử dụng AWS Glue DataBrew", initial: false },
    action: "Làm sạch",
    layout: (brew) => ({
      viewBox: VB,
      aria: "Analyst làm sạch tệp Parquet trên S3 bằng công cụ trực quan hoặc bằng code",
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Analyst", user: true },
        { id: "tool", x: 300, y: Y, w: 200, l1: brew ? "Glue DataBrew" : "Glue ETL job", l2: brew ? "recipe kéo thả" : "viết PySpark" },
        { id: "out", x: 640, y: Y, w: 190, l1: "S3 refined zone", l2: "Parquet đã làm sạch" },
      ],
      links: [["user", "tool"], ["tool", "out"]],
    }),
    run: (brew) => brew
      ? { steps: [
            { at: "tool", state: "pass", msg: "Lựa chọn trong hơn 250 phép biến đổi có sẵn. Mỗi bước được lưu vào **recipe** và có thể chia sẻ cho cả nhóm. Hỗ trợ **data profiling** và lineage." },
            { at: "out", state: "pass", msg: "Job DataBrew áp dụng recipe trên toàn bộ dữ liệu." },
          ], ok: true, result: "Analyst và kỹ sư cùng làm việc trên một giao diện trực quan, không cần viết hay bảo trì code." }
      : { steps: [
            { at: "tool", state: "block", tag: "CẦN CODE", msg: "Job ETL được viết bằng Python/Scala. Analyst không viết code phải phụ thuộc vào kỹ sư." },
          ], ok: false, result: "Chuẩn bị dữ liệu trực quan, không cần code, có profiling: Glue DataBrew." },
  },
  {
    name: "Phân tích ghi âm cuộc gọi chăm sóc khách hàng",
    request: "Trong tuần này, bao nhiêu cuộc gọi có khiếu nại về giao hàng?",
    action: "Phân tích",
    layout: {
      viewBox: VB,
      aria: "Tệp ghi âm trên S3 được Transcribe chuyển thành văn bản, sau đó Athena chạy SQL",
      nodes: [
        { id: "rec", x: 80, y: Y, w: 140, l1: "S3", l2: "tệp ghi âm" },
        { id: "tr", x: 280, y: Y, w: 170, l1: "Amazon Transcribe", l2: "giọng nói → văn bản" },
        { id: "txt", x: 480, y: Y, w: 130, l1: "S3", l2: "bản ghi văn bản" },
        { id: "ath", x: 680, y: Y, w: 160, l1: "Amazon Athena", l2: "SQL tuỳ ý" },
      ],
      links: [["rec", "tr"], ["tr", "txt"], ["txt", "ath"]],
    },
    run: () => ({
      steps: [
        { at: "tr", state: "change", tag: "CHUYỂN", msg: "Transcribe chuyển ghi âm thành văn bản, phân tách lời của từng người nói." },
        { at: "txt", state: "pass", msg: "Kết quả JSON được lưu trên S3." },
        { at: "ath", state: "pass", msg: "Analyst chạy SQL ad-hoc trên bản ghi văn bản: đếm từ khoá, lọc theo ngày, theo nhân viên." },
      ],
      ok: true,
      back: false,
      result: "Tự động hoá tác vụ trước đây phải nghe thủ công. Khi cần dashboard, kết nối QuickSight với Athena.",
    }),
  },
  {
    name: "Tìm kiếm đơn hàng và dashboard thời gian thực",
    request: "Tìm \"áo khoác đỏ size M giao Đà Nẵng\" trong đơn hàng 5 phút gần nhất",
    toggle: { label: "Đánh index vào OpenSearch", initial: false },
    action: "Tìm",
    layout: (os) => ({
      viewBox: VB,
      aria: "Đơn hàng đi qua Kinesis Data Streams vào kho tìm kiếm, QuickSight hiển thị dashboard",
      nodes: [
        { id: "src", x: 70, y: Y, w: 120, l1: "Hệ thống đơn", l2: "nhiều nguồn" },
        { id: "kds", x: 250, y: Y, w: 170, l1: "Kinesis Data Streams" },
        { id: "store", x: 480, y: Y, w: 200, l1: os ? "OpenSearch Service" : "DynamoDB", l2: os ? "full-text index" : "chỉ tìm theo key" },
        { id: "qs", x: 710, y: Y, w: 140, l1: "QuickSight", l2: "dashboard" },
      ],
      links: [["src", "kds"], ["kds", "store"], ["store", "qs"]],
    }),
    run: (os) => os
      ? { steps: [
            { at: "kds", state: "pass", msg: "Tiếp nhận dữ liệu từ nhiều nguồn gần thời gian thực." },
            { at: "store", state: "pass", flash: "120 kết quả", msg: "OpenSearch đánh index từng đơn hàng và hỗ trợ tìm kiếm full-text." },
            { at: "qs", state: "pass", msg: "QuickSight hiển thị dashboard tương tác cho đội vận hành." },
          ], ok: true, back: false, result: "Tìm kiếm và dashboard thời gian thực bằng các dịch vụ managed." }
      : { steps: [
            { at: "kds", state: "pass", msg: "Tiếp nhận dữ liệu gần thời gian thực." },
            { at: "store", state: "block", msg: "DynamoDB không hỗ trợ tìm kiếm full-text; chỉ truy vấn theo key hoặc Scan toàn bộ bảng." },
          ], ok: false, back: false, result: "Tìm kiếm văn bản tự do: OpenSearch Service." },
  },
  {
    name: "Gợi ý sản phẩm theo mạng quan hệ bạn bè",
    request: "Sản phẩm được bạn của bạn bè người dùng KH#4521 thích nhiều nhất",
    toggle: { label: "Sử dụng Amazon Neptune (graph)", initial: false },
    action: "Gợi ý",
    layout: (neptune) => ({
      viewBox: VB,
      aria: "Ứng dụng truy vấn database quan hệ hoặc graph database về bạn bè và lượt thích",
      nodes: [
        { id: "user", x: 70, y: Y, l1: "Người dùng", user: true },
        { id: "app", x: 280, y: Y, w: 140, l1: "App ShopViet" },
        { id: "db", x: 580, y: Y, w: 230, l1: neptune ? "Amazon Neptune" : "Aurora", l2: neptune ? "graph: người dùng → bạn → thích" : "JOIN bảng bạn bè nhiều tầng" },
      ],
      links: [["user", "app"], ["app", "db"]],
    }),
    run: (neptune) => neptune
      ? { steps: [
            { at: "app", state: "pass", msg: "Gửi truy vấn graph." },
            { at: "db", state: "pass", flash: "30 ms", msg: "Neptune duyệt theo cạnh: người dùng → bạn → bạn của bạn → sản phẩm được thích." },
          ], ok: true, result: "Dữ liệu có nhiều quan hệ đan xen (mạng xã hội, gợi ý, phát hiện gian lận): graph database." }
      : { steps: [
            { at: "app", state: "pass", msg: "Gửi truy vấn SQL." },
            { at: "db", state: "wait", flash: "8 s", msg: "Mỗi tầng quan hệ là một lần self-JOIN; số tầng càng nhiều, truy vấn càng chậm." },
          ], ok: false, result: "Truy vấn thực thi được nhưng rất chậm khi mạng quan hệ lớn. Truy vấn theo quan hệ: Amazon Neptune." },
  },
  {
    name: "Báo cáo cũ hơn 30 ngày ít được truy cập",
    request: "SELECT … FROM sales_2025_q4  (vài lần mỗi quý)",
    toggle: { label: "Chuyển sang S3 Standard-IA, truy vấn bằng Athena", initial: false },
    action: "Chạy query",
    layout: (cold) => ({
      viewBox: VB,
      aria: "Dữ liệu cũ lưu trong Redshift hoặc trên S3 Standard-IA và được truy vấn bằng Athena",
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Kế toán", user: true },
        { id: "engine", x: 320, y: Y, w: 200, l1: cold ? "Amazon Athena" : "Redshift cluster", l2: cold ? "tính phí theo dữ liệu quét" : "lưu cả dữ liệu hiếm dùng" },
        { id: "data", x: 640, y: Y, w: 200, l1: cold ? "S3 Standard-IA" : "Storage của cluster", l2: cold ? "chi phí thấp, truy xuất ngay" : "tính phí như dữ liệu nóng" },
      ],
      links: [["user", "engine"], ["engine", "data"]],
    }),
    run: (cold) => cold
      ? { steps: [
            { at: "engine", state: "pass", msg: "Không có cluster nào chạy thường trực." },
            { at: "data", state: "pass", msg: "Standard-IA dành cho dữ liệu ít truy cập nhưng vẫn truy xuất trong mili giây (có phí truy xuất theo GB). Truy vấn thực thi ngay lập tức." },
          ], ok: true, result: "Vẫn truy vấn bằng SQL, thực thi ngay, không phải duy trì cluster cho dữ liệu hiếm dùng. Glacier Deep Archive có chi phí lưu trữ thấp hơn nữa nhưng phải restore (mất nhiều giờ) trước khi Athena đọc được." }
      : { steps: [
            { at: "engine", state: "pass", msg: "Truy vấn được thực thi." },
            { at: "data", state: "change", tag: "TỐN", msg: "Cluster phải đủ lớn để chứa cả dữ liệu hầu như không được truy cập." },
          ], ok: false, result: "Giải pháp hoạt động, nhưng dữ liệu ít truy cập phải chịu chi phí của kho dữ liệu hiệu năng cao." },
  },
  {
    name: "Redshift UNLOAD sang bucket của đối tác",
    request: "UNLOAD ('SELECT …') TO 's3://doi-tac-bao-cao/'",
    toggle: { label: "Bucket đối tác cấu hình Object Ownership = Bucket owner enforced", initial: false },
    action: "UNLOAD, sau đó đối tác đọc",
    layout: () => ({
      viewBox: VB,
      aria: "Redshift tại account ShopViet ghi tệp vào bucket tại account đối tác, đối tác đọc tệp",
      boxes: [{ x: 20, y: 52, w: 300, h: 196, label: "Account ShopViet" }, { x: 360, y: 52, w: 440, h: 196, label: "Account đối tác" }],
      nodes: [
        { id: "rs", x: 170, y: Y, w: 170, l1: "Redshift", l2: "UNLOAD" },
        { id: "s3", x: 500, y: Y, w: 170, l1: "S3 bucket", l2: "doi-tac-bao-cao" },
        { id: "partner", x: 710, y: Y, l1: "Đối tác", user: true },
      ],
      links: [["rs", "s3"], ["s3", "partner"]],
    }),
    run: (enforced) => enforced
      ? { steps: [
            { at: "s3", state: "change", tag: "GHI", msg: "Tệp được ghi vào bucket. Với **Bucket owner enforced**, ACL bị vô hiệu hoá và mọi object thuộc về chủ sở hữu bucket." },
            { at: "partner", from: "s3", state: "pass", msg: "Đối tác sở hữu mọi object nên đọc được bằng quyền IAM của mình." },
          ], ok: true, back: false, result: "Đọc thành công. Bucket mới mặc định sử dụng Bucket owner enforced." }
      : { steps: [
            { at: "s3", state: "change", tag: "GHI", msg: "Tệp được ghi vào bucket, nhưng bucket vẫn bật ACL (Object writer): object thuộc về **account đã ghi**, tức ShopViet." },
            { at: "partner", from: "s3", state: "block", tag: "403", flash: "403", msg: "Chủ sở hữu bucket không mặc nhiên có quyền trên object do account khác ghi vào." },
          ], ok: false, back: false, result: "AccessDenied dù là bucket của chính đối tác. Cấu hình Object Ownership = Bucket owner enforced để chủ sở hữu bucket sở hữu mọi object." },
  },
];

export default function DataJobSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tác vụ dữ liệu của ShopViet và chạy mô phỏng, sau đó bật tuỳ chọn để chuyển sang công cụ phù hợp hơn." />;
}
