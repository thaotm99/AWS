import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// Patching an instance without the Auto Scaling group replacing it (Standby, or
// suspending ReplaceUnhealthy), and why a new instance needs a health check grace period.

const LAYOUT: PLayout = {
  viewBox: "0 36 820 228",
  aria: "ALB và Auto Scaling group cùng theo dõi ba EC2",
  boxes: [{ x: 370, y: 44, w: 190, h: 212, label: "Auto Scaling group" }],
  nodes: [
    { id: "alb", x: 110, y: 160, w: 150, l1: "ALB", l2: "health check /health" },
    { id: "i1", x: 465, y: 100, w: 150, l1: "i-1", l2: "InService" },
    { id: "i2", x: 465, y: 160, w: 150, l1: "i-2", l2: "InService" },
    { id: "i3", x: 465, y: 220, w: 150, l1: "i-3", l2: "InService" },
    { id: "asg", x: 700, y: 160, w: 150, l1: "Auto Scaling", l2: "health check: ELB" },
  ],
  links: [["alb", "i1"], ["alb", "i2"], ["alb", "i3"], ["asg", "i1"], ["asg", "i2"], ["asg", "i3"]],
};

const REBOOT = { at: "i2", jump: true, state: "change" as const, tag: "VÁ", relabel: { l2: "đang vá, reboot" }, msg: "Kỹ sư cài bản vá hệ điều hành và khởi động lại i-2." };
const DOWN = { at: "i2", from: "alb", state: "block" as const, flash: "timeout", msg: "Trong lúc reboot, i-2 không trả lời health check. ALB đánh dấu unhealthy." };
const REPLACED = { at: "i2", from: "asg", state: "block" as const, label: "Auto Scaling", tag: "THAY", relabel: { l1: "i-4", l2: "mới, chưa vá" }, msg: "ASG thấy i-2 unhealthy nên terminate nó và launch i-4. Bản vá vừa làm mất theo." };

const SCENARIOS: PScenario[] = [
  {
    name: "Vá hệ điều hành cho i-2",
    request: "Bảo trì i-2 trong 20 phút",
    toggle: { label: "Đưa i-2 vào Standby trước khi vá", initial: false },
    action: "Bắt đầu vá",
    run: (standby) => standby
      ? { steps: [
            { at: "i2", from: "asg", state: "wait", tag: "STANDBY", label: "Auto Scaling", relabel: { l2: "Standby" }, msg: "ASG rút i-2 khỏi target group của ALB. Instance ở **Standby** không bị health check và không bị thay." },
            { ...REBOOT, relabel: { l2: "Standby · đang vá" } },
            { at: "i1", from: "alb", state: "pass", roundTrip: true, msg: "Khách được chia sang i-1 và i-3." },
            { at: "i2", from: "asg", state: "pass", tag: "INSERVICE", label: "Auto Scaling", relabel: { l2: "InService · đã vá" }, msg: "Vá xong, đưa i-2 ra khỏi Standby. ASG đăng ký lại vào ALB." },
          ], ok: true, back: false, result: "Vá xong mà không mất máy. Trong lúc Standby, khách không bị gửi vào máy đang reboot." }
      : { steps: [REBOOT, DOWN, REPLACED], ok: false, back: false,
          result: "ASG làm đúng việc của nó: thay máy hỏng. Nhưng máy đó chỉ đang được vá. Đưa vào Standby hoặc tạm dừng ReplaceUnhealthy trước khi vá." },
  },
  {
    name: "Vá nhanh, giữ nguyên trong target group",
    request: "Bảo trì i-2 trong 5 phút",
    toggle: { label: "Suspend process ReplaceUnhealthy", initial: false },
    action: "Bắt đầu vá",
    run: (suspend) => suspend
      ? { steps: [
            { at: "asg", jump: true, state: "wait", tag: "SUSPEND", relabel: { l2: "ReplaceUnhealthy: tạm dừng" }, msg: "Tạm dừng process **ReplaceUnhealthy**. ASG vẫn chạy các process khác." },
            REBOOT, DOWN,
            { at: "i2", from: "asg", state: "wait", tag: "GIỮ", label: "Auto Scaling", msg: "ASG thấy i-2 unhealthy nhưng không thay vì ReplaceUnhealthy đang tạm dừng." },
            { at: "i2", from: "alb", state: "pass", flash: "200", roundTrip: true, relabel: { l2: "InService · đã vá" }, msg: "Reboot xong, health check trả 200. Nhớ **resume** ReplaceUnhealthy." },
          ], ok: true, back: false, result: "Vá xong, i-2 quay lại phục vụ. Cách này hợp khi việc bảo trì ngắn." }
      : { steps: [REBOOT, DOWN, REPLACED], ok: false, back: false,
          result: "Máy đang vá bị thay. Tạm dừng ReplaceUnhealthy trong lúc vá, xong việc thì resume." },
  },
  {
    name: "Instance mới cần thời gian khởi động",
    request: "Scale out: launch thêm một instance",
    toggle: { label: "Health check grace period 300 giây", initial: false },
    action: "Scale out",
    run: (grace) => ({
      steps: [
        { at: "i3", from: "asg", state: "change", tag: "LAUNCH", label: "Auto Scaling", relabel: { l1: "i-5", l2: "đang cài app" }, msg: "ASG launch i-5. User data cần khoảng 3 phút để cài và chạy app." },
        { at: "i3", from: "alb", state: "block", flash: "503", msg: "App chưa chạy xong, health check thất bại." },
        ...(grace
          ? [
              { at: "i3", from: "asg", state: "wait" as const, tag: "CHỜ", label: "Auto Scaling", msg: "Còn trong **health check grace period**: ASG chưa xét health check của i-5." },
              { at: "i3", from: "alb", state: "pass" as const, flash: "200", roundTrip: true, relabel: { l2: "InService" }, msg: "3 phút sau app chạy xong, health check trả 200." },
            ]
          : [
              { at: "i3", from: "asg", state: "block" as const, tag: "THAY", label: "Auto Scaling", relabel: { l1: "i-6", l2: "đang cài app" }, msg: "Không có grace period: ASG xét ngay, thấy unhealthy và thay i-5 bằng i-6. i-6 lại gặp đúng chuyện này." },
            ]),
      ],
      ok: grace,
      back: false,
      result: grace
        ? "Đủ máy sau 3 phút. Đặt grace period dài hơn thời gian khởi động của app."
        : "Vòng lặp launch rồi terminate, không bao giờ có thêm máy. Đặt health check grace period.",
    }),
  },
];

export default function MaintenanceSim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} hint="Chọn một việc bảo trì, bấm nút để chạy, rồi bật công tắc và chạy lại để so sánh." />;
}
