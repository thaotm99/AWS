import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// What a CloudWatch alarm can do by itself when one MFTech EC2 instance gets sick:
// reboot it (the problem is inside the instance), recover it onto new hardware (the
// problem is the host), and what recovery keeps or loses. Last: an alarm that makes
// an Auto Scaling group scale in, and which instance the default policy removes.

const EC2: PLayout = {
  viewBox: "0 34 820 236",
  aria: "CloudWatch alarm theo dõi status check của một EC2 instance và thực thi action reboot hoặc recover",
  boxes: [{ x: 470, y: 44, w: 330, h: 212, label: "Hạ tầng vật lý của AWS" }],
  nodes: [
    { id: "cw", x: 95, y: 160, w: 150, l1: "CloudWatch alarm", l2: "status check" },
    { id: "sns", x: 300, y: 70, w: 150, l1: "SNS", l2: "thông báo đội trực" },
    { id: "ec2", x: 300, y: 160, w: 150, l1: "i-shop01", l2: "EC2, web thương mại" },
    { id: "old", x: 635, y: 110, w: 180, l1: "Host hiện tại", l2: "physical host" },
    { id: "new", x: 635, y: 210, w: 180, l1: "Host khác", l2: "còn capacity" },
  ],
  links: [["cw", "sns"], ["cw", "ec2"], ["ec2", "old"], ["ec2", "new"]],
};

const ASG: PLayout = {
  viewBox: "0 30 820 246",
  aria: "CloudWatch alarm kích hoạt Auto Scaling group scale in, chọn AZ có nhiều instance hơn, sau đó chọn instance có launch template cũ nhất",
  boxes: [
    { x: 250, y: 40, w: 560, h: 100, label: "AZ A: 3 instance" },
    { x: 250, y: 150, w: 560, h: 120, label: "AZ B: 4 instance" },
  ],
  nodes: [
    { id: "cw", x: 100, y: 95, w: 140, l1: "CloudWatch alarm", l2: "CPU < 30%" },
    { id: "asg", x: 100, y: 205, w: 140, l1: "Auto Scaling", l2: "scale in 1" },
    { id: "a", x: 560, y: 95, w: 190, l1: "a1, a2, a3", l2: "launch template v3" },
    { id: "b", x: 520, y: 200, w: 190, l1: "b1, b2, b3", l2: "launch template v3" },
    { id: "bold", x: 715, y: 242, w: 180, l1: "b0", l2: "launch template v2 (cũ)" },
  ],
  links: [["cw", "asg"], ["asg", "a"], ["asg", "b"], ["asg", "bold"]],
};

