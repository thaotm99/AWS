import PacketSim, { type PScenario } from "../elb/PacketSim";

// Two ShopViet stories about logs. First: the Auto Scaling group already terminated
// the instance that had the bug, so the log is gone unless the CloudWatch agent sent
// it out. Second: someone keeps calling AWS APIs they are not allowed to; CloudTrail
// records it, and a metric filter plus an alarm turns it into a warning within minutes.

const SCENARIOS: PScenario[] = [
  {
    name: "Truy xuất log của instance đã bị thay thế",
    action: "Truy xuất log",
    request: "Lỗi thanh toán lúc 14:02 hai ngày trước, trên i-web3",
    toggle: { label: "Cài đặt CloudWatch agent trên mọi instance", initial: false },
    layout: {
      viewBox: "0 34 820 220",
      aria: "Kỹ sư truy xuất log trên một EC2 instance đã bị terminate hoặc trong CloudWatch Logs",
      boxes: [{ x: 300, y: 44, w: 230, h: 196, label: "Auto Scaling group" }],
      nodes: [
        { id: "dev", x: 70, y: 145, l1: "Kỹ sư", user: true },
        { id: "i3", x: 415, y: 100, w: 170, l1: "i-web3", l2: "đã terminate hôm qua" },
        { id: "i9", x: 415, y: 195, w: 170, l1: "i-web9", l2: "instance mới, không có lỗi" },
        { id: "logs", x: 690, y: 145, w: 190, l1: "CloudWatch Logs", l2: "log group /shopviet/web" },
      ],
      links: [["dev", "i3"], ["i3", "logs"], ["i9", "logs"], ["dev", "logs"]],
    },
    run: (agent) => agent
      ? { steps: [
            { at: "logs", from: "i3", state: "pass", tag: "GỬI LOG", label: "CloudWatch agent", msg: "Hai ngày trước, agent trên i-web3 đã gửi từng dòng log lên log group gần như ngay lập tức." },
            { at: "i3", jump: true, state: "skip", msg: "Instance đã bị terminate, nhưng log đã được lưu bên ngoài instance." },
            { at: "logs", from: "dev", state: "pass", flash: "tìm thấy", msg: "**Logs Insights** lọc `ERROR` quanh thời điểm 14:02 trong log stream của i-web3." }],
          ok: true,
          result: "Xác định được lỗi mà không cần SSH. Fleet thay thế instance hằng ngày cũng không làm mất log." }
      : { steps: [
            { at: "i3", state: "block", flash: "mất", msg: "ASG đã terminate i-web3. Log được lưu trên ổ đĩa của instance nên bị mất theo." },
            { at: "i9", from: "dev", state: "skip", msg: "Instance mới không có log của hai ngày trước." }],
          ok: false,
          result: "Không còn dữ liệu để truy vết. Tắt scale in hoặc tạo snapshot trước khi terminate chỉ là biện pháp tạm thời. Cần cài đặt **CloudWatch agent** để log được chuyển ra khỏi instance ngay khi được ghi." },
  },
  {
    name: "Lệnh gọi API trái phép",
    action: "Gọi API",
    request: "2h sáng: 300 lệnh gọi bị AccessDenied trong 10 phút",
    toggle: { label: "Cấu hình metric filter + alarm", initial: false },
    layout: {
      viewBox: "0 26 820 244",
      aria: "CloudTrail ghi lệnh gọi API vào CloudWatch Logs, metric filter đếm lỗi, alarm gửi thông báo qua SNS tới đội bảo mật",
      nodes: [
        { id: "x", x: 60, y: 80, l1: "Access key bị lộ", user: true },
        { id: "api", x: 230, y: 80, w: 130, l1: "AWS API", l2: "AccessDenied" },
        { id: "trail", x: 420, y: 80, w: 140, l1: "CloudTrail", l2: "trail ghi mọi API call" },
        { id: "logs", x: 640, y: 80, w: 190, l1: "CloudWatch Logs", l2: "log group của trail" },
        { id: "filter", x: 640, y: 200, w: 190, l1: "Metric filter", l2: "errorCode = AccessDenied" },
        { id: "alarm", x: 420, y: 200, w: 140, l1: "Alarm", l2: "> 10 lần / 5 phút" },
        { id: "sns", x: 230, y: 200, w: 130, l1: "SNS", l2: "email, chat" },
        { id: "team", x: 60, y: 200, l1: "Đội bảo mật", user: true },
      ],
      links: [["x", "api"], ["api", "trail"], ["trail", "logs"], ["logs", "filter"], ["filter", "alarm"], ["alarm", "sns"], ["sns", "team"]],
    },
    run: (on) => on
      ? { steps: [
            { at: "api", state: "block", tag: "TỪ CHỐI", msg: "IAM từ chối từng lệnh gọi, nhưng bên tấn công vẫn tiếp tục thử." },
            { at: "trail", state: "pass", msg: "Mỗi lệnh gọi được ghi thành một event: danh tính, API được gọi, địa chỉ IP nguồn, mã lỗi." },
            { at: "logs", state: "pass", msg: "Trail gửi event vào **CloudWatch Logs**." },
            { at: "filter", state: "change", tag: "ĐẾM", flash: "+300", msg: "Chuyển các dòng chứa `AccessDenied` thành một metric đếm." },
            { at: "alarm", state: "pass", flash: "ALARM", tag: "ALARM", msg: "Metric vượt ngưỡng, alarm chuyển sang trạng thái ALARM." },
            { at: "sns", state: "pass", msg: "Gửi thông báo qua **SNS**." },
            { at: "team", state: "pass", msg: "Cảnh báo được gửi sau vài phút, kể cả ngoài giờ làm việc." }],
          ok: true, back: false,
          result: "Cảnh báo gần thời gian thực, không cần viết mã. Đội bảo mật vô hiệu hoá access key ngay trong đêm." }
      : { steps: [
            { at: "api", state: "block", tag: "TỪ CHỐI", msg: "IAM từ chối từng lệnh gọi." },
            { at: "trail", state: "pass", msg: "CloudTrail vẫn ghi đầy đủ." },
            { at: "logs", state: "pass", msg: "Event được lưu trong log nhưng không được thống kê." },
            { at: "filter", state: "skip", msg: "Chưa có metric filter." }],
          ok: false, back: false,
          result: "Sự cố chỉ được phát hiện khi xem báo cáo cuối tuần. Truy vấn bằng Athena hoặc dashboard chỉ phục vụ phân tích sau sự cố, không phải cơ chế cảnh báo." },
  },
];

export default function LogPipelineSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh." />;
}
