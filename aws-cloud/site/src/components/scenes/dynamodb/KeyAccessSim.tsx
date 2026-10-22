import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// How ShopViet's requests reach DynamoDB. A read by partition key goes straight to
// one partition; a filter on a non-key attribute scans every partition until a GSI
// exists; a video does not fit in a 400 KB item; a report that needs JOINs belongs
// in a relational database; and a worker in a private subnet needs a gateway endpoint.

const VB = "0 40 820 230";

function tableLayout(gsi: boolean): PLayout {
  return {
    viewBox: VB,
    aria: "App gửi request tới DynamoDB; request router chọn partition theo partition key",
    boxes: [{ x: 395, y: 48, w: 170, h: 212, label: "Table Orders" }],
    nodes: [
      { id: "app", x: 70, y: 150, l1: "App ShopViet", user: true },
      { id: "router", x: 250, y: 150, w: 150, l1: "DynamoDB", l2: "request router" },
      { id: "p1", x: 480, y: 94, w: 140, l1: "Partition 1" },
      { id: "p2", x: 480, y: 150, w: 140, l1: "Partition 2" },
      { id: "p3", x: 480, y: 206, w: 140, l1: "Partition 3" },
      ...(gsi ? [{ id: "gsi", x: 250, y: 236, w: 170, l1: "GSI StatusIndex", l2: "PK = Status" }] : []),
    ],
    links: [["app", "router"], ["router", "p1"], ["router", "p2"], ["router", "p3"], ...(gsi ? [["router", "gsi"] as [string, string]] : [])],
  };
}

