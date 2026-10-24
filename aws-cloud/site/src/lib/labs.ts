// Architecture labs: the learner places AWS services into the slots of a MFTECH diagram, then checks
// the design against the requirements. Plain data plus rule functions, so the island imports it
// directly (functions cannot travel as island props) and the rules can be tested without a browser.

import { userData } from "../app/userData";

export type Text = { vi: string; en: string };

export type ServiceId =
  | "alb" | "ec2" | "rds" | "rdsStandby" | "nat" | "igw" | "s3" | "cloudfront" | "s3Gateway"
  | "s3Interface" | "sqs" | "sns" | "lambda" | "elasticache" | "readReplica" | "dynamodb";

export const SERVICES: Record<ServiceId, { name: string; hint: Text }> = {
  alb: { name: "Application Load Balancer", hint: { vi: "Phân phối request HTTP/HTTPS tới các target", en: "Spreads HTTP/HTTPS requests across targets" } },
  ec2: { name: "EC2 (Auto Scaling)", hint: { vi: "Máy chủ chạy ứng dụng", en: "Servers that run the application" } },
  rds: { name: "RDS primary", hint: { vi: "Database quan hệ, nhận ghi và đọc", en: "Relational database that takes reads and writes" } },
  rdsStandby: { name: "RDS standby", hint: { vi: "Bản sao đồng bộ của Multi-AZ, tự chuyển đổi khi lỗi", en: "Multi-AZ synchronous copy with automatic failover" } },
  nat: { name: "NAT gateway", hint: { vi: "Cho private subnet kết nối ra Internet", en: "Lets private subnets reach the internet" } },
  igw: { name: "Internet gateway", hint: { vi: "Cổng giữa VPC và Internet", en: "The gateway between a VPC and the internet" } },
  s3: { name: "Amazon S3", hint: { vi: "Lưu trữ object", en: "Object storage" } },
  cloudfront: { name: "CloudFront", hint: { vi: "CDN, cache nội dung tại edge location", en: "CDN that caches content at edge locations" } },
  s3Gateway: { name: "Gateway endpoint (S3)", hint: { vi: "Đường riêng tới S3 qua route table, không tính phí", en: "Private route to S3 through the route table, no charge" } },
  s3Interface: { name: "Interface endpoint (S3)", hint: { vi: "ENI trong subnet, tính phí theo giờ và theo GB", en: "An ENI in the subnet, charged per hour and per GB" } },
  sqs: { name: "Amazon SQS", hint: { vi: "Hàng đợi message", en: "Message queue" } },
  sns: { name: "Amazon SNS", hint: { vi: "Publish/subscribe, đẩy message tới subscriber", en: "Publish/subscribe, pushes messages to subscribers" } },
  lambda: { name: "AWS Lambda", hint: { vi: "Chạy code theo sự kiện", en: "Runs code in response to events" } },
  elasticache: { name: "ElastiCache (Redis OSS)", hint: { vi: "Cache trong bộ nhớ, độ trễ dưới mili-giây", en: "In-memory cache with sub-millisecond latency" } },
  readReplica: { name: "RDS read replica", hint: { vi: "Bản sao bất đồng bộ để phục vụ đọc", en: "Asynchronous copy that serves reads" } },
  dynamodb: { name: "DynamoDB", hint: { vi: "Database NoSQL key-value", en: "Key-value NoSQL database" } },
};

/** Where a slot sits: outside the Region (edge), in a subnet tier of an AZ, or Regional (outside the AZs). */
export type Tier = "edge" | "public" | "app" | "data" | "regional";
export type Zone = "a" | "b";

export interface Slot {
  id: string;
  tier: Tier;
  zone?: Zone;
  label: Text;
  /** Placed before the learner starts, and cannot be changed. */
  fixed?: ServiceId;
}

export type Placement = Partial<Record<string, ServiceId>>;

export interface Rule {
  text: Text;
  check: (p: Placement) => boolean;
  /** Why the design fails this rule: what goes wrong for MFTECH. */
  why: Text;
  hint: Text;
}

export interface Lab {
  id: string;
  title: Text;
  brief: Text;
  services: ServiceId[];
  slots: Slot[];
  rules: Rule[];
  /** The lesson part that explains the design. */
  learn: { lesson: string; part: string };
  done: Text;
}

