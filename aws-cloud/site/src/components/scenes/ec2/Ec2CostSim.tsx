import HopSim, { type HopScenario } from "../security/HopSim";
import { useLang } from "../../../lib/lang";

// Buying EC2 for real ShopViet workloads: Spot interruptions and persistent requests,
// Spot Fleet across instance pools, Dedicated Instances vs Dedicated Hosts, Compute
// Savings Plans and right-sizing with Compute Optimizer.
// Practice-test sources (build-time only): exam1_q21, exam4_q46, exam2_q49, exam6_q18, exam2_q23, exam6_q21, exam6_q33, exam6_q38, exam4_q30.

type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): HopScenario[] => [
  {
    name: L({ vi: "Spot worker bị gián đoạn", en: "Spot worker interrupted" }),
    story: L({ vi: "Worker xử lý ảnh sản phẩm chạy trên **Spot Instance** và nhận tác vụ từ một SQS queue. Lúc nửa đêm, AWS cần thu hồi capacity.",
      en: "A worker that processes product images runs on a **Spot Instance** and takes tasks from an SQS queue. At midnight, AWS needs the capacity back." }),
    request: L({ vi: "Spot Instance interruption notice", en: "Spot Instance interruption notice" }),
    toggle: { label: L({ vi: "Spot request kiểu persistent", en: "Persistent Spot request" }), initial: false },
    start: "aws",
    nodes: [
      { id: "aws", x: 100, y: 60, label: "AWS", sub: L({ vi: "thu hồi capacity", en: "reclaims capacity" }), kind: "aws" },
      { id: "w1", x: 360, y: 60, label: "Spot worker", sub: L({ vi: "đang xử lý ảnh", en: "processing images" }), kind: "app" },
      { id: "q", x: 660, y: 60, label: L({ vi: "SQS queue", en: "SQS queue" }), sub: L({ vi: "ảnh chờ xử lý", en: "images to process" }), kind: "store" },
      { id: "req", x: 100, y: 200, label: "Spot request", kind: "svc" },
      { id: "w2", x: 360, y: 200, label: L({ vi: "Spot worker mới", en: "New Spot worker" }), kind: "app" },
    ],
    run: (on) => ({ hops: [
      { to: "w1", state: "alert", tag: L({ vi: "2 PHÚT", en: "2 MINUTES" }), flash: "2:00", msg: L({ vi: "Thông báo gián đoạn được gửi trước **2 phút** khi EC2 stop hoặc terminate Spot Instance.", en: "An interruption notice is sent **2 minutes** before EC2 stops or terminates the Spot Instance." }) },
      { to: "q", state: "change", tag: L({ vi: "TRẢ TÁC VỤ", en: "TASK RETURNED" }), msg: L({ vi: "Worker trả tác vụ đang xử lý dở về queue; không tác vụ nào bị mất.", en: "The worker returns its unfinished task to the queue; no task is lost." }) },
      ...(on ? [
        { from: "req", to: "w2", state: "pass" as const, tag: L({ vi: "MỞ LẠI", en: "REOPENED" }), msg: L({ vi: "Request **persistent** được mở lại (open) sau khi instance bị gián đoạn; khi có capacity, instance mới được khởi chạy. Khác với trường hợp chính bạn **stop** Spot Instance: request chuyển sang **disabled** và chỉ mở lại sau khi bạn **start** instance.", en: "The **persistent** request is opened again after the instance is interrupted; when capacity is available, a new instance launches. Unlike when you **stop** the Spot Instance yourself: the request becomes **disabled** and opens only after you **start** the instance." }) },
        { to: "q", state: "pass" as const, tag: L({ vi: "TIẾP TỤC", en: "RESUMED" }), msg: L({ vi: "Worker mới tiếp tục nhận tác vụ.", en: "The new worker continues taking tasks." }) },
      ] : [
        { from: "req", to: "w2", state: "skip" as const, tag: L({ vi: "ĐÃ ĐÓNG", en: "CLOSED" }), msg: L({ vi: "Request **one-time** không được gửi lại khi instance bị gián đoạn; không có worker thay thế.", en: "A **one-time** request is not resubmitted when the instance is interrupted; there is no replacement worker." }) },
      ]),
    ], ok: on, result: on
      ? L({ vi: "Spot có chi phí thấp hơn tới 90% so với On-Demand. Tác vụ chịu được gián đoạn, nhận việc từ queue và dùng persistent request là trường hợp phù hợp cho Spot.",
        en: "Spot costs up to 90% less than On-Demand. Interruption-tolerant tasks that take work from a queue and use a persistent request are a good fit for Spot." })
      : L({ vi: "Dữ liệu ảnh không bị mất, nhưng không còn worker nào xử lý. Job dài hạn cần tiếp tục xử lý nên sử dụng request **persistent** (hoặc Auto Scaling group).",
        en: "No image data is lost, but no worker is left to process it. Long-running jobs that must keep processing should use a **persistent** request (or an Auto Scaling group)." }) }),
  },
  {
    name: L({ vi: "Batch đêm cần đủ 10 instance", en: "Nightly batch needs 10 instances" }),
    story: L({ vi: "Hằng đêm ShopViet chạy batch tổng hợp báo cáo, yêu cầu đúng **10 instance**. Job có thể chia nhỏ và chạy được trên mọi instance type.",
      en: "Every night ShopViet runs a reporting batch that needs exactly **10 instances**. The job can be split up and runs on any instance type." }),
    request: L({ vi: "Giữ target capacity = 10", en: "Keep target capacity = 10" }),
    toggle: { label: L({ vi: "Spot Fleet kết hợp nhiều instance type", en: "Spot Fleet with multiple instance types" }), initial: false },
    start: "aws",
    nodes: [
      { id: "aws", x: 100, y: 60, label: "AWS", sub: L({ vi: "thu hồi một pool", en: "reclaims one pool" }), kind: "aws" },
      { id: "p1", x: 360, y: 60, label: "Pool c5.large", sub: L({ vi: "4 instance", en: "4 instances" }), kind: "app" },
      { id: "fleet", x: 360, y: 200, label: "Spot Fleet", sub: "target 10", kind: "svc" },
      { id: "p2", x: 640, y: 60, label: "Pool m5.large", kind: "app" },
      { id: "p3", x: 640, y: 140, label: "Pool c6g.large", kind: "app" },
      { id: "job", x: 640, y: 220, label: L({ vi: "Batch báo cáo", en: "Reporting batch" }), kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["p2", "p3"]),
    run: (on) => on
      ? { hops: [
          { to: "p1", state: "alert", tag: L({ vi: "THU HỒI", en: "RECLAIMED" }), flash: "−4", msg: L({ vi: "Pool c5.large bị thu hồi 4 instance.", en: "4 instances are reclaimed from the c5.large pool." }) },
          { to: "fleet", state: "change", tag: L({ vi: "BÙ", en: "REPLENISH" }), msg: L({ vi: "Fleet phát hiện capacity giảm xuống 6.", en: "The fleet detects capacity has dropped to 6." }) },
          { to: "p2", state: "pass", tag: "+2", msg: L({ vi: "Bổ sung bằng m5.large.", en: "Replenishes with m5.large." }) },
          { from: "fleet", to: "p3", state: "pass", tag: "+2", msg: L({ vi: "Bổ sung thêm c6g.large.", en: "Adds c6g.large as well." }) },
          { from: "fleet", to: "job", state: "pass", tag: L({ vi: "ĐỦ 10", en: "10 RUNNING" }), msg: L({ vi: "Batch tiếp tục chạy với đủ 10 instance.", en: "The batch keeps running with all 10 instances." }) },
        ], ok: true, result: L({ vi: "**Spot Fleet** tự động yêu cầu capacity Spot thay thế khi instance bị gián đoạn, phân bổ trên nhiều instance type (có thể kết hợp cả On-Demand).",
          en: "**Spot Fleet** automatically requests replacement Spot capacity when instances are interrupted, spread across multiple instance types (and can include On-Demand)." }) }
      : { hops: [
          { to: "p1", state: "alert", tag: L({ vi: "THU HỒI", en: "RECLAIMED" }), flash: "−4", msg: L({ vi: "Pool c5.large bị thu hồi 4 instance.", en: "4 instances are reclaimed from the c5.large pool." }) },
          { to: "fleet", state: "alert", tag: L({ vi: "CÒN 6", en: "6 LEFT" }), msg: L({ vi: "Request chỉ chỉ định một instance type và pool đó đã hết capacity.", en: "The request specifies only one instance type, and that pool is out of capacity." }) },
          { to: "job", state: "alert", tag: L({ vi: "TRỄ", en: "LATE" }), msg: L({ vi: "Batch chạy thiếu instance; báo cáo buổi sáng bị chậm.", en: "The batch runs short of instances; the morning report is late." }) },
        ], ok: false, result: L({ vi: "Phụ thuộc vào một instance type duy nhất làm giảm khả năng chịu lỗi. Giải pháp: Spot Fleet phân bổ trên nhiều instance type.",
          en: "Depending on a single instance type reduces fault tolerance. Solution: a Spot Fleet spread across multiple instance types." }) },
  },
  {
    name: L({ vi: "Yêu cầu phần cứng không dùng chung", en: "Non-shared hardware required" }),
    story: L({ vi: "Đối tác ngân hàng yêu cầu các EC2 instance xử lý thanh toán của ShopViet chạy trên **phần cứng single-tenant**. Không có yêu cầu license đặc biệt; mục tiêu là chi phí thấp nhất.",
      en: "A banking partner requires ShopViet's payment EC2 instances to run on **single-tenant hardware**. There are no special licensing requirements; the goal is the lowest cost." }),
    request: L({ vi: "Launch 4 instance thanh toán", en: "Launch 4 payment instances" }),
    toggle: { label: L({ vi: "Dedicated Instances (tắt: Dedicated Hosts)", en: "Dedicated Instances (off: Dedicated Hosts)" }), initial: false },
    start: "pay",
    nodes: [
      { id: "pay", x: 100, y: 130, label: L({ vi: "Instance thanh toán", en: "Payment instances" }), sub: L({ vi: "4 instance", en: "4 instances" }), kind: "app" },
      { id: "di", x: 400, y: 130, label: "Dedicated Instances", sub: L({ vi: "phần cứng riêng của ShopViet", en: "hardware dedicated to ShopViet" }), kind: "svc" },
      { id: "dh", x: 400, y: 130, label: "Dedicated Host", sub: L({ vi: "thuê toàn bộ máy chủ vật lý", en: "rent the whole physical server" }), kind: "svc" },
      { id: "bill", x: 680, y: 130, w: 120, label: L({ vi: "Hoá đơn", en: "Bill" }), kind: "store" },
    ],
    hidden: (on) => (on ? ["dh"] : ["di"]),
    run: (on) => on
      ? { hops: [
          { to: "di", state: "pass", tag: "SINGLE-TENANT", msg: L({ vi: "Không dùng chung phần cứng với account khác.", en: "No hardware is shared with other accounts." }) },
          { to: "bill", state: "pass", tag: L({ vi: "THEO INSTANCE", en: "PER INSTANCE" }), msg: L({ vi: "Tính phí theo từng instance; đơn giá Dedicated Instance khác với On-Demand thông thường.", en: "Billed per instance; Dedicated Instance pricing differs from regular On-Demand." }) },
        ], ok: true, result: L({ vi: "Đáp ứng yêu cầu single-tenant mà không phải trả tiền cho toàn bộ host. Theo AWS, khi không cần kiểm soát vị trí instance và không dùng license theo socket, core, có thể chọn Dedicated Instances thay cho Dedicated Hosts.",
          en: "Meets the single-tenant requirement without paying for the whole host. According to AWS, when you do not need to control instance placement and do not use per-socket or per-core licenses, you can choose Dedicated Instances instead of Dedicated Hosts." }) }
      : { hops: [
          { to: "dh", state: "pass", tag: "SINGLE-TENANT", msg: L({ vi: "Đáp ứng yêu cầu.", en: "Meets the requirement." }) },
          { to: "bill", state: "alert", tag: L({ vi: "TOÀN BỘ HOST", en: "WHOLE HOST" }), msg: L({ vi: "Tính phí theo host: trả cho toàn bộ máy chủ vật lý, kể cả phần capacity không sử dụng.", en: "Billed per host: you pay for the whole physical server, including unused capacity." }) },
        ], ok: false, result: L({ vi: "Đáp ứng yêu cầu nhưng chi phí cao hơn mức cần thiết. Khi không có license tính theo socket hoặc core, lựa chọn phù hợp là **Dedicated Instances**.",
          en: "Meets the requirement but costs more than necessary. Without per-socket or per-core licenses, the right choice is **Dedicated Instances**." }) },
  },
  {
    name: L({ vi: "License tính theo socket", en: "Per-socket licensing" }),
    story: L({ vi: "Phần mềm quản lý kho hiện tại của ShopViet có license tính theo **số socket và core** của máy chủ vật lý. Yêu cầu: tái sử dụng license đã mua (BYOL).",
      en: "ShopViet's current warehouse management software is licensed by the **number of sockets and cores** of the physical server. Requirement: reuse the licenses already purchased (BYOL)." }),
    request: L({ vi: "Cài đặt phần mềm kho", en: "Install warehouse software" }),
    toggle: { label: L({ vi: "Dedicated Hosts (tắt: Dedicated Instances)", en: "Dedicated Hosts (off: Dedicated Instances)" }), initial: false },
    start: "lic",
    nodes: [
      { id: "lic", x: 100, y: 130, label: "License BYOL", sub: L({ vi: "2 socket, 48 core", en: "2 sockets, 48 cores" }), kind: "key" },
      { id: "dh", x: 400, y: 130, label: "Dedicated Host", sub: L({ vi: "hiển thị socket, core", en: "sockets, cores visible" }), kind: "svc" },
      { id: "di", x: 400, y: 130, label: "Dedicated Instances", sub: L({ vi: "không hiển thị socket, core", en: "sockets, cores not visible" }), kind: "svc" },
      { id: "app", x: 680, y: 130, w: 120, label: L({ vi: "Phần mềm kho", en: "Warehouse app" }), kind: "app" },
    ],
    hidden: (on) => (on ? ["di"] : ["dh"]),
    run: (on) => on
      ? { hops: [
          { to: "dh", state: "pass", tag: L({ vi: "TƯƠNG THÍCH", en: "COMPATIBLE" }), msg: L({ vi: "Quan sát và kiểm soát được socket, core của máy chủ vật lý.", en: "The physical server's sockets and cores are visible and controllable." }) },
          { to: "app", state: "pass", tag: L({ vi: "HOẠT ĐỘNG", en: "RUNNING" }), msg: L({ vi: "Tái sử dụng license hiện có.", en: "Reuses the existing licenses." }) },
        ], ok: true, result: L({ vi: "License theo socket, core hoặc VM: **Dedicated Hosts**.", en: "Per-socket, per-core or per-VM licenses: **Dedicated Hosts**." }) }
      : { hops: [
          { to: "di", state: "block", tag: L({ vi: "KHÔNG TƯƠNG THÍCH", en: "INCOMPATIBLE" }), msg: L({ vi: "Không xác định được instance chạy trên socket nào, do đó không chứng minh được việc tuân thủ license.", en: "You cannot tell which sockets the instance runs on, so you cannot prove license compliance." }) },
        ], ok: false, result: L({ vi: "Dedicated Instances không cung cấp khả năng quan sát phần cứng bên dưới. Giải pháp phù hợp: **Dedicated Hosts**.",
          en: "Dedicated Instances give no visibility into the underlying hardware. The right solution: **Dedicated Hosts**." }) },
  },
  {
    name: L({ vi: "Hoá đơn gồm EC2, Fargate và Lambda", en: "Bill covers EC2, Fargate and Lambda" }),
    story: L({ vi: "ShopViet chạy ứng dụng web trên EC2, các job nhỏ trên Fargate và Lambda. Yêu cầu: một cam kết duy nhất áp dụng chiết khấu cho **tất cả** các dịch vụ này.",
      en: "ShopViet runs its web application on EC2 and small jobs on Fargate and Lambda. Requirement: a single commitment that applies a discount to **all** of these services." }),
    request: L({ vi: "Cam kết 10 USD/giờ trong 1 năm", en: "Commit 10 USD/hour for 1 year" }),
    toggle: { label: L({ vi: "Compute Savings Plan (tắt: EC2 Instance Savings Plan)", en: "Compute Savings Plan (off: EC2 Instance Savings Plan)" }), initial: false },
    start: "plan",
    nodes: [
      { id: "plan", x: 110, y: 130, label: "Savings Plan", sub: L({ vi: "cam kết theo giờ", en: "hourly commitment" }), kind: "key" },
      { id: "ec2", x: 520, y: 50, label: "EC2", kind: "app" },
      { id: "far", x: 520, y: 130, label: "Fargate", kind: "app" },
      { id: "lam", x: 520, y: 210, label: "Lambda", kind: "app" },
    ],
    run: (on) => ({ hops: [
      { to: "ec2", state: "pass", tag: L({ vi: "CHIẾT KHẤU", en: "DISCOUNT" }), msg: L({ vi: "Áp dụng chiết khấu cho EC2.", en: "Discount applied to EC2." }) },
      { from: "plan", to: "far", state: on ? "pass" : "skip", tag: on ? L({ vi: "CHIẾT KHẤU", en: "DISCOUNT" }) : L({ vi: "KHÔNG ÁP DỤNG", en: "NOT APPLIED" }), msg: on ? L({ vi: "Áp dụng chiết khấu cho Fargate.", en: "Discount applied to Fargate." }) : L({ vi: "Không áp dụng cho Fargate.", en: "Does not apply to Fargate." }) },
      { from: "plan", to: "lam", state: on ? "pass" : "skip", tag: on ? L({ vi: "CHIẾT KHẤU", en: "DISCOUNT" }) : L({ vi: "KHÔNG ÁP DỤNG", en: "NOT APPLIED" }), msg: on ? L({ vi: "Áp dụng chiết khấu cho Lambda.", en: "Discount applied to Lambda." }) : L({ vi: "Không áp dụng cho Lambda.", en: "Does not apply to Lambda." }) },
    ], ok: on, result: on
      ? L({ vi: "**Compute Savings Plan** áp dụng cho EC2 bất kể instance family, size, OS, tenancy hay Region, đồng thời áp dụng cho Fargate và Lambda.",
        en: "A **Compute Savings Plan** applies to EC2 regardless of instance family, size, OS, tenancy or Region, and also applies to Fargate and Lambda." })
      : L({ vi: "EC2 Instance Savings Plan cam kết cho một instance family trong một Region (ví dụ m5 tại Virginia). Để áp dụng chiết khấu cho cả Fargate và Lambda, sử dụng Compute Savings Plan.",
        en: "An EC2 Instance Savings Plan commits to one instance family in one Region (for example m5 in Virginia). To discount Fargate and Lambda as well, use a Compute Savings Plan." }) }),
  },
  {
    name: L({ vi: "Instance vượt quá nhu cầu tải", en: "Instances oversized for the load" }),
    story: L({ vi: "Chi phí EC2 tăng đều đặn. Nhiều instance chỉ sử dụng 5% CPU nhưng chưa xác định được instance type thay thế phù hợp.",
      en: "EC2 costs keep rising. Many instances use only 5% CPU, but no suitable replacement instance type has been identified." }),
    request: L({ vi: "Rà soát 120 instance", en: "Review 120 instances" }),
    toggle: { label: L({ vi: "Sử dụng Compute Optimizer + Cost Optimization Hub", en: "Use Compute Optimizer + Cost Optimization Hub" }), initial: false },
    start: "opt",
    nodes: [
      { id: "opt", x: 120, y: 130, label: "Compute Optimizer", sub: L({ vi: "phân tích metric CloudWatch", en: "analyzes CloudWatch metrics" }), kind: "svc" },
      { id: "big", x: 420, y: 130, label: "m5.4xlarge", sub: "CPU 5%", kind: "app" },
      { id: "small", x: 690, y: 130, w: 120, label: "m5.large", sub: L({ vi: "phù hợp tải", en: "fits the load" }), kind: "app" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "big", state: "change", tag: L({ vi: "PHÂN TÍCH", en: "ANALYZE" }), msg: L({ vi: "Phát hiện instance nhàn rỗi, sử dụng rất ít tài nguyên.", en: "Finds an idle instance that uses very few resources." }) },
          { to: "small", state: "pass", tag: L({ vi: "ĐỀ XUẤT", en: "RECOMMEND" }), msg: L({ vi: "Đề xuất instance type nhỏ hơn, kèm mức tiết kiệm ước tính.", en: "Recommends a smaller instance type, with the estimated savings." }) },
        ], ok: true, result: L({ vi: "Compute Optimizer phân tích cấu hình và metric sử dụng để đề xuất rightsizing; Cost Optimization Hub tổng hợp các đề xuất tối ưu chi phí trên nhiều account và Region vào một dashboard.",
          en: "Compute Optimizer analyzes configuration and utilization metrics to make rightsizing recommendations; Cost Optimization Hub consolidates cost optimization recommendations across accounts and Regions into one dashboard." }) }
      : { hops: [
          { to: "big", state: "skip", tag: L({ vi: "KHÔNG GIÁM SÁT", en: "NOT MONITORED" }), msg: L({ vi: "Instance tiếp tục chạy với 95% tài nguyên bị lãng phí.", en: "The instance keeps running with 95% of its resources wasted." }) },
        ], ok: false, result: L({ vi: "Không có số liệu đo lường thì không xác định được tài nguyên dư thừa. Giải pháp: kích hoạt Compute Optimizer và Cost Optimization Hub.",
          en: "Without measurements you cannot identify excess resources. Solution: enable Compute Optimizer and Cost Optimization Hub." }) },
  },
];

export default function Ec2CostSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Chạy", en: "Run" })} height={250}
    label={L({ vi: "Các tình huống mua EC2 của ShopViet: Spot, Spot Fleet, Dedicated, Savings Plans và thay đổi instance type",
      en: "ShopViet EC2 purchasing scenarios: Spot, Spot Fleet, Dedicated, Savings Plans and changing instance types" })} />;
}
