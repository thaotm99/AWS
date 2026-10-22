import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// What a CloudWatch alarm can do by itself when one ShopViet EC2 instance gets sick:
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
    { id: "old", x: 635, y: 110, w: 180, l1: "Host hiện tại", l2: "máy chủ vật lý" },
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

export default function AlarmActionSim() {
  return <PacketSim scenarios={SCENARIOS} action="Chạy alarm" hint="Chọn một tình huống, bật hoặc tắt action, sau đó chọn Chạy alarm." />;
}
