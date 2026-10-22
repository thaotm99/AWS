import PacketSim, { type PScenario } from "../elb/PacketSim";

// Five jobs ElastiCache does for ShopViet: cache repeated Aurora reads (cache-aside),
// keep sessions when a web server dies, serve a live seller leaderboard, find the
// nearest shipper with geospatial commands, and survive a cache node failure.

const VB = "0 40 820 222";

const SCENARIOS: PScenario[] = [
  {
    name: "Khách tra trạng thái đơn liên tục",
    request: "GET /orders/88/status  (hàng nghìn lần mỗi phút)",
    toggle: { label: "Cache kết quả trong ElastiCache (cache-aside)", initial: false },
    layout: (cache) => ({
      viewBox: VB,
      aria: "App đọc trạng thái đơn từ ElastiCache trước, chỉ hỏi Aurora khi cache chưa có",
      nodes: [
        { id: "app", x: 100, y: 150, w: 140, l1: "App ShopViet", l2: "EC2" },
        ...(cache ? [{ id: "cache", x: 420, y: 92, w: 170, l1: "ElastiCache", l2: "TTL 60 giây" }] : []),
        { id: "db", x: 420, y: 210, w: 170, l1: "Aurora MySQL", l2: cache ? "CPU 35%" : "CPU 92%, đã có replica" },
      ],
      links: [["app", "db"], ...(cache ? [["app", "cache"] as [string, string]] : [])],
    }),
    run: (cache) => cache
      ? { steps: [
            { at: "cache", state: "skip", tag: "MISS", roundTrip: true, msg: "Lần đầu: cache chưa có đơn 88." },
            { at: "db", state: "pass", msg: "App đọc Aurora một lần." },
            { at: "cache", from: "app", state: "change", tag: "SET", roundTrip: true, msg: "App ghi kết quả vào cache, hết hạn sau 60 giây." },
            { at: "cache", state: "pass", tag: "HIT", flash: "< 1 ms", msg: "Những lần sau: lấy thẳng từ bộ nhớ, Aurora không phải làm gì." },
          ], ok: true, result: "Phần lớn lượt đọc lặp lại dừng ở cache. Aurora nhẹ hẳn mà không cần thêm replica. TTL giữ dữ liệu không cũ quá 60 giây." }
      : { steps: [
            { at: "db", state: "wait", flash: "180 ms", msg: "Cùng một câu truy vấn chạy lại hàng nghìn lần. Thêm read replica chỉ đỡ được một thời gian." },
          ], ok: false, result: "Chậm và tốn. Đọc nhiều, lặp lại nhiều: đặt cache trước database." },
  },
  {
    name: "Server web chết, khách bị đăng xuất",
    request: "GET /cart  Cookie: session=7f3a…",
    toggle: { label: "Lưu session trong ElastiCache", initial: false },
    action: "Mở giỏ hàng",
    layout: (cache) => ({
      viewBox: VB,
      aria: "ALB chuyển khách sang EC2 khác; EC2 đó đọc session từ ElastiCache",
      nodes: [
        { id: "user", x: 60, y: 150, l1: "Khách", user: true },
        { id: "alb", x: 210, y: 150, w: 110, l1: "ALB" },
        { id: "w1", x: 420, y: 92, w: 150, l1: "EC2 #1", l2: "vừa bị thay" },
        { id: "w2", x: 420, y: 210, w: 150, l1: "EC2 #2" },
        ...(cache ? [{ id: "cache", x: 680, y: 210, w: 170, l1: "ElastiCache", l2: "session store" }] : []),
      ],
      links: [["user", "alb"], ["alb", "w1"], ["alb", "w2"], ...(cache ? [["w2", "cache"] as [string, string]] : [])],
    }),
    run: (cache) => cache
      ? { steps: [
            { at: "w1", jump: true, state: "block", tag: "UNHEALTHY", msg: "EC2 #1 hỏng và bị Auto Scaling thay." },
            { at: "alb", state: "pass", msg: "Chuyển khách sang EC2 #2." },
            { at: "w2", state: "pass", msg: "Không giữ gì trong RAM của mình." },
            { at: "cache", state: "pass", tag: "HIT", msg: "Đọc session theo session id. Mọi server cùng dùng chung một chỗ." },
          ], ok: true, result: "Khách không biết có server nào vừa chết. Server web không giữ trạng thái nên thêm bớt thoải mái." }
      : { steps: [
            { at: "w1", jump: true, state: "block", tag: "UNHEALTHY", msg: "EC2 #1 hỏng. Session của khách nằm trong RAM của máy này." },
            { at: "alb", state: "pass", msg: "Chuyển khách sang EC2 #2." },
            { at: "w2", state: "block", flash: "đăng nhập lại", msg: "EC2 #2 không biết session 7f3a là ai." },
          ], ok: false, result: "Khách phải đăng nhập lại, giỏ hàng mất. Sticky session cũng không cứu được khi chính server đó chết. Đưa session ra một kho dùng chung in-memory: ElastiCache." },
  },
  {
    name: "Bảng xếp hạng người bán trực tiếp",
    request: "GET /top-sellers  (cập nhật mỗi khi có đơn)",
    toggle: { label: "Dùng Redis sorted set", initial: false },
    action: "Mở bảng xếp hạng",
    layout: (redis) => ({
      viewBox: VB,
      aria: "App lấy top người bán từ Aurora hoặc từ Redis sorted set",
      nodes: [
        { id: "user", x: 70, y: 150, l1: "Khách xem", user: true },
        { id: "app", x: 260, y: 150, w: 130, l1: "App ShopViet" },
        { id: "store", x: 560, y: 150, w: 230, l1: redis ? "ElastiCache (Redis OSS)" : "Aurora", l2: redis ? "sorted set top-sellers" : "SUM + ORDER BY mỗi lần" },
      ],
      links: [["user", "app"], ["app", "store"]],
    }),
    run: (redis) => redis
      ? { steps: [
            { at: "app", state: "pass", msg: "Mỗi đơn mới, app gọi `ZINCRBY` cộng doanh số cho người bán." },
            { at: "store", state: "pass", flash: "< 1 ms", msg: "`ZREVRANGE 0 9` trả 10 người bán đứng đầu, đã xếp sẵn trong bộ nhớ." },
          ], ok: true, result: "Bảng xếp hạng thời gian thực cho hàng triệu người xem. Sorted set là cấu trúc có sẵn của Redis." }
      : { steps: [
            { at: "app", state: "pass", msg: "Chuyển yêu cầu xuống database." },
            { at: "store", state: "wait", flash: "2,4 s", msg: "Cộng doanh số hàng triệu đơn rồi sắp xếp, mỗi lần có người mở trang." },
          ], ok: false, result: "Chậm và đè nặng database. Kết quả tính toán nặng, đọc nhiều: để trong ElastiCache." },
  },
  {
    name: "Tìm shipper gần khách nhất",
    request: "Shipper trong bán kính 2 km quanh 10.776, 106.700",
    toggle: { label: "Engine Redis OSS (thay vì Memcached)", initial: false },
    action: "Tìm shipper",
    layout: (redis) => ({
      viewBox: VB,
      aria: "Shipper gửi vị trí vào cache; app tìm shipper gần nhất",
      nodes: [
        { id: "user", x: 70, y: 150, l1: "Khách đặt đơn", user: true },
        { id: "app", x: 270, y: 150, w: 140, l1: "App ShopViet" },
        { id: "cache", x: 540, y: 150, w: 210, l1: redis ? "ElastiCache (Redis OSS)" : "ElastiCache (Memcached)", l2: redis ? "GEOADD mỗi 5 giây" : "chỉ có key → value" },
        { id: "ship", x: 540, y: 236, w: 170, l1: "App shipper", l2: "gửi vị trí liên tục" },
      ],
      links: [["user", "app"], ["app", "cache"], ["ship", "cache"]],
    }),
    run: (redis) => redis
      ? { steps: [
            { at: "app", state: "pass", msg: "Hỏi cache thay vì database." },
            { at: "cache", state: "pass", flash: "3 shipper", msg: "`GEOSEARCH` theo bán kính trả shipper gần nhất. Vị trí cũ tự hết hạn nhờ TTL." },
          ], ok: true, result: "Hàng nghìn lượt ghi và đọc vị trí mỗi giây mà PostgreSQL phía sau không bị đè." }
      : { steps: [
            { at: "app", state: "pass", msg: "Hỏi cache." },
            { at: "cache", state: "block", msg: "Memcached chỉ lưu key → value. Không có lệnh tìm theo vị trí." },
          ], ok: false, result: "Phải tải hết vị trí về app rồi tự tính khoảng cách. Cần geospatial: chọn Redis OSS (hoặc Valkey)." },
  },
  {
    name: "Một node cache bị hỏng",
    request: "GET /products/hot  (cache node chính vừa hỏng)",
    toggle: { label: "Multi-AZ với automatic failover", initial: false },
    action: "Gửi request",
    layout: (maz) => ({
      viewBox: VB,
      aria: "App đọc cache; node chính hỏng, replica ở AZ khác lên thay hoặc mọi request đổ về database",
      boxes: [{ x: 300, y: 50, w: 250, h: 200, label: "ElastiCache (Redis OSS)" }],
      nodes: [
        { id: "app", x: 110, y: 150, w: 140, l1: "App ShopViet" },
        { id: "pri", x: 425, y: 104, w: 170, l1: "Primary", l2: "AZ a · hỏng" },
        { id: "rep", x: 425, y: 206, w: 170, l1: maz ? "Replica" : "(không có replica)", l2: maz ? "AZ b" : undefined },
        { id: "db", x: 700, y: 150, w: 150, l1: "RDS", l2: "database chính" },
      ],
      links: [["app", "pri"], ["app", "rep"], ["app", "db"]],
    }),
    run: (maz) => maz
      ? { steps: [
            { at: "pri", state: "block", msg: "Primary không trả lời." },
            { at: "rep", jump: true, state: "change", tag: "PROMOTE", msg: "ElastiCache tự phát hiện lỗi và đưa replica ở AZ b lên làm primary." },
            { at: "rep", state: "pass", tag: "HIT", msg: "Dữ liệu đã được sao chép sẵn sang replica, cache vẫn còn nóng." },
          ], ok: true, result: "Ngừng rất ngắn, gần như không mất dữ liệu cache, database không bị dồn tải." }
      : { steps: [
            { at: "pri", state: "block", msg: "Node duy nhất hỏng. Tạo node mới thì cache trống trơn." },
            { at: "db", from: "app", state: "wait", flash: "quá tải", msg: "Mọi request đổ thẳng xuống database cùng lúc." },
          ], ok: false, result: "Backup hằng ngày không giúp phục hồi nhanh và vẫn mất dữ liệu từ lần backup cuối. Ít ngừng, ít mất dữ liệu: Multi-AZ với automatic failover." },
  },
];

export default function CacheSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một chuyện của ShopViet, gửi request, rồi bật công tắc để xem ElastiCache giúp gì." />;
}
