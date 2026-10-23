import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// How MFTech's requests reach DynamoDB. A read by partition key goes straight to
// one partition; a filter on a non-key attribute scans every partition until a GSI
// exists; a video does not fit in a 400 KB item; a report that needs JOINs belongs
// in a relational database; and a worker in a private subnet needs a gateway endpoint.

const VB = "0 40 820 230";
type Lang = ReturnType<typeof useLang>;

function tableLayout(L: Lang, gsi: boolean): PLayout {
  return {
    viewBox: VB,
    aria: L({ vi: "Ứng dụng gửi request tới DynamoDB; request router chọn partition theo partition key", en: "The application sends requests to DynamoDB; the request router picks the partition by partition key" }),
    boxes: [{ x: 395, y: 48, w: 170, h: 212, label: "Table Orders" }],
    nodes: [
      { id: "app", x: 70, y: 150, l1: L({ vi: "App MFTech", en: "MFTech app" }), user: true },
      { id: "router", x: 250, y: 150, w: 150, l1: "DynamoDB", l2: "request router" },
      { id: "p1", x: 480, y: 94, w: 140, l1: "Partition 1" },
      { id: "p2", x: 480, y: 150, w: 140, l1: "Partition 2" },
      { id: "p3", x: 480, y: 206, w: 140, l1: "Partition 3" },
      ...(gsi ? [{ id: "gsi", x: 250, y: 236, w: 170, l1: "GSI StatusIndex", l2: "PK = Status" }] : []),
    ],
    links: [["app", "router"], ["router", "p1"], ["router", "p2"], ["router", "p3"], ...(gsi ? [["router", "gsi"] as [string, string]] : [])],
  };
}