const SCENARIOS: PScenario[] = [
  {
    name: "Ứng dụng bị treo, instance vẫn chạy",
    request: "StatusCheckFailed_Instance = 1 trong ba phút liên tiếp",
    toggle: { label: "Alarm action: reboot", initial: false },
    layout: EC2,
    run: (reboot) => reboot
      ? { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "Instance status check thất bại: lỗi nằm **bên trong** instance (cạn bộ nhớ, hệ điều hành bị treo)." },
            { at: "ec2", state: "change", tag: "REBOOT", flash: "reboot", msg: "Action **reboot**: khởi động lại ngay trên host hiện tại. Ứng dụng hoạt động trở lại sau vài phút." },
            { at: "old", jump: true, state: "pass", msg: "Host vẫn ở trạng thái healthy, không cần thay đổi." }],
          ok: true, back: false,
          result: "Website hoạt động trở lại mà không cần thao tác thủ công trên console. Không cần Lambda hay script: alarm gọi trực tiếp action của EC2." }
      : { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "Instance status check thất bại." },
            { at: "ec2", state: "block", tag: "CHƯA KHẮC PHỤC", msg: "Action đang chọn là **recover**. Action recover chỉ dùng được với metric `StatusCheckFailed_System` (lỗi của host AWS), không dùng với `StatusCheckFailed_Instance`. Với lỗi bên trong instance, AWS khuyến nghị action **reboot**." }],
          ok: false,
          result: "Instance vẫn bị treo. Với lỗi bên trong instance, cần chọn action **reboot**." },
  },
  {
    name: "Host vật lý gặp sự cố",
    request: "StatusCheckFailed_System = 1  (mất điện, lỗi phần cứng tại host)",
    toggle: { label: "Alarm action: recover", initial: false },
    layout: EC2,
    run: (recover) => recover
      ? { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "System status check thất bại: sự cố nằm ở host, thuộc phạm vi xử lý của AWS." },
            { at: "old", from: "ec2", state: "block", flash: "sự cố", msg: "Host hiện tại không còn sử dụng được." },
            { at: "new", from: "ec2", state: "change", tag: "RECOVER", relabel: { l1: "i-shop01 (đã chuyển)" }, msg: "Action **recover** chuyển instance sang host khác." },
            { at: "ec2", jump: true, state: "pass", tag: "GIỮ NGUYÊN", msg: "Giữ nguyên **instance ID**, địa chỉ public IPv4, private IP, Elastic IP, instance metadata, placement group, Availability Zone và các EBS volume đã gắn." },
            { at: "ec2", jump: true, state: "change", tag: "MẤT", msg: "Đối với instance, quá trình recover diễn ra như một lần reboot ngoài kế hoạch: **dữ liệu trong RAM bị mất**, uptime của hệ điều hành bắt đầu lại từ 0." }],
          ok: true, back: false,
          result: "Website hoạt động trở lại với cùng địa chỉ. Một instance duy nhất, không dùng ASG, vẫn tự động khôi phục được trong vài phút." }
      : { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "System status check thất bại." },
            { at: "sns", state: "pass", msg: "Alarm chỉ gửi thông báo; kỹ sư trực không phản hồi ngoài giờ làm việc." },
            { at: "ec2", from: "cw", state: "wait", tag: "CHỜ", msg: "Instance nằm trên host gặp sự cố cho tới khi có người thực hiện stop/start thủ công." }],
          ok: false, back: false,
          result: "Website ngừng hoạt động suốt đêm. Cần thêm action **recover** vào alarm để EC2 tự động chuyển sang host khác. (Với instance type được hỗ trợ, **simplified automatic recovery** được bật mặc định khi launch; mô phỏng này giả định cơ chế đó không áp dụng cho instance.)" },
  },
  {
    name: "Instance sử dụng instance store",
    request: "StatusCheckFailed_System = 1, i-cache01 (m5d.large) có instance store volume",
    layout: {
      ...EC2,
      nodes: EC2.nodes.map((n) => n.id === "ec2" ? { ...n, l1: "i-cache01", l2: "m5d, có instance store" } : n),
    },
    run: () => ({
      steps: [
        { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "System status check thất bại." },
        { at: "ec2", state: "block", tag: "KHÔNG HỖ TRỢ", msg: "Khi instance có instance store volume được thêm lúc launch, CloudWatch action based recovery chỉ hỗ trợ các instance type M3, C3, R3, X1, X1e, X2idn, X2iedn. **m5d.large** không thuộc danh sách này nên action recover không thực hiện được." },
        { at: "new", from: "ec2", state: "skip", msg: "Không có host mới nào được sử dụng." }],
      ok: false, back: false,
      result: "Kể cả với instance type được hỗ trợ, CloudWatch action based recovery làm **mất dữ liệu trên instance store**. Dữ liệu cần bảo toàn nên lưu trên **EBS volume** và được backup định kỳ.",
    }),
  },
  {
    name: "Alarm kích hoạt ASG scale in",
    action: "Chạy alarm",
    request: "Ban đêm: CPU trung bình 20%, alarm scale in được kích hoạt",
    layout: ASG,
    run: () => ({
      steps: [
        { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "CPU ở dưới ngưỡng trong khoảng thời gian đủ dài, alarm gọi scaling policy." },
        { at: "asg", state: "pass", msg: "Giảm 1 instance theo **default termination policy** (group dùng launch template, không phải mixed instances group)." },
        { at: "a", state: "skip", msg: "AZ A có 3 instance, ít hơn AZ B." },
        { at: "b", from: "asg", state: "pass", tag: "CHỌN AZ", label: "AZ B", msg: "Bước 1: chọn AZ có nhiều instance nhất (và có ít nhất một instance không được bảo vệ khỏi scale in) là **AZ B**; cân bằng giữa các AZ được ưu tiên hơn termination policy." },
        { at: "bold", from: "asg", state: "change", tag: "TERMINATE", relabel: { l1: "b0 (đã terminate)" }, msg: "Bước 2: trong AZ B, ưu tiên instance dùng cấu hình cũ: launch configuration, rồi launch template khác template hiện tại, rồi **version cũ nhất của launch template hiện tại**. b0 dùng version 2 nên bị terminate. Nếu vẫn còn nhiều lựa chọn, chọn instance gần giờ tính phí tiếp theo nhất." }],
      ok: true, back: false,
      result: "Còn lại 3 + 3 instance, tất cả đều dùng launch template version mới. Với mixed instances group, Auto Scaling còn xác định purchase option (Spot hoặc On-Demand) cần giảm và xét allocation strategy trước bước cấu hình cũ.",
    }),
  },
];

