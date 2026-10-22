import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";

// The data layer of ShopViet when something breaks: the Aurora cluster when the whole
// Singapore Region goes down, the RDS PostgreSQL database of the warehouse app, and the
// Redis cache that holds carts and sessions when its primary node dies. Each switch is
// the setting that turns a long, lossy recovery into a short one.

const regions = (left: string, right: string) => [
  { x: 190, y: 44, w: 230, h: 200, label: left },
  { x: 470, y: 44, w: 330, h: 200, label: right, edge: true },
];

function aurora(global: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "Ứng dụng ghi vào Aurora tại Singapore, bản sao tại Tokyo",
    boxes: regions("Singapore (chính)", "Tokyo (DR)"),
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "Ứng dụng", l2: "ghi đơn hàng" },
      { id: "pri", x: 305, y: 150, w: 160, l1: "Aurora MySQL", l2: "cluster chính" },
      { id: "sec", x: 635, y: 150, w: 220, l1: global ? "Aurora secondary cluster" : "Snapshot copy", l2: global ? "Aurora Global Database" : "Lambda copy mỗi 5 phút" },
    ],
    links: [["app", "pri"], ["pri", "sec"]],
  };
}

function rds(replica: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "RDS PostgreSQL Multi-AZ tại Singapore và bản sao tại Tokyo",
    boxes: regions("Singapore", "Tokyo"),
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "Ứng dụng kho", l2: "3 EC2" },
      { id: "pri", x: 305, y: 105, w: 160, l1: "RDS primary", l2: "AZ a" },
      { id: "stb", x: 305, y: 195, w: 160, l1: "Standby Multi-AZ", l2: "AZ b, cùng Region" },
      { id: "tok", x: 635, y: 150, w: 230, l1: replica ? "Cross-Region read replica" : "Chưa có bản sao", l2: replica ? "+ automated backups được sao chép" : "backup chỉ lưu tại Singapore" },
    ],
    links: [["app", "pri"], ["pri", "stb"], ["pri", "tok"]],
  };
}

function redis(multiAz: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "ElastiCache Redis có primary node tại AZ a và replica tại AZ b",
    boxes: [
      { x: 190, y: 44, w: 240, h: 200, label: "AZ a" },
      { x: 470, y: 44, w: 330, h: 200, label: "AZ b" },
    ],
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "Web ShopViet", l2: "giỏ hàng, phiên" },
      { id: "pri", x: 310, y: 105, w: 170, l1: "Redis primary", l2: "ElastiCache" },
      { id: "bak", x: 310, y: 205, w: 170, l1: "Backup hằng ngày", l2: "snapshot lúc 2h sáng" },
      { id: "rep", x: 635, y: 105, w: 200, l1: multiAz ? "Redis replica" : "Không có replica", l2: multiAz ? "Multi-AZ, automatic failover" : "một node duy nhất" },
    ],
    links: [["app", "pri"], ["pri", "rep"], ["pri", "bak"]],
  };
}

