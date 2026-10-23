import PacketSim, { type PLayout, type PScenario, type PStep } from "./PacketSim";
import { useLang } from "../../../lib/lang";

// Why a healthy MFTECH server is marked unhealthy: the security group does not let
// the ALB in, or the health check path is wrong. Then: the ALB drops a target but the
// Auto Scaling group does not replace it (EC2 vs ELB health check). Last: which IP an
// NLB sends to when the target is registered by instance ID.

type Lang = ReturnType<typeof useLang>;

function layout(L: Lang, asgCheck: "EC2" | "ELB"): PLayout {
  return {
    viewBox: "0 36 820 228",
    aria: L({ vi: "ALB gửi health check qua security group tới ba EC2 trong Auto Scaling group", en: "The ALB sends health checks through a security group to three EC2 instances in an Auto Scaling group" }),
    boxes: [{ x: 410, y: 44, w: 180, h: 212, label: "Auto Scaling group" }],
    nodes: [
      { id: "alb", x: 95, y: 160, w: 130, l1: "ALB", l2: "health check /health" },
      { id: "sg", x: 280, y: 160, w: 120, l1: "Security group", l2: L({ vi: "inbound của EC2", en: "EC2 inbound" }) },
      { id: "i1", x: 500, y: 100, w: 130, l1: "i-1", l2: "web" },
      { id: "i2", x: 500, y: 160, w: 130, l1: "i-2", l2: "web" },
      { id: "i3", x: 500, y: 220, w: 130, l1: "i-3", l2: "web" },
      { id: "asg", x: 710, y: 160, w: 150, l1: "Auto Scaling", l2: `health check: ${asgCheck}` },
    ],
    links: [["alb", "sg"], ["sg", "i1"], ["sg", "i2"], ["sg", "i3"], ["asg", "i1"], ["asg", "i2"], ["asg", "i3"]],
  };
}

