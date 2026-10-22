import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

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

function auroraEn(global: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "The application writes to Aurora in Singapore, with a copy in Tokyo",
    boxes: regions("Singapore (primary)", "Tokyo (DR)"),
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "Application", l2: "writes orders" },
      { id: "pri", x: 305, y: 150, w: 160, l1: "Aurora MySQL", l2: "primary cluster" },
      { id: "sec", x: 635, y: 150, w: 220, l1: global ? "Aurora secondary cluster" : "Snapshot copy", l2: global ? "Aurora Global Database" : "Lambda copies every 5 min" },
    ],
    links: [["app", "pri"], ["pri", "sec"]],
  };
}

function rdsEn(replica: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "RDS PostgreSQL Multi-AZ in Singapore and a copy in Tokyo",
    boxes: regions("Singapore", "Tokyo"),
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "Inventory app", l2: "3 EC2" },
      { id: "pri", x: 305, y: 105, w: 160, l1: "RDS primary", l2: "AZ a" },
      { id: "stb", x: 305, y: 195, w: 160, l1: "Multi-AZ standby", l2: "AZ b, same Region" },
      { id: "tok", x: 635, y: 150, w: 230, l1: replica ? "Cross-Region read replica" : "No copy yet", l2: replica ? "+ automated backups replicated" : "backups only in Singapore" },
    ],
    links: [["app", "pri"], ["pri", "stb"], ["pri", "tok"]],
  };
}

function redisEn(multiAz: boolean): PLayout {
  return {
    viewBox: "0 36 820 216",
    aria: "ElastiCache Redis with the primary node in AZ a and a replica in AZ b",
    boxes: [
      { x: 190, y: 44, w: 240, h: 200, label: "AZ a" },
      { x: 470, y: 44, w: 330, h: 200, label: "AZ b" },
    ],
    nodes: [
      { id: "app", x: 80, y: 150, w: 110, l1: "ShopViet web", l2: "carts, sessions" },
      { id: "pri", x: 310, y: 105, w: 170, l1: "Redis primary", l2: "ElastiCache" },
      { id: "bak", x: 310, y: 205, w: 170, l1: "Daily backup", l2: "snapshot at 2:00 a.m." },
      { id: "rep", x: 635, y: 105, w: 200, l1: multiAz ? "Redis replica" : "No replica", l2: multiAz ? "Multi-AZ, automatic failover" : "a single node" },
    ],
    links: [["app", "pri"], ["pri", "rep"], ["pri", "bak"]],
  };
}