const scenarios = (L: Lang): PScenario[] => [
  {
    name: L({ vi: "Truy xuất đơn hàng của một người dùng", en: "Get one user’s orders" }),
    request: "Query Orders  PK = \"KH#4521\"  SK begins_with \"2026-10\"",
    action: L({ vi: "Gửi query", en: "Send query" }),
    layout: tableLayout(L, false),
    run: () => ({
      steps: [
        { at: "router", state: "pass", msg: L({ vi: "Băm **partition key** `KH#4521` để xác định partition chứa item.", en: "Hashes the **partition key** `KH#4521` to find the partition that holds the item." }) },
        { at: "p2", state: "pass", flash: "4 ms", msg: L({ vi: "Các đơn hàng của người dùng này được lưu liền kề, sắp xếp theo **sort key** (ngày đặt). Chỉ các đơn hàng tháng 10 được đọc.", en: "This user’s orders are stored together, ordered by the **sort key** (order date). Only the October orders are read." }) },
      ],
      ok: true,
      result: L({ vi: "Trả về 3 đơn hàng trong vài mili giây, dù bảng chứa hàng triệu đơn. Truy vấn theo key có độ trễ như nhau ở mọi kích thước bảng.", en: "Returns 3 orders in a few milliseconds, even though the table holds millions of orders. A query by key has the same latency at any table size." }),
    }),
  },
  {
    name: L({ vi: "Truy vấn mọi đơn hàng đang chờ xử lý", en: "Query all pending orders" }),
    request: (gsi) => gsi ? "Query StatusIndex  Status = \"PENDING\"" : "Scan Orders  FILTER Status = \"PENDING\"",
    toggle: { label: L({ vi: "Đã tạo GSI với partition key = Status", en: "A GSI with partition key = Status exists" }), initial: false },
    action: L({ vi: "Gửi request", en: "Send request" }),
    layout: (gsi) => tableLayout(L, gsi),
    run: (gsi) => gsi
      ? { steps: [
            { at: "router", state: "pass", msg: L({ vi: "Request được chuyển tới index thay vì bảng.", en: "The request goes to the index instead of the table." }) },
            { at: "gsi", state: "pass", flash: "8 ms", msg: L({ vi: "GSI là bản sao do DynamoDB tự động duy trì, sắp xếp theo `Status`. Các item `PENDING` được lưu tập trung.", en: "The GSI is a copy that DynamoDB maintains automatically, organized by `Status`. The `PENDING` items are stored together." }) },
          ], ok: true, result: L({ vi: "Chỉ các đơn hàng đang chờ được đọc. GSI được cập nhật bất đồng bộ nên thao tác đọc GSI là eventually consistent.", en: "Only the pending orders are read. A GSI is updated asynchronously, so reads from a GSI are eventually consistent." }) }
      : { steps: [
            { at: "router", state: "change", tag: "SCAN", msg: L({ vi: "`Status` không phải key. Không xác định được vị trí item nên phải đọc toàn bộ bảng.", en: "`Status` is not a key. The item locations are unknown, so the whole table must be read." }) },
            { at: "p1", state: "wait", msg: L({ vi: "Đọc toàn bộ partition 1, tiêu tốn RCU cho cả các đơn hàng đã giao.", en: "Reads all of partition 1, consuming RCUs even for delivered orders." }) },
            { at: "p2", state: "wait", msg: L({ vi: "Đọc toàn bộ partition 2.", en: "Reads all of partition 2." }) },
            { at: "p3", state: "wait", flash: "9 s", msg: L({ vi: "Đọc toàn bộ partition 3. Filter chỉ loại bỏ kết quả **sau khi** dữ liệu đã được đọc.", en: "Reads all of partition 3. The filter removes results only **after** the data has been read." }) },
          ], ok: false, result: L({ vi: "Trả về kết quả nhưng chậm và tiêu tốn RCU cho toàn bộ bảng. Giải pháp: tạo GSI theo Status. LSI không áp dụng được: LSI bắt buộc dùng chung partition key `CustomerId` và chỉ tạo được khi tạo bảng.", en: "Returns results, but slowly and consuming RCUs for the whole table. Solution: create a GSI on Status. An LSI does not work here: an LSI must share the partition key `CustomerId` and can be created only when the table is created." }) },
  },
  {
    name: L({ vi: "Lưu video review 80 MB", en: "Store an 80 MB review video" }),
    request: (s3) => s3 ? "PutObject video → S3, PutItem { reviewId, videoKey }" : "PutItem { reviewId, video: <80 MB> }",
    toggle: { label: L({ vi: "Video lưu trên S3, item chỉ lưu đường dẫn", en: "Video stored on S3; the item stores only its key" }), initial: false },
    action: L({ vi: "Lưu review", en: "Save review" }),
    layout: (s3) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng lưu video review vào DynamoDB hoặc S3", en: "The application stores the review video in DynamoDB or S3" }),
      nodes: [
        { id: "app", x: 80, y: 150, l1: L({ vi: "Người bán", en: "Seller" }), l2: L({ vi: "tải video", en: "uploads video" }), user: true },
        { id: "ddb", x: 420, y: s3 ? 210 : 150, w: 170, l1: "DynamoDB", l2: "table Reviews" },
        ...(s3 ? [{ id: "s3", x: 420, y: 92, w: 170, l1: "Amazon S3", l2: "bucket review-videos" }] : []),
      ],
      links: [["app", "ddb"], ...(s3 ? [["app", "s3"] as [string, string]] : [])],
    }),
    run: (s3) => s3
      ? { steps: [
            { at: "s3", state: "pass", roundTrip: true, msg: L({ vi: "Video 80 MB được tải lên S3. Object S3 có kích thước tối đa 50 TB (tải lên bằng multipart upload).", en: "The 80 MB video is uploaded to S3. An S3 object can be up to 50 TB (uploaded with multipart upload)." }) },
            { at: "ddb", state: "pass", flash: "1 KB", msg: L({ vi: "Item chỉ chứa `videoKey`, số sao và nội dung văn bản; kích thước nhỏ, đọc ghi nhanh.", en: "The item holds only `videoKey`, the star rating and the text; it is small and fast to read and write." }) },
          ], ok: true, result: L({ vi: "Khi đọc review, ứng dụng lấy item từ DynamoDB, sau đó tải video từ S3 (hoặc qua CloudFront).", en: "To read a review, the application gets the item from DynamoDB, then loads the video from S3 (or through CloudFront)." }) }
      : { steps: [
            { at: "ddb", state: "block", flash: "400 KB", msg: L({ vi: "Một item có kích thước tối đa **400 KB**, tính cả tên và giá trị của mọi attribute. Item 80 MB bị từ chối.", en: "An item can be at most **400 KB**, counting the names and values of all attributes. The 80 MB item is rejected." }) },
          ], ok: false, result: L({ vi: "ValidationException. Tệp lớn được lưu trên S3; DynamoDB chỉ lưu đường dẫn.", en: "ValidationException. Large files are stored on S3; DynamoDB stores only their key." }) },
  },
  {
    name: L({ vi: "Báo cáo doanh thu JOIN nhiều bảng", en: "Revenue report that JOINs tables" }),
    request: L({ vi: "Doanh thu theo tỉnh = Orders ⋈ Customers ⋈ Products", en: "Revenue by province = Orders ⋈ Customers ⋈ Products" }),
    toggle: { label: L({ vi: "Dữ liệu này lưu trên Aurora", en: "This data is stored on Aurora" }), initial: false },
    action: L({ vi: "Chạy báo cáo", en: "Run report" }),
    layout: (aurora) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng chạy báo cáo cần JOIN trên DynamoDB hoặc Aurora", en: "The application runs a report that needs JOINs on DynamoDB or Aurora" }),
      nodes: [
        { id: "app", x: 80, y: 150, l1: L({ vi: "Phòng kế toán", en: "Accounting" }), user: true },
        { id: "db", x: 420, y: 150, w: 210, l1: aurora ? "Aurora MySQL" : "DynamoDB", l2: aurora ? L({ vi: "bảng quan hệ, SQL", en: "relational tables, SQL" }) : L({ vi: "key-value, không JOIN", en: "key-value, no JOINs" }) },
      ],
      links: [["app", "db"]],
    }),
    run: (aurora) => aurora
      ? { steps: [
            { at: "db", state: "pass", flash: "JOIN", msg: L({ vi: "Một câu SQL JOIN ba bảng; database tự tối ưu truy vấn.", en: "One SQL statement JOINs the three tables; the database optimizes the query itself." }) },
          ], ok: true, result: L({ vi: "Dữ liệu quan hệ cần JOIN được lưu trên RDS hoặc Aurora. Với tải biến động không dự đoán được, sử dụng Aurora Serverless v2.", en: "Relational data that needs JOINs is stored on RDS or Aurora. For unpredictable, fluctuating load, use Aurora Serverless v2." }) }
      : { steps: [
            { at: "db", state: "block", flash: "no JOIN", msg: L({ vi: "DynamoDB không hỗ trợ JOIN. Ứng dụng phải gọi hàng nghìn request rồi tự ghép kết quả.", en: "DynamoDB does not support JOINs. The application would have to make thousands of requests and combine the results itself." }) },
          ], ok: false, result: L({ vi: "DynamoDB phù hợp với truy cập theo key với độ trễ ổn định. Báo cáo trên dữ liệu quan hệ, cần JOIN và schema chặt chẽ: lựa chọn cơ sở dữ liệu quan hệ.", en: "DynamoDB suits key-based access with consistent latency. For reports on relational data that need JOINs and a strict schema, choose a relational database." }) },
  },
  {
    name: L({ vi: "Worker trong private subnet cập nhật trạng thái", en: "Private-subnet worker updates a status" }),
    request: "UpdateItem Jobs  status = \"DONE\"",
    toggle: { label: L({ vi: "Route table có gateway endpoint cho DynamoDB", en: "Route table has a DynamoDB gateway endpoint" }), initial: false },
    action: L({ vi: "Ghi trạng thái", en: "Write status" }),
    layout: (gw) => ({
      viewBox: VB,
      aria: L({ vi: "EC2 trong private subnet kết nối tới DynamoDB qua route table và gateway endpoint", en: "EC2 in a private subnet connects to DynamoDB through the route table and a gateway endpoint" }),
      boxes: [{ x: 24, y: 52, w: 520, h: 196, label: L({ vi: "VPC của MFTech · private subnet, không có NAT", en: "MFTech VPC · private subnet, no NAT" }) }],
      nodes: [
        { id: "ec2", x: 110, y: 150, w: 130, l1: L({ vi: "EC2 xử lý ảnh", en: "Image EC2" }), l2: L({ vi: "chỉ có private IP", en: "private IP only" }) },
        { id: "rt", x: 290, y: 150, w: 150, l1: "Route table", l2: gw ? "pl-ddb → vpce-…" : L({ vi: "chỉ có route local", en: "local route only" }) },
        { id: "vpce", x: 460, y: 150, w: 130, l1: "Gateway endpoint", l2: gw ? "DynamoDB" : L({ vi: "(chưa tạo)", en: "(not created)" }) },
        { id: "ddb", x: 690, y: 150, w: 150, l1: "DynamoDB", l2: "table Jobs" },
      ],
      links: [["ec2", "rt"], ["rt", "vpce"], ["vpce", "ddb"]],
    }),
    run: (gw) => gw
      ? { steps: [
            { at: "rt", state: "pass", msg: L({ vi: "Route có destination là **prefix list** của DynamoDB, target là gateway endpoint.", en: "A route whose destination is the DynamoDB **prefix list** and whose target is the gateway endpoint." }) },
            { at: "vpce", state: "pass", msg: L({ vi: "Traffic được truyền trong mạng AWS, không đi qua Internet. Gateway endpoint không tính phí.", en: "Traffic stays on the AWS network and does not cross the internet. Gateway endpoints have no charge." }) },
            { at: "ddb", state: "pass", msg: L({ vi: "Cập nhật trạng thái thành công.", en: "The status update succeeds." }) },
          ], ok: true, result: L({ vi: "Chỉ **S3** và **DynamoDB** hỗ trợ gateway endpoint. Khi cần cả hai, tạo hai gateway endpoint và thêm cả hai vào route table.", en: "Only **S3** and **DynamoDB** support gateway endpoints. When you need both, create two gateway endpoints and add both to the route table." }) }
      : { steps: [
            { at: "rt", state: "block", flash: "timeout", msg: L({ vi: "Không có route tới DynamoDB và không có NAT. Request bị treo cho tới khi timeout.", en: "There is no route to DynamoDB and no NAT. The request hangs until it times out." }) },
          ], ok: false, result: L({ vi: "Thêm gateway endpoint cho DynamoDB vào route table của subnet. Không cần NAT gateway hay public IP.", en: "Add a DynamoDB gateway endpoint to the subnet’s route table. No NAT gateway or public IP is needed." }) },
  },
];

export default function KeyAccessSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} hint={L({ vi: "Chọn một tác vụ của MFTech và gửi request để quan sát đường đi của request trong DynamoDB. Với tình huống có tuỳ chọn cấu hình, bật tuỳ chọn và chạy lại để so sánh.", en: "Choose a MFTech task and send the request to follow its path through DynamoDB. For scenarios with a configuration option, turn it on and run again to compare." })} />;
}