const EC2_EN: PLayout = {
  viewBox: "0 34 820 236",
  aria: "A CloudWatch alarm watches the status checks of one EC2 instance and performs the reboot or recover action",
  boxes: [{ x: 470, y: 44, w: 330, h: 212, label: "AWS physical infrastructure" }],
  nodes: [
    { id: "cw", x: 95, y: 160, w: 150, l1: "CloudWatch alarm", l2: "status check" },
    { id: "sns", x: 300, y: 70, w: 150, l1: "SNS", l2: "notifies on-call team" },
    { id: "ec2", x: 300, y: 160, w: 150, l1: "i-shop01", l2: "EC2, storefront" },
    { id: "old", x: 635, y: 110, w: 180, l1: "Current host", l2: "physical host" },
    { id: "new", x: 635, y: 210, w: 180, l1: "Another host", l2: "has capacity" },
  ],
  links: [["cw", "sns"], ["cw", "ec2"], ["ec2", "old"], ["ec2", "new"]],
};

const ASG_EN: PLayout = {
  viewBox: "0 30 820 246",
  aria: "A CloudWatch alarm makes the Auto Scaling group scale in, choosing the AZ with more instances, then the instance with the oldest launch template",
  boxes: [
    { x: 250, y: 40, w: 560, h: 100, label: "AZ A: 3 instances" },
    { x: 250, y: 150, w: 560, h: 120, label: "AZ B: 4 instances" },
  ],
  nodes: [
    { id: "cw", x: 100, y: 95, w: 140, l1: "CloudWatch alarm", l2: "CPU < 30%" },
    { id: "asg", x: 100, y: 205, w: 140, l1: "Auto Scaling", l2: "scale in 1" },
    { id: "a", x: 560, y: 95, w: 190, l1: "a1, a2, a3", l2: "launch template v3" },
    { id: "b", x: 520, y: 200, w: 190, l1: "b1, b2, b3", l2: "launch template v3" },
    { id: "bold", x: 715, y: 242, w: 180, l1: "b0", l2: "launch template v2 (old)" },
  ],
  links: [["cw", "asg"], ["asg", "a"], ["asg", "b"], ["asg", "bold"]],
};

