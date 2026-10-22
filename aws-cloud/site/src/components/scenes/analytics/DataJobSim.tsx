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
    toggle: { label: "Dùng Athena query thẳng trên S3", initial: false },
    action: "Chạy query",
    layout: (athena) => ({
      viewBox: VB,
      aria: "Analyst chạy SQL trên dữ liệu click nằm ở S3",
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Kỹ sư dữ liệu", user: true },
        { id: "engine", x: 280, y: Y, w: 190, l1: athena ? "Amazon Athena" : "Redshift / EMR cluster", l2: athena ? "serverless" : "chạy cả ngày" },
        ...(athena ? [] : [{ id: "load", x: 520, y: 236, w: 170, l1: "Job nạp mỗi giờ", l2: "phải viết, phải theo dõi" }]),
        { id: "s3", x: 700, y: Y, w: 160, l1: "S3 raw zone", l2: "file JSON click" },
      ],
      links: [["user", "engine"], ["engine", "s3"], ...(athena ? [] : [["load", "s3"] as [string, string]])],
    }),
    run: (athena) => athena
      ? { steps: [
            { at: "engine", state: "pass", msg: "Không có cluster nào phải bật. Bảng được định nghĩa trong Glue Data Catalog." },
            { at: "s3", state: "pass", flash: "4 s", msg: "Athena đọc thẳng file trên S3, chỉ tính tiền theo lượng dữ liệu quét." },
          ], ok: true, result: "Kiểm tra dữ liệu thô bằng SQL chuẩn, không nạp, không cluster, không bảo trì." }
      : { steps: [
            { at: "load", jump: true, state: "wait", tag: "VẬN HÀNH", msg: "Trước đó phải có job nạp dữ liệu mới vào cluster mỗi giờ." },
            { at: "engine", state: "pass", msg: "Query chạy được trên dữ liệu đã nạp." },
          ], ok: false, result: "Chạy được nhưng trả tiền cluster cả ngày và tốn công cho một việc kiểm tra nhỏ." },
  },
  {
    name: "Mỗi sáng nạp kho dữ liệu, analyst làm ML bằng SQL",
    request: "06:00  S3 data lake → kho dữ liệu → dashboard và mô hình dự báo",
    toggle: { label: "Dùng dịch vụ serverless", initial: false },
    action: "Chạy job sáng",
    layout: (sl) => ({
      viewBox: VB,
      aria: "Dữ liệu từ S3 được biến đổi rồi nạp vào kho dữ liệu, analyst tạo mô hình bằng SQL",
      nodes: [
        { id: "s3", x: 80, y: Y, w: 130, l1: "S3 data lake", l2: "log giao dịch" },
        { id: "etl", x: 280, y: Y, w: 170, l1: sl ? "AWS Glue job" : "EMR cluster (Spark)", l2: sl ? "ETL serverless" : "tự chọn, tự tắt node" },
        { id: "dw", x: 500, y: Y, w: 190, l1: sl ? "Redshift Serverless" : "Redshift (provisioned)", l2: "MPP, xử lý song song" },
        { id: "ml", x: 712, y: Y, w: 180, l1: "Redshift ML", l2: "CREATE MODEL bằng SQL" },
      ],
      links: [["s3", "etl"], ["etl", "dw"], ["dw", "ml"]],
    }),
    run: (sl) => sl
      ? { steps: [
            { at: "etl", state: "pass", msg: "Glue đọc, làm sạch, biến đổi. Chỉ trả tiền lúc job chạy." },
            { at: "dw", state: "pass", msg: "Nạp vào **Redshift Serverless**: kho dữ liệu MPP, tự co giãn, không quản lý node." },
            { at: "ml", state: "pass", msg: "Analyst viết `CREATE MODEL` bằng SQL, không cần code Python." },
          ], ok: true, back: false, result: "Cả chuỗi là serverless: không cluster nào phải chọn cỡ, vá lỗi hay tắt bật." }
      : { steps: [
            { at: "etl", state: "change", tag: "VẬN HÀNH", msg: "Phải chọn cỡ cluster, bật lên mỗi sáng, tắt đi khi xong." },
            { at: "dw", state: "change", tag: "VẬN HÀNH", msg: "Cluster provisioned: tự chọn số node, tự resize khi dữ liệu lớn lên." },
            { at: "ml", state: "pass", msg: "Mô hình vẫn tạo được bằng SQL." },
          ], ok: false, back: false, result: "Chạy được nhưng nhiều việc vận hành. Muốn serverless: Glue + Redshift Serverless." },
  },
  {
    name: "Analyst tự làm sạch dữ liệu, không viết code",
    request: "Lọc bất thường, chuẩn hoá ngày giờ, gộp theo nhóm khách",
    toggle: { label: "Dùng AWS Glue DataBrew", initial: false },
    action: "Làm sạch",
    layout: (brew) => ({
      viewBox: VB,
      aria: "Analyst làm sạch file Parquet trên S3 bằng công cụ trực quan hoặc bằng code",
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Analyst", user: true },
        { id: "tool", x: 300, y: Y, w: 200, l1: brew ? "Glue DataBrew" : "Glue ETL job", l2: brew ? "recipe kéo thả" : "viết PySpark" },
        { id: "out", x: 640, y: Y, w: 190, l1: "S3 refined zone", l2: "Parquet đã làm sạch" },
      ],
      links: [["user", "tool"], ["tool", "out"]],
    }),
    run: (brew) => brew
      ? { steps: [
            { at: "tool", state: "pass", msg: "Chọn hơn 250 phép biến đổi có sẵn. Mỗi bước lưu vào **recipe**, chia sẻ được cho cả nhóm. Có **data profiling** và lineage." },
            { at: "out", state: "pass", msg: "Job DataBrew chạy recipe trên toàn bộ dữ liệu." },
          ], ok: true, result: "Analyst và kỹ sư cùng làm trên một giao diện trực quan, không ai phải viết hay bảo trì code." }
      : { steps: [
            { at: "tool", state: "block", tag: "CẦN CODE", msg: "Job ETL viết bằng Python/Scala. Analyst không viết code thì phải chờ kỹ sư." },
          ], ok: false, result: "Chuẩn bị dữ liệu trực quan, không code, có profiling: Glue DataBrew." },
  },
  {
    name: "Nghe lại cuộc gọi chăm sóc khách hàng",
    request: "Cuộc gọi tuần này có bao nhiêu khách phàn nàn về giao hàng?",
    action: "Phân tích",
    layout: {
      viewBox: VB,
      aria: "File ghi âm trên S3 được Transcribe chuyển thành văn bản, rồi Athena chạy SQL",
      nodes: [
        { id: "rec", x: 80, y: Y, w: 140, l1: "S3", l2: "file ghi âm" },
        { id: "tr", x: 280, y: Y, w: 170, l1: "Amazon Transcribe", l2: "giọng nói → văn bản" },
        { id: "txt", x: 480, y: Y, w: 130, l1: "S3", l2: "bản ghi văn bản" },
        { id: "ath", x: 680, y: Y, w: 160, l1: "Amazon Athena", l2: "SQL tuỳ ý" },
      ],
      links: [["rec", "tr"], ["tr", "txt"], ["txt", "ath"]],
    },
    run: () => ({
      steps: [
        { at: "tr", state: "change", tag: "CHUYỂN", msg: "Transcribe chuyển ghi âm thành văn bản, tách riêng lời từng người nói." },
        { at: "txt", state: "pass", msg: "Kết quả JSON lưu lại trên S3." },
        { at: "ath", state: "pass", msg: "Analyst chạy SQL ad-hoc trên bản ghi: đếm từ khoá, lọc theo ngày, theo nhân viên." },
      ],
      ok: true,
      back: false,
      result: "Tự động hoá việc trước đây phải nghe tay. Cần dashboard thì nối QuickSight vào Athena.",
    }),
  },
  {
    name: "Tìm kiếm đơn hàng và dashboard thời gian thực",
    request: "Tìm \"áo khoác đỏ size M giao Đà Nẵng\" trong đơn 5 phút qua",
    toggle: { label: "Đánh index vào OpenSearch", initial: false },
    action: "Tìm",
    layout: (os) => ({
      viewBox: VB,
      aria: "Đơn hàng đi qua Kinesis Data Streams vào kho tìm kiếm, QuickSight vẽ dashboard",
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
            { at: "kds", state: "pass", msg: "Nhận dữ liệu từ nhiều nguồn gần thời gian thực." },
            { at: "store", state: "pass", flash: "120 kết quả", msg: "OpenSearch đánh index từng đơn, tìm full-text trong vài trăm mili giây." },
            { at: "qs", state: "pass", msg: "QuickSight vẽ dashboard tương tác cho đội vận hành." },
          ], ok: true, back: false, result: "Tìm kiếm và dashboard thời gian thực bằng dịch vụ managed." }
      : { steps: [
            { at: "kds", state: "pass", msg: "Nhận dữ liệu gần thời gian thực." },
            { at: "store", state: "block", msg: "DynamoDB không có tìm kiếm full-text. Chỉ tìm theo key hoặc Scan cả bảng." },
          ], ok: false, back: false, result: "Tìm kiếm văn bản tự do: OpenSearch Service." },
  },
  {
    name: "Gợi ý: bạn bè của bạn đã mua gì",
    request: "Sản phẩm được bạn của bạn bè khách KH#4521 thích nhiều nhất",
    toggle: { label: "Dùng Amazon Neptune (graph)", initial: false },
    action: "Gợi ý",
    layout: (neptune) => ({
      viewBox: VB,
      aria: "App hỏi database quan hệ hoặc graph database về bạn bè và lượt thích",
      nodes: [
        { id: "user", x: 70, y: Y, l1: "Khách", user: true },
        { id: "app", x: 280, y: Y, w: 140, l1: "App ShopViet" },
        { id: "db", x: 580, y: Y, w: 230, l1: neptune ? "Amazon Neptune" : "Aurora", l2: neptune ? "graph: khách → bạn → lượt thích" : "JOIN bảng bạn bè nhiều tầng" },
      ],
      links: [["user", "app"], ["app", "db"]],
    }),
    run: (neptune) => neptune
      ? { steps: [
            { at: "app", state: "pass", msg: "Gửi truy vấn graph." },
            { at: "db", state: "pass", flash: "30 ms", msg: "Neptune đi theo cạnh: khách → bạn → bạn của bạn → sản phẩm được thích." },
          ], ok: true, result: "Dữ liệu nhiều quan hệ chồng chéo (mạng xã hội, gợi ý, chống gian lận): graph database." }
      : { steps: [
            { at: "app", state: "pass", msg: "Gửi câu SQL." },
            { at: "db", state: "wait", flash: "8 s", msg: "Mỗi tầng quan hệ là một lần self-JOIN. Càng sâu càng chậm." },
          ], ok: false, result: "Chạy được nhưng rất chậm khi mạng lưới lớn. Truy vấn theo quan hệ: Amazon Neptune." },
  },
  {
    name: "Báo cáo cũ hơn 30 ngày ít ai xem",
    request: "SELECT … FROM sales_2025_q4  (vài lần mỗi quý)",
    toggle: { label: "Chuyển ra S3 Standard-IA, query bằng Athena", initial: false },
    action: "Chạy query",
    layout: (cold) => ({
      viewBox: VB,
      aria: "Dữ liệu cũ nằm trong Redshift hoặc trên S3 Standard-IA và được query bằng Athena",
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Kế toán", user: true },
        { id: "engine", x: 320, y: Y, w: 200, l1: cold ? "Amazon Athena" : "Redshift cluster", l2: cold ? "trả theo dữ liệu quét" : "giữ cả dữ liệu hiếm dùng" },
        { id: "data", x: 640, y: Y, w: 200, l1: cold ? "S3 Standard-IA" : "Storage của cluster", l2: cold ? "rẻ, lấy ra ngay" : "trả như dữ liệu nóng" },
      ],
      links: [["user", "engine"], ["engine", "data"]],
    }),
    run: (cold) => cold
      ? { steps: [
            { at: "engine", state: "pass", msg: "Không có cluster nào chạy chờ." },
            { at: "data", state: "pass", msg: "Standard-IA giá lưu trữ thấp, đọc ra ngay (có phí truy xuất theo GB). Query chạy liền." },
          ], ok: true, result: "Vẫn query bằng SQL, bắt đầu ngay, rẻ hơn nhiều. Glacier Deep Archive thì rẻ hơn nữa nhưng phải restore hàng giờ trước khi đọc." }
      : { steps: [
            { at: "engine", state: "pass", msg: "Query chạy." },
            { at: "data", state: "change", tag: "TỐN", msg: "Cluster phải đủ lớn để chứa cả dữ liệu hầu như không ai đụng tới." },
          ], ok: false, result: "Chạy được, nhưng trả giá kho dữ liệu nóng cho dữ liệu lạnh." },
  },
  {
    name: "Redshift UNLOAD sang bucket của đối tác",
    request: "UNLOAD ('SELECT …') TO 's3://doi-tac-bao-cao/'",
    toggle: { label: "Bucket đối tác đặt Object Ownership = Bucket owner enforced", initial: false },
    action: "UNLOAD rồi đối tác đọc",
    layout: () => ({
      viewBox: VB,
      aria: "Redshift ở account ShopViet ghi file vào bucket ở account đối tác, đối tác đọc file",
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
            { at: "s3", state: "change", tag: "GHI", msg: "File ghi vào bucket. Với **Bucket owner enforced**, ACL bị tắt và mọi object thuộc về chủ bucket." },
            { at: "partner", from: "s3", state: "pass", msg: "Đối tác là chủ mọi object nên đọc được bằng quyền IAM của mình." },
          ], ok: true, back: false, result: "Đọc được. Bucket tạo mới từ 2023 mặc định đã là Bucket owner enforced." }
      : { steps: [
            { at: "s3", state: "change", tag: "GHI", msg: "File ghi vào bucket, nhưng bucket còn bật ACL (Object writer): object thuộc về **account đã ghi** là ShopViet." },
            { at: "partner", from: "s3", state: "block", tag: "403", flash: "403", msg: "Chủ bucket không tự có quyền trên object do account khác ghi vào." },
          ], ok: false, back: false, result: "AccessDenied dù là bucket của mình. Đặt Object Ownership = Bucket owner enforced để chủ bucket sở hữu mọi object." },
  },
];

export default function DataJobSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một việc dữ liệu của ShopViet, chạy thử, rồi bật công tắc để đổi sang công cụ hợp hơn." />;
}
