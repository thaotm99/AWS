import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// What a CloudWatch alarm can do by itself when one ShopViet EC2 instance gets sick:
// reboot it (the problem is inside the instance), recover it onto new hardware (the
// problem is the host), and what recovery keeps or loses. Last: an alarm that makes
// an Auto Scaling group scale in, and which instance the default policy removes.

const EC2: PLayout = {
  viewBox: "0 34 820 236",
  aria: "CloudWatch alarm theo dõi status check của một EC2 và chạy action reboot hoặc recover",
  boxes: [{ x: 470, y: 44, w: 330, h: 212, label: "Hạ tầng AWS bên dưới" }],
  nodes: [
    { id: "cw", x: 95, y: 160, w: 150, l1: "CloudWatch alarm", l2: "status check" },
    { id: "sns", x: 300, y: 70, w: 150, l1: "SNS", l2: "báo đội trực" },
    { id: "ec2", x: 300, y: 160, w: 150, l1: "i-shop01", l2: "EC2, web bán hàng" },
    { id: "old", x: 635, y: 110, w: 180, l1: "Host đang chạy", l2: "máy chủ vật lý" },
    { id: "new", x: 635, y: 210, w: 180, l1: "Host khác", l2: "còn trống" },
  ],
  links: [["cw", "sns"], ["cw", "ec2"], ["ec2", "old"], ["ec2", "new"]],
};

const ASG: PLayout = {
  viewBox: "0 30 820 246",
  aria: "CloudWatch alarm làm Auto Scaling group scale in, chọn AZ nhiều instance hơn rồi instance có launch template cũ nhất",
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
    name: "App treo, máy vẫn chạy",
    request: "StatusCheckFailed_Instance = 1, ba phút liền",
    toggle: { label: "Alarm action: reboot", initial: false },
    layout: EC2,
    run: (reboot) => reboot
      ? { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "Instance status check hỏng: lỗi nằm **trong** máy (hết RAM, OS treo)." },
            { at: "ec2", state: "change", tag: "REBOOT", flash: "reboot", msg: "Action **reboot**: khởi động lại ngay trên host cũ. App chạy lại sau vài phút." },
            { at: "old", jump: true, state: "pass", msg: "Host vẫn khỏe, không cần đổi." }],
          ok: true, back: false,
          result: "Web trở lại mà không ai phải vào console. Không tốn Lambda hay script: alarm tự gọi action của EC2." }
      : { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "Instance status check hỏng." },
            { at: "ec2", state: "block", tag: "CHƯA SỬA", msg: "Đang chọn action **recover**. Recover chỉ dùng cho **system status check** (lỗi của host AWS). Lỗi trong OS thì đưa sang host khác cũng vẫn treo." }],
          ok: false,
          result: "Instance vẫn treo. Lỗi trong máy thì chọn action **reboot**." },
  },
  {
    name: "Host vật lý hỏng",
    request: "StatusCheckFailed_System = 1  (mất điện, hỏng phần cứng ở host)",
    toggle: { label: "Alarm action: recover", initial: false },
    layout: EC2,
    run: (recover) => recover
      ? { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "System status check hỏng: vấn đề nằm ở host, cần AWS xử lý." },
            { at: "old", from: "ec2", state: "block", flash: "hỏng", msg: "Host cũ không dùng được nữa." },
            { at: "new", from: "ec2", state: "change", tag: "RECOVER", relabel: { l1: "i-shop01 chạy ở đây" }, msg: "Action **recover** chuyển instance sang host khác." },
            { at: "ec2", jump: true, state: "pass", tag: "GIỮ NGUYÊN", msg: "Vẫn **instance ID**, private IP, Elastic IP, public IPv4 và metadata như cũ. Ổ EBS gắn lại nguyên vẹn." },
            { at: "ec2", jump: true, state: "change", tag: "MẤT", msg: "Instance khởi động lại nên **dữ liệu trong RAM mất**." }],
          ok: true, back: false,
          result: "Web chạy lại với cùng địa chỉ. Một instance duy nhất, không ASG, vẫn tự hồi phục được trong vài phút." }
      : { steps: [
            { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "System status check hỏng." },
            { at: "sns", state: "pass", msg: "Alarm chỉ gửi thông báo. Kỹ sư trực đang ngủ." },
            { at: "ec2", from: "cw", state: "wait", tag: "CHỜ", msg: "Instance nằm im trên host hỏng tới khi có người vào stop/start." }],
          ok: false, back: false,
          result: "Web chết cả đêm. Thêm action **recover** vào alarm để EC2 tự chuyển sang host khác." },
  },
  {
    name: "Instance dùng instance store",
    request: "StatusCheckFailed_System = 1, i-cache01 có instance store volume",
    layout: {
      ...EC2,
      nodes: EC2.nodes.map((n) => n.id === "ec2" ? { ...n, l1: "i-cache01", l2: "có instance store" } : n),
    },
    run: () => ({
      steps: [
        { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "System status check hỏng." },
        { at: "ec2", state: "block", tag: "KHÔNG HỖ TRỢ", msg: "Recover gắn lại ổ EBS trên host mới. **Instance store** nằm trên host cũ nên không mang theo được; instance loại này không dùng được action recover." },
        { at: "new", from: "ec2", state: "skip", msg: "Không có host mới nào được dùng." }],
      ok: false, back: false,
      result: "Muốn tự recover thì instance chỉ dùng **EBS volume**. Dữ liệu cần giữ đừng để trên instance store.",
    }),
  },
  {
    name: "Alarm làm ASG bớt máy",
    action: "Chạy alarm",
    request: "Đêm khuya: CPU trung bình 20%, alarm scale in kích hoạt",
    layout: ASG,
    run: () => ({
      steps: [
        { at: "cw", jump: true, state: "pass", flash: "ALARM", tag: "ALARM", msg: "CPU dưới ngưỡng đủ lâu, alarm gọi scaling policy." },
        { at: "asg", state: "pass", msg: "Bớt 1 instance theo **default termination policy**." },
        { at: "a", state: "skip", msg: "AZ A có 3 instance, ít hơn AZ B." },
        { at: "b", from: "asg", state: "pass", tag: "CHỌN AZ", label: "AZ B", msg: "Bước 1: chọn AZ có nhiều instance nhất là **AZ B**, để hai AZ cân lại." },
        { at: "bold", from: "asg", state: "change", tag: "TERMINATE", relabel: { l1: "b0 (đã tắt)" }, msg: "Bước 2: trong AZ B, chọn instance có **launch template cũ nhất**." }],
      ok: true, back: false,
      result: "Còn 3 + 3 instance, đều ở launch template mới. Sticky session trên ALB không thay đổi thứ tự này.",
    }),
  },
];

export default function AlarmActionSim() {
  return <PacketSim scenarios={SCENARIOS} action="Chạy alarm" hint="Chọn một tình huống, bật hoặc tắt action rồi bấm Chạy alarm." />;
}
