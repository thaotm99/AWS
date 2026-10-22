import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// ShopViet's data jobs, each with the AWS service that fits it: Athena for SQL straight
// on S3, Glue + Redshift Serverless (+ Redshift ML) for a daily warehouse load, Glue
// DataBrew for code-free cleaning, Transcribe + Athena for call recordings, Kinesis +
// OpenSearch + QuickSight for live search, Neptune for friend graphs, cold warehouse
// data on S3 Standard-IA, and object ownership when Redshift UNLOADs to another account.

const VB = "0 40 820 222";
const Y = 150;
type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): PScenario[] => [
  {
    name: L({ vi: "Kiểm tra nhanh dữ liệu click bằng SQL", en: "Quick SQL check of click data" }),
    request: "SELECT count(*) FROM clicks WHERE user_id IS NULL",
    toggle: { label: L({ vi: "Sử dụng Athena truy vấn trực tiếp trên S3", en: "Use Athena to query S3 directly" }), initial: false },
    action: L({ vi: "Chạy query", en: "Run query" }),
    layout: (athena) => ({
      viewBox: VB,
      aria: L({ vi: "Analyst chạy SQL trên dữ liệu click lưu tại S3", en: "An analyst runs SQL on click data stored in S3" }),
      nodes: [
        { id: "user", x: 60, y: Y, l1: L({ vi: "Kỹ sư dữ liệu", en: "Data engineer" }), user: true },
        { id: "engine", x: 280, y: Y, w: 190, l1: athena ? "Amazon Athena" : "Redshift / EMR cluster", l2: athena ? "serverless" : L({ vi: "chạy liên tục cả ngày", en: "runs all day long" }) },
        ...(athena ? [] : [{ id: "load", x: 520, y: 236, w: 170, l1: L({ vi: "Job nạp mỗi giờ", en: "Hourly load job" }), l2: L({ vi: "cần phát triển, giám sát", en: "to build and monitor" }) }]),
        { id: "s3", x: 700, y: Y, w: 160, l1: "S3 raw zone", l2: L({ vi: "tệp JSON click", en: "click JSON files" }) },
      ],
      links: [["user", "engine"], ["engine", "s3"], ...(athena ? [] : [["load", "s3"] as [string, string]])],
    }),
    run: (athena) => athena
      ? { steps: [
            { at: "engine", state: "pass", msg: L({ vi: "Không cần khởi động cluster. Bảng được định nghĩa trong Glue Data Catalog.", en: "No cluster to start. The table is defined in the Glue Data Catalog." }) },
            { at: "s3", state: "pass", flash: "4 s", msg: L({ vi: "Athena đọc trực tiếp tệp trên S3, chỉ tính phí theo lượng dữ liệu được quét.", en: "Athena reads the files on S3 directly and charges only for the data scanned." }) },
          ], ok: true, result: L({ vi: "Kiểm tra dữ liệu thô bằng SQL chuẩn, không cần nạp dữ liệu, không cluster, không bảo trì.", en: "Check raw data with standard SQL: no data loading, no cluster, no maintenance." }) }
      : { steps: [
            { at: "load", jump: true, state: "wait", tag: L({ vi: "VẬN HÀNH", en: "OPS" }), msg: L({ vi: "Trước đó cần một job nạp dữ liệu mới vào cluster mỗi giờ.", en: "First, a job must load new data into the cluster every hour." }) },
            { at: "engine", state: "pass", msg: L({ vi: "Truy vấn thực thi được trên dữ liệu đã nạp.", en: "The query runs on the loaded data." }) },
          ], ok: false, result: L({ vi: "Giải pháp hoạt động nhưng phát sinh chi phí cluster cả ngày và tốn công vận hành cho một tác vụ kiểm tra nhỏ.", en: "It works, but it costs a cluster running all day and operational effort for a small check." }) },
  },
  {
    name: L({ vi: "Nạp kho dữ liệu mỗi sáng, analyst xây dựng ML bằng SQL", en: "Load the warehouse each morning; analysts build ML in SQL" }),
    request: L({ vi: "06:00  S3 data lake → kho dữ liệu → dashboard và mô hình dự báo", en: "06:00  S3 data lake → data warehouse → dashboards and forecast models" }),
    toggle: { label: L({ vi: "Sử dụng dịch vụ serverless", en: "Use serverless services" }), initial: false },
    action: L({ vi: "Chạy job sáng", en: "Run morning job" }),
    layout: (sl) => ({
      viewBox: VB,
      aria: L({ vi: "Dữ liệu từ S3 được biến đổi rồi nạp vào kho dữ liệu; analyst tạo mô hình bằng SQL", en: "Data from S3 is transformed and loaded into the data warehouse; analysts create models in SQL" }),
      nodes: [
        { id: "s3", x: 80, y: Y, w: 130, l1: "S3 data lake", l2: L({ vi: "log giao dịch", en: "transaction logs" }) },
        { id: "etl", x: 280, y: Y, w: 170, l1: sl ? "AWS Glue job" : "EMR cluster (Spark)", l2: sl ? L({ vi: "ETL serverless", en: "serverless ETL" }) : L({ vi: "tự quản lý node", en: "self-managed nodes" }) },
        { id: "dw", x: 500, y: Y, w: 190, l1: sl ? "Redshift Serverless" : "Redshift (provisioned)", l2: L({ vi: "MPP, xử lý song song", en: "MPP, parallel processing" }) },
        { id: "ml", x: 712, y: Y, w: 180, l1: "Redshift ML", l2: L({ vi: "CREATE MODEL bằng SQL", en: "CREATE MODEL in SQL" }) },
      ],
      links: [["s3", "etl"], ["etl", "dw"], ["dw", "ml"]],
    }),
    run: (sl) => sl
      ? { steps: [
            { at: "etl", state: "pass", msg: L({ vi: "Glue đọc, làm sạch và biến đổi dữ liệu. Glue là dịch vụ serverless, không có hạ tầng cần quản lý.", en: "Glue reads, cleans and transforms the data. Glue is serverless, with no infrastructure to manage." }) },
            { at: "dw", state: "pass", msg: L({ vi: "Nạp vào **Redshift Serverless**: kho dữ liệu MPP, tự động co giãn, không cần quản lý node.", en: "Loads into **Redshift Serverless**: an MPP data warehouse that scales automatically, with no nodes to manage." }) },
            { at: "ml", state: "pass", msg: L({ vi: "Analyst viết `CREATE MODEL` bằng SQL, không cần code Python.", en: "Analysts write `CREATE MODEL` in SQL, with no Python code." }) },
          ], ok: true, back: false, result: L({ vi: "Toàn bộ pipeline là serverless: không có cluster nào cần chọn kích thước, vá lỗi hay bật tắt.", en: "The whole pipeline is serverless: no cluster to size, patch, or start and stop." }) }
      : { steps: [
            { at: "etl", state: "change", tag: L({ vi: "VẬN HÀNH", en: "OPS" }), msg: L({ vi: "Phải chọn kích thước cluster, khởi động mỗi sáng và tắt khi hoàn tất.", en: "You must size the cluster, start it every morning and shut it down when done." }) },
            { at: "dw", state: "change", tag: L({ vi: "VẬN HÀNH", en: "OPS" }), msg: L({ vi: "Cluster provisioned: tự chọn số node và tự resize khi dữ liệu tăng.", en: "Provisioned cluster: you choose the number of nodes and resize it yourself as data grows." }) },
            { at: "ml", state: "pass", msg: L({ vi: "Mô hình vẫn tạo được bằng SQL.", en: "Models can still be created in SQL." }) },
          ], ok: false, back: false, result: L({ vi: "Giải pháp hoạt động nhưng phát sinh nhiều tác vụ vận hành. Kiến trúc serverless: Glue + Redshift Serverless.", en: "It works, but it creates a lot of operational tasks. Serverless architecture: Glue + Redshift Serverless." }) },
  },
  {
    name: L({ vi: "Analyst tự làm sạch dữ liệu, không viết code", en: "Analysts clean data themselves, without code" }),
    request: L({ vi: "Lọc bất thường, chuẩn hoá ngày giờ, gộp theo nhóm người dùng", en: "Filter anomalies, normalize timestamps, group by user segment" }),
    toggle: { label: L({ vi: "Sử dụng AWS Glue DataBrew", en: "Use AWS Glue DataBrew" }), initial: false },
    action: L({ vi: "Làm sạch", en: "Clean" }),
    layout: (brew) => ({
      viewBox: VB,
      aria: L({ vi: "Analyst làm sạch tệp Parquet trên S3 bằng công cụ trực quan hoặc bằng code", en: "An analyst cleans Parquet files on S3 with a visual tool or with code" }),
      nodes: [
        { id: "user", x: 60, y: Y, l1: "Analyst", user: true },
        { id: "tool", x: 300, y: Y, w: 200, l1: brew ? "Glue DataBrew" : "Glue ETL job", l2: brew ? L({ vi: "recipe kéo thả", en: "drag-and-drop recipe" }) : L({ vi: "viết PySpark", en: "write PySpark" }) },
        { id: "out", x: 640, y: Y, w: 190, l1: "S3 refined zone", l2: L({ vi: "Parquet đã làm sạch", en: "cleaned Parquet" }) },
      ],
      links: [["user", "tool"], ["tool", "out"]],
    }),
    run: (brew) => brew
      ? { steps: [
            { at: "tool", state: "pass", msg: L({ vi: "Lựa chọn trong hơn 250 phép biến đổi có sẵn. Mỗi bước được lưu vào **recipe** và có thể chia sẻ cho cả nhóm. Hỗ trợ **data profiling** và lineage.", en: "Choose from more than 250 built-in transformations. Each step is saved in a **recipe** that the whole team can share. Supports **data profiling** and lineage." }) },
            { at: "out", state: "pass", msg: L({ vi: "Job DataBrew áp dụng recipe trên toàn bộ dữ liệu.", en: "A DataBrew job applies the recipe to the full dataset." }) },
          ], ok: true, result: L({ vi: "Analyst và kỹ sư cùng làm việc trên một giao diện trực quan, không cần viết hay bảo trì code.", en: "Analysts and engineers work in the same visual interface, with no code to write or maintain." }) }
      : { steps: [
            { at: "tool", state: "block", tag: L({ vi: "CẦN CODE", en: "CODE NEEDED" }), msg: L({ vi: "Job ETL được viết bằng Python/Scala. Analyst không viết code phải phụ thuộc vào kỹ sư.", en: "ETL jobs are written in Python/Scala. Analysts who do not code must depend on engineers." }) },
          ], ok: false, result: L({ vi: "Chuẩn bị dữ liệu trực quan, không cần code, có profiling: Glue DataBrew.", en: "Visual, no-code data preparation with profiling: Glue DataBrew." }) },
  },
  {
    name: L({ vi: "Phân tích ghi âm cuộc gọi chăm sóc khách hàng", en: "Analyze customer service call recordings" }),
    request: L({ vi: "Trong tuần này, bao nhiêu cuộc gọi có khiếu nại về giao hàng?", en: "How many calls this week included a delivery complaint?" }),
    action: L({ vi: "Phân tích", en: "Analyze" }),
    layout: {
      viewBox: VB,
      aria: L({ vi: "Tệp ghi âm trên S3 được Transcribe chuyển thành văn bản, sau đó Athena chạy SQL", en: "Transcribe converts the recordings on S3 to text, then Athena runs SQL on it" }),
      nodes: [
        { id: "rec", x: 80, y: Y, w: 140, l1: "S3", l2: L({ vi: "tệp ghi âm", en: "recordings" }) },
        { id: "tr", x: 280, y: Y, w: 170, l1: "Amazon Transcribe", l2: L({ vi: "giọng nói → văn bản", en: "speech → text" }) },
        { id: "txt", x: 480, y: Y, w: 130, l1: "S3", l2: L({ vi: "bản ghi văn bản", en: "transcripts" }) },
        { id: "ath", x: 680, y: Y, w: 160, l1: "Amazon Athena", l2: L({ vi: "SQL tuỳ ý", en: "ad-hoc SQL" }) },
      ],
      links: [["rec", "tr"], ["tr", "txt"], ["txt", "ath"]],
    },
    run: () => ({
      steps: [
        { at: "tr", state: "change", tag: L({ vi: "CHUYỂN", en: "CONVERT" }), msg: L({ vi: "Transcribe chuyển ghi âm thành văn bản, phân tách lời của từng người nói.", en: "Transcribe converts the recordings to text and separates each speaker." }) },
        { at: "txt", state: "pass", msg: L({ vi: "Kết quả JSON được lưu trên S3.", en: "The JSON output is stored on S3." }) },
        { at: "ath", state: "pass", msg: L({ vi: "Analyst chạy SQL ad-hoc trên bản ghi văn bản: đếm từ khoá, lọc theo ngày, theo nhân viên.", en: "Analysts run ad-hoc SQL on the transcripts: count keywords, filter by date or by agent." }) },
      ],
      ok: true,
      back: false,
      result: L({ vi: "Tự động hoá tác vụ trước đây phải nghe thủ công. Khi cần dashboard, kết nối QuickSight với Athena.", en: "Automates a task that used to require listening manually. For dashboards, connect QuickSight to Athena." }),
    }),
  },
  {
    name: L({ vi: "Tìm kiếm đơn hàng và dashboard thời gian thực", en: "Order search and real-time dashboards" }),
    request: L({ vi: "Tìm \"áo khoác đỏ size M giao Đà Nẵng\" trong đơn hàng 5 phút gần nhất", en: "Search \"red jacket size M shipped to Da Nang\" in the last 5 minutes of orders" }),
    toggle: { label: L({ vi: "Đánh index vào OpenSearch", en: "Index into OpenSearch" }), initial: false },
    action: L({ vi: "Tìm", en: "Search" }),
    layout: (os) => ({
      viewBox: VB,
      aria: L({ vi: "Đơn hàng đi qua Kinesis Data Streams vào kho tìm kiếm, QuickSight hiển thị dashboard", en: "Orders flow through Kinesis Data Streams into the search store, and QuickSight shows the dashboard" }),
      nodes: [
        { id: "src", x: 70, y: Y, w: 120, l1: L({ vi: "Hệ thống đơn", en: "Order systems" }), l2: L({ vi: "nhiều nguồn", en: "many sources" }) },
        { id: "kds", x: 250, y: Y, w: 170, l1: "Kinesis Data Streams" },
        { id: "store", x: 480, y: Y, w: 200, l1: os ? "OpenSearch Service" : "DynamoDB", l2: os ? "full-text index" : L({ vi: "chỉ tìm theo key", en: "key lookups only" }) },
        { id: "qs", x: 710, y: Y, w: 140, l1: "QuickSight", l2: "dashboard" },
      ],
      links: [["src", "kds"], ["kds", "store"], ["store", "qs"]],
    }),
    run: (os) => os
      ? { steps: [
            { at: "kds", state: "pass", msg: L({ vi: "Tiếp nhận dữ liệu từ nhiều nguồn gần thời gian thực.", en: "Ingests data from many sources in near real time." }) },
            { at: "store", state: "pass", flash: L({ vi: "120 kết quả", en: "120 results" }), msg: L({ vi: "OpenSearch đánh index từng đơn hàng và hỗ trợ tìm kiếm full-text.", en: "OpenSearch indexes every order and supports full-text search." }) },
            { at: "qs", state: "pass", msg: L({ vi: "QuickSight hiển thị dashboard tương tác cho đội vận hành.", en: "QuickSight shows interactive dashboards to the operations team." }) },
          ], ok: true, back: false, result: L({ vi: "Tìm kiếm và dashboard thời gian thực bằng các dịch vụ managed.", en: "Real-time search and dashboards with managed services." }) }
      : { steps: [
            { at: "kds", state: "pass", msg: L({ vi: "Tiếp nhận dữ liệu gần thời gian thực.", en: "Ingests data in near real time." }) },
            { at: "store", state: "block", msg: L({ vi: "DynamoDB không hỗ trợ tìm kiếm full-text; chỉ truy vấn theo key hoặc Scan toàn bộ bảng.", en: "DynamoDB does not support full-text search; it can only query by key or Scan the whole table." }) },
          ], ok: false, back: false, result: L({ vi: "Tìm kiếm văn bản tự do: OpenSearch Service.", en: "Free-text search: OpenSearch Service." }) },
  },
  {
    name: L({ vi: "Gợi ý sản phẩm theo mạng quan hệ bạn bè", en: "Product suggestions from the friend network" }),
    request: L({ vi: "Sản phẩm được bạn của bạn bè người dùng KH#4521 thích nhiều nhất", en: "Products most liked by friends of friends of user KH#4521" }),
    toggle: { label: L({ vi: "Sử dụng Amazon Neptune (graph)", en: "Use Amazon Neptune (graph)" }), initial: false },
    action: L({ vi: "Gợi ý", en: "Suggest" }),
    layout: (neptune) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng truy vấn database quan hệ hoặc graph database về bạn bè và lượt thích", en: "The application queries a relational database or a graph database about friends and likes" }),
      nodes: [
        { id: "user", x: 70, y: Y, l1: L({ vi: "Người dùng", en: "User" }), user: true },
        { id: "app", x: 280, y: Y, w: 140, l1: L({ vi: "App ShopViet", en: "ShopViet app" }) },
        { id: "db", x: 580, y: Y, w: 230, l1: neptune ? "Amazon Neptune" : "Aurora", l2: neptune ? L({ vi: "graph: người dùng → bạn → thích", en: "graph: user → friend → likes" }) : L({ vi: "JOIN bảng bạn bè nhiều tầng", en: "multi-level JOINs on friends table" }) },
      ],
      links: [["user", "app"], ["app", "db"]],
    }),
    run: (neptune) => neptune
      ? { steps: [
            { at: "app", state: "pass", msg: L({ vi: "Gửi truy vấn graph.", en: "Sends a graph query." }) },
            { at: "db", state: "pass", flash: "30 ms", msg: L({ vi: "Neptune duyệt theo cạnh: người dùng → bạn → bạn của bạn → sản phẩm được thích.", en: "Neptune traverses the edges: user → friend → friend of friend → liked product." }) },
          ], ok: true, result: L({ vi: "Dữ liệu có nhiều quan hệ đan xen (mạng xã hội, gợi ý, phát hiện gian lận): graph database.", en: "Highly connected data (social networks, recommendations, fraud detection): a graph database." }) }
      : { steps: [
            { at: "app", state: "pass", msg: L({ vi: "Gửi truy vấn SQL.", en: "Sends a SQL query." }) },
            { at: "db", state: "wait", flash: "8 s", msg: L({ vi: "Mỗi tầng quan hệ là một lần self-JOIN; số tầng càng nhiều, truy vấn càng chậm.", en: "Each level of relationship is another self-JOIN; the more levels, the slower the query." }) },
          ], ok: false, result: L({ vi: "Truy vấn thực thi được nhưng rất chậm khi mạng quan hệ lớn. Truy vấn theo quan hệ: Amazon Neptune.", en: "The query runs, but very slowly when the network is large. For relationship queries: Amazon Neptune." }) },
  },
  {
    name: L({ vi: "Báo cáo cũ hơn 30 ngày ít được truy cập", en: "Reports older than 30 days are rarely accessed" }),
    request: L({ vi: "SELECT … FROM sales_2025_q4  (vài lần mỗi quý)", en: "SELECT … FROM sales_2025_q4  (a few times a quarter)" }),
    toggle: { label: L({ vi: "Chuyển sang S3 Standard-IA, truy vấn bằng Athena", en: "Move to S3 Standard-IA, query with Athena" }), initial: false },
    action: L({ vi: "Chạy query", en: "Run query" }),
    layout: (cold) => ({
      viewBox: VB,
      aria: L({ vi: "Dữ liệu cũ lưu trong Redshift hoặc trên S3 Standard-IA và được truy vấn bằng Athena", en: "Old data stored in Redshift, or on S3 Standard-IA and queried with Athena" }),
      nodes: [
        { id: "user", x: 60, y: Y, l1: L({ vi: "Kế toán", en: "Accounting" }), user: true },
        { id: "engine", x: 320, y: Y, w: 200, l1: cold ? "Amazon Athena" : "Redshift cluster", l2: cold ? L({ vi: "tính phí theo dữ liệu quét", en: "billed per data scanned" }) : L({ vi: "lưu cả dữ liệu hiếm dùng", en: "also holds rarely used data" }) },
        { id: "data", x: 640, y: Y, w: 200, l1: cold ? "S3 Standard-IA" : L({ vi: "Storage của cluster", en: "Cluster storage" }), l2: cold ? L({ vi: "chi phí thấp, truy xuất ngay", en: "low cost, immediate access" }) : L({ vi: "tính phí như dữ liệu nóng", en: "billed like hot data" }) },
      ],
      links: [["user", "engine"], ["engine", "data"]],
    }),
    run: (cold) => cold
      ? { steps: [
            { at: "engine", state: "pass", msg: L({ vi: "Không có cluster nào chạy thường trực.", en: "No cluster runs all the time." }) },
            { at: "data", state: "pass", msg: L({ vi: "Standard-IA dành cho dữ liệu ít truy cập nhưng vẫn truy xuất trong mili giây (có phí truy xuất theo GB). Truy vấn thực thi ngay lập tức.", en: "Standard-IA is for infrequently accessed data that is still retrieved in milliseconds (with a per-GB retrieval charge). The query runs immediately." }) },
          ], ok: true, result: L({ vi: "Vẫn truy vấn bằng SQL, thực thi ngay, không phải duy trì cluster cho dữ liệu hiếm dùng. Glacier Deep Archive có chi phí lưu trữ thấp hơn nữa nhưng phải restore (mất nhiều giờ) trước khi Athena đọc được.", en: "Still queried with SQL and run immediately, with no cluster to keep for rarely used data. Glacier Deep Archive has an even lower storage cost but needs a restore (taking many hours) before Athena can read it." }) }
      : { steps: [
            { at: "engine", state: "pass", msg: L({ vi: "Truy vấn được thực thi.", en: "The query runs." }) },
            { at: "data", state: "change", tag: L({ vi: "TỐN", en: "COST" }), msg: L({ vi: "Cluster phải đủ lớn để chứa cả dữ liệu hầu như không được truy cập.", en: "The cluster must be large enough to also hold data that is almost never accessed." }) },
          ], ok: false, result: L({ vi: "Giải pháp hoạt động, nhưng dữ liệu ít truy cập phải chịu chi phí của kho dữ liệu hiệu năng cao.", en: "It works, but infrequently accessed data bears the cost of a high-performance data warehouse." }) },
  },
  {
    name: L({ vi: "Đồng bộ liên tục Oracle tại văn phòng sang RDS", en: "Continuously sync on-premises Oracle to RDS" }),
    request: L({ vi: "Dữ liệu hiện có + mọi giao dịch mới → RDS for Oracle (khối lượng thay đổi biến động)", en: "Existing data + every new transaction → RDS for Oracle (fluctuating change volume)" }),
    toggle: { label: L({ vi: "Sử dụng AWS DMS Serverless (full load + ongoing replication)", en: "Use AWS DMS Serverless (full load + ongoing replication)" }), initial: false },
    action: L({ vi: "Đồng bộ", en: "Sync" }),
    layout: (dms) => ({
      viewBox: VB,
      aria: L({ vi: "Database Oracle tại văn phòng được sao chép sang Amazon RDS for Oracle bằng Glue job hoặc DMS Serverless", en: "An on-premises Oracle database is copied to Amazon RDS for Oracle by a Glue job or by DMS Serverless" }),
      nodes: [
        { id: "src", x: 100, y: Y, w: 160, l1: "Oracle", l2: "on-premises" },
        { id: "tool", x: 400, y: Y, w: 220, l1: dms ? "AWS DMS Serverless" : "AWS Glue job", l2: dms ? L({ vi: "tự cấp phát capacity", en: "provisions capacity itself" }) : L({ vi: "ETL theo lịch hoặc trigger", en: "ETL on a schedule or trigger" }) },
        { id: "rds", x: 700, y: Y, w: 170, l1: "RDS for Oracle" },
      ],
      links: [["src", "tool"], ["tool", "rds"]],
    }),
    run: (dms) => dms
      ? { steps: [
            { at: "tool", state: "pass", tag: "FULL LOAD", msg: L({ vi: "DMS sao chép dữ liệu hiện có, sau đó **replicate các thay đổi liên tục** để nguồn và đích luôn đồng bộ.", en: "DMS copies the existing data, then **replicates ongoing changes** to keep source and target in sync." }) },
            { at: "rds", state: "pass", msg: L({ vi: "DMS Serverless phân tích tải, tự cấp phát và co giãn capacity; không phải chọn kích thước replication instance.", en: "DMS Serverless analyzes the workload and provisions and scales capacity automatically; no replication instance to size." }) },
          ], ok: true, back: false, result: L({ vi: "Di chuyển và đồng bộ liên tục giữa hai database: AWS DMS (chi tiết trong bài Storage Gateway, Snow, DataSync, DMS).", en: "Migrating and continuously syncing between two databases: AWS DMS (details in the Storage Gateway, Snow, DataSync, DMS lesson)." }) }
      : { steps: [
            { at: "tool", state: "change", tag: L({ vi: "THEO LƯỢT", en: "BATCH" }), msg: L({ vi: "Glue là dịch vụ ETL: job chạy theo lịch, theo sự kiện hoặc theo yêu cầu, mỗi lượt đọc dữ liệu tại thời điểm chạy rồi biến đổi và ghi ra đích.", en: "Glue is an ETL service: jobs run on a schedule, on an event or on demand, and each run reads the data as of that moment, transforms it and writes it out." }) },
            { at: "rds", state: "wait", msg: L({ vi: "Giao dịch phát sinh giữa hai lượt chạy chưa có ở đích; phải tự xây dựng cơ chế phát hiện thay đổi.", en: "Transactions made between runs are not yet in the target; you would have to build change detection yourself." }) },
          ], ok: false, back: false, result: L({ vi: "Glue phù hợp với biến đổi dữ liệu cho phân tích. Sao chép dữ liệu cùng các thay đổi liên tục giữa hai database là chức năng của AWS DMS.", en: "Glue fits transforming data for analytics. Copying data plus ongoing changes between two databases is what AWS DMS does." }) },
  },
  {
    name: L({ vi: "Redshift UNLOAD sang bucket của đối tác", en: "Redshift UNLOAD to a partner’s bucket" }),
    request: "UNLOAD ('SELECT …') TO 's3://doi-tac-bao-cao/'",
    toggle: { label: L({ vi: "Bucket đối tác cấu hình Object Ownership = Bucket owner enforced", en: "Partner bucket uses Object Ownership = Bucket owner enforced" }), initial: false },
    action: L({ vi: "UNLOAD, sau đó đối tác đọc", en: "UNLOAD, then partner reads" }),
    layout: () => ({
      viewBox: VB,
      aria: L({ vi: "Redshift tại account ShopViet ghi tệp vào bucket tại account đối tác, đối tác đọc tệp", en: "Redshift in the ShopViet account writes files to a bucket in the partner account, and the partner reads them" }),
      boxes: [{ x: 20, y: 52, w: 300, h: 196, label: L({ vi: "Account ShopViet", en: "ShopViet account" }) }, { x: 360, y: 52, w: 440, h: 196, label: L({ vi: "Account đối tác", en: "Partner account" }) }],
      nodes: [
        { id: "rs", x: 170, y: Y, w: 170, l1: "Redshift", l2: "UNLOAD" },
        { id: "s3", x: 500, y: Y, w: 170, l1: "S3 bucket", l2: "doi-tac-bao-cao" },
        { id: "partner", x: 710, y: Y, l1: L({ vi: "Đối tác", en: "Partner" }), user: true },
      ],
      links: [["rs", "s3"], ["s3", "partner"]],
    }),
    run: (enforced) => enforced
      ? { steps: [
            { at: "s3", state: "change", tag: L({ vi: "GHI", en: "WRITE" }), msg: L({ vi: "Tệp được ghi vào bucket. Với **Bucket owner enforced**, ACL bị vô hiệu hoá và mọi object thuộc về chủ sở hữu bucket.", en: "The files are written to the bucket. With **Bucket owner enforced**, ACLs are disabled and every object belongs to the bucket owner." }) },
            { at: "partner", from: "s3", state: "pass", msg: L({ vi: "Đối tác sở hữu mọi object nên đọc được bằng quyền IAM của mình.", en: "The partner owns every object, so it can read them with its own IAM permissions." }) },
          ], ok: true, back: false, result: L({ vi: "Đọc thành công. Bucket mới mặc định sử dụng Bucket owner enforced.", en: "The read succeeds. New buckets use Bucket owner enforced by default." }) }
      : { steps: [
            { at: "s3", state: "change", tag: L({ vi: "GHI", en: "WRITE" }), msg: L({ vi: "Tệp được ghi vào bucket, nhưng bucket vẫn bật ACL (Object writer): object thuộc về **account đã ghi**, tức ShopViet.", en: "The files are written to the bucket, but the bucket still has ACLs enabled (Object writer): the objects belong to **the account that wrote them**, which is ShopViet." }) },
            { at: "partner", from: "s3", state: "block", tag: "403", flash: "403", msg: L({ vi: "Chủ sở hữu bucket không mặc nhiên có quyền trên object do account khác ghi vào.", en: "The bucket owner does not automatically have permissions on objects written by another account." }) },
          ], ok: false, back: false, result: L({ vi: "AccessDenied dù là bucket của chính đối tác. Cấu hình Object Ownership = Bucket owner enforced để chủ sở hữu bucket sở hữu mọi object.", en: "AccessDenied, even though it is the partner’s own bucket. Set Object Ownership = Bucket owner enforced so the bucket owner owns every object." }) },
  },
];

export default function DataJobSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} hint={L({ vi: "Chọn một tác vụ dữ liệu của ShopViet và chạy mô phỏng, sau đó bật tuỳ chọn để chuyển sang công cụ phù hợp hơn.", en: "Choose a ShopViet data job and run the simulation, then turn on the option to switch to a better-suited tool." })} />;
}
