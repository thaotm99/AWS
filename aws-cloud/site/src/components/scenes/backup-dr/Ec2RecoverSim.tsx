import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// ShopViet's admin site runs on a single EC2 instance, no Auto Scaling group. A CloudWatch
// alarm with the recover action brings it back on new hardware with the same instance ID
// and IPs, but only for system status check failures and only when its data is on EBS.

function layout(disk: "ebs" | "store", check: string): PLayout {
  return {
    viewBox: "0 20 820 230",
    aria: "CloudWatch alarm theo dõi một EC2 instance và volume lưu trữ của instance",
    nodes: [
      { id: "user", x: 70, y: 160, l1: "Nhân viên", user: true },
      { id: "ec2", x: 350, y: 160, w: 180, l1: "EC2 admin-1", l2: "host A · 10.0.1.20" },
      { id: "cw", x: 350, y: 60, w: 230, l1: "CloudWatch alarm", l2: check },
      { id: "disk", x: 650, y: 160, w: 170, l1: disk === "ebs" ? "EBS volume" : "Instance store", l2: disk === "ebs" ? "độc lập với host" : "gắn liền với host A" },
    ],
    links: [["user", "ec2"], ["cw", "ec2"], ["ec2", "disk"]],
  };
}

const RECOVERED = { l1: "EC2 admin-1", l2: "host B · 10.0.1.20" };

const SCENARIOS: PScenario[] = [
  {
    name: "Phần cứng host gặp sự cố",
    action: "Mô phỏng sự cố host",
    request: "Chấp nhận tối đa 10 phút gián đoạn",
    toggle: { label: "Cấu hình action recover cho alarm", initial: false },
    layout: () => layout("ebs", "StatusCheckFailed_System"),
    run: (recover) => ({
      steps: [
        { at: "ec2", state: "block", flash: "không phản hồi", msg: "Host vật lý gặp sự cố. **System status check** thất bại." },
        recover
          ? { from: "cw", at: "ec2", state: "change", tag: "RECOVER", relabel: RECOVERED, msg: "Alarm chuyển sang trạng thái ALARM và thực thi **recover**: instance được chuyển sang host khác, giữ nguyên **instance ID, public IPv4, private IP, Elastic IP**, metadata và EBS volume." }
          : { from: "cw", at: "ec2", state: "wait", tag: "CHỈ THÔNG BÁO", msg: "Alarm chỉ gửi email. Phải chờ nhân sự trực xử lý thủ công." },
        ...(recover ? [
          { at: "disk", state: "pass" as const, msg: "EBS volume vẫn được gắn với instance. Quá trình recover diễn ra như một lần reboot ngoài kế hoạch nên dữ liệu trong RAM bị mất." },
          { from: "user", at: "ec2", state: "pass" as const, flash: "OK", msg: "Nhân viên truy cập lại trang admin qua cùng địa chỉ." },
        ] : []),
      ],
      ok: recover,
      back: false,
      result: recover
        ? "Hoạt động trở lại sau vài phút, chi phí thấp và tự động, không cần Auto Scaling group hay chiến lược DR phức tạp."
        : "Trang admin ngừng hoạt động cho tới khi được khắc phục thủ công, dễ vượt quá 10 phút.",
    }),
  },
  {
    name: "Instance sử dụng instance store",
    action: "Mô phỏng sự cố host",
    request: "Dữ liệu ứng dụng được lưu trên instance store (m5d.large)",
    toggle: { label: "Chuyển dữ liệu sang EBS", initial: false },
    layout: (ebs) => layout(ebs ? "ebs" : "store", "StatusCheckFailed_System → recover"),
    run: (ebs) => ({
      steps: [
        { at: "ec2", state: "block", flash: "không phản hồi", msg: "Host vật lý gặp sự cố." },
        ebs
          ? { from: "cw", at: "ec2", state: "change", tag: "RECOVER", relabel: RECOVERED, msg: "Recover chuyển instance sang host mới." }
          : { from: "cw", at: "ec2", state: "block", tag: "KHÔNG HỖ TRỢ", msg: "Khi instance có instance store, CloudWatch action based recovery chỉ hỗ trợ các instance type M3, C3, R3, X1, X1e, X2idn, X2iedn; **m5d.large** không thuộc danh sách nên action recover không thực hiện được." },
        ebs
          ? { at: "disk", state: "pass", msg: "Dữ liệu trên EBS được chuyển theo instance." }
          : { from: "ec2", at: "disk", jump: true, state: "block", tag: "MẤT", msg: "Dữ liệu trên instance store không được bảo toàn; kể cả với instance type được hỗ trợ, recover cũng làm mất dữ liệu trên instance store." },
      ],
      ok: ebs,
      back: false,
      result: ebs
        ? "Dữ liệu trên EBS được giữ nguyên qua quá trình recover; dữ liệu trên instance store thì không."
        : "Không thể tự động khôi phục. Dữ liệu cần bảo toàn nên được lưu trên EBS volume.",
    }),
  },
  {
    name: "Ứng dụng bị treo",
    action: "Mô phỏng treo ứng dụng",
    request: "Host hoạt động bình thường, hệ điều hành bị treo",
    toggle: { label: "Thêm alarm thứ hai với action reboot", initial: false },
    layout: (reboot) => layout("ebs", reboot ? "StatusCheckFailed_Instance → reboot" : "StatusCheckFailed_System → recover"),
    run: (reboot) => ({
      steps: [
        { at: "ec2", state: "block", flash: "treo", msg: "Hệ điều hành bị treo, **instance status check** thất bại. System status check vẫn đạt." },
        reboot
          ? { from: "cw", at: "ec2", state: "change", tag: "REBOOT", relabel: { l2: "khởi động lại" }, msg: "Alarm theo dõi instance status check và thực thi action **reboot**." }
          : { from: "cw", at: "ec2", state: "skip", tag: "KHÔNG KÍCH HOẠT", msg: "Alarm recover theo dõi `StatusCheckFailed_System` (lỗi của hạ tầng AWS). Lỗi bên trong instance không kích hoạt alarm này." },
      ],
      ok: reboot,
      back: false,
      result: reboot
        ? "Recover dành cho sự cố phần cứng phía AWS. Lỗi trong hệ điều hành cần cơ chế khác, ví dụ reboot."
        : "Recover không khắc phục được lỗi bên trong instance.",
    }),
  },
];