const SCENARIOS_EN: PScenario[] = [
  {
    name: "App hangs, instance still running",
    request: "StatusCheckFailed_Instance = 1 for three consecutive minutes",
    toggle: { label: "Alarm action: reboot", initial: false },
    layout: EC2_EN,
    run: (reboot) => reboot
      ? { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "The instance status check fails: the problem is **inside** the instance (memory exhausted, operating system hung)." },
            { at: "ec2", state: "change", tag: "REBOOT", flash: "reboot", msg: "**Reboot** action: restarts immediately on the current host. The application is back after a few minutes." },
            { at: "old", jump: true, state: "pass", msg: "The host is still healthy; nothing to change." }],
          ok: true, back: false,
          result: "The website is back without any manual action in the console. No Lambda or script needed: the alarm calls the EC2 action directly." }
      : { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "The instance status check fails." },
            { at: "ec2", state: "block", tag: "NOT FIXED", msg: "The selected action is **recover**. The recover action can be used only with the `StatusCheckFailed_System` metric (a problem with the AWS host), not with `StatusCheckFailed_Instance`. For a problem inside the instance, AWS recommends the **reboot** action." }],
          ok: false,
          result: "The instance is still hung. For a problem inside the instance, choose the **reboot** action." },
  },
  {
    name: "Physical host failure",
    request: "StatusCheckFailed_System = 1  (power loss, hardware failure on the host)",
    toggle: { label: "Alarm action: recover", initial: false },
    layout: EC2_EN,
    run: (recover) => recover
      ? { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "The system status check fails: the problem is on the host, which is within AWS's scope." },
            { at: "old", from: "ec2", state: "block", flash: "failure", msg: "The current host can no longer be used." },
            { at: "new", from: "ec2", state: "change", tag: "RECOVER", relabel: { l1: "i-shop01 (moved)" }, msg: "The **recover** action moves the instance to another host." },
            { at: "ec2", jump: true, state: "pass", tag: "KEPT", msg: "Keeps the **instance ID**, public IPv4 address, private IP, Elastic IP, instance metadata, placement group, Availability Zone and attached EBS volumes." },
            { at: "ec2", jump: true, state: "change", tag: "LOST", msg: "For the instance, recovery works like an unplanned reboot: **data in RAM is lost**, and the operating system's uptime starts again from 0." }],
          ok: true, back: false,
          result: "The website is back at the same address. A single instance, without an ASG, can still recover automatically within minutes." }
      : { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "The system status check fails." },
            { at: "sns", state: "pass", msg: "The alarm only sends a notification; the on-call engineer does not respond outside working hours." },
            { at: "ec2", from: "cw", state: "wait", tag: "WAITING", msg: "The instance stays on the failed host until someone stops and starts it manually." }],
          ok: false, back: false,
          result: "The website is down all night. Add the **recover** action to the alarm so EC2 moves to another host automatically. (For supported instance types, **simplified automatic recovery** is enabled by default at launch; this simulation assumes that mechanism does not apply to the instance.)" },
  },
  {
    name: "Instance with instance store",
    request: "StatusCheckFailed_System = 1, i-cache01 (m5d.large) has an instance store volume",
    layout: {
      ...EC2_EN,
      nodes: EC2_EN.nodes.map((n) => n.id === "ec2" ? { ...n, l1: "i-cache01", l2: "m5d, has instance store" } : n),
    },
    run: () => ({
      steps: [
        { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "The system status check fails." },
        { at: "ec2", state: "block", tag: "NOT SUPPORTED", msg: "When an instance has instance store volumes added at launch, CloudWatch action based recovery supports only the M3, C3, R3, X1, X1e, X2idn and X2iedn instance types. **m5d.large** is not on this list, so the recover action cannot run." },
        { at: "new", from: "ec2", state: "skip", msg: "No new host is used." }],
      ok: false, back: false,
      result: "Even with a supported instance type, CloudWatch action based recovery **loses the data on the instance store**. Data that must be preserved should be stored on an **EBS volume** and backed up regularly.",
    }),
  },
  {
    name: "Alarm triggers ASG scale-in",
    action: "Run alarm",
    request: "At night: average CPU 20%, the scale-in alarm fires",
    layout: ASG_EN,
    run: () => ({
      steps: [
        { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "CPU stays below the threshold long enough, and the alarm invokes the scaling policy." },
        { at: "asg", state: "pass", msg: "Removes 1 instance using the **default termination policy** (the group uses a launch template and is not a mixed instances group)." },
        { at: "a", state: "skip", msg: "AZ A has 3 instances, fewer than AZ B." },
        { at: "b", from: "asg", state: "pass", tag: "AZ", label: "AZ B", msg: "Step 1: choose the AZ with the most instances (and at least one instance not protected from scale in), which is **AZ B**; balance across AZs takes priority over the termination policy." },
        { at: "bold", from: "asg", state: "change", tag: "TERMINATE", relabel: { l1: "b0 (terminated)" }, msg: "Step 2: in AZ B, prefer instances with an older configuration: a launch configuration, then a launch template other than the current one, then **the oldest version of the current launch template**. b0 uses version 2, so it is terminated. If several candidates remain, choose the instance closest to the next billing hour." }],
      ok: true, back: false,
      result: "3 + 3 instances remain, all using the new launch template version. With a mixed instances group, Auto Scaling also determines which purchase option (Spot or On-Demand) to reduce and considers the allocation strategy before the old-configuration step.",
    }),
  },
];

export default function AlarmActionSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} action={L({ vi: "Chạy alarm", en: "Run alarm" })} hint={L({ vi: "Chọn một tình huống, bật hoặc tắt action, sau đó chọn Chạy alarm.", en: "Choose a scenario, turn the action on or off, then choose Run alarm." })} />;
}
