// Service comparisons: the services that are easy to confuse, side by side, and which one fits a set of
// requirements the learner picks. Imported by the island and by the build.
import type { Text } from "./labs";
export type { Text };

export type Fit = "yes" | "partial" | "no";

export interface Need {
  id: string;
  text: Text;
  /** How well each service meets the need, and why. */
  fit: Record<string, { fit: Fit; why: Text }>;
}

export interface CompareSet {
  id: string;
  title: Text;
  lede: Text;
  services: { id: string; name: string }[];
  rows: { label: Text; cells: Record<string, Text> }[];
  needs: Need[];
  /** When no single service meets every requirement. */
  combine: Text;
  learn: { lesson: string; part: string };
}

const t = (vi: string, en: string): Text => ({ vi, en });
const f = (fit: Fit, vi: string, en: string) => ({ fit, why: t(vi, en) });

export const COMPARE: CompareSet[] = [
  {
    id: "messaging",
    title: t("SQS, SNS hay EventBridge?", "SQS, SNS or EventBridge?"),
    lede: t("Ba dịch vụ cùng chuyển message giữa các thành phần của MFTECH nhưng khác cách giao message và cách giữ message.", "All three move messages between MFTECH's components, but they deliver and keep messages differently."),
    services: [
      { id: "sqs", name: "Amazon SQS" },
      { id: "sns", name: "Amazon SNS" },
      { id: "eb", name: "Amazon EventBridge" },
    ],
    rows: [
      { label: t("Mô hình", "Model"), cells: { sqs: t("Hàng đợi; consumer chủ động lấy message", "Queue; consumers poll for messages"), sns: t("Publish/subscribe; đẩy tới subscriber", "Publish/subscribe; pushes to subscribers"), eb: t("Event bus; rule định tuyến tới target", "Event bus; rules route to targets") } },
      { label: t("Giữ message khi bên nhận ngừng", "Keeps messages while the receiver is down"), cells: { sqs: t("Có, tới 14 ngày", "Yes, up to 14 days"), sns: t("Không lưu; thử gửi lại rồi chuyển vào DLQ", "No storage; retries, then a DLQ"), eb: t("Thử gửi lại tới 24 giờ; archive để phát lại", "Retries for up to 24 hours; archive and replay") } },
      { label: t("Số bên nhận một message", "Receivers per message"), cells: { sqs: t("Một consumer xử lý mỗi message", "One consumer processes each message"), sns: t("Mọi subscriber (fan-out)", "Every subscriber (fan-out)"), eb: t("Mọi target của các rule khớp", "Every target of matching rules") } },
      { label: t("Lọc theo nội dung", "Content filtering"), cells: { sqs: t("Không", "No"), sns: t("Filter policy trên attribute hoặc nội dung", "Filter policies on attributes or the payload"), eb: t("Event pattern, linh hoạt nhất", "Event patterns, the most flexible") } },
      { label: t("Thứ tự", "Ordering"), cells: { sqs: t("FIFO queue", "FIFO queues"), sns: t("FIFO topic", "FIFO topics"), eb: t("Không đảm bảo", "Not guaranteed") } },
      { label: t("Nguồn sự kiện", "Event sources"), cells: { sqs: t("Ứng dụng gửi vào", "Applications send to it"), sns: t("Ứng dụng và dịch vụ AWS", "Applications and AWS services"), eb: t("Dịch vụ AWS, ứng dụng và đối tác SaaS", "AWS services, applications and SaaS partners") } },
    ],
    needs: [
      {
        id: "keep",
        text: t("Giữ đơn hàng khi dịch vụ kho tạm ngừng", "Keep orders while the warehouse service is down"),
        fit: {
          sqs: f("yes", "Message nằm trong hàng đợi tới 14 ngày cho tới khi dịch vụ kho đọc.", "Messages wait in the queue for up to 14 days until the warehouse service reads them."),
          sns: f("no", "SNS không lưu message; khi subscriber ngừng, message chỉ được thử gửi lại rồi chuyển vào dead-letter queue.", "SNS stores nothing; while a subscriber is down, messages are only retried, then sent to a dead-letter queue."),
          eb: f("partial", "EventBridge thử gửi lại tới 24 giờ; archive giúp phát lại sự kiện nhưng không phải hàng đợi.", "EventBridge retries for up to 24 hours; an archive can replay events but is not a queue."),
        },
      },
      {
        id: "once",
        text: t("Mỗi đơn chỉ được một worker xử lý", "Each order is processed by one worker"),
        fit: {
          sqs: f("yes", "Visibility timeout ẩn message với các consumer khác trong lúc một worker xử lý.", "The visibility timeout hides a message from other consumers while one worker processes it."),
          sns: f("no", "SNS gửi bản sao tới mọi subscriber.", "SNS sends a copy to every subscriber."),
          eb: f("no", "Mọi target của rule đều nhận sự kiện.", "Every target of the rule gets the event."),
        },
      },
      {
        id: "fanout",
        text: t("Nhiều hệ thống cùng nhận một sự kiện", "Several systems receive the same event"),
        fit: {
          sqs: f("no", "Một message chỉ được một consumer nhận.", "A message goes to one consumer."),
          sns: f("yes", "Một message được đẩy tới mọi subscriber: kho, email, phân tích.", "One message is pushed to every subscriber: warehouse, email, analytics."),
          eb: f("yes", "Một rule có tới 5 target; nhiều rule có thể khớp cùng một sự kiện.", "A rule has up to 5 targets; several rules can match the same event."),
        },
      },
      {
        id: "filter",
        text: t("Định tuyến theo nội dung sự kiện", "Route by the event's content"),
        fit: {
          sqs: f("no", "SQS không lọc message.", "SQS does not filter messages."),
          sns: f("partial", "Filter policy lọc theo attribute hoặc nội dung message, ở mức từng subscription.", "Filter policies match attributes or the payload, per subscription."),
          eb: f("yes", "Event pattern so khớp bất kỳ trường nào trong sự kiện, kể cả theo tiền tố hoặc khoảng số.", "Event patterns match any field, including prefixes and numeric ranges."),
        },
      },
      {
        id: "saas",
        text: t("Nhận sự kiện từ ứng dụng SaaS của đối tác", "Receive events from a partner's SaaS application"),
        fit: {
          sqs: f("no", "Đối tác phải tự gửi vào hàng đợi.", "The partner would have to send to the queue itself."),
          sns: f("no", "SNS không có tích hợp sẵn với ứng dụng SaaS.", "SNS has no built-in SaaS integrations."),
          eb: f("yes", "EventBridge có partner event source cho nhiều ứng dụng SaaS.", "EventBridge has partner event sources for many SaaS applications."),
        },
      },
      {
        id: "order",
        text: t("Xử lý đúng thứ tự cập nhật của một đơn hàng", "Process an order's updates in order"),
        fit: {
          sqs: f("yes", "FIFO queue giữ thứ tự trong mỗi message group, ví dụ theo mã đơn hàng.", "A FIFO queue keeps order within each message group, for example per order ID."),
          sns: f("yes", "FIFO topic giữ thứ tự và gửi tới SQS FIFO queue.", "A FIFO topic keeps order and delivers to SQS FIFO queues."),
          eb: f("no", "EventBridge không đảm bảo thứ tự giao sự kiện.", "EventBridge does not guarantee delivery order."),
        },
      },
    ],
    combine: t(
      "Không dịch vụ nào đáp ứng tất cả. Mẫu thường dùng: SNS (hoặc EventBridge) fan-out tới nhiều hàng đợi SQS, mỗi hệ thống một hàng đợi; message được giữ lại khi hệ thống đó ngừng.",
      "No single service meets them all. The usual pattern: SNS (or EventBridge) fans out to several SQS queues, one per system; messages wait while that system is down.",
    ),
    learn: { lesson: "messaging", part: "fan-out-workflows" },
  },
  {
    id: "storage",
    title: t("EBS, EFS hay S3?", "EBS, EFS or S3?"),
    lede: t("Block storage, file storage và object storage khác nhau ở cách truy cập, phạm vi và cách tính phí.", "Block, file and object storage differ in how they are accessed, where they live and how they are billed."),
    services: [
      { id: "ebs", name: "Amazon EBS" },
      { id: "efs", name: "Amazon EFS" },
      { id: "s3", name: "Amazon S3" },
    ],
    rows: [
      { label: t("Loại", "Type"), cells: { ebs: t("Block storage, gắn vào EC2 như ổ đĩa", "Block storage, attached to EC2 as a disk"), efs: t("File system NFS, mount từ nhiều máy", "NFS file system, mounted by many machines"), s3: t("Object storage, truy cập qua API HTTP", "Object storage, accessed over an HTTP API") } },
      { label: t("Phạm vi", "Scope"), cells: { ebs: t("Một AZ", "One AZ"), efs: t("Region (hoặc One Zone)", "Regional (or One Zone)"), s3: t("Region", "Regional") } },
      { label: t("Số máy dùng cùng lúc", "Concurrent clients"), cells: { ebs: t("Một instance; Multi-Attach với io1/io2 trong cùng AZ", "One instance; Multi-Attach for io1/io2 within an AZ"), efs: t("Hàng nghìn instance ở nhiều AZ", "Thousands of instances across AZs"), s3: t("Không giới hạn, qua API", "Unlimited, through the API") } },
      { label: t("Dung lượng và tính phí", "Capacity and billing"), cells: { ebs: t("Cấp phát trước; trả theo dung lượng cấp phát", "Provisioned up front; billed on provisioned size"), efs: t("Tự co giãn; trả theo dung lượng dùng", "Grows and shrinks; billed on what is used"), s3: t("Không giới hạn; trả theo dung lượng dùng", "Unlimited; billed on what is used") } },
      { label: t("Phù hợp", "Good for"), cells: { ebs: t("Ổ hệ điều hành, database tự quản lý", "Boot volumes, self-managed databases"), efs: t("Thư mục dùng chung, nội dung web, CMS", "Shared folders, web content, CMS"), s3: t("Ảnh, video, bản sao lưu, data lake", "Images, video, backups, data lakes") } },
    ],
    needs: [
      {
        id: "db",
        text: t("Ổ đĩa độ trễ thấp cho database tự quản lý trên EC2", "A low-latency disk for a self-managed database on EC2"),
        fit: {
          ebs: f("yes", "EBS io2 hoặc gp3 cho độ trễ mức mili-giây dưới một chữ số và IOPS cấp phát được.", "EBS io2 or gp3 gives single-digit millisecond latency and provisioned IOPS."),
          efs: f("partial", "EFS dùng được nhưng độ trễ qua mạng NFS cao hơn, không phù hợp với database nhiều thao tác ghi nhỏ.", "EFS works, but NFS latency is higher and does not suit databases with many small writes."),
          s3: f("no", "S3 không mount làm ổ đĩa cho database.", "S3 cannot be mounted as a database disk."),
        },
      },
      {
        id: "shared",
        text: t("Nhiều instance ở nhiều AZ cùng đọc ghi một thư mục", "Instances in several AZs read and write one folder"),
        fit: {
          ebs: f("no", "Một volume EBS nằm trong một AZ và thường gắn vào một instance.", "An EBS volume lives in one AZ and usually attaches to one instance."),
          efs: f("yes", "EFS là file system dùng chung, mount được từ mọi AZ trong Region.", "EFS is a shared file system, mountable from every AZ in the Region."),
          s3: f("partial", "S3 dùng chung được qua API nhưng không phải file system POSIX: không khoá tệp, không sửa một phần tệp.", "S3 can be shared through the API but is not a POSIX file system: no file locks, no partial updates."),
        },
      },
      {
        id: "static",
        text: t("Lưu ảnh sản phẩm và phục vụ qua CloudFront", "Store product images and serve them through CloudFront"),
        fit: {
          ebs: f("no", "Ảnh trên EBS buộc EC2 phục vụ tệp tĩnh.", "Images on EBS make EC2 serve static files."),
          efs: f("partial", "Ảnh trên EFS vẫn cần EC2 hoặc máy chủ khác làm origin.", "Images on EFS still need EC2 or another server as the origin."),
          s3: f("yes", "S3 làm origin trực tiếp cho CloudFront, bảo vệ bằng origin access control.", "S3 is a direct CloudFront origin, protected with origin access control."),
        },
      },
      {
        id: "elastic",
        text: t("Không phải dự đoán dung lượng trước", "No capacity to plan up front"),
        fit: {
          ebs: f("no", "Volume EBS có kích thước cấp phát; tăng dung lượng phải thay đổi volume.", "An EBS volume has a provisioned size; growing it means modifying the volume."),
          efs: f("yes", "EFS tự tăng giảm theo dữ liệu.", "EFS grows and shrinks with the data."),
          s3: f("yes", "S3 không giới hạn dung lượng.", "S3 has no capacity limit."),
        },
      },
      {
        id: "durable",
        text: t("Lưu bản sao lưu nhiều năm với chi phí thấp", "Keep backups for years at low cost"),
        fit: {
          ebs: f("no", "Volume EBS đắt hơn nhiều so với các lớp lưu trữ dài hạn; snapshot EBS được lưu trên S3.", "EBS volumes cost far more than archive storage; EBS snapshots are themselves stored in S3."),
          efs: f("partial", "EFS có lớp Infrequent Access và Archive, nhưng không rẻ bằng các lớp Glacier.", "EFS has Infrequent Access and Archive classes, but they cost more than the Glacier classes."),
          s3: f("yes", "Lifecycle chuyển bản sao lưu sang Glacier Flexible Retrieval hoặc Deep Archive.", "Lifecycle rules move backups to Glacier Flexible Retrieval or Deep Archive."),
        },
      },
    ],
    combine: t(
      "Không loại nào đáp ứng tất cả. Hệ thống thường kết hợp: EBS cho database, EFS cho thư mục dùng chung, S3 cho tệp tĩnh và bản sao lưu.",
      "No single type meets them all. Systems usually combine them: EBS for databases, EFS for shared folders, S3 for static files and backups.",
    ),
    learn: { lesson: "storage", part: "shared-storage" },
  },
  {
    id: "entry",
    title: t("ALB, NLB hay API Gateway?", "ALB, NLB or API Gateway?"),
    lede: t("Ba cách đưa request vào ứng dụng, khác nhau ở tầng giao thức và các tính năng quản lý API.", "Three ways to bring requests into an application, differing in protocol layer and API management features."),
    services: [
      { id: "alb", name: "Application Load Balancer" },
      { id: "nlb", name: "Network Load Balancer" },
      { id: "apigw", name: "Amazon API Gateway" },
    ],
    rows: [
      { label: t("Tầng", "Layer"), cells: { alb: t("Tầng 7: HTTP, HTTPS, gRPC", "Layer 7: HTTP, HTTPS, gRPC"), nlb: t("Tầng 4: TCP, UDP, TLS", "Layer 4: TCP, UDP, TLS"), apigw: t("API REST, HTTP và WebSocket được quản lý", "Managed REST, HTTP and WebSocket APIs") } },
      { label: t("Định tuyến", "Routing"), cells: { alb: t("Theo path, host, header, query string", "By path, host, header, query string"), nlb: t("Theo port", "By port"), apigw: t("Theo resource và method", "By resource and method") } },
      { label: t("Địa chỉ IP", "IP addresses"), cells: { alb: t("Thay đổi; truy cập qua DNS", "Change over time; reached by DNS"), nlb: t("Một IP tĩnh mỗi AZ, gắn được Elastic IP", "One static IP per AZ, Elastic IPs allowed"), apigw: t("Truy cập qua DNS", "Reached by DNS") } },
      { label: t("Quản lý API", "API management"), cells: { alb: t("Không", "No"), nlb: t("Không", "No"), apigw: t("Throttling, API key, usage plan, xác thực, cache", "Throttling, API keys, usage plans, auth, caching") } },
    ],
    needs: [
      {
        id: "path",
        text: t("Gửi /api và /images tới hai dịch vụ khác nhau", "Send /api and /images to two different services"),
        fit: {
          alb: f("yes", "Listener rule của ALB định tuyến theo path tới các target group khác nhau.", "ALB listener rules route by path to different target groups."),
          nlb: f("no", "NLB không đọc nội dung HTTP nên không định tuyến theo path.", "An NLB does not read HTTP, so it cannot route by path."),
          apigw: f("yes", "Mỗi resource của API có integration riêng.", "Each API resource has its own integration."),
        },
      },
      {
        id: "staticip",
        text: t("IP tĩnh để đối tác đưa vào allowlist", "Static IPs for a partner's allowlist"),
        fit: {
          alb: f("no", "IP của ALB thay đổi theo thời gian.", "An ALB's IPs change over time."),
          nlb: f("yes", "NLB có một IP tĩnh mỗi AZ và gắn được Elastic IP.", "An NLB has one static IP per AZ and takes Elastic IPs."),
          apigw: f("no", "API Gateway không có IP tĩnh.", "API Gateway has no static IPs."),
        },
      },
      {
        id: "udp",
        text: t("Dịch vụ thời gian thực dùng UDP", "A real-time service over UDP"),
        fit: {
          alb: f("no", "ALB chỉ xử lý HTTP và HTTPS.", "An ALB handles only HTTP and HTTPS."),
          nlb: f("yes", "NLB hỗ trợ UDP với độ trễ rất thấp.", "An NLB supports UDP with very low latency."),
          apigw: f("no", "API Gateway không hỗ trợ UDP.", "API Gateway does not support UDP."),
        },
      },
      {
        id: "quota",
        text: t("Giới hạn số request theo API key của từng đối tác", "Limit requests per partner API key"),
        fit: {
          alb: f("no", "ALB không có API key hay usage plan.", "An ALB has no API keys or usage plans."),
          nlb: f("no", "NLB không có API key hay usage plan.", "An NLB has no API keys or usage plans."),
          apigw: f("yes", "Usage plan gắn với API key đặt throttling và quota cho từng đối tác.", "Usage plans tied to API keys set throttling and quotas per partner."),
        },
      },
      {
        id: "waf",
        text: t("Chặn SQL injection bằng AWS WAF", "Block SQL injection with AWS WAF"),
        fit: {
          alb: f("yes", "Web ACL của AWS WAF gắn trực tiếp vào ALB.", "An AWS WAF web ACL attaches directly to an ALB."),
          nlb: f("no", "AWS WAF không gắn vào NLB.", "AWS WAF does not attach to an NLB."),
          apigw: f("yes", "Web ACL gắn vào REST API của API Gateway.", "A web ACL attaches to an API Gateway REST API."),
        },
      },
    ],
    combine: t(
      "Không dịch vụ nào đáp ứng tất cả. Có thể đặt NLB với IP tĩnh phía trước và dùng ALB làm target của NLB, để vừa có IP tĩnh vừa định tuyến theo path và gắn AWS WAF.",
      "No single service meets them all. An NLB with static IPs can sit in front with an ALB as its target, giving static IPs together with path routing and AWS WAF.",
    ),
    learn: { lesson: "elb", part: "alb-or-nlb" },
  },
];

export const compareById = (id: string) => COMPARE.find((c) => c.id === id);

const SCORE: Record<Fit, number> = { yes: 2, partial: 1, no: 0 };

/**
 * The service that fits the picked needs: one with "yes" on all of them, else the best without a "no"
 * (a partial fit), else none (the needs call for a combination).
 */
export function recommend(set: CompareSet, picked: string[]): { id: string; full: boolean } | null {
  if (!picked.length) return null;
  const needs = set.needs.filter((n) => picked.includes(n.id));
  const ranked = set.services
    .map((s) => ({ id: s.id, fits: needs.map((n) => n.fit[s.id].fit) }))
    .filter((s) => !s.fits.includes("no"))
    .map((s) => ({ id: s.id, full: s.fits.every((x) => x === "yes"), score: s.fits.reduce((a, x) => a + SCORE[x], 0) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] ? { id: ranked[0].id, full: ranked[0].full } : null;
}
