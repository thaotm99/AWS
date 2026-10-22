import PacketSim, { type PScenario } from "../elb/PacketSim";

// Five jobs ElastiCache does for ShopViet: cache repeated Aurora reads (cache-aside),
// keep sessions when a web server dies, serve a live seller leaderboard, find the
// nearest shipper with geospatial commands, and survive a cache node failure.

const VB = "0 40 820 222";

const SCENARIOS: PScenario[] = [
  {
    name: "Người dùng truy vấn trạng thái đơn hàng liên tục",
    request: "GET /orders/88/status  (hàng nghìn lần mỗi phút)",
    toggle: { label: "Cache kết quả trong ElastiCache (cache-aside)", initial: false },
    layout: (cache) => ({
      viewBox: VB,
      aria: "Ứng dụng đọc trạng thái đơn hàng từ ElastiCache trước, chỉ truy vấn Aurora khi cache chưa có dữ liệu",
      nodes: [
        { id: "app", x: 100, y: 150, w: 140, l1: "App ShopViet", l2: "EC2" },
        ...(cache ? [{ id: "cache", x: 420, y: 92, w: 170, l1: "ElastiCache", l2: "TTL 60 giây" }] : []),
        { id: "db", x: 420, y: 210, w: 170, l1: "Aurora MySQL", l2: cache ? "CPU 35%" : "CPU 92%, đã có replica" },
      ],
      links: [["app", "db"], ...(cache ? [["app", "cache"] as [string, string]] : [])],
    }),
    run: (cache) => cache
      ? { steps: [
            { at: "cache", state: "skip", tag: "MISS", roundTrip: true, msg: "Lần đầu tiên: cache chưa có dữ liệu đơn 88." },
            { at: "db", state: "pass", msg: "Ứng dụng đọc từ Aurora một lần." },
            { at: "cache", from: "app", state: "change", tag: "SET", roundTrip: true, msg: "Ứng dụng ghi kết quả vào cache, hết hạn sau 60 giây." },
            { at: "cache", state: "pass", tag: "HIT", flash: "< 1 ms", msg: "Các lần tiếp theo: dữ liệu được lấy trực tiếp từ bộ nhớ, không phát sinh tải cho Aurora." },
          ], ok: true, result: "Phần lớn lượt đọc lặp lại được phục vụ tại cache. Tải trên Aurora giảm đáng kể mà không cần thêm replica. TTL đảm bảo dữ liệu không cũ quá 60 giây." }
      : { steps: [
            { at: "db", state: "wait", flash: "180 ms", msg: "Cùng một truy vấn được thực thi lặp lại hàng nghìn lần. Thêm read replica chỉ giải quyết được trong ngắn hạn." },
          ], ok: false, result: "Độ trễ cao và tốn chi phí. Với tải đọc lớn, lặp lại nhiều: đặt cache phía trước database." },
  },
  {
    name: "Web server lỗi, người dùng bị đăng xuất",
    request: "GET /cart  Cookie: session=7f3a…",
    toggle: { label: "Lưu session trong ElastiCache", initial: false },
    action: "Truy xuất giỏ hàng",
    layout: (cache) => ({
      viewBox: VB,
      aria: "ALB chuyển người dùng sang EC2 khác; EC2 đó đọc session từ ElastiCache",
      nodes: [
        { id: "user", x: 60, y: 150, l1: "Người dùng", user: true },
        { id: "alb", x: 210, y: 150, w: 110, l1: "ALB" },
        { id: "w1", x: 420, y: 92, w: 150, l1: "EC2 #1", l2: "vừa bị thay thế" },
        { id: "w2", x: 420, y: 210, w: 150, l1: "EC2 #2" },
        ...(cache ? [{ id: "cache", x: 680, y: 210, w: 170, l1: "ElastiCache", l2: "session store" }] : []),
      ],
      links: [["user", "alb"], ["alb", "w1"], ["alb", "w2"], ...(cache ? [["w2", "cache"] as [string, string]] : [])],
    }),
    run: (cache) => cache
      ? { steps: [
            { at: "w1", jump: true, state: "block", tag: "UNHEALTHY", msg: "EC2 #1 gặp lỗi và được Auto Scaling thay thế." },
            { at: "alb", state: "pass", msg: "Chuyển người dùng sang EC2 #2." },
            { at: "w2", state: "pass", msg: "Không lưu trạng thái trong RAM cục bộ." },
            { at: "cache", state: "pass", tag: "HIT", msg: "Đọc session theo session id. Mọi server dùng chung một kho lưu trữ." },
          ], ok: true, result: "Người dùng không bị ảnh hưởng khi một server gặp lỗi. Web server là stateless nên có thể thêm bớt linh hoạt." }
      : { steps: [
            { at: "w1", jump: true, state: "block", tag: "UNHEALTHY", msg: "EC2 #1 gặp lỗi. Session của người dùng được lưu trong RAM của instance này." },
            { at: "alb", state: "pass", msg: "Chuyển người dùng sang EC2 #2." },
            { at: "w2", state: "block", flash: "đăng nhập lại", msg: "EC2 #2 không có thông tin về session 7f3a." },
          ], ok: false, result: "Người dùng phải đăng nhập lại và mất giỏ hàng. Sticky session cũng không khắc phục được khi chính server đó gặp lỗi. Giải pháp: lưu session tại một kho in-memory dùng chung: ElastiCache." },
  },
  {
    name: "Bảng xếp hạng người bán thời gian thực",
    request: "GET /top-sellers  (cập nhật mỗi khi có đơn)",
    toggle: { label: "Sử dụng Redis sorted set", initial: false },
    action: "Xem bảng xếp hạng",
    layout: (redis) => ({
      viewBox: VB,
      aria: "Ứng dụng lấy top người bán từ Aurora hoặc từ Redis sorted set",
      nodes: [
        { id: "user", x: 70, y: 150, l1: "Người dùng", user: true },
        { id: "app", x: 260, y: 150, w: 130, l1: "App ShopViet" },
        { id: "store", x: 560, y: 150, w: 230, l1: redis ? "ElastiCache (Redis OSS)" : "Aurora", l2: redis ? "sorted set top-sellers" : "SUM + ORDER BY mỗi lần" },
      ],
      links: [["user", "app"], ["app", "store"]],
    }),
    run: (redis) => redis
      ? { steps: [
            { at: "app", state: "pass", msg: "Với mỗi đơn hàng mới, ứng dụng gọi `ZINCRBY` để cộng doanh số cho người bán." },
            { at: "store", state: "pass", flash: "< 1 ms", msg: "`ZREVRANGE 0 9` trả về 10 người bán đứng đầu, đã được sắp xếp sẵn trong bộ nhớ." },
          ], ok: true, result: "Bảng xếp hạng thời gian thực phục vụ hàng triệu người dùng. Sorted set là cấu trúc dữ liệu có sẵn của Redis." }
      : { steps: [
            { at: "app", state: "pass", msg: "Chuyển request tới database." },
            { at: "store", state: "wait", flash: "2,4 s", msg: "Tính tổng doanh số của hàng triệu đơn hàng rồi sắp xếp, mỗi khi có người dùng mở trang." },
          ], ok: false, result: "Độ trễ cao và gây tải lớn cho database. Kết quả tốn nhiều tài nguyên để tính và được đọc nhiều: lưu trong ElastiCache." },
  },
  {
    name: "Tìm shipper gần người dùng nhất",
    request: "Shipper trong bán kính 2 km quanh 10.776, 106.700",
    toggle: { label: "Engine Redis OSS (thay vì Memcached)", initial: false },
    action: "Tìm shipper",
    layout: (redis) => ({
      viewBox: VB,
      aria: "Shipper gửi vị trí vào cache; ứng dụng tìm shipper gần nhất",
      nodes: [
        { id: "user", x: 70, y: 150, l1: "Người đặt hàng", user: true },
        { id: "app", x: 270, y: 150, w: 140, l1: "App ShopViet" },
        { id: "cache", x: 540, y: 150, w: 210, l1: redis ? "ElastiCache (Redis OSS)" : "ElastiCache (Memcached)", l2: redis ? "GEOADD mỗi 5 giây" : "chỉ có key → value" },
        { id: "ship", x: 540, y: 236, w: 170, l1: "App shipper", l2: "gửi vị trí liên tục" },
      ],
      links: [["user", "app"], ["app", "cache"], ["ship", "cache"]],
    }),
    run: (redis) => redis
      ? { steps: [
            { at: "app", state: "pass", msg: "Truy vấn cache thay vì database." },
            { at: "cache", state: "pass", flash: "3 shipper", msg: "`GEOSEARCH` theo bán kính trả về shipper gần nhất. Vị trí cũ tự động hết hạn nhờ TTL." },
          ], ok: true, result: "Hàng nghìn lượt ghi và đọc vị trí mỗi giây mà không gây tải cho PostgreSQL phía sau." }
      : { steps: [
            { at: "app", state: "pass", msg: "Truy vấn cache." },
            { at: "cache", state: "block", msg: "Memcached chỉ lưu key → value, không có lệnh truy vấn theo vị trí." },
          ], ok: false, result: "Ứng dụng phải tải toàn bộ vị trí về rồi tự tính khoảng cách. Yêu cầu geospatial: lựa chọn Redis OSS (hoặc Valkey)." },
  },
  {
    name: "Sự cố một node cache",
    request: "GET /products/hot  (cache node chính vừa gặp lỗi)",
    toggle: { label: "Multi-AZ với automatic failover", initial: false },
    action: "Gửi request",
    layout: (maz) => ({
      viewBox: VB,
      aria: "Ứng dụng đọc cache; node chính gặp lỗi, replica tại AZ khác thay thế hoặc mọi request chuyển tới database",
      boxes: [{ x: 300, y: 50, w: 250, h: 200, label: "ElastiCache (Redis OSS)" }],
      nodes: [
        { id: "app", x: 110, y: 150, w: 140, l1: "App ShopViet" },
        { id: "pri", x: 425, y: 104, w: 170, l1: "Primary", l2: "AZ a · lỗi" },
        { id: "rep", x: 425, y: 206, w: 170, l1: maz ? "Replica" : "(không có replica)", l2: maz ? "AZ b" : undefined },
        { id: "db", x: 700, y: 150, w: 150, l1: "RDS", l2: "database chính" },
      ],
      links: [["app", "pri"], ["app", "rep"], ["app", "db"]],
    }),
    run: (maz) => maz
      ? { steps: [
            { at: "pri", state: "block", msg: "Primary không phản hồi." },
            { at: "rep", jump: true, state: "change", tag: "PROMOTE", msg: "ElastiCache tự động phát hiện lỗi và promote replica tại AZ b thành primary." },
            { at: "rep", state: "pass", tag: "HIT", msg: "Dữ liệu đã được sao chép sẵn sang replica nên cache vẫn giữ nguyên dữ liệu." },
          ], ok: true, result: "Thời gian gián đoạn rất ngắn, gần như không mất dữ liệu cache, database không bị dồn tải." }
      : { steps: [
            { at: "pri", state: "block", msg: "Node duy nhất gặp lỗi. Node mới được tạo với cache rỗng." },
            { at: "db", from: "app", state: "wait", flash: "quá tải", msg: "Mọi request được chuyển trực tiếp tới database cùng lúc." },
          ], ok: false, result: "Backup hằng ngày không giúp phục hồi nhanh và vẫn mất dữ liệu kể từ lần backup cuối. Giảm thời gian gián đoạn và mất dữ liệu: Multi-AZ với automatic failover." },
  },
];

export default function CacheSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống của ShopViet, gửi request, sau đó bật tuỳ chọn cấu hình để quan sát tác dụng của ElastiCache." />;
}
