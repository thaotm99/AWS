import PacketSim, { type PScenario } from "../elb/PacketSim";

// Two ShopViet stories about logs. First: the Auto Scaling group already terminated
// the instance that had the bug, so the log is gone unless the CloudWatch agent sent
// it out. Second: someone keeps calling AWS APIs they are not allowed to; CloudTrail
// records it, and a metric filter plus an alarm turns it into a warning within minutes.

const SCENARIOS: PScenario[] = [
  {
    name: "Tìm log của máy đã bị thay",
    action: "Đi tìm log",
    request: "Lỗi thanh toán lúc 14:02 hôm kia, trên i-web3",
    toggle: { label: "Cài CloudWatch agent trên mọi instance", initial: false },
    layout: {
      viewBox: "0 34 820 220",
      aria: "Kỹ sư đi tìm log trên một EC2 đã bị terminate hoặc trong CloudWatch Logs",
      boxes: [{ x: 300, y: 44, w: 230, h: 196, label: "Auto Scaling group" }],
      nodes: [
        { id: "dev", x: 70, y: 145, l1: "Kỹ sư", user: true },
        { id: "i3", x: 415, y: 100, w: 170, l1: "i-web3", l2: "đã terminate hôm qua" },
        { id: "i9", x: 415, y: 195, w: 170, l1: "i-web9", l2: "máy mới, không có lỗi" },
        { id: "logs", x: 690, y: 145, w: 190, l1: "CloudWatch Logs", l2: "log group /shopviet/web" },
      ],
      links: [["dev", "i3"], ["i3", "logs"], ["i9", "logs"], ["dev", "logs"]],
    },
    run: (agent) => agent
      ? { steps: [
            { at: "logs", from: "i3", state: "pass", tag: "GỬI LOG", label: "CloudWatch agent", msg: "Hôm kia, agent trên i-web3 đẩy từng dòng log lên log group gần như ngay lập tức." },
            { at: "i3", jump: true, state: "skip", msg: "Máy đã bị terminate, nhưng log đã ở ngoài máy." },
            { at: "logs", from: "dev", state: "pass", flash: "tìm thấy", msg: "**Logs Insights** lọc `ERROR` quanh 14:02 trong log stream của i-web3." }],
          ok: true,
          result: "Tìm ra lỗi mà không cần SSH. Fleet thay máy mỗi ngày cũng không mất log." }
      : { steps: [
            { at: "i3", state: "block", flash: "mất", msg: "ASG đã terminate i-web3. Log nằm trên ổ của máy nên mất theo." },
            { at: "i9", from: "dev", state: "skip", msg: "Máy mới không có log của hôm kia." }],
          ok: false,
          result: "Không còn dấu vết. Tắt scale in hay chụp snapshot trước khi terminate đều là chữa cháy. Cài **CloudWatch agent** để log rời máy ngay khi được ghi." },
  },
  {
    name: "Ai đó gọi API trái phép",
    action: "Gọi API",
    request: "2h sáng: 300 lời gọi bị AccessDenied trong 10 phút",
    toggle: { label: "Có metric filter + alarm", initial: false },
    layout: {
      viewBox: "0 26 820 244",
      aria: "CloudTrail ghi lời gọi API vào CloudWatch Logs, metric filter đếm lỗi, alarm gửi SNS tới đội bảo mật",
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
            { at: "api", state: "block", tag: "TỪ CHỐI", msg: "IAM chặn từng lời gọi, nhưng kẻ gọi vẫn đang thử." },
            { at: "trail", state: "pass", msg: "Mỗi lời gọi thành một event: ai gọi, gọi gì, từ IP nào, lỗi gì." },
            { at: "logs", state: "pass", msg: "Trail gửi event vào **CloudWatch Logs**." },
            { at: "filter", state: "change", tag: "ĐẾM", flash: "+300", msg: "Biến các dòng có `AccessDenied` thành một metric đếm." },
            { at: "alarm", state: "pass", flash: "ALARM", tag: "ALARM", msg: "Metric vượt ngưỡng, alarm bật." },
            { at: "sns", state: "pass", msg: "Gửi thông báo qua **SNS**." },
            { at: "team", state: "pass", msg: "Có cảnh báo sau vài phút, đêm hôm vẫn biết." }],
          ok: true, back: false,
          result: "Gần thời gian thực và không phải viết code. Đội bảo mật vô hiệu hoá access key ngay trong đêm." }
      : { steps: [
            { at: "api", state: "block", tag: "TỪ CHỐI", msg: "IAM chặn từng lời gọi." },
            { at: "trail", state: "pass", msg: "CloudTrail vẫn ghi đầy đủ." },
            { at: "logs", state: "pass", msg: "Event nằm trong log, nhưng không ai đếm." },
            { at: "filter", state: "skip", msg: "Chưa có metric filter." }],
          ok: false, back: false,
          result: "Cuối tuần đọc báo cáo mới thấy. Query bằng Athena hay vẽ dashboard đều là xem lại sau, không phải cảnh báo." },
  },
];

export default function LogPipelineSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn tình huống rồi bấm nút chạy. Bật công tắc và chạy lại để so sánh." />;
}