const scenarios = (L: Lang): PScenario[] => {
  const SG_OK: PStep = { at: "sg", state: "pass", msg: L({ vi: "Inbound rule cho phép traffic từ **security group của ALB** tới cổng 80.", en: "An inbound rule allows traffic from the **ALB's security group** to port 80." }) };
  return [
  {
    name: L({ vi: "Instance hoạt động nhưng unhealthy", en: "Instance works but is unhealthy" }),
    request: L({ vi: "GET /health  (ALB → i-2, mỗi 30 giây)", en: "GET /health  (ALB → i-2, every 30 seconds)" }),
    toggle: { label: L({ vi: "Security group cho phép traffic từ ALB", en: "Security group allows traffic from the ALB" }), initial: false },
    layout: () => layout(L, "ELB"),
    run: (open) => open
      ? { steps: [SG_OK, { at: "i2", state: "pass", flash: "200", roundTrip: true, msg: L({ vi: "Ứng dụng trả về 200 OK.", en: "The application returns 200 OK." }) }],
          ok: true, result: L({ vi: "i-2 ở trạng thái healthy; ALB định tuyến request của người dùng tới i-2 bình thường.", en: "i-2 is healthy; the ALB routes user requests to i-2 as normal." }) }
      : { steps: [
            { at: "sg", state: "block", flash: "timeout", msg: L({ vi: "Inbound rule chỉ mở cổng 80 cho IP văn phòng, không bao gồm ALB. Health check không tới được ứng dụng.", en: "The inbound rule opens port 80 only to the office IP, not to the ALB. Health checks cannot reach the application." }) },
            { at: "i2", jump: true, state: "block", tag: "UNHEALTHY", msg: L({ vi: "Health check thất bại liên tiếp (mặc định 2 lần) nên ALB đánh dấu i-2 là unhealthy, dù ứng dụng vẫn hoạt động.", en: "Health checks fail consecutively (2 times by default), so the ALB marks i-2 unhealthy even though the application still works." }) }],
          ok: false, result: L({ vi: "Request của người dùng không được định tuyến tới i-2. Cần thêm inbound rule với nguồn là security group của ALB.", en: "User requests are not routed to i-2. Add an inbound rule whose source is the ALB's security group." }) },
  },
  {
    name: L({ vi: "Sai health check path", en: "Wrong health check path" }),
    request: "GET /healthz  (ALB → i-2)",
    toggle: { label: L({ vi: "Đổi health check path thành /health", en: "Change the health check path to /health" }), initial: false },
    layout: () => layout(L, "ELB"),
    run: (fixed) => fixed
      ? { steps: [SG_OK, { at: "i2", state: "pass", flash: "200", roundTrip: true, msg: L({ vi: "Ứng dụng có path `/health`, trả về 200 OK.", en: "The application has the `/health` path and returns 200 OK." }) }],
          ok: true, result: L({ vi: "i-2 trở lại trạng thái healthy.", en: "i-2 is healthy again." }) }
      : { steps: [SG_OK, { at: "i2", state: "block", flash: "404", msg: L({ vi: "Ứng dụng không có path `/healthz`, trả về 404. Success code mặc định là 200 nên ALB xem 404 là health check thất bại.", en: "The application has no `/healthz` path and returns 404. The default success code is 200, so the ALB treats 404 as a failed health check." }) }],
          ok: false, result: L({ vi: "Target unhealthy dù instance không có lỗi. Cần kiểm tra path và mã phản hồi kỳ vọng (success codes) của health check.", en: "The target is unhealthy although the instance has no fault. Check the health check path and the expected response codes (success codes)." }) },
  },
  {
    name: L({ vi: "ALB loại instance nhưng không được thay thế", en: "ALB drops an instance, nothing replaces it" }),
    request: L({ vi: "i-2: ứng dụng không phản hồi, instance vẫn chạy", en: "i-2: app not responding, instance still running" }),
    toggle: { label: L({ vi: "ASG sử dụng ELB health check", en: "ASG uses ELB health checks" }), initial: false },
    layout: (elb) => layout(L, elb ? "ELB" : "EC2"),
    run: (elb) => ({
      steps: [
        SG_OK,
        { at: "i2", state: "block", flash: "timeout", msg: L({ vi: "Ứng dụng không phản hồi health check. ALB đánh dấu unhealthy và ngừng định tuyến request tới instance.", en: "The application does not answer the health check. The ALB marks it unhealthy and stops routing requests to the instance." }) },
        elb
          ? { from: "asg", at: "i2", state: "change", tag: L({ vi: "THAY THẾ", en: "REPLACE" }), label: "Auto Scaling", relabel: { l1: "i-4", l2: L({ vi: "mới", en: "new" }) }, msg: L({ vi: "ASG sử dụng **ELB health check** nên dựa theo kết quả của ALB: terminate i-2 và launch i-4.", en: "The ASG uses **ELB health checks**, so it follows the ALB's result: it terminates i-2 and launches i-4." }) }
          : { from: "asg", at: "i2", state: "wait", tag: L({ vi: "VẪN CHẠY", en: "STILL RUNNING" }), label: "Auto Scaling", msg: L({ vi: "ASG chỉ dùng **EC2 health check** (mặc định): kiểm tra instance đang chạy và sự cố phần cứng, phần mềm bên dưới, không dùng kết quả của ALB. Instance vẫn chạy nên ASG không thực hiện thay thế.", en: "The ASG uses only **EC2 health checks** (the default): they check that the instance is running and for underlying hardware or software problems, not the ALB's result. The instance is still running, so the ASG does not replace it." }) },
      ],
      ok: elb,
      back: false,
      result: elb
        ? L({ vi: "Nhóm tự phục hồi: i-4 được đăng ký vào target group, khôi phục đủ 3 instance.", en: "The group heals itself: i-4 is registered with the target group, restoring all 3 instances." })
        : L({ vi: "ALB đã loại i-2 nhưng ASG vẫn giữ instance này. MFTECH vận hành thiếu một instance cho tới khi có can thiệp thủ công.", en: "The ALB has dropped i-2, but the ASG keeps the instance. MFTECH runs one instance short until someone intervenes manually." }),
    }),
  },
  {
    name: L({ vi: "Địa chỉ IP đích của NLB", en: "NLB destination IP address" }),
    action: L({ vi: "Gửi request", en: "Send request" }),
    request: L({ vi: "Target đăng ký bằng instance ID: i-7", en: "Target registered by instance ID: i-7" }),
    layout: () => ({
      viewBox: "0 40 820 215",
      aria: L({ vi: "NLB gửi traffic tới primary private IP của network interface chính của EC2", en: "The NLB sends traffic to the primary private IP of the EC2 instance's primary network interface" }),
      boxes: [{ x: 420, y: 60, w: 380, h: 176, label: L({ vi: "EC2 i-7 có hai network interface", en: "EC2 i-7 has two network interfaces" }) }],
      nodes: [
        { id: "c", x: 60, y: 148, l1: L({ vi: "Người dùng", en: "User" }), user: true },
        { id: "nlb", x: 230, y: 148, w: 140, l1: "NLB", l2: "target: i-7" },
        { id: "eth0", x: 610, y: 108, w: 300, l1: L({ vi: "eth0 (chính): 10.0.1.15", en: "eth0 (primary): 10.0.1.15" }), l2: "primary private IP" },
        { id: "eth1", x: 610, y: 190, w: 300, l1: "eth1: 10.0.2.40", l2: L({ vi: "ENI phụ", en: "secondary ENI" }) },
      ],
      links: [["c", "nlb"], ["nlb", "eth0"], ["nlb", "eth1"]],
    }),
    run: () => ({
      steps: [
        { at: "nlb", state: "pass", msg: L({ vi: "Listener TCP tiếp nhận kết nối.", en: "The TCP listener accepts the connection." }) },
        { at: "eth1", jump: true, state: "skip", msg: L({ vi: "ENI phụ không được sử dụng.", en: "The secondary ENI is not used." }) },
        { at: "eth0", state: "pass", msg: L({ vi: "Khi target được đăng ký bằng instance ID, NLB gửi traffic tới **primary private IP** của **primary network interface** (eth0).", en: "When the target is registered by instance ID, the NLB sends traffic to the **primary private IP** of the **primary network interface** (eth0)." }) },
      ],
      ok: true,
      result: L({ vi: "Để gửi traffic tới IP khác, cần đăng ký target bằng địa chỉ IP (target type `ip`).", en: "To send traffic to a different IP, register the target by IP address (target type `ip`)." }),
    }),
  },
  ];
};

export default function HealthCheckSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} action={L({ vi: "Chạy health check", en: "Run health check" })}
    hint={L({ vi: "Chọn một tình huống, sau đó nhấn nút chạy. Bật cấu hình khắc phục và chạy lại để so sánh kết quả.", en: "Pick a scenario, then press the run button. Turn on the fix and run again to compare the results." })} />;
}
