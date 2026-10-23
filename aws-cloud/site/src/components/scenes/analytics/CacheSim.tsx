import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Five jobs ElastiCache does for MFTECH: cache repeated Aurora reads (cache-aside),
// keep sessions when a web server dies, serve a live seller leaderboard, find the
// nearest shipper with geospatial commands, and survive a cache node failure.

const VB = "0 40 820 222";
type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): PScenario[] => [
  {
    name: L({ vi: "Người dùng truy vấn trạng thái đơn hàng liên tục", en: "Users check order status constantly" }),
    request: L({ vi: "GET /orders/88/status  (hàng nghìn lần mỗi phút)", en: "GET /orders/88/status  (thousands of times a minute)" }),
    toggle: { label: L({ vi: "Cache kết quả trong ElastiCache (cache-aside)", en: "Cache results in ElastiCache (cache-aside)" }), initial: false },
    layout: (cache) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng đọc trạng thái đơn hàng từ ElastiCache trước, chỉ truy vấn Aurora khi cache chưa có dữ liệu", en: "The application reads order status from ElastiCache first and queries Aurora only when the cache has no data" }),
      nodes: [
        { id: "app", x: 100, y: 150, w: 140, l1: L({ vi: "App MFTECH", en: "MFTECH app" }), l2: "EC2" },
        ...(cache ? [{ id: "cache", x: 420, y: 92, w: 170, l1: "ElastiCache", l2: L({ vi: "TTL 60 giây", en: "TTL 60 seconds" }) }] : []),
        { id: "db", x: 420, y: 210, w: 170, l1: "Aurora MySQL", l2: cache ? "CPU 35%" : L({ vi: "CPU 92%, đã có replica", en: "CPU 92%, has a replica" }) },
      ],
      links: [["app", "db"], ...(cache ? [["app", "cache"] as [string, string]] : [])],
    }),
    run: (cache) => cache
      ? { steps: [
            { at: "cache", state: "skip", tag: "MISS", roundTrip: true, msg: L({ vi: "Lần đầu tiên: cache chưa có dữ liệu đơn 88.", en: "First time: the cache has no data for order 88." }) },
            { at: "db", state: "pass", msg: L({ vi: "Ứng dụng đọc từ Aurora một lần.", en: "The application reads from Aurora once." }) },
            { at: "cache", from: "app", state: "change", tag: "SET", roundTrip: true, msg: L({ vi: "Ứng dụng ghi kết quả vào cache, hết hạn sau 60 giây.", en: "The application writes the result to the cache, expiring after 60 seconds." }) },
            { at: "cache", state: "pass", tag: "HIT", flash: "< 1 ms", msg: L({ vi: "Các lần tiếp theo: dữ liệu được lấy trực tiếp từ cache, không phát sinh tải cho Aurora.", en: "Subsequent requests: the data comes straight from the cache, putting no load on Aurora." }) },
          ], ok: true, result: L({ vi: "Phần lớn lượt đọc lặp lại được phục vụ tại cache. Tải trên Aurora giảm đáng kể mà không cần thêm replica. TTL đảm bảo dữ liệu không cũ quá 60 giây.", en: "Most repeated reads are served from the cache. Load on Aurora drops significantly with no extra replica. The TTL ensures data is never more than 60 seconds old." }) }
      : { steps: [
            { at: "db", state: "wait", flash: "180 ms", msg: L({ vi: "Cùng một truy vấn được thực thi lặp lại hàng nghìn lần. Thêm read replica chỉ giải quyết được trong ngắn hạn.", en: "The same query runs thousands of times over. Adding read replicas only helps in the short term." }) },
          ], ok: false, result: L({ vi: "Độ trễ cao và tốn chi phí. Với tải đọc lớn, lặp lại nhiều: đặt cache phía trước database.", en: "High latency and high cost. For heavy, highly repetitive read traffic: put a cache in front of the database." }) },
  },
  {
    name: L({ vi: "Web server lỗi, người dùng bị đăng xuất", en: "A web server fails and users are logged out" }),
    request: "GET /cart  Cookie: session=7f3a…",
    toggle: { label: L({ vi: "Lưu session trong ElastiCache", en: "Store sessions in ElastiCache" }), initial: false },
    action: L({ vi: "Truy xuất giỏ hàng", en: "Get cart" }),
    layout: (cache) => ({
      viewBox: VB,
      aria: L({ vi: "ALB chuyển người dùng sang EC2 khác; EC2 đó đọc session từ ElastiCache", en: "The ALB sends the user to another EC2 instance; that instance reads the session from ElastiCache" }),
      nodes: [
        { id: "user", x: 60, y: 150, l1: L({ vi: "Người dùng", en: "User" }), user: true },
        { id: "alb", x: 210, y: 150, w: 110, l1: "ALB" },
        { id: "w1", x: 420, y: 92, w: 150, l1: "EC2 #1", l2: L({ vi: "vừa bị thay thế", en: "just replaced" }) },
        { id: "w2", x: 420, y: 210, w: 150, l1: "EC2 #2" },
        ...(cache ? [{ id: "cache", x: 680, y: 210, w: 170, l1: "ElastiCache", l2: "session store" }] : []),
      ],
      links: [["user", "alb"], ["alb", "w1"], ["alb", "w2"], ...(cache ? [["w2", "cache"] as [string, string]] : [])],
    }),
    run: (cache) => cache
      ? { steps: [
            { at: "w1", jump: true, state: "block", tag: "UNHEALTHY", msg: L({ vi: "EC2 #1 gặp lỗi và được Auto Scaling thay thế.", en: "EC2 #1 fails and Auto Scaling replaces it." }) },
            { at: "alb", state: "pass", msg: L({ vi: "Chuyển người dùng sang EC2 #2.", en: "Sends the user to EC2 #2." }) },
            { at: "w2", state: "pass", msg: L({ vi: "Không lưu trạng thái trong RAM cục bộ.", en: "Keeps no state in local RAM." }) },
            { at: "cache", state: "pass", tag: "HIT", msg: L({ vi: "Đọc session theo session ID. Mọi web server dùng chung một session store.", en: "Reads the session by session ID. Every web server shares one session store." }) },
          ], ok: true, result: L({ vi: "Người dùng không bị ảnh hưởng khi một web server gặp lỗi. Web server là stateless nên có thể thêm bớt linh hoạt.", en: "Users are unaffected when a web server fails. The web servers are stateless, so they can be added or removed freely." }) }
      : { steps: [
            { at: "w1", jump: true, state: "block", tag: "UNHEALTHY", msg: L({ vi: "EC2 #1 gặp lỗi. Session của người dùng được lưu trong RAM của instance này.", en: "EC2 #1 fails. The user’s session was stored in this instance’s RAM." }) },
            { at: "alb", state: "pass", msg: L({ vi: "Chuyển người dùng sang EC2 #2.", en: "Sends the user to EC2 #2." }) },
            { at: "w2", state: "block", flash: L({ vi: "đăng nhập lại", en: "log in again" }), msg: L({ vi: "EC2 #2 không có thông tin về session 7f3a.", en: "EC2 #2 knows nothing about session 7f3a." }) },
          ], ok: false, result: L({ vi: "Người dùng phải đăng nhập lại và mất giỏ hàng. Sticky session cũng không khắc phục được khi chính web server đó gặp lỗi. Giải pháp: lưu session tại một in-memory session store dùng chung: ElastiCache.", en: "The user must log in again and loses their cart. Sticky sessions do not help either when that very server fails. Solution: store sessions in a shared in-memory store: ElastiCache." }) },
  },
  {
    name: L({ vi: "Bảng xếp hạng người bán thời gian thực", en: "Real-time seller leaderboard" }),
    request: L({ vi: "GET /top-sellers  (cập nhật mỗi khi có đơn)", en: "GET /top-sellers  (updated on every order)" }),
    toggle: { label: L({ vi: "Sử dụng Redis sorted set", en: "Use a Redis sorted set" }), initial: false },
    action: L({ vi: "Xem bảng xếp hạng", en: "View leaderboard" }),
    layout: (redis) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng lấy top người bán từ Aurora hoặc từ Redis sorted set", en: "The application gets the top sellers from Aurora or from a Redis sorted set" }),
      nodes: [
        { id: "user", x: 70, y: 150, l1: L({ vi: "Người dùng", en: "User" }), user: true },
        { id: "app", x: 260, y: 150, w: 130, l1: L({ vi: "App MFTECH", en: "MFTECH app" }) },
        { id: "store", x: 560, y: 150, w: 230, l1: redis ? "ElastiCache (Redis OSS)" : "Aurora", l2: redis ? "sorted set top-sellers" : L({ vi: "SUM + ORDER BY mỗi lần", en: "SUM + ORDER BY every time" }) },
      ],
      links: [["user", "app"], ["app", "store"]],
    }),
    run: (redis) => redis
      ? { steps: [
            { at: "app", state: "pass", msg: L({ vi: "Với mỗi đơn hàng mới, ứng dụng gọi `ZINCRBY` để cộng doanh số cho người bán.", en: "For each new order, the application calls `ZINCRBY` to add to the seller’s sales." }) },
            { at: "store", state: "pass", flash: "< 1 ms", msg: L({ vi: "`ZREVRANGE 0 9` trả về 10 người bán đứng đầu, đã được sắp xếp sẵn trong bộ nhớ.", en: "`ZREVRANGE 0 9` returns the top 10 sellers, already sorted in memory." }) },
          ], ok: true, result: L({ vi: "Bảng xếp hạng thời gian thực phục vụ hàng triệu người dùng. Sorted set là cấu trúc dữ liệu có sẵn của Redis.", en: "A real-time leaderboard serves millions of users. The sorted set is a built-in Redis data structure." }) }
      : { steps: [
            { at: "app", state: "pass", msg: L({ vi: "Chuyển request tới database.", en: "Sends the request to the database." }) },
            { at: "store", state: "wait", flash: L({ vi: "2,4 s", en: "2.4 s" }), msg: L({ vi: "Tính tổng doanh số của hàng triệu đơn hàng rồi sắp xếp, mỗi khi có người dùng mở trang.", en: "Sums the sales of millions of orders and sorts them every time a user opens the page." }) },
          ], ok: false, result: L({ vi: "Độ trễ cao và gây tải lớn cho database. Kết quả tốn nhiều tài nguyên để tính và được đọc nhiều: lưu trong ElastiCache.", en: "High latency and heavy load on the database. A result that is expensive to compute and read often: store it in ElastiCache." }) },
  },
  {
    name: L({ vi: "Tìm shipper gần người dùng nhất", en: "Find the shipper nearest the user" }),
    request: L({ vi: "Shipper trong bán kính 2 km quanh 10.776, 106.700", en: "Shippers within 2 km of 10.776, 106.700" }),
    toggle: { label: L({ vi: "Engine Redis OSS (thay vì Memcached)", en: "Redis OSS engine (instead of Memcached)" }), initial: false },
    action: L({ vi: "Tìm shipper", en: "Find shipper" }),
    layout: (redis) => ({
      viewBox: VB,
      aria: L({ vi: "Shipper gửi vị trí vào cache; ứng dụng tìm shipper gần nhất", en: "Shippers send their locations to the cache; the application finds the nearest shipper" }),
      nodes: [
        { id: "user", x: 70, y: 150, l1: L({ vi: "Người đặt hàng", en: "Customer" }), user: true },
        { id: "app", x: 270, y: 150, w: 140, l1: L({ vi: "App MFTECH", en: "MFTECH app" }) },
        { id: "cache", x: 540, y: 150, w: 210, l1: redis ? "ElastiCache (Redis OSS)" : "ElastiCache (Memcached)", l2: redis ? L({ vi: "GEOADD mỗi 5 giây", en: "GEOADD every 5 seconds" }) : L({ vi: "chỉ có key → value", en: "key → value only" }) },
        { id: "ship", x: 540, y: 236, w: 170, l1: L({ vi: "App shipper", en: "Shipper app" }), l2: L({ vi: "gửi vị trí liên tục", en: "sends location nonstop" }) },
      ],
      links: [["user", "app"], ["app", "cache"], ["ship", "cache"]],
    }),
    run: (redis) => redis
      ? { steps: [
            { at: "app", state: "pass", msg: L({ vi: "Truy vấn cache thay vì database.", en: "Queries the cache instead of the database." }) },
            { at: "cache", state: "pass", flash: L({ vi: "3 shipper", en: "3 shippers" }), msg: L({ vi: "`GEOSEARCH` theo bán kính trả về shipper gần nhất. Vị trí cũ tự động hết hạn nhờ TTL.", en: "A radius `GEOSEARCH` returns the nearest shippers. Old locations expire automatically thanks to TTL." }) },
          ], ok: true, result: L({ vi: "Hàng nghìn lượt ghi và đọc vị trí mỗi giây mà không gây tải cho PostgreSQL phía sau.", en: "Thousands of location writes and reads per second with no load on the PostgreSQL database behind it." }) }
      : { steps: [
            { at: "app", state: "pass", msg: L({ vi: "Truy vấn cache.", en: "Queries the cache." }) },
            { at: "cache", state: "block", msg: L({ vi: "Memcached chỉ lưu key → value, không có lệnh truy vấn theo vị trí.", en: "Memcached stores only key → value and has no location-based query commands." }) },
          ], ok: false, result: L({ vi: "Ứng dụng phải tải toàn bộ vị trí về rồi tự tính khoảng cách. Yêu cầu geospatial: lựa chọn Redis OSS (hoặc Valkey).", en: "The application would have to download every location and compute distances itself. For geospatial requirements, choose Redis OSS (or Valkey)." }) },
  },
  {
    name: L({ vi: "Sự cố một node cache", en: "A cache node fails" }),
    request: L({ vi: "GET /products/hot  (cache node chính vừa gặp lỗi)", en: "GET /products/hot  (the primary cache node just failed)" }),
    toggle: { label: L({ vi: "Multi-AZ với automatic failover", en: "Multi-AZ with automatic failover" }), initial: false },
    action: L({ vi: "Gửi request", en: "Send request" }),
    layout: (maz) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng đọc cache; node chính gặp lỗi, replica tại AZ khác thay thế hoặc mọi request chuyển tới database", en: "The application reads the cache; the primary node fails, and either a replica in another AZ takes over or every request goes to the database" }),
      boxes: [{ x: 300, y: 50, w: 250, h: 200, label: "ElastiCache (Redis OSS)" }],
      nodes: [
        { id: "app", x: 110, y: 150, w: 140, l1: L({ vi: "App MFTECH", en: "MFTECH app" }) },
        { id: "pri", x: 425, y: 104, w: 170, l1: "Primary", l2: L({ vi: "AZ a · lỗi", en: "AZ a · failed" }) },
        { id: "rep", x: 425, y: 206, w: 170, l1: maz ? "Replica" : L({ vi: "(không có replica)", en: "(no replica)" }), l2: maz ? "AZ b" : undefined },
        { id: "db", x: 700, y: 150, w: 150, l1: "RDS", l2: L({ vi: "database chính", en: "primary database" }) },
      ],
      links: [["app", "pri"], ["app", "rep"], ["app", "db"]],
    }),
    run: (maz) => maz
      ? { steps: [
            { at: "pri", state: "block", msg: L({ vi: "Primary không phản hồi.", en: "The primary does not respond." }) },
            { at: "rep", jump: true, state: "change", tag: "PROMOTE", msg: L({ vi: "ElastiCache tự động phát hiện lỗi và promote replica tại AZ b thành primary.", en: "ElastiCache detects the failure automatically and promotes the replica in AZ b to primary." }) },
            { at: "rep", state: "pass", tag: "HIT", msg: L({ vi: "Dữ liệu đã được sao chép sẵn sang replica nên cache vẫn giữ nguyên dữ liệu.", en: "The data was already replicated to the replica, so the cache keeps its data." }) },
          ], ok: true, result: L({ vi: "Thời gian gián đoạn rất ngắn, gần như không mất dữ liệu cache, database không bị dồn tải.", en: "Very short interruption, almost no cache data lost, and no surge of load on the database." }) }
      : { steps: [
            { at: "pri", state: "block", msg: L({ vi: "Node duy nhất gặp lỗi. Node mới được tạo với cache rỗng.", en: "The only node fails. A new node is created with an empty cache." }) },
            { at: "db", from: "app", state: "wait", flash: L({ vi: "quá tải", en: "overloaded" }), msg: L({ vi: "Mọi request được chuyển trực tiếp tới database cùng lúc.", en: "Every request goes straight to the database at once." }) },
          ], ok: false, result: L({ vi: "Backup hằng ngày không giúp phục hồi nhanh và vẫn mất dữ liệu kể từ lần backup cuối. Giảm thời gian gián đoạn và mất dữ liệu: Multi-AZ với automatic failover.", en: "Daily backups do not give a fast recovery and still lose the data since the last backup. To reduce downtime and data loss: Multi-AZ with automatic failover." }) },
  },
  {
    name: L({ vi: "Flash sale: đơn mua ghi vào cache trước database", en: "Flash sale: purchases written to the cache before the database" }),
    request: L({ vi: "POST /orders  (hàng nghìn đơn mỗi phút, Aurora bắt đầu timeout)", en: "POST /orders  (thousands of orders a minute, Aurora starts timing out)" }),
    toggle: { label: L({ vi: "Đưa đơn vào SQS queue, worker trong Auto Scaling group ghi Aurora", en: "Send orders to an SQS queue; workers in an Auto Scaling group write to Aurora" }), initial: false },
    action: L({ vi: "Đặt mua", en: "Place order" }),
    layout: (sqs) => ({
      viewBox: VB,
      aria: L({ vi: "Ứng dụng ghi đơn hàng vào ElastiCache hoặc vào SQS queue; Aurora là nơi lưu đơn hàng cuối cùng", en: "The application writes orders to ElastiCache or to an SQS queue; Aurora is where orders are finally stored" }),
      nodes: [
        { id: "app", x: 90, y: 150, w: 140, l1: L({ vi: "App MFTECH", en: "MFTECH app" }), l2: "EC2" },
        { id: "buf", x: 320, y: 150, w: 180, l1: sqs ? "Amazon SQS" : "ElastiCache", l2: sqs ? L({ vi: "lưu trên nhiều server", en: "stored on multiple servers" }) : L({ vi: "dữ liệu trong bộ nhớ", en: "data in memory" }) },
        { id: "wk", x: 540, y: 150, w: 160, l1: sqs ? L({ vi: "Worker (ASG)", en: "Workers (ASG)" }) : L({ vi: "Job đẩy sang DB", en: "Flush job" }), l2: sqs ? L({ vi: "co giãn theo queue", en: "scale with the queue" }) : L({ vi: "chạy định kỳ", en: "runs periodically" }) },
        { id: "db", x: 730, y: 150, w: 150, l1: "Aurora", l2: L({ vi: "nơi lưu đơn hàng", en: "system of record" }) },
      ],
      links: [["app", "buf"], ["buf", "wk"], ["wk", "db"]],
    }),
    run: (sqs) => sqs
      ? { steps: [
            { at: "buf", state: "pass", tag: "SEND", msg: L({ vi: "Đơn hàng được gửi vào SQS. SQS lưu message trên nhiều server nên không mất khi một server gặp lỗi.", en: "The order is sent to SQS. SQS stores messages on multiple servers, so they survive a server failure." }) },
            { at: "wk", state: "pass", msg: L({ vi: "Worker nhận message và xử lý theo tốc độ Aurora chịu được; Auto Scaling thêm worker khi queue dài ra.", en: "Workers receive the messages and process them at a rate Aurora can handle; Auto Scaling adds workers as the queue grows." }) },
            { at: "db", state: "pass", msg: L({ vi: "Đơn được ghi vào Aurora. Cache chỉ dùng cho tải đọc (cache-aside hoặc write-through sau khi database đã ghi).", en: "The order is written to Aurora. The cache is used only for reads (cache-aside, or write-through after the database write)." }) },
          ], ok: true, back: false, result: L({ vi: "Đỉnh tải được queue hấp thụ, không mất đơn. Thêm RDS Proxy để thực hiện connection pooling tới Aurora (bài RDS).", en: "The queue absorbs the peak and no order is lost. Add RDS Proxy for connection pooling to Aurora (RDS lesson)." }) }
      : { steps: [
            { at: "buf", state: "change", tag: "SET", msg: L({ vi: "Đơn hàng chỉ nằm trong bộ nhớ của cache node, chưa có trong database.", en: "The order exists only in the cache node's memory, not yet in the database." }) },
            { at: "buf", state: "block", tag: L({ vi: "LỖI", en: "FAIL" }), msg: L({ vi: "Cache node gặp lỗi trước khi job kịp ghi sang Aurora. Replication sang replica là bất đồng bộ.", en: "The cache node fails before the job writes to Aurora. Replication to replicas is asynchronous." }) },
            { at: "db", state: "block", flash: L({ vi: "mất đơn", en: "orders lost" }), msg: L({ vi: "Các đơn chưa được ghi xuống database bị mất.", en: "The orders not yet written to the database are lost." }) },
          ], ok: false, back: false, result: L({ vi: "ElastiCache tăng tốc đọc, không phải nơi lưu giao dịch bền vững, và cũng không giảm tải ghi hay số kết nối tới Aurora. Đơn hàng phải vào nơi lưu trữ bền vững: queue hoặc database.", en: "ElastiCache speeds up reads; it is not a durable store for transactions, and it does not reduce write load or connections to Aurora. Orders must go to durable storage: a queue or the database." }) },
  },
];

export default function CacheSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} action={L({ vi: "Gửi request", en: "Send request" })} hint={L({ vi: "Chọn một tình huống của MFTECH, gửi request, sau đó bật tuỳ chọn cấu hình để quan sát tác dụng của ElastiCache.", en: "Choose a MFTECH scenario, send the request, then turn on the configuration option to see what ElastiCache does." })} />;
}
