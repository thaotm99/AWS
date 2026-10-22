import PacketSim, { type PBox, type PScenario } from "../elb/PacketSim";

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

const BOXES: PBox[] = [
  { x: 16, y: 40, w: 252, h: 216, label: "ap-southeast-1 · Singapore" },
  { x: 284, y: 40, w: 252, h: 216, label: "eu-central-1 · Frankfurt" },
  { x: 552, y: 40, w: 252, h: 216, label: "us-east-1 · Virginia" },
];

const SCENARIOS: PScenario[] = [
  {
    name: "Khách ở Đức đặt hàng",
    request: "PutItem Orders  { id: \"DE-1001\", … }  từ Frankfurt",
    toggle: { label: "Dùng DynamoDB global tables", initial: false },
    action: "Đặt hàng",
    layout: (gt) => ({
      viewBox: VB,
      aria: "Ba Region, mỗi Region có một bản sao database; khách ở Frankfurt ghi đơn hàng",
      boxes: BOXES,
      nodes: [
        { id: "de", x: X.fra + UX, y: UY, l1: "Khách ở Đức", user: true },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora primary", l2: gt ? "đọc + ghi" : "nhận mọi lệnh ghi" },
        { id: "fra", x: X.fra + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora secondary", l2: gt ? "đọc + ghi" : "chỉ đọc" },
        { id: "us", x: X.us + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora secondary", l2: gt ? "đọc + ghi" : "chỉ đọc" },
      ],
      links: [["de", "fra"], ["sg", "fra"], ["fra", "us"]],
    }),
    run: (gt) => gt
      ? { steps: [
            { at: "fra", state: "pass", flash: "~5 ms", roundTrip: true, msg: "Ghi ngay vào replica ở Frankfurt và trả lời khách." },
            { at: "sg", from: "fra", state: "change", tag: "SAO CHÉP", msg: "DynamoDB tự sao chép sang Singapore, thường dưới một giây." },
            { at: "us", from: "fra", state: "change", tag: "SAO CHÉP", msg: "Và sang Virginia." },
          ], ok: true, back: false, result: "Mọi Region đều đọc và ghi được (**multi-active**). Hai nơi sửa cùng một item gần như cùng lúc thì lần ghi sau cùng thắng (last writer wins)." }
      : { steps: [
            { at: "fra", state: "change", tag: "CHUYỂN", msg: "Secondary chỉ đọc. Lệnh ghi phải chuyển về primary (write forwarding cũng chỉ là chuyển hộ)." },
            { at: "sg", state: "wait", flash: "~200 ms", msg: "Ghi tại Singapore, rồi mới trả lời về Đức." },
          ], ok: false, result: "Đọc thì nhanh tại chỗ, nhưng **mọi lệnh ghi** đều đi vòng qua một Region. Cần ghi nhanh ở nhiều Region: global tables." },
  },
  {
    name: "Khách ở Mỹ xem danh mục (SQL, JOIN)",
    request: "SELECT … FROM products JOIN brands …  từ Virginia",
    toggle: { label: "Bật Aurora Global Database", initial: false },
    action: "Xem danh mục",
    layout: (agd) => ({
      viewBox: VB,
      aria: "Khách ở Virginia đọc danh mục sản phẩm từ Aurora",
      boxes: BOXES,
      nodes: [
        { id: "us-u", x: X.us + UX, y: UY, l1: "Khách ở Mỹ", user: true },
        { id: "us", x: X.us + TX, y: TY, w: 170, l1: agd ? "Aurora secondary" : "(chưa có bản sao)", l2: agd ? "chỉ đọc" : undefined },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: "Aurora primary", l2: "schema quan hệ" },
      ],
      links: [["us-u", "us"], ["us", "sg"]],
    }),
    run: (agd) => agd
      ? { steps: [
            { at: "us", state: "pass", flash: "~10 ms", msg: "Secondary ở Virginia trả lời. Dữ liệu được sao chép ở tầng storage, thường trễ dưới một giây." },
          ], ok: true, result: "Giữ nguyên schema, JOIN và câu SQL, không phải viết lại app. Chỉ cần **đọc** tại chỗ thì Aurora Global Database là đủ." }
      : { steps: [
            { at: "us", state: "skip", msg: "Chưa có bản sao nào ở Mỹ." },
            { at: "sg", state: "wait", flash: "~220 ms", msg: "Mỗi truy vấn đi qua nửa vòng trái đất tới Singapore." },
          ], ok: false, result: "Trang danh mục chậm với khách Mỹ. Bật Aurora Global Database để có bản đọc ngay tại Region của khách." },
  },
  {
    name: "Region Singapore gặp sự cố",
    request: "GetItem Carts  KH#4521  từ Việt Nam",
    toggle: { label: "Bảng đã là global table", initial: false },
    action: "Mở giỏ hàng",
    layout: (gt) => ({
      viewBox: VB,
      aria: "Khách ở Việt Nam đọc giỏ hàng khi Region Singapore lỗi",
      boxes: BOXES,
      nodes: [
        { id: "vn", x: X.sg + UX, y: UY, l1: "Khách ở Việt Nam", user: true },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: gt ? "Replica" : "Table Carts", l2: "Region đang lỗi" },
        ...(gt
          ? [
              { id: "fra", x: X.fra + TX, y: TY, w: 170, l1: "Replica", l2: "đọc + ghi" },
              { id: "us", x: X.us + TX, y: TY, w: 170, l1: "Replica", l2: "đọc + ghi" },
            ]
          : []),
      ],
      links: [["vn", "sg"], ...(gt ? [["sg", "fra"], ["fra", "us"]] as [string, string][] : [])],
    }),
    run: (gt) => gt
      ? { steps: [
            { at: "sg", state: "block", flash: "lỗi", msg: "Region Singapore không trả lời." },
            { at: "fra", state: "pass", msg: "App chuyển sang Frankfurt (ví dụ bằng Route 53 failover). Replica ở đây có sẵn dữ liệu, đọc và ghi được ngay." },
          ], ok: true, result: "Khách vẫn mua được hàng. Global tables có SLA 99,999%, cao hơn 99,99% của bảng một Region." }
      : { steps: [
            { at: "sg", state: "block", flash: "lỗi", msg: "Bảng chỉ có ở Singapore. Region lỗi thì không còn nơi nào có dữ liệu." },
          ], ok: false, result: "Cả shop ngừng bán cho tới khi Region hồi phục. Tự dựng Streams + Lambda để sao chép sang Region khác thì phải tự lo retry, xung đột, vòng lặp; global tables làm sẵn những việc đó." },
  },
];

export default function MultiRegionSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống khi ShopViet chạy ở ba Region, gửi request, rồi bật công tắc để so sánh." />;
}
