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
    aria: "App ghi vào Aurora ở Singapore, bản sao ở Tokyo",
    boxes: regions("Singapore (chính)", "Tokyo (DR)"),
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "App ShopViet", l2: "ghi đơn hàng" },
      { id: "pri", x: 305, y: 150, w: 160, l1: "Aurora MySQL", l2: "cluster chính" },
      { id: "sec", x: 635, y: 150, w: 220, l1: global ? "Aurora secondary cluster" : "Snapshot copy", l2: global ? "Aurora Global Database" : "Lambda tự copy mỗi 5 phút" },
    ],
    links: [["app", "pri"], ["pri", "sec"]],
  };
}

function rds(replica: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "RDS PostgreSQL Multi-AZ ở Singapore và bản sao ở Tokyo",
    boxes: regions("Singapore", "Tokyo"),
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "App kho hàng", l2: "3 EC2" },
      { id: "pri", x: 305, y: 105, w: 160, l1: "RDS primary", l2: "AZ a" },
      { id: "stb", x: 305, y: 195, w: 160, l1: "Standby Multi-AZ", l2: "AZ b, cùng Region" },
      { id: "tok", x: 635, y: 150, w: 230, l1: replica ? "Cross-Region read replica" : "Không có gì", l2: replica ? "+ automated backups sao chép sang" : "backup chỉ nằm ở Singapore" },
    ],
    links: [["app", "pri"], ["pri", "stb"], ["pri", "tok"]],
  };
}

function redis(multiAz: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "ElastiCache Redis có node chính ở AZ a và replica ở AZ b",
    boxes: [
      { x: 190, y: 44, w: 240, h: 200, label: "AZ a" },
      { x: 470, y: 44, w: 330, h: 200, label: "AZ b" },
    ],
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "Web ShopViet", l2: "giỏ hàng, phiên" },
      { id: "pri", x: 310, y: 105, w: 170, l1: "Redis primary", l2: "ElastiCache" },
      { id: "bak", x: 310, y: 205, w: 170, l1: "Backup hằng ngày", l2: "chụp lúc 2h sáng" },
      { id: "rep", x: 635, y: 105, w: 200, l1: multiAz ? "Redis replica" : "Không có replica", l2: multiAz ? "Multi-AZ, automatic failover" : "một node duy nhất" },
    ],
    links: [["app", "pri"], ["pri", "rep"], ["pri", "bak"]],
  };
}