const SCENARIOS_EN: PScenario[] = [
  {
    name: "Aurora: Singapore Region failure",
    action: "Simulate Region failure",
    request: (on) => (on ? "RPO ≤ 5 min, RTO ≤ 15 min · Aurora Global Database" : "RPO ≤ 5 min, RTO ≤ 15 min · self-developed script"),
    toggle: { label: "Switch to Aurora Global Database", initial: false },
    layout: auroraEn,
    run: (global) => global
      ? {
          steps: [
            { at: "pri", state: "block", flash: "failure", msg: "The Singapore Region goes down. The primary cluster does not respond." },
            { from: "pri", at: "sec", jump: true, state: "pass", tag: "IN PLACE", msg: "The data has already been replicated at the storage layer, with latency typically **under 1 second**. The orders lost depend on the replication lag at the time of the failure, typically measured in seconds." },
            { at: "sec", jump: true, state: "change", tag: "FAILOVER", relabel: { l1: "Aurora Tokyo", l2: "new primary cluster" }, msg: "The global database **failover** promotes the secondary cluster in Tokyo to be the primary cluster, typically within minutes." },
            { from: "app", at: "sec", state: "pass", flash: "OK", msg: "The application writes new orders to Tokyo." },
          ],
          ok: true,
          result: "RPO in seconds and RTO in minutes, within the RPO ≤ 5 minutes, RTO ≤ 15 minutes objective. Aurora handles the replication and failover; the ShopViet team does not need to develop scripts.",
        }
      : {
          steps: [
            { at: "pri", state: "block", flash: "failure", msg: "The Singapore Region goes down. The primary cluster does not respond." },
            { from: "pri", at: "sec", jump: true, state: "wait", tag: "RESTORE", msg: "There are only snapshots. They must be **restored** to a new cluster before the application can write; restore time depends on the database size. Orders placed after the latest snapshot are lost." },
            { from: "app", at: "sec", state: "block", flash: "not ready", msg: "The application has nowhere to write data during the restore." },
          ],
          ok: false,
          result: "An RTO of 15 minutes cannot be guaranteed, and the snapshot-copy script must be developed and maintained by the ShopViet team. Turn on the option to compare.",
        },
  },
  {
    name: "RDS PostgreSQL: Region failure",
    action: "Simulate Region failure",
    request: "Inventory database, heavy read load",
    toggle: { label: "Add a cross-Region read replica and replicate backups to Tokyo", initial: false },
    layout: rdsEn,
    run: (replica) => ({
      steps: [
        { at: "pri", state: "block", flash: "failure", msg: "The Singapore Region loses power." },
        { from: "pri", at: "stb", jump: true, state: "block", tag: "SAME FAILURE", msg: "The **Multi-AZ** standby is in another AZ but **in the same Region**. When the Region goes down, the standby is unavailable too." },
        replica
          ? { from: "pri", at: "tok", jump: true, state: "change", tag: "PROMOTE", relabel: { l1: "RDS Tokyo", l2: "standalone DB, writable" }, msg: "**Promote** the read replica in Tokyo to a standalone database. The automated backups already replicated to Tokyo can be used for a point-in-time restore when needed." }
          : { from: "pri", at: "tok", jump: true, state: "skip", tag: "EMPTY", msg: "There is no copy in another Region." },
        replica
          ? { from: "app", at: "tok", state: "pass", flash: "OK", msg: "The inventory application switches to the endpoint in Tokyo." }
          : { from: "app", at: "pri", state: "block", msg: "There is no database to connect to." },
      ],
      ok: replica,
      result: replica
        ? "The inventory application is back in Tokyo. Multi-AZ protects against the failure of one AZ; to survive a Region-wide failure, you need a copy in another Region."
        : "Multi-AZ does not protect against a failure of the entire Region. You need a read replica or backups in another Region.",
    }),
  },
  {
    name: "Redis: primary node failure",
    action: "Simulate primary node failure",
    request: "Cache for shopping carts and login sessions",
    toggle: { label: "Enable Multi-AZ with automatic failover", initial: false },
    layout: redisEn,
    run: (multiAz) => multiAz
      ? {
          steps: [
            { at: "pri", state: "block", flash: "failure", msg: "The primary node's hardware fails." },
            { from: "pri", at: "rep", jump: true, state: "change", tag: "PROMOTE", relabel: { l1: "New Redis primary", l2: "AZ b" }, msg: "ElastiCache **automatically promotes** the replica in AZ b. The replica has been receiving data continuously, so very little data is lost." },
            { from: "app", at: "rep", state: "pass", flash: "OK", msg: "The web tier keeps using the same **primary endpoint**, which now points to the new node. No configuration change is needed." },
          ],
          ok: true,
          result: "Short downtime, shopping cart data is almost fully preserved, and no manual intervention is needed.",
        }
      : {
          steps: [
            { at: "pri", state: "block", flash: "failure", msg: "The primary node's hardware fails." },
            { from: "pri", at: "rep", jump: true, state: "skip", tag: "EMPTY", msg: "There is no replica to take over." },
            { from: "pri", at: "bak", jump: true, state: "wait", tag: "RESTORE", msg: "Create a new cluster from the 2:00 a.m. backup. All shopping carts and login sessions created from 2:00 a.m. until now **are lost**." },
          ],
          ok: false,
          result: "Users are signed out, carts are cleared, and the database takes a sudden load spike while the cache is empty. Daily backups cannot keep up with continuously changing data.",
        },
  },
];

export default function DataFailoverSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} hint={L({ vi: "Chọn một tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh.", en: "Choose a scenario, then choose the run button. Change the setting and run again to compare." })} />;
}
