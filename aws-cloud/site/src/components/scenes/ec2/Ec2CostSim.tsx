import HopSim, { type HopScenario } from "../security/HopSim";

// Buying EC2 for real ShopViet workloads: Spot interruptions and persistent requests,
// Spot Fleet across instance pools, Dedicated Instances vs Dedicated Hosts, Compute
// Savings Plans and right-sizing with Compute Optimizer.
// Practice-test sources (build-time only): exam1_q21, exam4_q46, exam2_q49, exam6_q18, exam2_q23, exam6_q21, exam6_q33, exam6_q38, exam4_q30.

const SCENARIOS: HopScenario[] = [
  {
    name: "Worker Spot bị thu hồi",
    story: "Worker xử lý ảnh sản phẩm chạy trên **Spot Instance**, lấy việc từ hàng đợi SQS. Giữa đêm AWS cần lại capacity.",
    request: "Thông báo thu hồi Spot",
    toggle: { label: "Spot request kiểu persistent", initial: false },
    start: "aws",
    nodes: [
      { id: "aws", x: 100, y: 60, label: "AWS", sub: "cần lại capacity", kind: "aws" },
      { id: "w1", x: 360, y: 60, label: "Spot worker", sub: "đang xử lý ảnh", kind: "app" },
      { id: "q", x: 660, y: 60, label: "Hàng đợi SQS", sub: "ảnh chờ xử lý", kind: "store" },
      { id: "req", x: 100, y: 200, label: "Spot request", kind: "svc" },
      { id: "w2", x: 360, y: 200, label: "Spot worker mới", kind: "app" },
    ],
    run: (on) => ({ hops: [
      { to: "w1", state: "alert", tag: "2 PHÚT", flash: "2:00", msg: "Thông báo thu hồi trước **2 phút**." },
      { to: "q", state: "change", tag: "TRẢ VIỆC", msg: "Worker trả ảnh đang làm dở về hàng đợi, không mất việc." },
      ...(on ? [
        { from: "req", to: "w2", state: "pass" as const, tag: "MỞ LẠI", msg: "Request **persistent** mở lại; có capacity là instance mới chạy." },
        { to: "q", state: "pass" as const, tag: "CHẠY TIẾP", msg: "Worker mới lấy việc tiếp." },
      ] : [
        { from: "req", to: "w2", state: "skip" as const, tag: "ĐÃ ĐÓNG", msg: "Request **one-time** đóng sau lần đầu, không ai thay worker." },
      ]),
    ], ok: on, result: on
      ? "Spot rẻ tới 90% so với On-Demand. Việc chịu được gián đoạn + hàng đợi + persistent request là hợp nhất cho Spot."
      : "Ảnh không mất, nhưng không còn worker nào xử lý. Job dài cần chạy tiếp thì dùng request **persistent** (hoặc Auto Scaling group)." }),
  },
  {
    name: "Batch đêm cần đủ 10 server",
    story: "Mỗi đêm ShopViet chạy batch tổng hợp báo cáo, cần đúng **10 instance**. Job chia nhỏ được, chạy trên loại server nào cũng được.",
    request: "Giữ target capacity = 10",
    toggle: { label: "Spot Fleet trộn nhiều loại instance", initial: false },
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
          { to: "fleet", state: "change", tag: "BÙ", msg: "Fleet thấy capacity tụt xuống 6." },
          { to: "p2", state: "pass", tag: "+2", msg: "Bù bằng m5.large." },
          { from: "fleet", to: "p3", state: "pass", tag: "+2", msg: "Bù thêm c6g.large." },
          { from: "fleet", to: "job", state: "pass", tag: "ĐỦ 10", msg: "Batch vẫn chạy đủ 10 instance." },
        ], ok: true, result: "**Spot Fleet** giữ target capacity bằng cách thay instance bị thu hồi, trộn nhiều loại instance (có thể trộn cả On-Demand)." }
      : { hops: [
          { to: "p1", state: "alert", tag: "THU HỒI", flash: "−4", msg: "Pool c5.large bị thu hồi 4 instance." },
          { to: "fleet", state: "alert", tag: "CÒN 6", msg: "Chỉ xin một loại instance, pool đó đang hết." },
          { to: "job", state: "alert", tag: "TRỄ", msg: "Batch chạy thiếu server, báo cáo sáng ra muộn." },
        ], ok: false, result: "Một loại instance là một điểm yếu. Dùng Spot Fleet trải trên nhiều loại instance." },
  },
  {
    name: "Quy định: phần cứng không dùng chung",
    story: "Đối tác ngân hàng yêu cầu server xử lý thanh toán của ShopViet chạy trên **phần cứng single-tenant**. Không cần license gì đặc biệt, muốn rẻ nhất.",
    request: "Launch 4 instance thanh toán",
    toggle: { label: "Dedicated Instances (tắt: Dedicated Hosts)", initial: false },
    start: "pay",
    nodes: [
      { id: "pay", x: 100, y: 130, label: "Server thanh toán", sub: "4 instance", kind: "app" },
      { id: "di", x: 400, y: 130, label: "Dedicated Instances", sub: "phần cứng chỉ của ShopViet", kind: "svc" },
      { id: "dh", x: 400, y: 130, label: "Dedicated Host", sub: "thuê nguyên server vật lý", kind: "svc" },
      { id: "bill", x: 680, y: 130, w: 120, label: "Hoá đơn", kind: "store" },
    ],
    hidden: (on) => (on ? ["dh"] : ["di"]),
    run: (on) => on
      ? { hops: [
          { to: "di", state: "pass", tag: "SINGLE-TENANT", msg: "Không chung phần cứng với account khác." },
          { to: "bill", state: "pass", tag: "THEO INSTANCE", msg: "Trả theo instance đang chạy." },
        ], ok: true, result: "Đủ yêu cầu single-tenant, rẻ hơn Dedicated Hosts. Chỉ cần Dedicated Host khi phải thấy socket, core của server (license BYOL)." }
      : { hops: [
          { to: "dh", state: "pass", tag: "SINGLE-TENANT", msg: "Đạt yêu cầu." },
          { to: "bill", state: "alert", tag: "CẢ SERVER", msg: "Trả tiền cho nguyên server vật lý, kể cả phần không dùng." },
        ], ok: false, result: "Đạt yêu cầu nhưng đắt hơn cần thiết. Không cần license theo server thì chọn **Dedicated Instances**." },
  },
  {
    name: "License tính theo socket",
    story: "Phần mềm kho cũ của ShopViet có license tính theo **số socket và core** của server vật lý. ShopViet muốn dùng lại license đã mua (BYOL).",
    request: "Cài phần mềm kho",
    toggle: { label: "Dedicated Hosts (tắt: Dedicated Instances)", initial: false },
    start: "lic",
    nodes: [
      { id: "lic", x: 100, y: 130, label: "License BYOL", sub: "2 socket, 48 core", kind: "key" },
      { id: "dh", x: 400, y: 130, label: "Dedicated Host", sub: "thấy socket, core", kind: "svc" },
      { id: "di", x: 400, y: 130, label: "Dedicated Instances", sub: "không thấy socket, core", kind: "svc" },
      { id: "app", x: 680, y: 130, w: 120, label: "Phần mềm kho", kind: "app" },
    ],
    hidden: (on) => (on ? ["di"] : ["dh"]),
    run: (on) => on
      ? { hops: [
          { to: "dh", state: "pass", tag: "KHỚP", msg: "Nhìn thấy và kiểm soát socket, core của server vật lý." },
          { to: "app", state: "pass", tag: "CHẠY", msg: "Dùng lại license sẵn có." },
        ], ok: true, result: "License theo socket, core hoặc VM: **Dedicated Hosts**." }
      : { hops: [
          { to: "di", state: "block", tag: "KHÔNG KHỚP", msg: "Không biết instance nằm trên socket nào, không chứng minh được license." },
        ], ok: false, result: "Dedicated Instances không cho thấy phần cứng bên dưới. Cần **Dedicated Hosts**." },
  },
  {
    name: "Hoá đơn có EC2, Fargate và Lambda",
    story: "ShopViet chạy web trên EC2, các job nhỏ trên Fargate và Lambda. Muốn cam kết một lần để giảm giá cho **tất cả**.",
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
      { to: "ec2", state: "pass", tag: "GIẢM", msg: "Giảm giá cho EC2." },
      { from: "plan", to: "far", state: on ? "pass" : "skip", tag: on ? "GIẢM" : "KHÔNG", msg: on ? "Giảm giá cho Fargate." : "Không áp dụng cho Fargate." },
      { from: "plan", to: "lam", state: on ? "pass" : "skip", tag: on ? "GIẢM" : "KHÔNG", msg: on ? "Giảm giá cho Lambda." : "Không áp dụng cho Lambda." },
    ], ok: on, result: on
      ? "**Compute Savings Plan** áp dụng linh hoạt cho EC2 (mọi loại, mọi Region), Fargate và Lambda."
      : "EC2 Instance Savings Plan chỉ áp cho một họ instance EC2 trong một Region. Muốn giảm cả Fargate, Lambda thì dùng Compute Savings Plan." }),
  },
  {
    name: "Server quá to so với việc",
    story: "Hoá đơn EC2 tăng đều. Nhiều server chỉ dùng 5% CPU nhưng không ai biết nên đổi sang loại nào.",
    request: "Rà soát 120 instance",
    toggle: { label: "Dùng Compute Optimizer + Cost Optimization Hub", initial: false },
    start: "opt",
    nodes: [
      { id: "opt", x: 120, y: 130, label: "Compute Optimizer", sub: "đọc metric CloudWatch", kind: "svc" },
      { id: "big", x: 420, y: 130, label: "m5.4xlarge", sub: "CPU 5%", kind: "app" },
      { id: "small", x: 690, y: 130, w: 120, label: "m5.large", sub: "vừa đủ", kind: "app" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "big", state: "change", tag: "PHÂN TÍCH", msg: "Thấy instance nhàn rỗi, dùng rất ít tài nguyên." },
          { to: "small", state: "pass", tag: "ĐỀ XUẤT", msg: "Đề xuất loại instance nhỏ hơn, kèm số tiền tiết kiệm được." },
        ], ok: true, result: "Compute Optimizer đề xuất loại instance phù hợp; Cost Optimization Hub gom mọi cơ hội tiết kiệm về một chỗ." }
      : { hops: [
          { to: "big", state: "skip", tag: "KHÔNG AI XEM", msg: "Server tiếp tục chạy với 95% tài nguyên bỏ phí." },
        ], ok: false, result: "Không đo thì không biết thừa ở đâu. Bật Compute Optimizer và Cost Optimization Hub." },
  },
];

export default function Ec2CostSim() {
  return <HopSim scenarios={SCENARIOS} action="Chạy" height={250}
    label="Các tình huống mua EC2 của ShopViet: Spot, Spot Fleet, Dedicated, Savings Plans và đổi loại instance" />;
}
