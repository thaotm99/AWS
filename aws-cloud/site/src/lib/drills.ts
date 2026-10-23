// Incident drills: an outage or a surprise at ShopViet, played as a few decisions. Each choice is
// judged, explained, and moves the metrics the way the real system would. Plain data, imported by the
// island and by the build.
import type { Text } from "./labs";
export type { Text };

export type Verdict = "good" | "partial" | "bad";
export type ItemState = "down" | "hot" | "ok" | "busy";

export interface Metric {
  id: string;
  label: Text;
  unit: string;
  /** Value when the drill starts. */
  value: number;
  normal: Text;
  /** Higher is worse (error rate, latency) or better (orders per minute). */
  worse: "up" | "down";
  /** At or past this, the metric shows as unhealthy. */
  alert: number;
}

export interface Panel {
  title: Text;
  items: { id: string; text: Text; state: ItemState }[];
}

export interface Option {
  text: Text;
  verdict: Verdict;
  feedback: Text;
  /** New metric values once this choice plays out. */
  metrics?: Record<string, number>;
  items?: Record<string, ItemState>;
  /** New wording for panel items whose situation changed. */
  itemText?: Record<string, Text>;
  log?: Text;
}

export interface Step {
  at: Text;
  situation: Text;
  question: Text;
  options: Option[];
}

export interface Drill {
  id: string;
  title: Text;
  brief: Text;
  metrics: Metric[];
  panels: Panel[];
  start: { at: Text; text: Text }[];
  steps: Step[];
  summary: Text;
  learn: { lesson: string; part: string };
}

const t = (vi: string, en: string): Text => ({ vi, en });