const S = (id: string, tier: Tier, zone: Zone | undefined, vi: string, en: string, fixed?: ServiceId): Slot => ({ id, tier, zone, label: { vi, en }, fixed });

/** What sits in the slots of a tier (and zone). */
export function inTier(lab: Lab, p: Placement, tier: Tier, zone?: Zone): ServiceId[] {
  return lab.slots.filter((s) => s.tier === tier && (!zone || s.zone === zone)).map((s) => s.fixed ?? p[s.id]).filter((x): x is ServiceId => !!x);
}

/** The service in one slot, fixed or placed. */
export const at = (lab: Lab, p: Placement, slot: string): ServiceId | undefined => lab.slots.find((s) => s.id === slot)?.fixed ?? p[slot];

/** Every service placed anywhere. */
export const used = (lab: Lab, p: Placement): ServiceId[] => lab.slots.map((s) => s.fixed ?? p[s.id]).filter((x): x is ServiceId => !!x);

function define(lab: Omit<Lab, "rules"> & { rules: (l: Lab) => Rule[] }): Lab {
  const full = { ...lab, rules: [] as Rule[] } as Lab;
  full.rules = lab.rules(full);
  return full;
}

export const LABS: Lab[] = [
  define({
    id: "public-private",
    title: { vi: "Tầng web công khai, database riêng tư", en: "A public web tier, a private database" },
    brief: {
      vi: "Khách hàng truy cập MFTECH qua Internet. Các EC2 instance cần tải bản vá hệ điều hành từ Internet nhưng không được nhận kết nối trực tiếp từ Internet; database chỉ nhận kết nối từ tầng ứng dụng.",
      en: "Customers reach MFTECH over the internet. The EC2 instances must download OS patches from the internet but must not accept connections from it; the database accepts connections only from the application tier.",
    },
    services: ["alb", "ec2", "rds", "nat", "s3"],
    slots: [
      S("pubA", "public", "a", "Public subnet", "Public subnet"),
      S("pubA2", "public", "a", "Public subnet", "Public subnet"),
      S("pubB", "public", "b", "Public subnet", "Public subnet"),
      S("appA", "app", "a", "Private subnet · ứng dụng", "Private subnet · application"),
      S("appB", "app", "b", "Private subnet · ứng dụng", "Private subnet · application"),
      S("dataA", "data", "a", "Private subnet · dữ liệu", "Private subnet · data"),
    ],
    rules: (l) => [
      {
        text: { vi: "Load balancer nằm trong public subnet của cả hai AZ", en: "The load balancer sits in a public subnet in both AZs" },
        check: (p) => inTier(l, p, "public", "a").includes("alb") && inTier(l, p, "public", "b").includes("alb"),
        why: { vi: "Một ALB hướng Internet cần subnet public ở ít nhất hai AZ; thiếu nó, request từ Internet không tới được ứng dụng.", en: "An internet-facing ALB needs public subnets in at least two AZs; without it, requests from the internet never reach the application." },
        hint: { vi: "ALB được tạo trên nhiều subnet, mỗi AZ một subnet.", en: "An ALB is created across several subnets, one per AZ." },
      },
      {
        text: { vi: "EC2 instance chỉ nằm trong private subnet", en: "EC2 instances sit only in private subnets" },
        check: (p) => inTier(l, p, "app").includes("ec2") && !inTier(l, p, "public").includes("ec2"),
        why: { vi: "Instance trong public subnet có thể nhận kết nối trực tiếp từ Internet, trái với yêu cầu.", en: "An instance in a public subnet can take connections straight from the internet, against the requirement." },
        hint: { vi: "Đặt EC2 vào tầng ứng dụng; ALB là thành phần duy nhất nhận request từ Internet.", en: "Put EC2 in the application tier; the ALB is the only part that takes requests from the internet." },
      },
      {
        text: { vi: "Database nằm trong private subnet tầng dữ liệu", en: "The database sits in a private data subnet" },
        check: (p) => inTier(l, p, "data").includes("rds") && !inTier(l, p, "public").includes("rds") && !inTier(l, p, "app").includes("rds"),
        why: { vi: "Database phải tách khỏi tầng nhận request; đặt sai tầng làm Security Group và route table khó giới hạn đúng nguồn kết nối.", en: "The database must be apart from the tiers that take requests; in the wrong tier, Security Groups and route tables can hardly limit who connects." },
        hint: { vi: "RDS thuộc tầng dữ liệu, không có route ra Internet.", en: "RDS belongs in the data tier, with no route to the internet." },
      },
      {
        text: { vi: "EC2 tải được bản vá mà không có địa chỉ IP public", en: "EC2 can download patches without a public IP address" },
        check: (p) => inTier(l, p, "public").includes("nat") && !inTier(l, p, "app").includes("nat"),
        why: { vi: "Không có NAT gateway trong public subnet thì instance ở private subnet không có đường ra Internet để tải bản vá.", en: "Without a NAT gateway in a public subnet, instances in private subnets have no way out to download patches." },
        hint: { vi: "NAT gateway đặt ở public subnet; route table của private subnet trỏ 0.0.0.0/0 tới nó.", en: "A NAT gateway goes in a public subnet; the private route table points 0.0.0.0/0 at it." },
      },
    ],
    learn: { lesson: "vpc", part: "nat-gateway" },
    done: { vi: "Request đi Internet → ALB → EC2 → RDS; lưu lượng ra ngoài của EC2 đi qua NAT gateway. Không thành phần nào ở private subnet có thể bị truy cập trực tiếp từ Internet.", en: "Requests go internet → ALB → EC2 → RDS; EC2's outbound traffic goes through the NAT gateway. Nothing in a private subnet can be reached from the internet directly." },
  }),
  define({
    id: "multi-az",
    title: { vi: "Đặt hàng vẫn hoạt động khi một AZ ngừng hoạt động", en: "Ordering keeps working when an AZ goes down" },
    brief: {
      vi: "ALB và RDS primary đã có sẵn. Hãy đặt tầng web và tầng dữ liệu sao cho khi AZ ap-southeast-1a ngừng hoạt động, khách hàng vẫn xem hàng và đặt hàng được.",
      en: "The ALB and the RDS primary are already in place. Place the web and data tiers so that customers can still browse and order when AZ ap-southeast-1a goes down.",
    },
    services: ["ec2", "rdsStandby", "readReplica", "elasticache", "nat"],
    slots: [
      S("pubA", "public", "a", "Public subnet", "Public subnet", "alb"),
      S("pubB", "public", "b", "Public subnet", "Public subnet", "alb"),
      S("appA", "app", "a", "Private subnet · web", "Private subnet · web"),
      S("appB", "app", "b", "Private subnet · web", "Private subnet · web"),
      S("dataA", "data", "a", "Private subnet · dữ liệu", "Private subnet · data", "rds"),
      S("dataB", "data", "b", "Private subnet · dữ liệu", "Private subnet · data"),
    ],
    rules: (l) => [
      {
        text: { vi: "Tầng web chạy trên ít nhất hai AZ", en: "The web tier runs in at least two AZs" },
        check: (p) => at(l, p, "appA") === "ec2" && at(l, p, "appB") === "ec2",
        why: { vi: "Nếu mọi instance nằm trong một AZ, sự cố AZ đó làm cả tầng web ngừng phục vụ.", en: "With every instance in one AZ, an outage there takes the whole web tier down." },
        hint: { vi: "Auto Scaling group trải trên subnet của cả hai AZ.", en: "The Auto Scaling group spans subnets in both AZs." },
      },
      {
        text: { vi: "Database có bản sao ở AZ khác và tự chuyển đổi khi lỗi", en: "The database has a copy in another AZ and fails over on its own" },
        check: (p) => at(l, p, "dataB") === "rdsStandby",
        why: { vi: "Database chỉ nằm ở AZ 1a. Khi AZ này ngừng hoạt động, tầng web ở AZ 1b vẫn chạy nhưng không ghi được đơn hàng. Read replica sao chép bất đồng bộ và không tự nhận ghi.", en: "The database lives only in AZ 1a. When that AZ goes down, the web tier in AZ 1b still runs but cannot write orders. A read replica copies asynchronously and does not take writes on its own." },
        hint: { vi: "RDS Multi-AZ giữ một standby đồng bộ ở AZ khác.", en: "RDS Multi-AZ keeps a synchronous standby in another AZ." },
      },
      {
        text: { vi: "Không thêm thành phần không cần cho yêu cầu này", en: "Nothing added that this requirement does not need" },
        check: (p) => !used(l, p).some((s) => s === "elasticache" || s === "nat" || s === "readReplica"),
        why: { vi: "Cache, NAT gateway hay read replica không làm hệ thống chịu được sự cố AZ, chỉ thêm chi phí.", en: "A cache, a NAT gateway or a read replica does not make the system survive an AZ outage; it only adds cost." },
        hint: { vi: "Chỉ cần tầng web ở hai AZ và một standby.", en: "All it takes is a web tier in two AZs and a standby." },
      },
    ],
    learn: { lesson: "rds", part: "multi-az-read-replicas" },
    done: { vi: "Khi AZ 1a ngừng hoạt động, ALB chỉ gửi request tới instance ở AZ 1b và RDS chuyển sang standby, thường trong một đến hai phút; ứng dụng kết nối lại cùng endpoint.", en: "When AZ 1a goes down, the ALB sends requests only to instances in AZ 1b and RDS fails over to the standby, usually within one to two minutes; the application reconnects to the same endpoint." },
  }),
  define({
    id: "static-content",
    title: { vi: "Ảnh sản phẩm tải nhanh ở mọi nơi", en: "Product images that load fast everywhere" },
    brief: {
      vi: "Ảnh sản phẩm chiếm 80% lưu lượng. Khách hàng ở Hà Nội, Sydney và Tokyo cần tải ảnh với độ trễ thấp, và EC2 không phải phục vụ các tệp tĩnh.",
      en: "Product images make up 80% of the traffic. Customers in Hanoi, Sydney and Tokyo need them with low latency, and EC2 should not serve static files.",
    },
    services: ["cloudfront", "s3", "ec2", "alb", "elasticache"],
    slots: [
      S("edge", "edge", undefined, "Edge location gần khách hàng", "Edge location near customers"),
      S("origin", "regional", undefined, "Nơi lưu ảnh gốc (origin)", "Where the original images live (origin)"),
      S("appA", "app", "a", "Private subnet · web", "Private subnet · web", "ec2"),
    ],
    rules: (l) => [
      {
        text: { vi: "Ảnh được cache tại edge location", en: "Images are cached at edge locations" },
        check: (p) => at(l, p, "edge") === "cloudfront",
        why: { vi: "Không có CDN, mọi request ảnh đi về Region Singapore; khách hàng ở xa chịu độ trễ cao.", en: "Without a CDN, every image request travels to the Singapore Region; distant customers get high latency." },
        hint: { vi: "Dịch vụ CDN của AWS phục vụ nội dung từ hơn 600 điểm hiện diện.", en: "AWS's CDN serves content from over 600 points of presence." },
      },
      {
        text: { vi: "Ảnh gốc nằm ngoài EC2, trong kho lưu trữ bền vững", en: "The originals live outside EC2, in durable storage" },
        check: (p) => at(l, p, "origin") === "s3",
        why: { vi: "Lưu ảnh trên EC2 buộc instance phục vụ tệp tĩnh và mất ảnh khi instance bị thay thế.", en: "Keeping images on EC2 makes instances serve static files and loses images when an instance is replaced." },
        hint: { vi: "Object storage với độ bền 99,999999999%.", en: "Object storage with 99.999999999% durability." },
      },
    ],
    learn: { lesson: "cloudfront", part: "s3-origin-access" },
    done: { vi: "CloudFront phục vụ ảnh từ cache gần khách hàng và chỉ lấy từ S3 khi cache chưa có. Origin access control giữ bucket ở chế độ private.", en: "CloudFront serves images from caches near customers and fetches from S3 only on a cache miss. Origin access control keeps the bucket private." },
  }),
  define({
    id: "s3-endpoint",
    title: { vi: "Đọc S3 từ private subnet mà không trả phí NAT", en: "Reach S3 from private subnets without NAT charges" },
    brief: {
      vi: "Dịch vụ xử lý ảnh trong private subnet đọc 2 TB từ S3 mỗi tháng. Lưu lượng hiện đi qua NAT gateway và phí xử lý dữ liệu tăng mỗi tháng. Lưu lượng tới S3 phải ở lại trong mạng AWS.",
      en: "An image service in private subnets reads 2 TB from S3 each month. The traffic goes through a NAT gateway today, and the data processing charge keeps growing. Traffic to S3 must stay on the AWS network.",
    },
    services: ["s3Gateway", "s3Interface", "nat", "igw"],
    slots: [
      S("appA", "app", "a", "Private subnet · xử lý ảnh", "Private subnet · image processing", "ec2"),
      S("path", "regional", undefined, "Đường từ VPC tới S3", "Path from the VPC to S3"),
      S("s3", "regional", undefined, "Bucket ảnh", "Image bucket", "s3"),
    ],
    rules: (l) => [
      {
        text: { vi: "Lưu lượng tới S3 không đi qua Internet", en: "Traffic to S3 does not cross the internet" },
        check: (p) => at(l, p, "path") === "s3Gateway" || at(l, p, "path") === "s3Interface",
        why: { vi: "NAT gateway hay Internet gateway đưa lưu lượng ra địa chỉ public của S3, không đáp ứng yêu cầu giữ trong mạng AWS.", en: "A NAT or internet gateway sends traffic to S3's public addresses, which misses the requirement to stay on the AWS network." },
        hint: { vi: "VPC endpoint cho S3 có hai loại.", en: "S3 has two kinds of VPC endpoint." },
      },
      {
        text: { vi: "Không tính phí theo giờ hay theo GB cho đường tới S3", en: "No hourly or per-GB charge for the path to S3" },
        check: (p) => at(l, p, "path") === "s3Gateway",
        why: { vi: "Interface endpoint tính phí theo giờ cho mỗi AZ và theo GB dữ liệu; gateway endpoint cho S3 không tính phí.", en: "An interface endpoint is charged per hour in each AZ and per GB; a gateway endpoint for S3 has no charge." },
        hint: { vi: "Loại endpoint được thêm vào route table.", en: "The kind of endpoint that is added to the route table." },
      },
    ],
    learn: { lesson: "vpc", part: "vpc-endpoints" },
    done: { vi: "Route table của private subnet có route tới prefix list của S3 qua gateway endpoint; NAT gateway chỉ còn phục vụ lưu lượng đi Internet thật sự.", en: "The private route table sends S3's prefix list through the gateway endpoint; the NAT gateway only carries traffic that really goes to the internet." },
  }),
  define({
    id: "decouple-orders",
    title: { vi: "Không mất đơn khi dịch vụ kho tạm ngừng", en: "No lost orders when the warehouse service is down" },
    brief: {
      vi: "Tầng web nhận đơn hàng và gửi sang dịch vụ kho để trừ tồn kho. Khi dịch vụ kho bảo trì, đơn hàng phải được giữ lại và xử lý sau; mỗi đơn chỉ được trừ kho một lần.",
      en: "The web tier takes orders and passes them to the warehouse service to update stock. While the warehouse service is under maintenance, orders must wait and be processed later; each order updates stock once.",
    },
    services: ["sqs", "sns", "lambda", "ec2", "dynamodb"],
    slots: [
      S("web", "app", "a", "Tầng web nhận đơn", "Web tier taking orders", "ec2"),
      S("between", "regional", undefined, "Giữa tầng web và dịch vụ kho", "Between the web tier and the warehouse service"),
      S("worker", "app", "b", "Dịch vụ kho xử lý đơn", "Warehouse service processing orders"),
    ],
    rules: (l) => [
      {
        text: { vi: "Đơn hàng được giữ lại khi dịch vụ kho ngừng", en: "Orders wait while the warehouse service is down" },
        check: (p) => at(l, p, "between") === "sqs",
        why: { vi: "SNS đẩy message ngay và không lưu lại; gọi trực tiếp thì đơn hàng thất bại khi dịch vụ kho ngừng.", en: "SNS pushes messages at once and does not keep them; a direct call fails while the warehouse service is down." },
        hint: { vi: "Dịch vụ giữ message tới 14 ngày cho tới khi consumer lấy.", en: "The service that keeps messages for up to 14 days until a consumer takes them." },
      },
      {
        text: { vi: "Có thành phần tính toán lấy đơn ra xử lý", en: "Compute takes orders off and processes them" },
        check: (p) => at(l, p, "worker") === "ec2" || at(l, p, "worker") === "lambda",
        why: { vi: "Hàng đợi chỉ giữ message; cần EC2 hoặc Lambda đọc hàng đợi và cập nhật tồn kho.", en: "A queue only holds messages; EC2 or Lambda must read the queue and update stock." },
        hint: { vi: "Lambda có thể đọc SQS qua event source mapping.", en: "Lambda can read SQS through an event source mapping." },
      },
    ],
    learn: { lesson: "messaging", part: "queues" },
    done: { vi: "Tầng web gửi đơn vào SQS và trả lời khách ngay. Dịch vụ kho đọc hàng đợi theo tốc độ của nó; visibility timeout giữ mỗi message cho một consumer, và message chỉ bị xoá sau khi xử lý xong.", en: "The web tier puts orders on SQS and answers the customer at once. The warehouse service reads the queue at its own pace; the visibility timeout keeps each message with one consumer, and a message is deleted only once processed." },
  }),
  define({
    id: "read-cache",
    title: { vi: "Trang sản phẩm phản hồi dưới mili-giây", en: "Product pages answered in under a millisecond" },
    brief: {
      vi: "Trang chi tiết sản phẩm được đọc hàng nghìn lần mỗi giây và dữ liệu ít thay đổi. CPU của RDS lên 90% vào giờ cao điểm. Cần giảm tải đọc cho RDS và trả kết quả với độ trễ dưới mili-giây.",
      en: "Product detail pages are read thousands of times a second and rarely change. RDS CPU reaches 90% at peak. Reads must come off RDS, with sub-millisecond latency.",
    },
    services: ["elasticache", "readReplica", "dynamodb", "cloudfront"],
    slots: [
      S("appA", "app", "a", "Private subnet · web", "Private subnet · web", "ec2"),
      S("cache", "data", "a", "Lớp đọc trước database", "Read layer in front of the database"),
      S("dataB", "data", "b", "Private subnet · dữ liệu", "Private subnet · data", "rds"),
    ],
    rules: (l) => [
      {
        text: { vi: "Kết quả đọc trả về với độ trễ dưới mili-giây", en: "Reads come back in under a millisecond" },
        check: (p) => at(l, p, "cache") === "elasticache",
        why: { vi: "Read replica giảm tải cho primary nhưng vẫn là database trên đĩa, độ trễ tính bằng mili-giây; DynamoDB cần chuyển toàn bộ dữ liệu.", en: "A read replica takes load off the primary but is still a disk-based database, with latency in milliseconds; DynamoDB means moving all the data." },
        hint: { vi: "Kho dữ liệu trong bộ nhớ, dùng theo mẫu cache-aside.", en: "An in-memory store, used with the cache-aside pattern." },
      },
    ],
    learn: { lesson: "analytics", part: "database-cache" },
    done: { vi: "Ứng dụng đọc ElastiCache trước; khi cache chưa có thì đọc RDS rồi ghi vào cache kèm TTL. Phần lớn lượt đọc không còn tới RDS.", en: "The application reads ElastiCache first; on a miss it reads RDS and writes the result to the cache with a TTL. Most reads no longer reach RDS." },
  }),
];

export const labById = (id: string) => LABS.find((l) => l.id === id);

/** Which rules a design meets. */
export function evaluate(lab: Lab, p: Placement): boolean[] {
  return lab.rules.map((r) => r.check(p));
}

// ---------- progress, kept per account (app/userData) ----------

const KEY = "labs";
export interface LabProgress {
  placement: Placement;
  done?: boolean;
}

export function readLabs(): Record<string, LabProgress> {
  const v = userData.get(KEY);
  return v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, LabProgress>) } : {};
}

export function writeLab(id: string, progress: LabProgress) {
  userData.set(KEY, { ...readLabs(), [id]: progress });
}
