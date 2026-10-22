import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Patching an instance without the Auto Scaling group replacing it (Standby, or
// suspending ReplaceUnhealthy), and why a new instance needs a health check grace period.

type Lang = ReturnType<typeof useLang>;

const layout = (L: Lang): PLayout => ({
  viewBox: "0 36 820 228",
  aria: L({ vi: "ALB và Auto Scaling group cùng theo dõi ba EC2", en: "The ALB and the Auto Scaling group both monitor three EC2 instances" }),
  boxes: [{ x: 370, y: 44, w: 190, h: 212, label: "Auto Scaling group" }],
  nodes: [
    { id: "alb", x: 110, y: 160, w: 150, l1: "ALB", l2: "health check /health" },
    { id: "i1", x: 465, y: 100, w: 150, l1: "i-1", l2: "InService" },
    { id: "i2", x: 465, y: 160, w: 150, l1: "i-2", l2: "InService" },
    { id: "i3", x: 465, y: 220, w: 150, l1: "i-3", l2: "InService" },
    { id: "asg", x: 700, y: 160, w: 150, l1: "Auto Scaling", l2: "health check: ELB" },
  ],
  links: [["alb", "i1"], ["alb", "i2"], ["alb", "i3"], ["asg", "i1"], ["asg", "i2"], ["asg", "i3"]],
});

const scenarios = (L: Lang): PScenario[] => {
  const REBOOT = { at: "i2", jump: true, state: "change" as const, tag: L({ vi: "VÁ LỖI", en: "PATCH" }), relabel: { l2: L({ vi: "đang vá, reboot", en: "patching, reboot" }) }, msg: L({ vi: "Kỹ sư cài đặt bản vá hệ điều hành và khởi động lại i-2.", en: "An engineer installs an operating system patch and reboots i-2." }) };
  const DOWN = { at: "i2", from: "alb", state: "block" as const, flash: "timeout", msg: L({ vi: "Trong quá trình reboot, i-2 không phản hồi health check. ALB đánh dấu unhealthy.", en: "While rebooting, i-2 does not answer the health check. The ALB marks it unhealthy." }) };
  const REPLACED = { at: "i2", from: "asg", state: "block" as const, label: "Auto Scaling", tag: L({ vi: "THAY THẾ", en: "REPLACE" }), relabel: { l1: "i-4", l2: L({ vi: "mới, chưa vá", en: "new, unpatched" }) }, msg: L({ vi: "ASG xác định i-2 unhealthy nên terminate instance này và launch i-4. Bản vá vừa cài đặt bị mất.", en: "The ASG finds i-2 unhealthy, so it terminates the instance and launches i-4. The patch just installed is lost." }) };
  const PATCH = L({ vi: "Bắt đầu vá lỗi", en: "Start patching" });
  return [
  {
    name: L({ vi: "Vá hệ điều hành cho i-2", en: "Patch the OS on i-2" }),
    request: L({ vi: "Bảo trì i-2 trong 20 phút", en: "Maintain i-2 for 20 minutes" }),
    toggle: { label: L({ vi: "Chuyển i-2 sang Standby trước khi vá", en: "Put i-2 into Standby before patching" }), initial: false },
    action: PATCH,
    run: (standby) => standby
      ? { steps: [
            { at: "i2", from: "asg", state: "wait", tag: "STANDBY", label: "Auto Scaling", relabel: { l2: "Standby" }, msg: L({ vi: "ASG gỡ i-2 khỏi target group của ALB. Instance ở trạng thái **Standby** không được health check và không bị thay thế.", en: "The ASG deregisters i-2 from the ALB target group. An instance in **Standby** is not health checked and is not replaced." }) },
            { ...REBOOT, relabel: { l2: L({ vi: "Standby · đang vá", en: "Standby · patching" }) } },
            { at: "i1", from: "alb", state: "pass", roundTrip: true, msg: L({ vi: "Request của người dùng được phân phối sang i-1 và i-3.", en: "User requests are distributed to i-1 and i-3." }) },
            { at: "i2", from: "asg", state: "pass", tag: "INSERVICE", label: "Auto Scaling", relabel: { l2: L({ vi: "InService · đã vá", en: "InService · patched" }) }, msg: L({ vi: "Sau khi vá xong, đưa i-2 ra khỏi Standby. ASG đăng ký lại instance vào ALB.", en: "After patching, take i-2 out of Standby. The ASG registers the instance with the ALB again." }) },
          ], ok: true, back: false, result: L({ vi: "Hoàn tất vá lỗi mà instance không bị thay thế. Trong thời gian Standby, request của người dùng không được định tuyến tới instance đang reboot.", en: "Patching completes without the instance being replaced. During Standby, user requests are not routed to the rebooting instance." }) }
      : { steps: [REBOOT, DOWN, REPLACED], ok: false, back: false,
          result: L({ vi: "ASG thực hiện đúng chức năng: thay thế instance lỗi. Tuy nhiên, instance đó chỉ đang được vá. Cần chuyển sang Standby hoặc tạm dừng ReplaceUnhealthy trước khi vá.", en: "The ASG does exactly its job: it replaces a failed instance. But that instance was only being patched. Put it into Standby or suspend ReplaceUnhealthy before patching." }) },
  },
  {
    name: L({ vi: "Vá nhanh, giữ nguyên trong target group", en: "Quick patch, stay in the target group" }),
    request: L({ vi: "Bảo trì i-2 trong 5 phút", en: "Maintain i-2 for 5 minutes" }),
    toggle: { label: L({ vi: "Suspend process ReplaceUnhealthy", en: "Suspend the ReplaceUnhealthy process" }), initial: false },
    action: PATCH,
    run: (suspend) => suspend
      ? { steps: [
            { at: "asg", jump: true, state: "wait", tag: "SUSPEND", relabel: { l2: L({ vi: "ReplaceUnhealthy: tạm dừng", en: "ReplaceUnhealthy: suspended" }) }, msg: L({ vi: "Tạm dừng process **ReplaceUnhealthy**. Các process khác của ASG vẫn hoạt động.", en: "Suspends the **ReplaceUnhealthy** process. The ASG's other processes keep running." }) },
            REBOOT, DOWN,
            { at: "i2", from: "asg", state: "wait", tag: L({ vi: "GIỮ NGUYÊN", en: "KEPT" }), label: "Auto Scaling", msg: L({ vi: "ASG ghi nhận i-2 unhealthy nhưng không thay thế vì ReplaceUnhealthy đang tạm dừng.", en: "The ASG records i-2 as unhealthy but does not replace it because ReplaceUnhealthy is suspended." }) },
            { at: "i2", from: "alb", state: "pass", flash: "200", roundTrip: true, relabel: { l2: L({ vi: "InService · đã vá", en: "InService · patched" }) }, msg: L({ vi: "Sau khi reboot, health check trả về 200. Cần **resume** ReplaceUnhealthy.", en: "After the reboot, the health check returns 200. Remember to **resume** ReplaceUnhealthy." }) },
          ], ok: true, back: false, result: L({ vi: "Sau khi vá, i-2 tiếp tục phục vụ. Phương án này phù hợp với tác vụ bảo trì ngắn.", en: "After patching, i-2 keeps serving. This option suits short maintenance tasks." }) }
      : { steps: [REBOOT, DOWN, REPLACED], ok: false, back: false,
          result: L({ vi: "Instance đang vá bị thay thế. Cần tạm dừng ReplaceUnhealthy trong quá trình vá và resume sau khi hoàn tất.", en: "The instance being patched is replaced. Suspend ReplaceUnhealthy during patching and resume it when done." }) },
  },
  {
    name: L({ vi: "Instance mới cần thời gian khởi động", en: "New instance needs time to start" }),
    request: L({ vi: "Scale out: launch thêm một instance", en: "Scale out: launch one more instance" }),
    toggle: { label: L({ vi: "Health check grace period 300 giây", en: "Health check grace period of 300 seconds" }), initial: false },
    action: "Scale out",
    run: (grace) => ({
      steps: [
        { at: "i3", from: "asg", state: "change", tag: "LAUNCH", label: "Auto Scaling", relabel: { l1: "i-5", l2: L({ vi: "đang cài ứng dụng", en: "installing app" }) }, msg: L({ vi: "ASG launch i-5. User data cần khoảng 3 phút để cài đặt và khởi chạy ứng dụng.", en: "The ASG launches i-5. User data needs about 3 minutes to install and start the application." }) },
        { at: "i3", from: "alb", state: "block", flash: "503", msg: L({ vi: "Ứng dụng chưa khởi chạy xong, health check thất bại.", en: "The application has not finished starting; the health check fails." }) },
        ...(grace
          ? [
              { at: "i3", from: "asg", state: "wait" as const, tag: L({ vi: "CHỜ", en: "WAIT" }), label: "Auto Scaling", msg: L({ vi: "Vẫn trong **health check grace period**: ASG chưa đánh giá health check của i-5.", en: "Still within the **health check grace period**: the ASG does not yet evaluate i-5's health checks." }) },
              { at: "i3", from: "alb", state: "pass" as const, flash: "200", roundTrip: true, relabel: { l2: "InService" }, msg: L({ vi: "Sau 3 phút, ứng dụng khởi chạy xong, health check trả về 200.", en: "After 3 minutes, the application has started and the health check returns 200." }) },
            ]
          : [
              { at: "i3", from: "asg", state: "block" as const, tag: L({ vi: "THAY", en: "REPLACE" }), label: "Auto Scaling", relabel: { l1: "i-6", l2: L({ vi: "đang cài ứng dụng", en: "installing app" }) }, msg: L({ vi: "Không có grace period: ASG đánh giá ngay, xác định unhealthy và thay i-5 bằng i-6. i-6 tiếp tục gặp tình trạng tương tự.", en: "No grace period: the ASG evaluates immediately, finds it unhealthy and replaces i-5 with i-6. i-6 runs into the same problem." }) },
            ]),
      ],
      ok: grace,
      back: false,
      result: grace
        ? L({ vi: "Đủ capacity sau 3 phút. Grace period cần dài hơn thời gian khởi động của ứng dụng.", en: "Full capacity after 3 minutes. The grace period must be longer than the application's startup time." })
        : L({ vi: "Vòng lặp launch rồi terminate, capacity không bao giờ tăng. Cần cấu hình health check grace period.", en: "A launch-then-terminate loop; capacity never increases. Configure a health check grace period." }),
    }),
  },
  ];
};

export default function MaintenanceSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} layout={layout(L)}
    hint={L({ vi: "Chọn một tác vụ bảo trì, nhấn nút để chạy, sau đó bật tuỳ chọn và chạy lại để so sánh kết quả.", en: "Pick a maintenance task, press the button to run it, then turn on the option and run again to compare the results." })} />;
}
