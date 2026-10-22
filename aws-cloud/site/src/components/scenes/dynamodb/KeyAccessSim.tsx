import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// How ShopViet's requests reach DynamoDB. A read by partition key goes straight to
// one partition; a filter on a non-key attribute scans every partition until a GSI
// exists; a video does not fit in a 400 KB item; a report that needs JOINs belongs
// in a relational database; and a worker in a private subnet needs a gateway endpoint.

const VB = "0 40 820 230";

function tableLayout(gsi: boolean): PLayout {
  return {
    viewBox: VB,
    aria: "Ứng dụng gửi request tới DynamoDB; request router chọn partition theo partition key",
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
    name: "Truy xuất đơn hàng của một người dùng",
    request: "Query Orders  PK = \"KH#4521\"  SK begins_with \"2026-10\"",
    action: "Gửi query",
    layout: tableLayout(false),
    run: () => ({
      steps: [
        { at: "router", state: "pass", msg: "Băm **partition key** `KH#4521` để xác định partition chứa item." },
        { at: "p2", state: "pass", flash: "4 ms", msg: "Các đơn hàng của người dùng này được lưu liền kề, sắp xếp theo **sort key** (ngày đặt). Chỉ các đơn hàng tháng 10 được đọc." },
      ],
      ok: true,
      result: "Trả về 3 đơn hàng trong vài mili giây, dù bảng chứa hàng triệu đơn. Truy vấn theo key có độ trễ như nhau ở mọi kích thước bảng.",
    }),
  },
  {
    name: "Truy vấn mọi đơn hàng đang chờ xử lý",
    request: (gsi) => gsi ? "Query StatusIndex  Status = \"PENDING\"" : "Scan Orders  FILTER Status = \"PENDING\"",
    toggle: { label: "Đã tạo GSI với partition key = Status", initial: false },
    action: "Gửi request",
    layout: tableLayout,
    run: (gsi) => gsi
      ? { steps: [
            { at: "router", state: "pass", msg: "Request được chuyển tới index thay vì bảng." },
            { at: "gsi", state: "pass", flash: "8 ms", msg: "GSI là bản sao do DynamoDB tự động duy trì, sắp xếp theo `Status`. Các item `PENDING` được lưu tập trung." },
          ], ok: true, result: "Chỉ các đơn hàng đang chờ được đọc. GSI được cập nhật bất đồng bộ nên thao tác đọc GSI là eventually consistent." }
      : { steps: [
            { at: "router", state: "change", tag: "SCAN", msg: "`Status` không phải key. Không xác định được vị trí item nên phải đọc toàn bộ bảng." },
            { at: "p1", state: "wait", msg: "Đọc toàn bộ partition 1, tiêu tốn RCU cho cả các đơn hàng đã giao." },
            { at: "p2", state: "wait", msg: "Đọc toàn bộ partition 2." },
            { at: "p3", state: "wait", flash: "9 s", msg: "Đọc toàn bộ partition 3. Filter chỉ loại bỏ kết quả **sau khi** dữ liệu đã được đọc." },
          ], ok: false, result: "Trả về kết quả nhưng chậm và tiêu tốn RCU cho toàn bộ bảng. Giải pháp: tạo GSI theo Status. LSI không áp dụng được: LSI bắt buộc dùng chung partition key `CustomerId` và chỉ tạo được khi tạo bảng." },
  },
  {
    name: "Lưu video review 80 MB",
    request: (s3) => s3 ? "PutObject video → S3, PutItem { reviewId, videoKey }" : "PutItem { reviewId, video: <80 MB> }",
    toggle: { label: "Video lưu trên S3, item chỉ lưu đường dẫn", initial: false },
    action: "Lưu review",
    layout: (s3) => ({
      viewBox: VB,
      aria: "Ứng dụng lưu video review vào DynamoDB hoặc S3",
      nodes: [
        { id: "app", x: 80, y: 150, l1: "Người bán", l2: "tải video", user: true },
        { id: "ddb", x: 420, y: s3 ? 210 : 150, w: 170, l1: "DynamoDB", l2: "table Reviews" },
        ...(s3 ? [{ id: "s3", x: 420, y: 92, w: 170, l1: "Amazon S3", l2: "bucket review-videos" }] : []),
      ],
      links: [["app", "ddb"], ...(s3 ? [["app", "s3"] as [string, string]] : [])],
    }),
    run: (s3) => s3
      ? { steps: [
            { at: "s3", state: "pass", roundTrip: true, msg: "Video 80 MB được tải lên S3. Object S3 có kích thước tối đa 50 TB (tải lên bằng multipart upload)." },
            { at: "ddb", state: "pass", flash: "1 KB", msg: "Item chỉ chứa `videoKey`, số sao và nội dung văn bản; kích thước nhỏ, đọc ghi nhanh." },
          ], ok: true, result: "Khi đọc review, ứng dụng lấy item từ DynamoDB, sau đó tải video từ S3 (hoặc qua CloudFront)." }
      : { steps: [
            { at: "ddb", state: "block", flash: "400 KB", msg: "Một item có kích thước tối đa **400 KB**, tính cả tên và giá trị của mọi attribute. Item 80 MB bị từ chối." },
          ], ok: false, result: "ValidationException. Tệp lớn được lưu trên S3; DynamoDB chỉ lưu đường dẫn." },
  },
  {
    name: "Báo cáo doanh thu JOIN nhiều bảng",
    request: "Doanh thu theo tỉnh = Orders ⋈ Customers ⋈ Products",
    toggle: { label: "Dữ liệu này lưu trên Aurora", initial: false },
    action: "Chạy báo cáo",
    layout: (aurora) => ({
      viewBox: VB,
      aria: "Ứng dụng chạy báo cáo cần JOIN trên DynamoDB hoặc Aurora",
      nodes: [
        { id: "app", x: 80, y: 150, l1: "Phòng kế toán", user: true },
        { id: "db", x: 420, y: 150, w: 210, l1: aurora ? "Aurora MySQL" : "DynamoDB", l2: aurora ? "bảng quan hệ, SQL" : "key-value, không JOIN" },
      ],
      links: [["app", "db"]],
    }),
    run: (aurora) => aurora
      ? { steps: [
            { at: "db", state: "pass", flash: "JOIN", msg: "Một câu SQL JOIN ba bảng; database tự tối ưu truy vấn." },
          ], ok: true, result: "Dữ liệu quan hệ cần JOIN được lưu trên RDS hoặc Aurora. Với tải biến động không dự đoán được, sử dụng Aurora Serverless v2." }
      : { steps: [
            { at: "db", state: "block", flash: "no JOIN", msg: "DynamoDB không hỗ trợ JOIN. Ứng dụng phải gọi hàng nghìn request rồi tự ghép kết quả." },
          ], ok: false, result: "DynamoDB phù hợp với truy cập theo key với độ trễ ổn định. Báo cáo trên dữ liệu quan hệ, cần JOIN và schema chặt chẽ: lựa chọn cơ sở dữ liệu quan hệ." },
  },
  {
    name: "Worker trong private subnet cập nhật trạng thái",
    request: "UpdateItem Jobs  status = \"DONE\"",
    toggle: { label: "Route table có gateway endpoint cho DynamoDB", initial: false },
    action: "Ghi trạng thái",
    layout: (gw) => ({
      viewBox: VB,
      aria: "EC2 trong private subnet kết nối tới DynamoDB qua route table và gateway endpoint",
      boxes: [{ x: 24, y: 52, w: 520, h: 196, label: "VPC của ShopViet · private subnet, không có NAT" }],
      nodes: [
        { id: "ec2", x: 110, y: 150, w: 130, l1: "EC2 xử lý ảnh", l2: "chỉ có private IP" },
        { id: "rt", x: 290, y: 150, w: 150, l1: "Route table", l2: gw ? "pl-ddb → vpce-…" : "chỉ có route local" },
        { id: "vpce", x: 460, y: 150, w: 130, l1: "Gateway endpoint", l2: gw ? "DynamoDB" : "(chưa tạo)" },
        { id: "ddb", x: 690, y: 150, w: 150, l1: "DynamoDB", l2: "table Jobs" },
      ],
      links: [["ec2", "rt"], ["rt", "vpce"], ["vpce", "ddb"]],
    }),
    run: (gw) => gw
      ? { steps: [
            { at: "rt", state: "pass", msg: "Route có destination là **prefix list** của DynamoDB, target là gateway endpoint." },
            { at: "vpce", state: "pass", msg: "Traffic được truyền trong mạng AWS, không đi qua Internet. Gateway endpoint không tính phí." },
            { at: "ddb", state: "pass", msg: "Cập nhật trạng thái thành công." },
          ], ok: true, result: "Chỉ **S3** và **DynamoDB** hỗ trợ gateway endpoint. Khi cần cả hai, tạo hai gateway endpoint và thêm cả hai vào route table." }
      : { steps: [
            { at: "rt", state: "block", flash: "timeout", msg: "Không có route tới DynamoDB và không có NAT. Request bị treo cho tới khi hết thời gian chờ (timeout)." },
          ], ok: false, result: "Thêm gateway endpoint cho DynamoDB vào route table của subnet. Không cần NAT gateway hay public IP." },
  },
];

export default function KeyAccessSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tác vụ của ShopViet và gửi request để quan sát đường đi của request trong DynamoDB. Với tình huống có tuỳ chọn cấu hình, bật tuỳ chọn và chạy lại để so sánh." />;
}
