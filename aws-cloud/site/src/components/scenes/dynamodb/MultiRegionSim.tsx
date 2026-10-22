import PacketSim, { type PBox, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// ShopViet opens in Europe and the US. Writing an order from Germany shows why
// DynamoDB global tables (every replica takes writes) differ from Aurora Global
// Database (one Region takes writes). Reading a relational catalogue from the US
// shows where Aurora Global Database fits. Losing Singapore shows failover.

const VB = "0 30 820 236";
const X = { sg: 142, fra: 410, us: 678 };
/** Users sit left of centre and tables right of it, so links never cross a user label. */
const UX = -75;
const TX = 35;
const UY = 92;
const TY = 210;
type Lang = ReturnType<typeof useLang>;

const BOXES: PBox[] = [
  { x: 16, y: 40, w: 252, h: 216, label: "ap-southeast-1 · Singapore" },
  { x: 284, y: 40, w: 252, h: 216, label: "eu-central-1 · Frankfurt" },
  { x: 552, y: 40, w: 252, h: 216, label: "us-east-1 · Virginia" },
];

const scenarios = (L: Lang): PScenario[] => [
  {
    name: L({ vi: "Người dùng tại Đức đặt hàng", en: "A user in Germany places an order" }),
    request: L({ vi: "PutItem Orders  { id: \"DE-1001\", … }  từ Frankfurt", en: "PutItem Orders  { id: \"DE-1001\", … }  from Frankfurt" }),
    toggle: { label: L({ vi: "Sử dụng DynamoDB global tables", en: "Use DynamoDB global tables" }), initial: false },
    action: L({ vi: "Đặt hàng", en: "Place order" }),
    layout: (gt) => ({
      viewBox: VB,
      aria: L({ vi: "Ba Region, mỗi Region có một bản sao database; người dùng tại Frankfurt ghi đơn hàng", en: "Three Regions, each with a copy of the database; a user in Frankfurt writes an order" }),
      boxes: BOXES,
      nodes: [
        { id: "de", x: X.fra + UX, y: UY, l1: L({ vi: "Người dùng Đức", en: "German user" }), user: true },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora primary", l2: gt ? L({ vi: "đọc + ghi", en: "read + write" }) : L({ vi: "tiếp nhận mọi request ghi", en: "takes every write" }) },
        { id: "fra", x: X.fra + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora secondary", l2: gt ? L({ vi: "đọc + ghi", en: "read + write" }) : L({ vi: "chỉ đọc", en: "read-only" }) },
        { id: "us", x: X.us + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora secondary", l2: gt ? L({ vi: "đọc + ghi", en: "read + write" }) : L({ vi: "chỉ đọc", en: "read-only" }) },
      ],
      links: [["de", "fra"], ["sg", "fra"], ["fra", "us"]],
    }),
    run: (gt) => gt
      ? { steps: [
            { at: "fra", state: "pass", flash: "~5 ms", roundTrip: true, msg: L({ vi: "Ghi ngay vào replica tại Frankfurt và phản hồi người dùng.", en: "Writes straight to the Frankfurt replica and responds to the user." }) },
            { at: "sg", from: "fra", state: "change", tag: L({ vi: "SAO CHÉP", en: "REPLICATE" }), msg: L({ vi: "DynamoDB tự động sao chép sang Singapore, thường dưới một giây.", en: "DynamoDB replicates to Singapore automatically, usually in under one second." }) },
            { at: "us", from: "fra", state: "change", tag: L({ vi: "SAO CHÉP", en: "REPLICATE" }), msg: L({ vi: "Đồng thời sao chép sang Virginia.", en: "At the same time, it replicates to Virginia." }) },
          ], ok: true, back: false, result: L({ vi: "Mọi Region đều hỗ trợ đọc và ghi (**multi-active**). Ở chế độ MREC mặc định, khi hai Region cập nhật cùng một item gần như đồng thời, DynamoDB giữ lần ghi có timestamp nội bộ mới nhất (last writer wins).", en: "Every Region supports reads and writes (**multi-active**). In the default MREC mode, when two Regions update the same item at almost the same time, DynamoDB keeps the write with the latest internal timestamp (last writer wins)." }) }
      : { steps: [
            { at: "fra", state: "change", tag: L({ vi: "CHUYỂN", en: "FORWARD" }), msg: L({ vi: "Secondary chỉ phục vụ đọc. Request ghi phải được chuyển về primary (write forwarding cũng chỉ chuyển tiếp request).", en: "The secondary serves only reads. Write requests must go to the primary (write forwarding also just forwards the request)." }) },
            { at: "sg", state: "wait", flash: "~200 ms", msg: L({ vi: "Ghi tại Singapore, sau đó mới phản hồi về Đức.", en: "The write happens in Singapore, and only then does the response go back to Germany." }) },
          ], ok: false, result: L({ vi: "Thao tác đọc có độ trễ thấp tại Region gần người dùng, nhưng **mọi request ghi** đều phải chuyển qua một Region duy nhất. Yêu cầu ghi với độ trễ thấp tại nhiều Region: global tables.", en: "Reads have low latency in the Region near the user, but **every write request** must go through a single Region. For low-latency writes in multiple Regions: global tables." }) },
  },
  {
    name: L({ vi: "Người dùng tại Hoa Kỳ xem danh mục (SQL, JOIN)", en: "A US user browses the catalog (SQL, JOIN)" }),
    request: L({ vi: "SELECT … FROM products JOIN brands …  từ Virginia", en: "SELECT … FROM products JOIN brands …  from Virginia" }),
    toggle: { label: L({ vi: "Bật Aurora Global Database", en: "Enable Aurora Global Database" }), initial: false },
    action: L({ vi: "Xem danh mục", en: "Browse catalog" }),
    layout: (agd) => ({
      viewBox: VB,
      aria: L({ vi: "Người dùng tại Virginia đọc danh mục sản phẩm từ Aurora", en: "A user in Virginia reads the product catalog from Aurora" }),
      boxes: BOXES,
      nodes: [
        { id: "us-u", x: X.us + UX, y: UY, l1: L({ vi: "Người dùng Hoa Kỳ", en: "US user" }), user: true },
        { id: "us", x: X.us + TX, y: TY, w: 170, l1: agd ? "Aurora secondary" : L({ vi: "(chưa có bản sao)", en: "(no copy yet)" }), l2: agd ? L({ vi: "chỉ đọc", en: "read-only" }) : undefined },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: "Aurora primary", l2: L({ vi: "schema quan hệ", en: "relational schema" }) },
      ],
      links: [["us-u", "us"], ["us", "sg"]],
    }),
    run: (agd) => agd
      ? { steps: [
            { at: "us", state: "pass", flash: "~10 ms", msg: L({ vi: "Secondary tại Virginia phản hồi. Dữ liệu được sao chép ở tầng storage, độ trễ thường dưới một giây.", en: "The secondary in Virginia responds. Data is replicated at the storage layer, usually with under one second of lag." }) },
          ], ok: true, result: L({ vi: "Giữ nguyên schema, JOIN và câu SQL, không phải viết lại ứng dụng. Khi chỉ cần **đọc** tại Region gần người dùng, Aurora Global Database là đủ.", en: "The schema, JOINs and SQL stay the same; there is no need to rewrite the application. When you only need to **read** in a Region near the user, Aurora Global Database is enough." }) }
      : { steps: [
            { at: "us", state: "skip", msg: L({ vi: "Chưa có bản sao nào tại Hoa Kỳ.", en: "There is no copy in the US yet." }) },
            { at: "sg", state: "wait", flash: "~220 ms", msg: L({ vi: "Mỗi truy vấn phải truyền qua nửa vòng trái đất tới Singapore.", en: "Every query must travel halfway around the world to Singapore." }) },
          ], ok: false, result: L({ vi: "Trang danh mục có độ trễ cao đối với người dùng tại Hoa Kỳ. Bật Aurora Global Database để có bản sao chỉ đọc tại Region của người dùng.", en: "The catalog page has high latency for users in the US. Enable Aurora Global Database to get a read-only copy in the users’ Region." }) },
  },
  {
    name: L({ vi: "Region Singapore gặp sự cố", en: "Singapore Region outage" }),
    request: L({ vi: "GetItem Carts  KH#4521  từ Việt Nam", en: "GetItem Carts  KH#4521  from Vietnam" }),
    toggle: { label: L({ vi: "Bảng đã được cấu hình global table", en: "The table is a global table" }), initial: false },
    action: L({ vi: "Truy xuất giỏ hàng", en: "Get cart" }),
    layout: (gt) => ({
      viewBox: VB,
      aria: L({ vi: "Người dùng tại Việt Nam đọc giỏ hàng khi Region Singapore gặp sự cố", en: "A user in Vietnam reads their cart while the Singapore Region is down" }),
      boxes: BOXES,
      nodes: [
        { id: "vn", x: X.sg + UX, y: UY, l1: L({ vi: "Người dùng VN", en: "Vietnam user" }), user: true },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: gt ? "Replica" : "Table Carts", l2: L({ vi: "Region đang sự cố", en: "Region is down" }) },
        ...(gt
          ? [
              { id: "fra", x: X.fra + TX, y: TY, w: 170, l1: "Replica", l2: L({ vi: "đọc + ghi", en: "read + write" }) },
              { id: "us", x: X.us + TX, y: TY, w: 170, l1: "Replica", l2: L({ vi: "đọc + ghi", en: "read + write" }) },
            ]
          : []),
      ],
      links: [["vn", "sg"], ...(gt ? [["sg", "fra"], ["fra", "us"]] as [string, string][] : [])],
    }),
    run: (gt) => gt
      ? { steps: [
            { at: "sg", state: "block", flash: L({ vi: "lỗi", en: "error" }), msg: L({ vi: "Region Singapore không phản hồi.", en: "The Singapore Region does not respond." }) },
            { at: "fra", state: "pass", msg: L({ vi: "Ứng dụng chuyển sang Frankfurt (ví dụ bằng Route 53 failover). Replica tại đây có sẵn dữ liệu, đọc và ghi được ngay.", en: "The application switches to Frankfurt (for example, with Route 53 failover). The replica there already has the data and can read and write immediately." }) },
          ], ok: true, result: L({ vi: "Người dùng vẫn mua hàng bình thường. Global tables có SLA 99,999%, cao hơn mức 99,99% của bảng một Region.", en: "Users keep shopping as usual. Global tables have a 99.999% SLA, higher than the 99.99% of a single-Region table." }) }
      : { steps: [
            { at: "sg", state: "block", flash: L({ vi: "lỗi", en: "error" }), msg: L({ vi: "Bảng chỉ tồn tại tại Singapore. Khi Region gặp sự cố, không còn vị trí nào lưu dữ liệu.", en: "The table exists only in Singapore. When the Region fails, there is nowhere else that holds the data." }) },
          ], ok: false, result: L({ vi: "Toàn bộ hệ thống ngừng bán hàng cho tới khi Region phục hồi. Nếu tự xây dựng Streams + Lambda để sao chép sang Region khác, cần tự xử lý retry, xung đột và vòng lặp sao chép; global tables đã tích hợp sẵn các cơ chế này.", en: "The whole system stops selling until the Region recovers. If you build your own Streams + Lambda replication to another Region, you must handle retries, conflicts and replication loops yourself; global tables have these mechanisms built in." }) },
  },
];

export default function MultiRegionSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} hint={L({ vi: "Chọn một tình huống khi ShopViet vận hành tại ba Region, gửi request, sau đó bật tuỳ chọn cấu hình để so sánh.", en: "Choose a scenario with ShopViet running in three Regions, send the request, then turn on the configuration option to compare." })} />;
}
