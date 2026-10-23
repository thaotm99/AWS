import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Two MFTECH stories about logs. First: the Auto Scaling group already terminated
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
        { id: "logs", x: 690, y: 145, w: 190, l1: "CloudWatch Logs", l2: "log group /mftech/web" },
      ],
      links: [["dev", "i3"], ["i3", "logs"], ["i9", "logs"], ["dev", "logs"]],
    },
    run: (agent) => agent
      ? { steps: [
            { at: "logs", from: "i3", state: "pass", tag: "GỬI LOG", label: "CloudWatch agent", msg: "Hai ngày trước, CloudWatch agent trên i-web3 đã thu thập log và gửi liên tục lên log group." },
            { at: "i3", jump: true, state: "skip", msg: "Instance đã bị terminate, nhưng log đã được lưu bên ngoài instance." },
            { at: "logs", from: "dev", state: "pass", flash: "tìm thấy", msg: "**Logs Insights** lọc `ERROR` quanh thời điểm 14:02 trong log stream của i-web3." }],
          ok: true,
          result: "Xác định được lỗi mà không cần SSH. Fleet thay thế instance hằng ngày cũng không làm mất log." }
      : { steps: [
            { at: "i3", state: "block", flash: "mất", msg: "ASG đã terminate i-web3. Log được lưu cục bộ trên root volume của instance nên bị mất theo." },
            { at: "i9", from: "dev", state: "skip", msg: "Instance mới không có log của hai ngày trước." }],
          ok: false,
          result: "Không còn dữ liệu để truy vết. Tắt scale in hoặc tạo snapshot trước khi terminate chỉ là biện pháp tạm thời. Cần cài đặt **CloudWatch agent** để log được gửi lên CloudWatch Logs, bên ngoài instance." },
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

const SCENARIOS_EN: PScenario[] = [
  {
    name: "Retrieve logs of a replaced instance",
    action: "Retrieve logs",
    request: "Payment error at 14:02 two days ago, on i-web3",
    toggle: { label: "Install the CloudWatch agent on every instance", initial: false },
    layout: {
      viewBox: "0 34 820 220",
      aria: "An engineer retrieves logs on a terminated EC2 instance or in CloudWatch Logs",
      boxes: [{ x: 300, y: 44, w: 230, h: 196, label: "Auto Scaling group" }],
      nodes: [
        { id: "dev", x: 70, y: 145, l1: "Engineer", user: true },
        { id: "i3", x: 415, y: 100, w: 170, l1: "i-web3", l2: "terminated yesterday" },
        { id: "i9", x: 415, y: 195, w: 170, l1: "i-web9", l2: "new instance, no error" },
        { id: "logs", x: 690, y: 145, w: 190, l1: "CloudWatch Logs", l2: "log group /mftech/web" },
      ],
      links: [["dev", "i3"], ["i3", "logs"], ["i9", "logs"], ["dev", "logs"]],
    },
    run: (agent) => agent
      ? { steps: [
            { at: "logs", from: "i3", state: "pass", tag: "SEND LOGS", label: "CloudWatch agent", msg: "Two days ago, the CloudWatch agent on i-web3 collected logs and sent them continuously to the log group." },
            { at: "i3", jump: true, state: "skip", msg: "The instance has been terminated, but the logs were stored outside the instance." },
            { at: "logs", from: "dev", state: "pass", flash: "found", msg: "**Logs Insights** filters `ERROR` around 14:02 in i-web3's log stream." }],
          ok: true,
          result: "The error is found without SSH. A fleet that replaces instances every day no longer loses logs." }
      : { steps: [
            { at: "i3", state: "block", flash: "lost", msg: "The ASG has terminated i-web3. The logs were stored locally on the instance root volume, so they are lost with it." },
            { at: "i9", from: "dev", state: "skip", msg: "The new instance has no logs from two days ago." }],
          ok: false,
          result: "No data is left to trace. Disabling scale-in or taking a snapshot before termination is only a stopgap. Install the **CloudWatch agent** so that logs are sent to CloudWatch Logs, outside the instance." },
  },
  {
    name: "Unauthorized API calls",
    action: "Call API",
    request: "2:00 a.m.: 300 calls denied with AccessDenied in 10 minutes",
    toggle: { label: "Configure a metric filter + alarm", initial: false },
    layout: {
      viewBox: "0 26 820 244",
      aria: "CloudTrail records API calls in CloudWatch Logs, a metric filter counts the errors, and an alarm notifies the security team through SNS",
      nodes: [
        { id: "x", x: 60, y: 80, l1: "Leaked access key", user: true },
        { id: "api", x: 230, y: 80, w: 130, l1: "AWS API", l2: "AccessDenied" },
        { id: "trail", x: 420, y: 80, w: 140, l1: "CloudTrail", l2: "trail logs every API call" },
        { id: "logs", x: 640, y: 80, w: 190, l1: "CloudWatch Logs", l2: "the trail's log group" },
        { id: "filter", x: 640, y: 200, w: 190, l1: "Metric filter", l2: "errorCode = AccessDenied" },
        { id: "alarm", x: 420, y: 200, w: 140, l1: "Alarm", l2: "> 10 times / 5 min" },
        { id: "sns", x: 230, y: 200, w: 130, l1: "SNS", l2: "email, chat" },
        { id: "team", x: 60, y: 200, l1: "Security team", user: true },
      ],
      links: [["x", "api"], ["api", "trail"], ["trail", "logs"], ["logs", "filter"], ["filter", "alarm"], ["alarm", "sns"], ["sns", "team"]],
    },
    run: (on) => on
      ? { steps: [
            { at: "api", state: "block", tag: "DENIED", msg: "IAM denies each call, but the attacker keeps trying." },
            { at: "trail", state: "pass", msg: "Each call is recorded as an event: identity, API called, source IP address, error code." },
            { at: "logs", state: "pass", msg: "The trail sends the events to **CloudWatch Logs**." },
            { at: "filter", state: "change", tag: "COUNT", flash: "+300", msg: "Turns the lines that contain `AccessDenied` into a count metric." },
            { at: "alarm", state: "pass", flash: "ALARM", tag: "ALARM", msg: "The metric breaches the threshold, and the alarm goes into the ALARM state." },
            { at: "sns", state: "pass", msg: "Sends a notification through **SNS**." },
            { at: "team", state: "pass", msg: "The alert arrives within minutes, even outside working hours." }],
          ok: true, back: false,
          result: "Near-real-time alerting, with no code to write. The security team disables the access key the same night." }
      : { steps: [
            { at: "api", state: "block", tag: "DENIED", msg: "IAM denies each call." },
            { at: "trail", state: "pass", msg: "CloudTrail still records everything." },
            { at: "logs", state: "pass", msg: "The events are stored in the logs but not counted." },
            { at: "filter", state: "skip", msg: "No metric filter yet." }],
          ok: false, back: false,
          result: "The incident is only discovered when the weekly report is reviewed. Queries with Athena or dashboards only serve post-incident analysis; they are not an alerting mechanism." },
  },
];

export default function LogPipelineSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} hint={L({ vi: "Chọn tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh.", en: "Choose a scenario, then choose the run button. Change the setting and run again to compare." })} />;
}