function layoutEn(disk: "ebs" | "store", check: string): PLayout {
  return {
    viewBox: "0 20 820 230",
    aria: "A CloudWatch alarm watches one EC2 instance and the instance's storage volume",
    nodes: [
      { id: "user", x: 70, y: 160, l1: "Staff", user: true },
      { id: "ec2", x: 350, y: 160, w: 180, l1: "EC2 admin-1", l2: "host A · 10.0.1.20" },
      { id: "cw", x: 350, y: 60, w: 230, l1: "CloudWatch alarm", l2: check },
      { id: "disk", x: 650, y: 160, w: 170, l1: disk === "ebs" ? "EBS volume" : "Instance store", l2: disk === "ebs" ? "independent of the host" : "tied to host A" },
    ],
    links: [["user", "ec2"], ["cw", "ec2"], ["ec2", "disk"]],
  };
}

const SCENARIOS_EN: PScenario[] = [
  {
    name: "Host hardware failure",
    action: "Simulate host failure",
    request: "At most 10 minutes of disruption accepted",
    toggle: { label: "Configure the recover action for the alarm", initial: false },
    layout: () => layoutEn("ebs", "StatusCheckFailed_System"),
    run: (recover) => ({
      steps: [
        { at: "ec2", state: "block", flash: "no response", msg: "The physical host fails. The **system status check** fails." },
        recover
          ? { from: "cw", at: "ec2", state: "change", tag: "RECOVER", relabel: RECOVERED, msg: "The alarm goes into the ALARM state and performs **recover**: the instance moves to another host, keeping the **instance ID, public IPv4, private IP, Elastic IP**, metadata and EBS volumes." }
          : { from: "cw", at: "ec2", state: "wait", tag: "NOTIFY ONLY", msg: "The alarm only sends an email. You must wait for on-call staff to fix it manually." },
        ...(recover ? [
          { at: "disk", state: "pass" as const, msg: "The EBS volume stays attached to the instance. Recovery works like an unplanned reboot, so data in RAM is lost." },
          { from: "user", at: "ec2", state: "pass" as const, flash: "OK", msg: "Staff reach the admin page again at the same address." },
        ] : []),
      ],
      ok: recover,
      back: false,
      result: recover
        ? "Back after a few minutes, automatically and at low cost, with no Auto Scaling group or complex DR strategy."
        : "The admin page stays down until it is fixed manually, which can easily exceed 10 minutes.",
    }),
  },
  {
    name: "Instance with instance store",
    action: "Simulate host failure",
    request: "Application data is stored on instance store (m5d.large)",
    toggle: { label: "Move the data to EBS", initial: false },
    layout: (ebs) => layoutEn(ebs ? "ebs" : "store", "StatusCheckFailed_System → recover"),
    run: (ebs) => ({
      steps: [
        { at: "ec2", state: "block", flash: "no response", msg: "The physical host fails." },
        ebs
          ? { from: "cw", at: "ec2", state: "change", tag: "RECOVER", relabel: RECOVERED, msg: "Recover moves the instance to a new host." }
          : { from: "cw", at: "ec2", state: "block", tag: "NOT SUPPORTED", msg: "When an instance has instance store, CloudWatch action based recovery supports only the M3, C3, R3, X1, X1e, X2idn and X2iedn instance types; **m5d.large** is not on the list, so the recover action cannot run." },
        ebs
          ? { at: "disk", state: "pass", msg: "The data on EBS moves with the instance." }
          : { from: "ec2", at: "disk", jump: true, state: "block", tag: "LOST", msg: "Data on the instance store is not preserved; even with a supported instance type, recovery loses the data on the instance store." },
      ],
      ok: ebs,
      back: false,
      result: ebs
        ? "Data on EBS is kept through recovery; data on the instance store is not."
        : "Automatic recovery is not possible. Data that must be preserved should be stored on an EBS volume.",
    }),
  },
  {
    name: "Application hangs",
    action: "Simulate application hang",
    request: "The host is healthy, the operating system hangs",
    toggle: { label: "Add a second alarm with the reboot action", initial: false },
    layout: (reboot) => layoutEn("ebs", reboot ? "StatusCheckFailed_Instance → reboot" : "StatusCheckFailed_System → recover"),
    run: (reboot) => ({
      steps: [
        { at: "ec2", state: "block", flash: "hung", msg: "The operating system hangs, and the **instance status check** fails. The system status check still passes." },
        reboot
          ? { from: "cw", at: "ec2", state: "change", tag: "REBOOT", relabel: { l2: "rebooting" }, msg: "The alarm watches the instance status check and performs the **reboot** action." }
          : { from: "cw", at: "ec2", state: "skip", tag: "NOT TRIGGERED", msg: "The recover alarm watches `StatusCheckFailed_System` (a problem with the AWS infrastructure). A problem inside the instance does not trigger this alarm." },
      ],
      ok: reboot,
      back: false,
      result: reboot
        ? "Recover is for hardware failures on the AWS side. Problems in the operating system need a different mechanism, for example a reboot."
        : "Recover cannot fix a problem inside the instance.",
    }),
  },
];

export default function Ec2RecoverSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} hint={L({ vi: "Chọn một tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh.", en: "Choose a scenario, then choose the run button. Change the setting and run again to compare." })} />;
}