const SCENARIOS: PScenario[] = [
  {
    name: "Aurora: Singapore sập",
    action: "Cho Region sập",
    request: (on) => (on ? "RPO ≤ 5 phút, RTO ≤ 15 phút · Aurora Global Database" : "RPO ≤ 5 phút, RTO ≤ 15 phút · script tự viết"),
    toggle: { label: "Chuyển sang Aurora Global Database", initial: false },
    layout: aurora,
    run: (global) => global
      ? {
          steps: [
            { at: "pri", state: "block", flash: "sập", msg: "Region Singapore mất. Cluster chính không trả lời." },
            { from: "pri", at: "sec", jump: true, state: "pass", tag: "ĐÃ CÓ", msg: "Dữ liệu đã được sao chép ở tầng storage, thường trễ **dưới 1 giây**. Đơn mất gần như bằng 0." },
            { at: "sec", jump: true, state: "change", tag: "FAILOVER", relabel: { l1: "Aurora Tokyo", l2: "cluster chính mới" }, msg: "**Failover** của global database promote Tokyo thành cluster chính, thường trong khoảng 1 phút." },
            { from: "app", at: "sec", state: "pass", flash: "OK", msg: "App ghi đơn mới vào Tokyo." },
          ],
          ok: true,
          result: "Đạt RPO giây, RTO khoảng một phút. AWS lo phần sao chép và failover, đội ShopViet không phải viết script.",
        }
      : {
          steps: [
            { at: "pri", state: "block", flash: "sập", msg: "Region Singapore mất. Cluster chính không trả lời." },
            { from: "pri", at: "sec", jump: true, state: "wait", tag: "RESTORE", msg: "Chỉ có snapshot. Phải **restore** thành cluster mới, database lớn mất cả giờ. Đơn sau snapshot cuối bị mất." },
            { from: "app", at: "sec", state: "block", flash: "chưa sẵn sàng", msg: "App chưa có chỗ để ghi trong lúc restore." },
          ],
          ok: false,
          result: "Vượt RTO 15 phút, và script copy snapshot là thứ đội ShopViet phải tự viết, tự sửa. Bật công tắc để so sánh.",
        },
  },
  {
    name: "RDS PostgreSQL: Region sập",
    action: "Cho Region sập",
    request: "Database kho hàng, đọc nhiều",
    toggle: { label: "Thêm cross-Region read replica và sao chép backup sang Tokyo", initial: false },
    layout: rds,
    run: (replica) => ({
      steps: [
        { at: "pri", state: "block", flash: "sập", msg: "Region Singapore mất điện." },
        { from: "pri", at: "stb", jump: true, state: "block", tag: "CŨNG SẬP", msg: "Standby của **Multi-AZ** nằm ở AZ khác nhưng **cùng Region**. Region mất thì standby cũng mất." },
        replica
          ? { from: "pri", at: "tok", jump: true, state: "change", tag: "PROMOTE", relabel: { l1: "RDS Tokyo", l2: "DB độc lập, nhận ghi" }, msg: "**Promote** read replica ở Tokyo thành database độc lập. Bản backup tự động đã sao chép sang Tokyo dùng để restore về một thời điểm nếu cần." }
          : { from: "pri", at: "tok", jump: true, state: "skip", tag: "TRỐNG", msg: "Không có bản sao nào ở Region khác." },
        replica
          ? { from: "app", at: "tok", state: "pass", flash: "OK", msg: "App kho hàng trỏ sang endpoint ở Tokyo." }
          : { from: "app", at: "pri", state: "block", msg: "Không có database nào để kết nối." },
      ],
      ok: replica,
      result: replica
        ? "Kho hàng chạy lại ở Tokyo. Multi-AZ chống hỏng một AZ; muốn chống mất cả Region thì cần bản sao ở Region khác."
        : "Multi-AZ không giúp được khi cả Region sập. Phải có read replica hoặc backup ở Region khác.",
    }),
  },
  {
    name: "Redis: node chính hỏng",
    action: "Làm hỏng node chính",
    request: "Cache giỏ hàng và phiên đăng nhập",
    toggle: { label: "Bật Multi-AZ với automatic failover", initial: false },
    layout: redis,
    run: (multiAz) => multiAz
      ? {
          steps: [
            { at: "pri", state: "block", flash: "hỏng", msg: "Phần cứng dưới node chính hỏng." },
            { from: "pri", at: "rep", jump: true, state: "change", tag: "PROMOTE", relabel: { l1: "Redis primary mới", l2: "AZ b" }, msg: "ElastiCache **tự động promote** replica ở AZ b. Replica đã nhận dữ liệu liên tục nên mất rất ít." },
            { from: "app", at: "rep", state: "pass", flash: "OK", msg: "Web vẫn dùng **primary endpoint** cũ, giờ trỏ tới node mới. Không phải sửa cấu hình." },
          ],
          ok: true,
          result: "Gián đoạn ngắn, giỏ hàng gần như còn nguyên, không cần ai can thiệp.",
        }
      : {
          steps: [
            { at: "pri", state: "block", flash: "hỏng", msg: "Phần cứng dưới node chính hỏng." },
            { from: "pri", at: "rep", jump: true, state: "skip", tag: "TRỐNG", msg: "Không có replica để thay." },
            { from: "pri", at: "bak", jump: true, state: "wait", tag: "RESTORE", msg: "Tạo cluster mới từ backup lúc 2h sáng. Mọi giỏ hàng và phiên từ 2h sáng tới giờ **mất hết**." },
          ],
          ok: false,
          result: "Khách bị đăng xuất, giỏ hàng trống, database bị dồn tải trong lúc cache rỗng. Backup hằng ngày không đủ cho dữ liệu đổi liên tục.",
        },
  },
];

export default function DataFailoverSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống rồi bấm nút. Bật công tắc và chạy lại để so sánh." />;
}