export const DRILLS: Drill[] = [
  {
    id: "az-outage",
    title: t("Một AZ ngừng hoạt động giữa giờ cao điểm", "An AZ goes down at peak time"),
    brief: t(
      "20:14, giữa đợt khuyến mãi. Một nửa số EC2 instance của tầng web không còn phản hồi, và RDS primary nằm trong AZ bị ảnh hưởng.",
      "20:14, in the middle of a sale. Half the web tier's EC2 instances stop responding, and the RDS primary is in the affected AZ.",
    ),
    metrics: [
      { id: "err", label: t("Tỉ lệ lỗi 5xx", "5xx error rate"), unit: "%", value: 38, normal: t("bình thường dưới 0,5%", "normally under 0.5%"), worse: "up", alert: 2 },
      { id: "p95", label: t("Độ trễ p95", "p95 latency"), unit: "ms", value: 2400, normal: t("bình thường 180 ms", "normally 180 ms"), worse: "up", alert: 800 },
      { id: "orders", label: t("Đơn hàng mỗi phút", "Orders per minute"), unit: "", value: 74, normal: t("trước sự cố 120", "120 before the incident"), worse: "down", alert: 100 },
    ],
    panels: [
      {
        title: t("AZ ap-southeast-1a", "AZ ap-southeast-1a"),
        items: [
          { id: "ec2a", text: t("EC2 × 2 · không phản hồi health check", "EC2 × 2 · failing health checks"), state: "down" },
          { id: "rdsA", text: t("RDS primary · không truy cập được", "RDS primary · unreachable"), state: "down" },
        ],
      },
      {
        title: t("AZ ap-southeast-1b", "AZ ap-southeast-1b"),
        items: [
          { id: "ec2b", text: t("EC2 × 2 · CPU 92%", "EC2 × 2 · CPU 92%"), state: "hot" },
          { id: "rdsB", text: t("RDS standby · đang nhận vai trò primary", "RDS standby · taking over as primary"), state: "busy" },
        ],
      },
    ],
    start: [
      { at: t("T+00:00", "T+00:00"), text: t("ALB đánh dấu 2 target ở AZ 1a là không khỏe và ngừng gửi request tới chúng", "The ALB marks 2 targets in AZ 1a unhealthy and stops sending them requests") },
      { at: t("T+01:10", "T+01:10"), text: t("RDS Multi-AZ bắt đầu chuyển sang standby ở AZ 1b", "RDS Multi-AZ starts failing over to the standby in AZ 1b") },
    ],
    steps: [
      {
        at: t("T+02:00", "T+02:00"),
        situation: t("Hai instance còn lại ở AZ 1b gánh toàn bộ lưu lượng, CPU 92%. Auto Scaling group đặt desired capacity là 4 và đang thay instance hỏng, nhưng instance mới vẫn được đặt vào AZ 1a.", "The two remaining instances in AZ 1b carry all traffic at 92% CPU. The Auto Scaling group has a desired capacity of 4 and is replacing failed instances, but keeps placing them in AZ 1a."),
        question: t("Bạn xử lý thế nào trước?", "What do you do first?"),
        options: [
          {
            text: t("Bỏ subnet của AZ 1a khỏi Auto Scaling group và tăng desired capacity lên 6", "Take AZ 1a's subnet out of the Auto Scaling group and raise desired capacity to 6"),
            verdict: "good",
            feedback: t("Auto Scaling group chỉ còn khởi chạy instance ở AZ 1b. Sau khoảng 3 phút, 4 instance mới vượt qua health check và CPU giảm xuống 55%.", "The Auto Scaling group now launches only in AZ 1b. About 3 minutes later, 4 new instances pass health checks and CPU drops to 55%."),
            metrics: { err: 9, p95: 650, orders: 104 },
            items: { ec2b: "ok" },
            itemText: { ec2b: t("EC2 × 6 · CPU 55%", "EC2 × 6 · CPU 55%") },
            log: t("Bỏ AZ 1a khỏi Auto Scaling group, desired capacity 6", "AZ 1a removed from the Auto Scaling group, desired capacity 6"),
          },
          {
            text: t("Khởi động lại các instance ở AZ 1a", "Reboot the instances in AZ 1a"),
            verdict: "bad",
            feedback: t("Cả AZ đang ngừng hoạt động: các instance ở đó không khởi động lại được, và thời gian chờ chỉ kéo dài sự cố.", "The whole AZ is down: instances there cannot restart, and the wait only drags the incident out."),
          },
          {
            text: t("Chuyển DNS của toàn bộ hệ thống sang Region dự phòng", "Move all DNS to the standby Region"),
            verdict: "partial",
            feedback: t("Hệ thống được thiết kế để chịu một AZ ngừng hoạt động trong cùng Region. Chuyển Region tốn thời gian, có thể mất dữ liệu ghi gần nhất, và chưa cần khi AZ 1b vẫn hoạt động.", "The system is built to survive one AZ going down within the Region. A Region switch takes time, can lose recent writes, and is not needed while AZ 1b works."),
          },
        ],
      },
      {
        at: t("T+04:30", "T+04:30"),
        situation: t("Một số request ghi đơn hàng vẫn lỗi với thông báo không kết nối được database. RDS báo quá trình failover sắp hoàn tất.", "Some order writes still fail with database connection errors. RDS reports the failover is nearly complete."),
        question: t("Bạn làm gì với database?", "What do you do about the database?"),
        options: [
          {
            text: t("Chờ failover hoàn tất và xác nhận ứng dụng kết nối lại qua cùng endpoint", "Let the failover finish and confirm the application reconnects through the same endpoint"),
            verdict: "good",
            feedback: t("RDS cập nhật bản ghi DNS của endpoint sang standby mới được nâng cấp. Ứng dụng có cơ chế thử lại kết nối nên tự phục hồi, không cần đổi cấu hình.", "RDS points the endpoint's DNS record at the promoted standby. The application retries connections, so it recovers with no configuration change."),
            metrics: { err: 0.4, p95: 210, orders: 118 },
            items: { rdsB: "ok" },
            itemText: { rdsB: t("RDS primary mới · hoạt động bình thường", "New RDS primary · healthy") },
            log: t("RDS failover hoàn tất, ứng dụng kết nối lại", "RDS failover complete, the application reconnects"),
          },
          {
            text: t("Promote một read replica thành database độc lập", "Promote a read replica to a standalone database"),
            verdict: "bad",
            feedback: t("Read replica sao chép bất đồng bộ nên có thể thiếu các đơn hàng vừa ghi, và có endpoint khác buộc phải đổi cấu hình ứng dụng. Multi-AZ đã tự xử lý việc này.", "A read replica copies asynchronously, so it can miss orders just written, and it has a different endpoint that forces a configuration change. Multi-AZ already handles this."),
          },
          {
            text: t("Khôi phục database mới từ snapshot gần nhất", "Restore a new database from the latest snapshot"),
            verdict: "bad",
            feedback: t("Khôi phục mất nhiều phút tới hàng giờ và mất mọi dữ liệu sau thời điểm snapshot.", "A restore takes minutes to hours and loses everything written after the snapshot."),
          },
        ],
      },
      {
        at: t("Sau sự cố", "After the incident"),
        situation: t("Hệ thống đã ổn định. Buổi rà soát sau sự cố cần một thay đổi để lần sau không bị quá tải trong lúc chờ instance mới.", "The system is stable. The post-incident review needs one change so the next outage does not overload the system while new instances start."),
        question: t("Bạn đề xuất thay đổi nào?", "Which change do you propose?"),
        options: [
          {
            text: t("Đặt minimum capacity sao cho mỗi AZ đủ gánh toàn bộ tải khi AZ kia ngừng hoạt động", "Set minimum capacity so each AZ can carry the whole load when the other goes down"),
            verdict: "good",
            feedback: t("Đây là thiết kế static stability: hệ thống chịu được mất một AZ mà không phải chờ scale out. Đổi lại là chi phí cho phần công suất dự phòng.", "This is static stability: the system survives losing an AZ without waiting to scale out. The trade-off is paying for the spare capacity."),
          },
          {
            text: t("Dồn toàn bộ instance sang AZ 1b vì AZ 1a vừa gặp sự cố", "Move every instance to AZ 1b because AZ 1a just failed"),
            verdict: "bad",
            feedback: t("Một AZ duy nhất là điểm lỗi đơn; lần sau AZ 1b gặp sự cố thì toàn bộ hệ thống ngừng.", "A single AZ is a single point of failure; the next time AZ 1b fails, the whole system stops."),
          },
          {
            text: t("Đổi sang instance type lớn hơn", "Move to a larger instance type"),
            verdict: "partial",
            feedback: t("Instance lớn hơn có thêm dư địa CPU nhưng không giải quyết việc thiếu instance trong lúc chờ scale out, và vẫn trả phí cho mọi giờ.", "Larger instances add CPU headroom but do not fix the shortfall while scaling out, and they cost more every hour."),
          },
        ],
      },
    ],
    summary: t("Thiết kế Multi-AZ đã làm phần lớn công việc: ALB ngừng gửi request tới AZ hỏng và RDS tự chuyển sang standby. Phần cần con người là đảm bảo đủ công suất ở AZ còn lại.", "The Multi-AZ design did most of the work: the ALB stopped sending requests to the failed AZ and RDS failed over on its own. What needed people was enough capacity in the AZ that was left."),
    learn: { lesson: "asg", part: "az-failure-capacity" },
  },
  {
    id: "flash-sale",
    title: t("Lưu lượng tăng 8 lần khi mở bán", "Traffic jumps eightfold at a product launch"),
    brief: t(
      "10:00, ShopViet mở bán một mẫu điện thoại mới. Lưu lượng tăng 8 lần trong 10 phút; trang tải chậm và một phần khách hàng gặp lỗi.",
      "10:00, ShopViet opens sales of a new phone. Traffic grows eightfold in 10 minutes; pages are slow and some customers get errors.",
    ),
    metrics: [
      { id: "p95", label: t("Độ trễ p95", "p95 latency"), unit: "ms", value: 3100, normal: t("bình thường 180 ms", "normally 180 ms"), worse: "up", alert: 800 },
      { id: "err", label: t("Tỉ lệ lỗi 5xx", "5xx error rate"), unit: "%", value: 12, normal: t("bình thường dưới 0,5%", "normally under 0.5%"), worse: "up", alert: 2 },
      { id: "db", label: t("CPU của RDS", "RDS CPU"), unit: "%", value: 96, normal: t("bình thường 35%", "normally 35%"), worse: "up", alert: 80 },
    ],
    panels: [
      {
        title: t("Tầng web", "Web tier"),
        items: [
          { id: "asg", text: t("Auto Scaling group · 4 instance, đang thêm 6", "Auto Scaling group · 4 instances, adding 6"), state: "hot" },
          { id: "boot", text: t("Instance mới cần 6 phút để sẵn sàng", "New instances take 6 minutes to be ready"), state: "busy" },
        ],
      },
      {
        title: t("Tầng dữ liệu", "Data tier"),
        items: [
          { id: "rds", text: t("RDS primary · 85% truy vấn là đọc trang sản phẩm", "RDS primary · 85% of queries are product page reads"), state: "hot" },
          { id: "mail", text: t("Gửi email xác nhận · gọi đồng bộ khi thanh toán", "Confirmation email · called synchronously at checkout"), state: "ok" },
        ],
      },
    ],
    start: [
      { at: t("T+00:00", "T+00:00"), text: t("Mở bán; lưu lượng tăng từ 1.200 lên 9.600 request mỗi giây", "Sales open; traffic grows from 1,200 to 9,600 requests a second") },
      { at: t("T+02:00", "T+02:00"), text: t("Target tracking policy bắt đầu thêm instance", "The target tracking policy starts adding instances") },
    ],
    steps: [
      {
        at: t("T+05:00", "T+05:00"),
        situation: t("CPU của RDS 96%, phần lớn là truy vấn đọc thông tin sản phẩm giống nhau. Một read replica đã có sẵn nhưng ứng dụng chưa dùng.", "RDS CPU is at 96%, mostly identical product reads. A read replica exists but the application does not use it."),
        question: t("Bạn giảm tải cho database thế nào?", "How do you take load off the database?"),
        options: [
          {
            text: t("Chuyển truy vấn đọc trang sản phẩm sang endpoint của read replica", "Send product page reads to the read replica's endpoint"),
            verdict: "good",
            feedback: t("Read replica nhận phần đọc, CPU của primary giảm còn 45%. Dữ liệu trên replica có thể trễ vài giây, chấp nhận được với thông tin sản phẩm.", "The replica takes the reads and primary CPU falls to 45%. Replica data can lag a few seconds, which is fine for product information."),
            metrics: { db: 45, p95: 900, err: 4 },
            items: { rds: "ok" },
            itemText: { rds: t("RDS primary · CPU 45%, phần đọc chuyển sang read replica", "RDS primary · CPU 45%, reads on the read replica") },
            log: t("Truy vấn đọc trang sản phẩm chuyển sang read replica", "Product page reads moved to the read replica"),
          },
          {
            text: t("Tăng max_connections của RDS", "Raise RDS max_connections"),
            verdict: "bad",
            feedback: t("Database thiếu CPU chứ không thiếu kết nối; thêm kết nối làm CPU càng quá tải.", "The database is short of CPU, not connections; more connections push CPU further."),
          },
          {
            text: t("Đổi RDS sang instance class lớn hơn ngay lúc này", "Move RDS to a larger instance class right now"),
            verdict: "partial",
            feedback: t("Thay đổi instance class gây gián đoạn trong lúc failover ngay giữa đợt mở bán. Nên làm trong khung bảo trì, sau khi đã giảm tải đọc.", "Changing the instance class means a failover outage in the middle of the sale. Do it in a maintenance window, after taking the reads off."),
          },
        ],
      },
      {
        at: t("T+09:00", "T+09:00"),
        situation: t("Thanh toán chậm: mỗi đơn hàng chờ dịch vụ email gửi xác nhận, và dịch vụ email đang bị giới hạn tốc độ gửi.", "Checkout is slow: every order waits for the email service to send a confirmation, and the email service is being throttled."),
        question: t("Bạn xử lý bước thanh toán thế nào?", "What do you do about checkout?"),
        options: [
          {
            text: t("Đưa việc gửi email vào hàng đợi SQS và xử lý bất đồng bộ", "Put confirmation emails on an SQS queue and send them asynchronously"),
            verdict: "good",
            feedback: t("Thanh toán không còn chờ email; email được gửi dần theo giới hạn tốc độ của dịch vụ và không bị mất.", "Checkout no longer waits for email; emails go out at the service's allowed rate and none are lost."),
            metrics: { p95: 240, err: 0.6 },
            items: { mail: "ok", asg: "ok", boot: "ok" },
            itemText: {
              mail: t("Email xác nhận · gửi qua hàng đợi SQS", "Confirmation email · sent through an SQS queue"),
              asg: t("Auto Scaling group · 10 instance", "Auto Scaling group · 10 instances"),
              boot: t("Instance mới đã sẵn sàng", "New instances are ready"),
            },
            log: t("Email xác nhận chuyển sang SQS", "Confirmation emails moved to SQS"),
          },
          {
            text: t("Tăng timeout khi gọi dịch vụ email lên 30 giây", "Raise the email call timeout to 30 seconds"),
            verdict: "bad",
            feedback: t("Request thanh toán giữ kết nối lâu hơn, chiếm thêm tài nguyên tầng web và độ trễ tăng thêm.", "Checkout requests hold connections longer, take more web tier resources and get even slower."),
          },
          {
            text: t("Tạm tắt email xác nhận", "Turn confirmation emails off for now"),
            verdict: "partial",
            feedback: t("Thanh toán nhanh lại nhưng khách hàng không nhận xác nhận và đơn hàng không được gửi bù sau đó.", "Checkout recovers, but customers get no confirmation and the emails are never sent later."),
          },
        ],
      },
      {
        at: t("Sau sự cố", "After the incident"),
        situation: t("Đợt mở bán tiếp theo đã có lịch vào 10:00 thứ Sáu tuần sau.", "The next launch is scheduled for 10:00 next Friday."),
        question: t("Bạn chuẩn bị tầng web thế nào?", "How do you prepare the web tier?"),
        options: [
          {
            text: t("Thêm scheduled action tăng capacity trước 09:45 thứ Sáu", "Add a scheduled action that raises capacity before 09:45 on Friday"),
            verdict: "good",
            feedback: t("Instance sẵn sàng trước khi lưu lượng tăng; target tracking vẫn xử lý phần chênh lệch. Warm pool có thể rút ngắn thêm thời gian khởi động.", "Instances are ready before the surge; target tracking still handles the difference. A warm pool can cut start-up time further."),
          },
          {
            text: t("Giữ maximum capacity ở mức cao thường xuyên", "Keep maximum capacity high at all times"),
            verdict: "partial",
            feedback: t("Maximum chỉ là giới hạn trên; instance vẫn chỉ được thêm khi tải đã tăng, nên vẫn chậm 6 phút như lần này.", "Maximum is only a ceiling; instances are still added after load rises, so they are 6 minutes late again."),
          },
          {
            text: t("Giảm health check grace period để instance mới nhận request sớm hơn", "Shorten the health check grace period so new instances get requests sooner"),
            verdict: "bad",
            feedback: t("Instance chưa khởi động xong có thể bị đánh dấu không khỏe và bị thay thế liên tục.", "Instances that have not finished starting can be marked unhealthy and replaced over and over."),
          },
        ],
      },
    ],
    summary: t("Tải tăng đột ngột lộ ra hai điểm nghẽn ngoài tầng web: database phục vụ cả phần đọc lặp lại, và một lời gọi đồng bộ nằm trên đường thanh toán.", "The surge exposed two bottlenecks beyond the web tier: the database served repeated reads, and a synchronous call sat on the checkout path."),
    learn: { lesson: "asg", part: "scaling-policies" },
  },
  {
    id: "cost-spike",
    title: t("Hoá đơn AWS tăng 40% trong một tháng", "The AWS bill grows 40% in a month"),
    brief: t(
      "Hoá đơn tháng này của ShopViet tăng 40% dù lưu lượng khách hàng gần như không đổi. Bộ phận tài chính cần biết nguyên nhân trước cuối tuần.",
      "ShopViet's bill this month is up 40% although customer traffic is nearly flat. Finance wants the cause before the weekend.",
    ),
    metrics: [
      { id: "day", label: t("Chi phí mỗi ngày", "Cost per day"), unit: "$", value: 420, normal: t("tháng trước $300", "$300 last month"), worse: "up", alert: 340 },
      { id: "nat", label: t("Dữ liệu qua NAT gateway mỗi ngày", "NAT gateway data per day"), unit: "GB", value: 1900, normal: t("tháng trước 300 GB", "300 GB last month"), worse: "up", alert: 500 },
    ],
    panels: [
      {
        title: t("Thay đổi gần đây", "Recent changes"),
        items: [
          { id: "img", text: t("Dịch vụ xử lý ảnh mới trong private subnet", "New image service in private subnets"), state: "busy" },
          { id: "alert", text: t("Chưa có cảnh báo chi phí", "No cost alerts in place"), state: "hot" },
        ],
      },
    ],
    start: [{ at: t("Ngày 1", "Day 1"), text: t("Dịch vụ xử lý ảnh mới được triển khai, đọc ảnh gốc từ S3", "The new image service goes live, reading originals from S3") }],
    steps: [
      {
        at: t("Ngày 24", "Day 24"),
        situation: t("Bạn mới nhận hoá đơn tạm tính và chưa biết khoản nào tăng.", "You have the month-to-date bill and do not yet know which line grew."),
        question: t("Bạn bắt đầu từ đâu?", "Where do you start?"),
        options: [
          {
            text: t("Mở Cost Explorer, nhóm theo service rồi theo usage type", "Open Cost Explorer and group by service, then by usage type"),
            verdict: "good",
            feedback: t("Khoản tăng nằm ở EC2-Other, usage type NatGateway-Bytes: phí xử lý dữ liệu qua NAT gateway tăng gần 6 lần.", "The growth is under EC2-Other, usage type NatGateway-Bytes: NAT gateway data processing is up almost sixfold."),
            items: { img: "hot" },
            itemText: { img: t("Dịch vụ xử lý ảnh · nguồn của phần lớn dữ liệu qua NAT gateway", "Image service · the source of most NAT gateway data") },
            log: t("Cost Explorer: NatGateway-Bytes tăng gần 6 lần", "Cost Explorer: NatGateway-Bytes up almost sixfold"),
          },
          {
            text: t("Xoá các EC2 instance có vẻ không dùng", "Delete EC2 instances that look unused"),
            verdict: "bad",
            feedback: t("Xoá tài nguyên khi chưa biết nguyên nhân có thể gây sự cố, và EC2 instance không phải là khoản tăng.", "Deleting resources before knowing the cause risks an outage, and EC2 instances are not what grew."),
          },
          {
            text: t("Mở yêu cầu hỗ trợ với AWS Support", "Open a case with AWS Support"),
            verdict: "partial",
            feedback: t("AWS Support có thể giúp, nhưng dữ liệu cần thiết đã có sẵn trong Cost Explorer và tìm ra nhanh hơn.", "AWS Support can help, but the data is already in Cost Explorer and quicker to find there."),
          },
        ],
      },
      {
        at: t("Ngày 24", "Day 24"),
        situation: t("VPC Flow Logs cho thấy phần lớn dữ liệu qua NAT gateway là lưu lượng từ dịch vụ xử lý ảnh tới S3.", "VPC Flow Logs show most NAT gateway data is the image service talking to S3."),
        question: t("Bạn giảm khoản phí này thế nào?", "How do you cut this charge?"),
        options: [
          {
            text: t("Tạo gateway endpoint cho S3 và thêm vào route table của private subnet", "Create an S3 gateway endpoint and add it to the private route tables"),
            verdict: "good",
            feedback: t("Lưu lượng tới S3 đi qua gateway endpoint, không tính phí; dữ liệu qua NAT gateway trở về mức cũ.", "S3 traffic goes through the gateway endpoint at no charge; NAT gateway data returns to its old level."),
            metrics: { day: 305, nat: 310 },
            items: { img: "ok" },
            itemText: { img: t("Dịch vụ xử lý ảnh · đọc S3 qua gateway endpoint", "Image service · reads S3 through the gateway endpoint") },
            log: t("Gateway endpoint cho S3 được thêm vào route table", "S3 gateway endpoint added to the route tables"),
          },
          {
            text: t("Chuyển dịch vụ xử lý ảnh sang public subnet với IP public", "Move the image service to a public subnet with public IPs"),
            verdict: "bad",
            feedback: t("Bỏ được NAT gateway nhưng mở dịch vụ nội bộ ra Internet, và lưu lượng tới S3 vẫn đi qua địa chỉ public.", "It drops the NAT gateway but exposes an internal service to the internet, and S3 traffic still uses public addresses."),
          },
          {
            text: t("Thêm NAT gateway thứ hai để chia tải", "Add a second NAT gateway to share the load"),
            verdict: "bad",
            feedback: t("Phí xử lý tính theo GB dữ liệu; thêm NAT gateway chỉ cộng thêm phí theo giờ.", "Processing is charged per GB; another NAT gateway only adds an hourly charge."),
          },
        ],
      },
      {
        at: t("Ngày 25", "Day 25"),
        situation: t("Chi phí đã về mức cũ. Lần này khoản tăng chỉ được phát hiện khi có hoá đơn.", "Costs are back to normal. This time the growth was only found from the bill."),
        question: t("Làm sao phát hiện sớm hơn lần sau?", "How do you catch it sooner next time?"),
        options: [
          {
            text: t("Bật Cost Anomaly Detection và đặt AWS Budgets gửi cảnh báo theo ngưỡng", "Turn on Cost Anomaly Detection and set AWS Budgets alerts"),
            verdict: "good",
            feedback: t("Cost Anomaly Detection phát hiện mức tăng bất thường theo từng service và gửi cảnh báo; Budgets cảnh báo khi chi phí dự báo vượt ngưỡng.", "Cost Anomaly Detection flags unusual growth per service and sends an alert; Budgets alerts when forecast cost crosses a threshold."),
            items: { alert: "ok" },
            itemText: { alert: t("Cost Anomaly Detection và AWS Budgets đã bật", "Cost Anomaly Detection and AWS Budgets are on") },
          },
          {
            text: t("Xem hoá đơn thủ công vào đầu mỗi tháng", "Read the bill by hand at the start of each month"),
            verdict: "partial",
            feedback: t("Vẫn chỉ phát hiện sau khi đã trả phí cả tháng.", "It still finds the problem only after a full month of charges."),
          },
          {
            text: t("Đặt Service Quotas thấp hơn cho NAT gateway", "Lower the Service Quotas for NAT gateways"),
            verdict: "bad",
            feedback: t("Service Quotas giới hạn số tài nguyên, không giới hạn dữ liệu đi qua; khoản tăng này vẫn xảy ra.", "Service Quotas cap how many resources exist, not how much data flows; this growth would still happen."),
          },
        ],
      },
    ],
    summary: t("Thiết kế mạng ảnh hưởng trực tiếp tới chi phí: cùng một luồng dữ liệu tới S3 có thể tốn hàng trăm đô mỗi tháng qua NAT gateway hoặc không tốn gì qua gateway endpoint.", "Network design drives cost directly: the same data flow to S3 can cost hundreds of dollars a month through a NAT gateway or nothing through a gateway endpoint."),
    learn: { lesson: "vpc", part: "vpc-endpoints" },
  },
];

export const drillById = (id: string) => DRILLS.find((d) => d.id === id);

/** First-try good choices out of the steps, for the summary. */
export function score(first: (Verdict | undefined)[]): number {
  return first.filter((v) => v === "good").length;
}

const KEY = "drills";
export function readDrills(): Record<string, { best: number; steps: number }> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function saveDrill(id: string, best: number, steps: number) {
  try {
    const all = readDrills();
    if ((all[id]?.best ?? -1) < best) localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: { best, steps } }));
  } catch {
    /* storage blocked */
  }
}