const SCENARIOS: PScenario[] = [
  {
    name: "Mở đơn hàng của một khách",
    request: "Query Orders  PK = \"KH#4521\"  SK begins_with \"2026-10\"",
    action: "Gửi query",
    layout: tableLayout(false),
    run: () => ({
      steps: [
        { at: "router", state: "pass", msg: "Băm **partition key** `KH#4521` để biết item nằm ở partition nào." },
        { at: "p2", state: "pass", flash: "4 ms", msg: "Các đơn của khách này nằm cạnh nhau, xếp theo **sort key** (ngày đặt). Chỉ đọc đúng các đơn tháng 10." },
      ],
      ok: true,
      result: "Trả về 3 đơn trong vài mili giây, dù bảng có hàng triệu đơn. Truy vấn theo key thì nhanh như nhau ở mọi kích thước bảng.",
    }),
  },
  {
    name: "Tìm mọi đơn đang chờ xử lý",
    request: (gsi) => gsi ? "Query StatusIndex  Status = \"PENDING\"" : "Scan Orders  FILTER Status = \"PENDING\"",
    toggle: { label: "Đã tạo GSI với partition key = Status", initial: false },
    action: "Gửi request",
    layout: tableLayout,
    run: (gsi) => gsi
      ? { steps: [
            { at: "router", state: "pass", msg: "Request đi vào index thay vì bảng." },
            { at: "gsi", state: "pass", flash: "8 ms", msg: "GSI là bản sao do DynamoDB tự duy trì, xếp theo `Status`. Nhóm `PENDING` nằm sẵn một chỗ." },
          ], ok: true, result: "Chỉ đọc đúng các đơn đang chờ. GSI được cập nhật bất đồng bộ nên đọc GSI là eventually consistent." }
      : { steps: [
            { at: "router", state: "change", tag: "SCAN", msg: "`Status` không phải key. Không biết item nằm đâu nên phải đọc hết bảng." },
            { at: "p1", state: "wait", msg: "Đọc toàn bộ partition 1, tốn RCU cho cả những đơn đã giao." },
            { at: "p2", state: "wait", msg: "Đọc toàn bộ partition 2." },
            { at: "p3", state: "wait", flash: "9 s", msg: "Đọc toàn bộ partition 3. Filter chỉ bỏ bớt kết quả **sau khi** đã đọc." },
          ], ok: false, result: "Có kết quả nhưng chậm và tốn RCU cho cả bảng. Tạo GSI theo Status. LSI không giúp được: LSI bắt buộc dùng chung partition key `CustomerId` và chỉ tạo được lúc tạo bảng." },
  },
  {
    name: "Lưu video review 80 MB",
    request: (s3) => s3 ? "PutObject video → S3, PutItem { reviewId, videoKey }" : "PutItem { reviewId, video: <80 MB> }",
    toggle: { label: "Video để trên S3, item chỉ giữ đường dẫn", initial: false },
    action: "Lưu review",
    layout: (s3) => ({
      viewBox: VB,
      aria: "App lưu video review vào DynamoDB hoặc S3",
      nodes: [
        { id: "app", x: 80, y: 150, l1: "Người bán", l2: "tải video", user: true },
        { id: "ddb", x: 420, y: s3 ? 210 : 150, w: 170, l1: "DynamoDB", l2: "table Reviews" },
        ...(s3 ? [{ id: "s3", x: 420, y: 92, w: 170, l1: "Amazon S3", l2: "bucket review-videos" }] : []),
      ],
      links: [["app", "ddb"], ...(s3 ? [["app", "s3"] as [string, string]] : [])],
    }),
    run: (s3) => s3
      ? { steps: [
            { at: "s3", state: "pass", roundTrip: true, msg: "Video 80 MB lên S3. Object S3 tới 5 TB." },
            { at: "ddb", state: "pass", flash: "1 KB", msg: "Item chỉ chứa `videoKey`, số sao, nội dung chữ. Nhỏ, đọc ghi nhanh." },
          ], ok: true, result: "Đọc review lấy item từ DynamoDB, rồi tải video từ S3 (hoặc qua CloudFront)." }
      : { steps: [
            { at: "ddb", state: "block", flash: "400 KB", msg: "Một item tối đa **400 KB**, tính cả tên và giá trị mọi attribute. 80 MB bị từ chối." },
          ], ok: false, result: "ValidationException. File lớn để trên S3, DynamoDB chỉ lưu đường dẫn." },
  },
  {
    name: "Báo cáo doanh thu nối nhiều bảng",
    request: "Doanh thu theo tỉnh = Orders ⋈ Customers ⋈ Products",
    toggle: { label: "Dữ liệu này để trên Aurora", initial: false },
    action: "Chạy báo cáo",
    layout: (aurora) => ({
      viewBox: VB,
      aria: "App chạy báo cáo cần JOIN trên DynamoDB hoặc Aurora",
      nodes: [
        { id: "app", x: 80, y: 150, l1: "Phòng kế toán", user: true },
        { id: "db", x: 420, y: 150, w: 210, l1: aurora ? "Aurora MySQL" : "DynamoDB", l2: aurora ? "bảng quan hệ, SQL" : "key-value, không JOIN" },
      ],
      links: [["app", "db"]],
    }),
    run: (aurora) => aurora
      ? { steps: [
            { at: "db", state: "pass", flash: "JOIN", msg: "Một câu SQL nối ba bảng, database tự tối ưu." },
          ], ok: true, result: "Dữ liệu quan hệ cần JOIN thì để trên RDS hoặc Aurora. Tải thất thường không đoán trước thì dùng Aurora Serverless v2." }
      : { steps: [
            { at: "db", state: "block", flash: "no JOIN", msg: "DynamoDB không có JOIN. App phải gọi hàng nghìn lần rồi tự ghép kết quả." },
          ], ok: false, result: "DynamoDB hợp truy cập theo key với tốc độ ổn định. Báo cáo quan hệ, JOIN, schema chặt thì chọn database quan hệ." },
  },
  {
    name: "Worker trong private subnet ghi trạng thái",
    request: "UpdateItem Jobs  status = \"DONE\"",
    toggle: { label: "Route table có gateway endpoint cho DynamoDB", initial: false },
    action: "Ghi trạng thái",
    layout: (gw) => ({
      viewBox: VB,
      aria: "EC2 trong private subnet đi qua route table và gateway endpoint tới DynamoDB",
      boxes: [{ x: 24, y: 52, w: 520, h: 196, label: "VPC của ShopViet · private subnet, không có NAT" }],
      nodes: [
        { id: "ec2", x: 110, y: 150, w: 130, l1: "EC2 xử lý ảnh", l2: "chỉ có private IP" },
        { id: "rt", x: 290, y: 150, w: 150, l1: "Route table", l2: gw ? "pl-ddb → vpce-…" : "chỉ có local" },
        { id: "vpce", x: 460, y: 150, w: 130, l1: "Gateway endpoint", l2: gw ? "DynamoDB" : "(chưa có)" },
        { id: "ddb", x: 690, y: 150, w: 150, l1: "DynamoDB", l2: "table Jobs" },
      ],
      links: [["ec2", "rt"], ["rt", "vpce"], ["vpce", "ddb"]],
    }),
    run: (gw) => gw
      ? { steps: [
            { at: "rt", state: "pass", msg: "Route có đích là **prefix list** của DynamoDB, target là gateway endpoint." },
            { at: "vpce", state: "pass", msg: "Traffic đi trong mạng AWS, không qua internet. Gateway endpoint không tính phí." },
            { at: "ddb", state: "pass", msg: "Cập nhật trạng thái xong." },
          ], ok: true, result: "Chỉ **S3** và **DynamoDB** có gateway endpoint. Cần cả hai thì tạo hai gateway endpoint và thêm cả hai vào route table." }
      : { steps: [
            { at: "rt", state: "block", flash: "timeout", msg: "Không có route nào tới DynamoDB, cũng không có NAT. Request treo tới hết giờ." },
          ], ok: false, result: "Thêm gateway endpoint cho DynamoDB vào route table của subnet. Không cần NAT gateway hay IP public." },
  },
];

export default function KeyAccessSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một việc của ShopViet, gửi request, xem nó đi tới đâu trong DynamoDB. Có công tắc thì bật lên rồi chạy lại." />;
}
