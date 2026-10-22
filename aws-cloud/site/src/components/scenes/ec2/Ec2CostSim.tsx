import HopSim, { type HopScenario } from "../security/HopSim";

// Buying EC2 for real ShopViet workloads: Spot interruptions and persistent requests,
// Spot Fleet across instance pools, Dedicated Instances vs Dedicated Hosts, Compute
// Savings Plans and right-sizing with Compute Optimizer.
// Practice-test sources (build-time only): exam1_q21, exam4_q46, exam2_q49, exam6_q18, exam2_q23, exam6_q21, exam6_q33, exam6_q38, exam4_q30.

const SCENARIOS: HopScenario[] = [
  {
    name: "Spot worker bị thu hồi",
    story: "Worker xử lý ảnh sản phẩm chạy trên **Spot Instance** và nhận tác vụ từ hàng đợi SQS. Lúc nửa đêm, AWS cần thu hồi capacity.",
    request: "Thông báo thu hồi Spot",
    toggle: { label: "Spot request kiểu persistent", initial: false },
    start: "aws",
    nodes: [
      { id: "aws", x: 100, y: 60, label: "AWS", sub: "thu hồi capacity", kind: "aws" },
      { id: "w1", x: 360, y: 60, label: "Spot worker", sub: "đang xử lý ảnh", kind: "app" },
      { id: "q", x: 660, y: 60, label: "Hàng đợi SQS", sub: "ảnh chờ xử lý", kind: "store" },
      { id: "req", x: 100, y: 200, label: "Spot request", kind: "svc" },
      { id: "w2", x: 360, y: 200, label: "Spot worker mới", kind: "app" },
    ],
    run: (on) => ({ hops: [
      { to: "w1", state: "alert", tag: "2 PHÚT", flash: "2:00", msg: "Thông báo gián đoạn được gửi trước **2 phút** khi EC2 stop hoặc terminate Spot Instance." },
      { to: "q", state: "change", tag: "TRẢ TÁC VỤ", msg: "Worker trả tác vụ đang xử lý dở về hàng đợi; không tác vụ nào bị mất." },
      ...(on ? [
        { from: "req", to: "w2", state: "pass" as const, tag: "MỞ LẠI", msg: "Request **persistent** được gửi lại để bù instance bị gián đoạn; khi có capacity, instance mới được khởi chạy." },
        { to: "q", state: "pass" as const, tag: "TIẾP TỤC", msg: "Worker mới tiếp tục nhận tác vụ." },
      ] : [
        { from: "req", to: "w2", state: "skip" as const, tag: "ĐÃ ĐÓNG", msg: "Request **one-time** không được gửi lại khi instance bị gián đoạn; không có worker thay thế." },
      ]),
    ], ok: on, result: on
      ? "Spot có chi phí thấp hơn tới 90% so với On-Demand. Tác vụ chịu được gián đoạn, nhận việc từ hàng đợi và dùng persistent request là trường hợp phù hợp cho Spot."
      : "Dữ liệu ảnh không bị mất, nhưng không còn worker nào xử lý. Job dài hạn cần tiếp tục xử lý nên sử dụng request **persistent** (hoặc Auto Scaling group)." }),
  },
  {
    name: "Batch đêm cần đủ 10 instance",
    story: "Hằng đêm ShopViet chạy batch tổng hợp báo cáo, yêu cầu đúng **10 instance**. Job có thể chia nhỏ và chạy được trên mọi instance type.",
    request: "Giữ target capacity = 10",
    toggle: { label: "Spot Fleet kết hợp nhiều instance type", initial: false },
    start: "aws",
    nodes: [
      { id: "aws", x: 100, y: 60, label: "AWS", sub: "thu hồi một pool", kind: "aws" },
      { id: "p1", x: 360, y: 60, label: "Pool c5.large", sub: "4 instance", kind: "app" },
      { id: "fleet", x: 360, y: 200, label: "Spot Fleet", sub: "target 10", kind: "svc" },
      { id: "p2", x: 640, y: 60, label: "Pool m5.large", kind: "app" },
      { id: "p3", x: 640, y: 140, label: "Pool c6g.large", kind: "app" },
      { id: "job", x: 640, y: 220, label: "Batch báo cáo", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["p2", "p3"]),
    run: (on) => on
      ? { hops: [
          { to: "p1", state: "alert", tag: "THU HỒI", flash: "−4", msg: "Pool c5.large bị thu hồi 4 instance." },
          { to: "fleet", state: "change", tag: "BÙ", msg: "Fleet phát hiện capacity giảm xuống 6." },
          { to: "p2", state: "pass", tag: "+2", msg: "Bổ sung bằng m5.large." },
          { from: "fleet", to: "p3", state: "pass", tag: "+2", msg: "Bổ sung thêm c6g.large." },
          { from: "fleet", to: "job", state: "pass", tag: "ĐỦ 10", msg: "Batch tiếp tục chạy với đủ 10 instance." },
        ], ok: true, result: "**Spot Fleet** tự động yêu cầu capacity Spot thay thế khi instance bị gián đoạn, phân bổ trên nhiều instance type (có thể kết hợp cả On-Demand)." }
      : { hops: [
          { to: "p1", state: "alert", tag: "THU HỒI", flash: "−4", msg: "Pool c5.large bị thu hồi 4 instance." },
          { to: "fleet", state: "alert", tag: "CÒN 6", msg: "Request chỉ chỉ định một instance type và pool đó đã hết capacity." },
          { to: "job", state: "alert", tag: "TRỄ", msg: "Batch chạy thiếu instance; báo cáo buổi sáng bị chậm." },
        ], ok: false, result: "Phụ thuộc vào một instance type duy nhất làm giảm khả năng chịu lỗi. Giải pháp: Spot Fleet phân bổ trên nhiều instance type." },
  },
  {
    name: "Yêu cầu phần cứng không dùng chung",
    story: "Đối tác ngân hàng yêu cầu máy chủ xử lý thanh toán của ShopViet chạy trên **phần cứng single-tenant**. Không có yêu cầu license đặc biệt; mục tiêu là chi phí thấp nhất.",
    request: "Launch 4 instance thanh toán",
    toggle: { label: "Dedicated Instances (tắt: Dedicated Hosts)", initial: false },
    start: "pay",
    nodes: [
      { id: "pay", x: 100, y: 130, label: "Máy chủ thanh toán", sub: "4 instance", kind: "app" },
      { id: "di", x: 400, y: 130, label: "Dedicated Instances", sub: "phần cứng riêng của ShopViet", kind: "svc" },
      { id: "dh", x: 400, y: 130, label: "Dedicated Host", sub: "thuê toàn bộ máy chủ vật lý", kind: "svc" },
      { id: "bill", x: 680, y: 130, w: 120, label: "Hoá đơn", kind: "store" },
    ],
    hidden: (on) => (on ? ["dh"] : ["di"]),
    run: (on) => on
      ? { hops: [
          { to: "di", state: "pass", tag: "SINGLE-TENANT", msg: "Không dùng chung phần cứng với account khác." },
          { to: "bill", state: "pass", tag: "THEO INSTANCE", msg: "Tính phí theo từng instance; đơn giá Dedicated Instance khác với On-Demand thông thường." },
        ], ok: true, result: "Đáp ứng yêu cầu single-tenant mà không phải trả tiền cho toàn bộ host. Theo AWS, khi không cần kiểm soát vị trí instance và không dùng license theo socket, core, có thể chọn Dedicated Instances thay cho Dedicated Hosts." }
      : { hops: [
          { to: "dh", state: "pass", tag: "SINGLE-TENANT", msg: "Đáp ứng yêu cầu." },
          { to: "bill", state: "alert", tag: "TOÀN BỘ HOST", msg: "Tính phí theo host: trả cho toàn bộ máy chủ vật lý, kể cả phần capacity không sử dụng." },
        ], ok: false, result: "Đáp ứng yêu cầu nhưng chi phí cao hơn mức cần thiết. Khi không có license theo máy chủ, lựa chọn phù hợp là **Dedicated Instances**." },
  },
  {
    name: "License tính theo socket",
    story: "Phần mềm quản lý kho hiện tại của ShopViet có license tính theo **số socket và core** của máy chủ vật lý. Yêu cầu: tái sử dụng license đã mua (BYOL).",
    request: "Cài đặt phần mềm kho",
    toggle: { label: "Dedicated Hosts (tắt: Dedicated Instances)", initial: false },
    start: "lic",
    nodes: [
      { id: "lic", x: 100, y: 130, label: "License BYOL", sub: "2 socket, 48 core", kind: "key" },
      { id: "dh", x: 400, y: 130, label: "Dedicated Host", sub: "hiển thị socket, core", kind: "svc" },
      { id: "di", x: 400, y: 130, label: "Dedicated Instances", sub: "không hiển thị socket, core", kind: "svc" },
      { id: "app", x: 680, y: 130, w: 120, label: "Phần mềm kho", kind: "app" },
    ],
    hidden: (on) => (on ? ["di"] : ["dh"]),
    run: (on) => on
      ? { hops: [
          { to: "dh", state: "pass", tag: "TƯƠNG THÍCH", msg: "Quan sát và kiểm soát được socket, core của máy chủ vật lý." },
          { to: "app", state: "pass", tag: "HOẠT ĐỘNG", msg: "Tái sử dụng license hiện có." },
        ], ok: true, result: "License theo socket, core hoặc VM: **Dedicated Hosts**." }
      : { hops: [
          { to: "di", state: "block", tag: "KHÔNG TƯƠNG THÍCH", msg: "Không xác định được instance chạy trên socket nào, do đó không chứng minh được việc tuân thủ license." },
        ], ok: false, result: "Dedicated Instances không cung cấp khả năng quan sát phần cứng bên dưới. Giải pháp phù hợp: **Dedicated Hosts**." },
  },
  {
    name: "Hoá đơn gồm EC2, Fargate và Lambda",
    story: "ShopViet chạy ứng dụng web trên EC2, các job nhỏ trên Fargate và Lambda. Yêu cầu: một cam kết duy nhất áp dụng chiết khấu cho **tất cả** các dịch vụ này.",
    request: "Cam kết 10 USD/giờ trong 1 năm",
    toggle: { label: "Compute Savings Plan (tắt: EC2 Instance Savings Plan)", initial: false },
    start: "plan",
    nodes: [
      { id: "plan", x: 110, y: 130, label: "Savings Plan", sub: "cam kết theo giờ", kind: "key" },
      { id: "ec2", x: 520, y: 50, label: "EC2", kind: "app" },
      { id: "far", x: 520, y: 130, label: "Fargate", kind: "app" },
      { id: "lam", x: 520, y: 210, label: "Lambda", kind: "app" },
    ],
    run: (on) => ({ hops: [
      { to: "ec2", state: "pass", tag: "CHIẾT KHẤU", msg: "Áp dụng chiết khấu cho EC2." },
      { from: "plan", to: "far", state: on ? "pass" : "skip", tag: on ? "CHIẾT KHẤU" : "KHÔNG ÁP DỤNG", msg: on ? "Áp dụng chiết khấu cho Fargate." : "Không áp dụng cho Fargate." },
      { from: "plan", to: "lam", state: on ? "pass" : "skip", tag: on ? "CHIẾT KHẤU" : "KHÔNG ÁP DỤNG", msg: on ? "Áp dụng chiết khấu cho Lambda." : "Không áp dụng cho Lambda." },
    ], ok: on, result: on
      ? "**Compute Savings Plan** áp dụng cho EC2 bất kể instance family, size, OS, tenancy hay Region, đồng thời áp dụng cho Fargate và Lambda."
      : "EC2 Instance Savings Plan cam kết cho một instance family trong một Region (ví dụ m5 tại Virginia). Để áp dụng chiết khấu cho cả Fargate và Lambda, sử dụng Compute Savings Plan." }),
  },
  {
    name: "Instance vượt quá nhu cầu tải",
    story: "Chi phí EC2 tăng đều đặn. Nhiều instance chỉ sử dụng 5% CPU nhưng chưa xác định được instance type thay thế phù hợp.",
    request: "Rà soát 120 instance",
    toggle: { label: "Sử dụng Compute Optimizer + Cost Optimization Hub", initial: false },
    start: "opt",
    nodes: [
      { id: "opt", x: 120, y: 130, label: "Compute Optimizer", sub: "phân tích metric CloudWatch", kind: "svc" },
      { id: "big", x: 420, y: 130, label: "m5.4xlarge", sub: "CPU 5%", kind: "app" },
      { id: "small", x: 690, y: 130, w: 120, label: "m5.large", sub: "phù hợp tải", kind: "app" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "big", state: "change", tag: "PHÂN TÍCH", msg: "Phát hiện instance nhàn rỗi, sử dụng rất ít tài nguyên." },
          { to: "small", state: "pass", tag: "ĐỀ XUẤT", msg: "Đề xuất instance type nhỏ hơn, kèm mức tiết kiệm ước tính." },
        ], ok: true, result: "Compute Optimizer phân tích cấu hình và metric sử dụng để đề xuất rightsizing; Cost Optimization Hub tổng hợp các đề xuất tối ưu chi phí trên nhiều account và Region vào một dashboard." }
      : { hops: [
          { to: "big", state: "skip", tag: "KHÔNG GIÁM SÁT", msg: "Instance tiếp tục chạy với 95% tài nguyên bị lãng phí." },
        ], ok: false, result: "Không có số liệu đo lường thì không xác định được tài nguyên dư thừa. Giải pháp: kích hoạt Compute Optimizer và Cost Optimization Hub." },
  },
];

export default function Ec2CostSim() {
  return <HopSim scenarios={SCENARIOS} action="Chạy" height={250}
    label="Các tình huống mua EC2 của ShopViet: Spot, Spot Fleet, Dedicated, Savings Plans và thay đổi instance type" />;
}
