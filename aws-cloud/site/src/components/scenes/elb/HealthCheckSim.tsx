import PacketSim, { type PLayout, type PScenario, type PStep } from "./PacketSim";

// Why a healthy ShopViet server is marked unhealthy: the security group does not let
// the ALB in, or the health check path is wrong. Then: the ALB drops a target but the
// Auto Scaling group does not replace it (EC2 vs ELB health check). Last: which IP an
// NLB sends to when the target is registered by instance ID.

function layout(asgCheck: "EC2" | "ELB"): PLayout {
  return {
    viewBox: "0 36 820 228",
    aria: "ALB gửi health check qua security group tới ba EC2 trong Auto Scaling group",
    boxes: [{ x: 410, y: 44, w: 180, h: 212, label: "Auto Scaling group" }],
    nodes: [
      { id: "alb", x: 95, y: 160, w: 130, l1: "ALB", l2: "health check /health" },
      { id: "sg", x: 280, y: 160, w: 120, l1: "Security group", l2: "inbound của EC2" },
      { id: "i1", x: 500, y: 100, w: 130, l1: "i-1", l2: "web" },
      { id: "i2", x: 500, y: 160, w: 130, l1: "i-2", l2: "web" },
      { id: "i3", x: 500, y: 220, w: 130, l1: "i-3", l2: "web" },
      { id: "asg", x: 710, y: 160, w: 150, l1: "Auto Scaling", l2: `health check: ${asgCheck}` },
    ],
    links: [["alb", "sg"], ["sg", "i1"], ["sg", "i2"], ["sg", "i3"], ["asg", "i1"], ["asg", "i2"], ["asg", "i3"]],
  };
}

const SG_OK: PStep = { at: "sg", state: "pass", msg: "Inbound rule cho phép **security group của ALB** vào cổng 80." };

const SCENARIOS: PScenario[] = [
  {
    name: "Server chạy tốt mà vẫn unhealthy",
    request: "GET /health  (ALB → i-2, mỗi 30 giây)",
    toggle: { label: "Security group cho phép ALB vào", initial: false },
    layout: () => layout("ELB"),
    run: (open) => open
      ? { steps: [SG_OK, { at: "i2", state: "pass", flash: "200", roundTrip: true, msg: "App trả 200 OK." }],
          ok: true, result: "i-2 healthy, ALB gửi khách vào bình thường." }
      : { steps: [
            { at: "sg", state: "block", flash: "timeout", msg: "Inbound rule chỉ mở cổng 80 cho IP văn phòng, không có ALB. Health check không tới được app." },
            { at: "i2", jump: true, state: "block", tag: "UNHEALTHY", msg: "Hết giờ nhiều lần liên tiếp nên ALB đánh dấu i-2 unhealthy, dù app vẫn chạy." }],
          ok: false, result: "Khách không được gửi vào i-2. Thêm inbound rule nguồn là security group của ALB." },
  },
  {
    name: "Sai đường dẫn health check",
    request: "GET /healthz  (ALB → i-2)",
    toggle: { label: "Sửa health check path thành /health", initial: false },
    layout: () => layout("ELB"),
    run: (fixed) => fixed
      ? { steps: [SG_OK, { at: "i2", state: "pass", flash: "200", roundTrip: true, msg: "`/health` có trong app, trả 200 OK." }],
          ok: true, result: "i-2 healthy trở lại." }
      : { steps: [SG_OK, { at: "i2", state: "block", flash: "404", msg: "App không có đường dẫn `/healthz`, trả 404. ALB coi 404 là hỏng." }],
          ok: false, result: "Target unhealthy dù server không có lỗi gì. Kiểm tra path và mã trả về mong đợi của health check." },
  },
  {
    name: "ALB loại server nhưng không ai thay",
    request: "i-2: app bị treo, máy vẫn chạy",
    toggle: { label: "ASG dùng ELB health check", initial: false },
    layout: (elb) => layout(elb ? "ELB" : "EC2"),
    run: (elb) => ({
      steps: [
        SG_OK,
        { at: "i2", state: "block", flash: "timeout", msg: "App treo, không trả lời health check. ALB đánh dấu unhealthy và ngừng gửi khách vào." },
        elb
          ? { from: "asg", at: "i2", state: "change", tag: "THAY", label: "Auto Scaling", relabel: { l1: "i-4", l2: "mới" }, msg: "ASG dùng **ELB health check** nên nghe theo ALB: terminate i-2 và launch i-4." }
          : { from: "asg", at: "i2", state: "wait", tag: "VẪN CHẠY", label: "Auto Scaling", msg: "ASG dùng **EC2 health check**: chỉ xem máy còn chạy. Máy vẫn chạy nên ASG không làm gì." },
      ],
      ok: elb,
      back: false,
      result: elb
        ? "Nhóm tự lành: i-4 vào target group, lại đủ 3 server."
        : "ALB đã loại i-2 nhưng ASG vẫn giữ nó. ShopViet chạy thiếu một server cho tới khi có người vào sửa.",
    }),
  },
  {
    name: "NLB gửi tới IP nào?",
    action: "Gửi request",
    request: "Target đăng ký bằng instance ID: i-7",
    layout: () => ({
      viewBox: "0 40 820 215",
      aria: "NLB gửi traffic tới primary private IP của network interface chính của EC2",
      boxes: [{ x: 420, y: 60, w: 380, h: 176, label: "EC2 i-7 có hai network interface" }],
      nodes: [
        { id: "c", x: 60, y: 148, l1: "Khách", user: true },
        { id: "nlb", x: 230, y: 148, w: 140, l1: "NLB", l2: "target: i-7" },
        { id: "eth0", x: 610, y: 108, w: 300, l1: "eth0 (chính): 10.0.1.15", l2: "primary private IP" },
        { id: "eth1", x: 610, y: 190, w: 300, l1: "eth1: 10.0.2.40", l2: "ENI phụ" },
      ],
      links: [["c", "nlb"], ["nlb", "eth0"], ["nlb", "eth1"]],
    }),
    run: () => ({
      steps: [
        { at: "nlb", state: "pass", msg: "Listener TCP nhận kết nối." },
        { at: "eth1", jump: true, state: "skip", msg: "ENI phụ không được dùng." },
        { at: "eth0", state: "pass", msg: "Đăng ký bằng instance ID thì NLB gửi tới **primary private IP** của **network interface chính** (eth0)." },
      ],
      ok: true,
      result: "Muốn gửi tới IP khác thì đăng ký target bằng địa chỉ IP (target type `ip`).",
    }),
  },
];

export default function HealthCheckSim() {
  return <PacketSim scenarios={SCENARIOS} action="Chạy health check" hint="Chọn một tình huống rồi bấm nút chạy. Bật công tắc để sửa lỗi và chạy lại." />;
}