const SCENARIOS: PScenario[] = [
  {
    name: "Aurora: sự cố Region Singapore",
    action: "Mô phỏng sự cố Region",
    request: (on) => (on ? "RPO ≤ 5 phút, RTO ≤ 15 phút · Aurora Global Database" : "RPO ≤ 5 phút, RTO ≤ 15 phút · script tự phát triển"),
    toggle: { label: "Chuyển sang Aurora Global Database", initial: false },
    layout: aurora,
    run: (global) => global
      ? {
          steps: [
            { at: "pri", state: "block", flash: "sự cố", msg: "Region Singapore ngừng hoạt động. Cluster chính không phản hồi." },
            { from: "pri", at: "sec", jump: true, state: "pass", tag: "ĐÃ CÓ", msg: "Dữ liệu đã được sao chép ở tầng storage, với độ trễ thường **dưới 1 giây**. Lượng đơn hàng bị mất phụ thuộc replication lag tại thời điểm sự cố, thường tính bằng giây." },
            { at: "sec", jump: true, state: "change", tag: "FAILOVER", relabel: { l1: "Aurora Tokyo", l2: "cluster chính mới" }, msg: "**Failover** của global database promote secondary cluster tại Tokyo thành cluster chính, thường trong vài phút." },
            { from: "app", at: "sec", state: "pass", flash: "OK", msg: "Ứng dụng ghi đơn hàng mới vào Tokyo." },
          ],
          ok: true,
          result: "Đạt RPO tính bằng giây, RTO tính bằng phút, trong mục tiêu RPO ≤ 5 phút, RTO ≤ 15 phút. Aurora thực hiện việc sao chép và failover; đội ShopViet không cần phát triển script.",
        }
      : {
          steps: [
            { at: "pri", state: "block", flash: "sự cố", msg: "Region Singapore ngừng hoạt động. Cluster chính không phản hồi." },
            { from: "pri", at: "sec", jump: true, state: "wait", tag: "RESTORE", msg: "Chỉ có snapshot. Phải **restore** thành cluster mới trước khi ứng dụng có thể ghi; thời gian restore phụ thuộc kích thước database. Đơn hàng phát sinh sau snapshot gần nhất bị mất." },
            { from: "app", at: "sec", state: "block", flash: "chưa sẵn sàng", msg: "Ứng dụng không có đích ghi dữ liệu trong quá trình restore." },
          ],
          ok: false,
          result: "Không đảm bảo được RTO 15 phút, và script copy snapshot phải do đội ShopViet tự phát triển và bảo trì. Bật tuỳ chọn để so sánh.",
        },
  },
  {
    name: "RDS PostgreSQL: sự cố Region",
    action: "Mô phỏng sự cố Region",
    request: "Database kho hàng, tải đọc lớn",
    toggle: { label: "Thêm cross-Region read replica và sao chép backup sang Tokyo", initial: false },
    layout: rds,
    run: (replica) => ({
      steps: [
        { at: "pri", state: "block", flash: "sự cố", msg: "Region Singapore mất điện." },
        { from: "pri", at: "stb", jump: true, state: "block", tag: "CÙNG SỰ CỐ", msg: "Standby của **Multi-AZ** nằm ở AZ khác nhưng **cùng Region**. Khi Region ngừng hoạt động, standby cũng không còn khả dụng." },
        replica
          ? { from: "pri", at: "tok", jump: true, state: "change", tag: "PROMOTE", relabel: { l1: "RDS Tokyo", l2: "DB độc lập, nhận ghi" }, msg: "**Promote** read replica tại Tokyo thành database độc lập. Automated backup đã được sao chép sang Tokyo có thể dùng để restore về một thời điểm khi cần." }
          : { from: "pri", at: "tok", jump: true, state: "skip", tag: "TRỐNG", msg: "Không có bản sao nào tại Region khác." },
        replica
          ? { from: "app", at: "tok", state: "pass", flash: "OK", msg: "Ứng dụng kho hàng chuyển sang endpoint tại Tokyo." }
          : { from: "app", at: "pri", state: "block", msg: "Không có database nào để kết nối." },
      ],
      ok: replica,
      result: replica
        ? "Ứng dụng kho hàng hoạt động trở lại tại Tokyo. Multi-AZ bảo vệ trước sự cố của một AZ; để chịu được sự cố toàn Region, cần có bản sao tại Region khác."
        : "Multi-AZ không bảo vệ được khi toàn bộ Region gặp sự cố. Cần có read replica hoặc backup tại Region khác.",
    }),
  },
  {
    name: "Redis: primary node gặp sự cố",
    action: "Mô phỏng sự cố primary node",
    request: "Cache giỏ hàng và phiên đăng nhập",
    toggle: { label: "Bật Multi-AZ với automatic failover", initial: false },
    layout: redis,
    run: (multiAz) => multiAz
      ? {
          steps: [
            { at: "pri", state: "block", flash: "sự cố", msg: "Phần cứng của primary node gặp sự cố." },
            { from: "pri", at: "rep", jump: true, state: "change", tag: "PROMOTE", relabel: { l1: "Redis primary mới", l2: "AZ b" }, msg: "ElastiCache **tự động promote** replica tại AZ b. Replica đã nhận dữ liệu liên tục nên lượng dữ liệu bị mất rất ít." },
            { from: "app", at: "rep", state: "pass", flash: "OK", msg: "Web vẫn sử dụng **primary endpoint** cũ, hiện trỏ tới node mới. Không cần thay đổi cấu hình." },
          ],
          ok: true,
          result: "Thời gian gián đoạn ngắn, dữ liệu giỏ hàng gần như được bảo toàn, không cần can thiệp thủ công.",
        }
      : {
          steps: [
            { at: "pri", state: "block", flash: "sự cố", msg: "Phần cứng của primary node gặp sự cố." },
            { from: "pri", at: "rep", jump: true, state: "skip", tag: "TRỐNG", msg: "Không có replica để thay thế." },
            { from: "pri", at: "bak", jump: true, state: "wait", tag: "RESTORE", msg: "Tạo cluster mới từ backup lúc 2h sáng. Toàn bộ giỏ hàng và phiên đăng nhập phát sinh từ 2h sáng tới thời điểm hiện tại **bị mất**." },
          ],
          ok: false,
          result: "Người dùng bị đăng xuất, giỏ hàng bị xoá, database chịu tải tăng đột biến trong thời gian cache rỗng. Backup hằng ngày không đáp ứng được dữ liệu thay đổi liên tục.",
        },
  },
];

export default function DataFailoverSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh." />;
}
