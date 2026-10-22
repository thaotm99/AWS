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

const REBOOT = { at: "i2", jump: true, state: "change" as const, tag: "VÁ LỖI", relabel: { l2: "đang vá, reboot" }, msg: "Kỹ sư cài đặt bản vá hệ điều hành và khởi động lại i-2." };
const DOWN = { at: "i2", from: "alb", state: "block" as const, flash: "timeout", msg: "Trong quá trình reboot, i-2 không phản hồi health check. ALB đánh dấu unhealthy." };
const REPLACED = { at: "i2", from: "asg", state: "block" as const, label: "Auto Scaling", tag: "THAY THẾ", relabel: { l1: "i-4", l2: "mới, chưa vá" }, msg: "ASG xác định i-2 unhealthy nên terminate instance này và launch i-4. Bản vá vừa cài đặt bị mất." };

const SCENARIOS: PScenario[] = [
  {
    name: "Vá hệ điều hành cho i-2",
    request: "Bảo trì i-2 trong 20 phút",
    toggle: { label: "Chuyển i-2 sang Standby trước khi vá", initial: false },
    action: "Bắt đầu vá lỗi",
    run: (standby) => standby
      ? { steps: [
            { at: "i2", from: "asg", state: "wait", tag: "STANDBY", label: "Auto Scaling", relabel: { l2: "Standby" }, msg: "ASG gỡ i-2 khỏi target group của ALB. Instance ở trạng thái **Standby** không được health check và không bị thay thế." },
            { ...REBOOT, relabel: { l2: "Standby · đang vá" } },
            { at: "i1", from: "alb", state: "pass", roundTrip: true, msg: "Request của người dùng được phân phối sang i-1 và i-3." },
            { at: "i2", from: "asg", state: "pass", tag: "INSERVICE", label: "Auto Scaling", relabel: { l2: "InService · đã vá" }, msg: "Sau khi vá xong, đưa i-2 ra khỏi Standby. ASG đăng ký lại instance vào ALB." },
          ], ok: true, back: false, result: "Hoàn tất vá lỗi mà instance không bị thay thế. Trong thời gian Standby, request của người dùng không được định tuyến tới instance đang reboot." }
      : { steps: [REBOOT, DOWN, REPLACED], ok: false, back: false,
          result: "ASG thực hiện đúng chức năng: thay thế instance lỗi. Tuy nhiên, instance đó chỉ đang được vá. Cần chuyển sang Standby hoặc tạm dừng ReplaceUnhealthy trước khi vá." },
  },
  {
    name: "Vá nhanh, giữ nguyên trong target group",
    request: "Bảo trì i-2 trong 5 phút",
    toggle: { label: "Suspend process ReplaceUnhealthy", initial: false },
    action: "Bắt đầu vá lỗi",
    run: (suspend) => suspend
      ? { steps: [
            { at: "asg", jump: true, state: "wait", tag: "SUSPEND", relabel: { l2: "ReplaceUnhealthy: tạm dừng" }, msg: "Tạm dừng process **ReplaceUnhealthy**. Các process khác của ASG vẫn hoạt động." },
            REBOOT, DOWN,
            { at: "i2", from: "asg", state: "wait", tag: "GIỮ NGUYÊN", label: "Auto Scaling", msg: "ASG ghi nhận i-2 unhealthy nhưng không thay thế vì ReplaceUnhealthy đang tạm dừng." },
            { at: "i2", from: "alb", state: "pass", flash: "200", roundTrip: true, relabel: { l2: "InService · đã vá" }, msg: "Sau khi reboot, health check trả về 200. Cần **resume** ReplaceUnhealthy." },
          ], ok: true, back: false, result: "Sau khi vá, i-2 tiếp tục phục vụ. Phương án này phù hợp với tác vụ bảo trì ngắn." }
      : { steps: [REBOOT, DOWN, REPLACED], ok: false, back: false,
          result: "Instance đang vá bị thay thế. Cần tạm dừng ReplaceUnhealthy trong quá trình vá và resume sau khi hoàn tất." },
  },
  {
    name: "Instance mới cần thời gian khởi động",
    request: "Scale out: launch thêm một instance",
    toggle: { label: "Health check grace period 300 giây", initial: false },
    action: "Scale out",
    run: (grace) => ({
      steps: [
        { at: "i3", from: "asg", state: "change", tag: "LAUNCH", label: "Auto Scaling", relabel: { l1: "i-5", l2: "đang cài ứng dụng" }, msg: "ASG launch i-5. User data cần khoảng 3 phút để cài đặt và khởi chạy ứng dụng." },
        { at: "i3", from: "alb", state: "block", flash: "503", msg: "Ứng dụng chưa khởi chạy xong, health check thất bại." },
        ...(grace
          ? [
              { at: "i3", from: "asg", state: "wait" as const, tag: "CHỜ", label: "Auto Scaling", msg: "Vẫn trong **health check grace period**: ASG chưa đánh giá health check của i-5." },
              { at: "i3", from: "alb", state: "pass" as const, flash: "200", roundTrip: true, relabel: { l2: "InService" }, msg: "Sau 3 phút, ứng dụng khởi chạy xong, health check trả về 200." },
            ]
          : [
              { at: "i3", from: "asg", state: "block" as const, tag: "THAY", label: "Auto Scaling", relabel: { l1: "i-6", l2: "đang cài ứng dụng" }, msg: "Không có grace period: ASG đánh giá ngay, xác định unhealthy và thay i-5 bằng i-6. i-6 tiếp tục gặp tình trạng tương tự." },
            ]),
      ],
      ok: grace,
      back: false,
      result: grace
        ? "Đủ capacity sau 3 phút. Grace period cần dài hơn thời gian khởi động của ứng dụng."
        : "Vòng lặp launch rồi terminate, capacity không bao giờ tăng. Cần cấu hình health check grace period.",
    }),
  },
];

export default function MaintenanceSim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} hint="Chọn một tác vụ bảo trì, nhấn nút để chạy, sau đó bật tuỳ chọn và chạy lại để so sánh kết quả." />;
}
