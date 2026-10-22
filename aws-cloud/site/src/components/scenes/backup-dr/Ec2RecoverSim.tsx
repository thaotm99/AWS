import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// ShopViet's admin site runs on a single EC2 instance, no Auto Scaling group. A CloudWatch
// alarm with the recover action brings it back on new hardware with the same instance ID
// and IPs, but only for system status check failures and only when its data is on EBS.

function layout(disk: "ebs" | "store", check: string): PLayout {
  return {
    viewBox: "0 20 820 230",
    aria: "CloudWatch alarm theo dõi một EC2 và ổ đĩa của nó",
    nodes: [
      { id: "user", x: 70, y: 160, l1: "Nhân viên", user: true },
      { id: "ec2", x: 350, y: 160, w: 180, l1: "EC2 admin-1", l2: "host A · 10.0.1.20" },
      { id: "cw", x: 350, y: 60, w: 230, l1: "CloudWatch alarm", l2: check },
      { id: "disk", x: 650, y: 160, w: 170, l1: disk === "ebs" ? "EBS volume" : "Instance store", l2: disk === "ebs" ? "nằm ngoài host" : "gắn chặt vào host A" },
    ],
    links: [["user", "ec2"], ["cw", "ec2"], ["ec2", "disk"]],
  };
}

const RECOVERED = { l1: "EC2 admin-1", l2: "host B · 10.0.1.20" };

const SCENARIOS: PScenario[] = [
  {
    name: "Phần cứng dưới máy hỏng",
    action: "Làm hỏng host",
    request: "Chịu được tối đa 10 phút gián đoạn",
    toggle: { label: "Alarm có action recover", initial: false },
    layout: () => layout("ebs", "StatusCheckFailed_System"),
    run: (recover) => ({
      steps: [
        { at: "ec2", state: "block", flash: "không trả lời", msg: "Host vật lý hỏng. **System status check** thất bại." },
        recover
          ? { from: "cw", at: "ec2", state: "change", tag: "RECOVER", relabel: RECOVERED, msg: "Alarm chuyển sang ALARM và chạy **recover**: instance khởi động lại trên host khác, giữ nguyên **instance ID, private IP, Elastic IP** và metadata." }
          : { from: "cw", at: "ec2", state: "wait", tag: "CHỈ BÁO", msg: "Alarm chỉ gửi email. Phải chờ người trực vào xử lý." },
        ...(recover ? [
          { at: "disk", state: "pass" as const, msg: "Volume EBS gắn lại nguyên vẹn. Dữ liệu trong RAM thì mất, vì máy khởi động lại." },
          { from: "user", at: "ec2", state: "pass" as const, flash: "OK", msg: "Nhân viên vào lại trang admin cùng địa chỉ cũ." },
        ] : []),
      ],
      ok: recover,
      back: false,
      result: recover
        ? "Chạy lại sau vài phút, rẻ và tự động, không cần Auto Scaling group hay chiến lược DR phức tạp."
        : "Trang admin chết tới khi có người vào sửa, dễ quá 10 phút.",
    }),
  },
  {
    name: "Máy dùng instance store",
    action: "Làm hỏng host",
    request: "Dữ liệu ứng dụng nằm trên instance store",
    toggle: { label: "Chuyển dữ liệu sang EBS", initial: false },
    layout: (ebs) => layout(ebs ? "ebs" : "store", "StatusCheckFailed_System → recover"),
    run: (ebs) => ({
      steps: [
        { at: "ec2", state: "block", flash: "không trả lời", msg: "Host vật lý hỏng." },
        ebs
          ? { from: "cw", at: "ec2", state: "change", tag: "RECOVER", relabel: RECOVERED, msg: "Recover chuyển instance sang host mới." }
          : { from: "cw", at: "ec2", state: "block", tag: "KHÔNG ĐƯỢC", msg: "Action **recover** chỉ dùng cho instance chạy bằng **EBS**. Instance store gắn liền với host cũ, không mang theo được." },
        ebs
          ? { at: "disk", state: "pass", msg: "Dữ liệu trên EBS đi theo instance." }
          : { from: "ec2", at: "disk", jump: true, state: "block", tag: "MẤT", msg: "Dữ liệu trên instance store mất cùng host." },
      ],
      ok: ebs,
      back: false,
      result: ebs
        ? "Đặt dữ liệu trên EBS thì tính năng recover mới dùng được."
        : "Không tự hồi phục được. Muốn dùng recover, instance chỉ được dùng ổ EBS.",
    }),
  },
  {
    name: "Ứng dụng bị treo",
    action: "Làm treo app",
    request: "Host vẫn tốt, hệ điều hành bị treo",
    toggle: { label: "Thêm alarm thứ hai với action reboot", initial: false },
    layout: (reboot) => layout("ebs", reboot ? "StatusCheckFailed_Instance → reboot" : "StatusCheckFailed_System → recover"),
    run: (reboot) => ({
      steps: [
        { at: "ec2", state: "block", flash: "treo", msg: "Hệ điều hành treo, **instance status check** thất bại. System status check vẫn đạt." },
        reboot
          ? { from: "cw", at: "ec2", state: "change", tag: "REBOOT", relabel: { l2: "khởi động lại" }, msg: "Alarm theo dõi instance status check và chạy action **reboot**." }
          : { from: "cw", at: "ec2", state: "skip", tag: "ĐỨNG YÊN", msg: "Alarm recover chỉ theo dõi lỗi phía AWS (system status check). Lỗi bên trong máy không kích hoạt nó." },
      ],
      ok: reboot,
      back: false,
      result: reboot
        ? "Recover dành cho hỏng phần cứng phía AWS. Lỗi trong hệ điều hành cần cách khác, ví dụ reboot."
        : "Recover không giúp được lỗi bên trong máy.",
    }),
  },
];

export default function Ec2RecoverSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống rồi bấm nút. Đổi công tắc và chạy lại để so sánh." />;
}
