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
    name: "Người dùng tại Đức đặt hàng",
    request: "PutItem Orders  { id: \"DE-1001\", … }  từ Frankfurt",
    toggle: { label: "Sử dụng DynamoDB global tables", initial: false },
    action: "Đặt hàng",
    layout: (gt) => ({
      viewBox: VB,
      aria: "Ba Region, mỗi Region có một bản sao database; người dùng tại Frankfurt ghi đơn hàng",
      boxes: BOXES,
      nodes: [
        { id: "de", x: X.fra + UX, y: UY, l1: "Người dùng Đức", user: true },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora primary", l2: gt ? "đọc + ghi" : "tiếp nhận mọi request ghi" },
        { id: "fra", x: X.fra + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora secondary", l2: gt ? "đọc + ghi" : "chỉ đọc" },
        { id: "us", x: X.us + TX, y: TY, w: 170, l1: gt ? "Replica" : "Aurora secondary", l2: gt ? "đọc + ghi" : "chỉ đọc" },
      ],
      links: [["de", "fra"], ["sg", "fra"], ["fra", "us"]],
    }),
    run: (gt) => gt
      ? { steps: [
            { at: "fra", state: "pass", flash: "~5 ms", roundTrip: true, msg: "Ghi ngay vào replica tại Frankfurt và phản hồi người dùng." },
            { at: "sg", from: "fra", state: "change", tag: "SAO CHÉP", msg: "DynamoDB tự động sao chép sang Singapore, thường dưới một giây." },
            { at: "us", from: "fra", state: "change", tag: "SAO CHÉP", msg: "Đồng thời sao chép sang Virginia." },
          ], ok: true, back: false, result: "Mọi Region đều hỗ trợ đọc và ghi (**multi-active**). Khi hai Region cập nhật cùng một item gần như đồng thời, lần ghi sau cùng được giữ lại (last writer wins)." }
      : { steps: [
            { at: "fra", state: "change", tag: "CHUYỂN", msg: "Secondary chỉ phục vụ đọc. Request ghi phải được chuyển về primary (write forwarding cũng chỉ chuyển tiếp request)." },
            { at: "sg", state: "wait", flash: "~200 ms", msg: "Ghi tại Singapore, sau đó mới phản hồi về Đức." },
          ], ok: false, result: "Thao tác đọc có độ trễ thấp tại Region gần người dùng, nhưng **mọi request ghi** đều phải chuyển qua một Region duy nhất. Yêu cầu ghi với độ trễ thấp tại nhiều Region: global tables." },
  },
  {
    name: "Người dùng tại Hoa Kỳ xem danh mục (SQL, JOIN)",
    request: "SELECT … FROM products JOIN brands …  từ Virginia",
    toggle: { label: "Bật Aurora Global Database", initial: false },
    action: "Xem danh mục",
    layout: (agd) => ({
      viewBox: VB,
      aria: "Người dùng tại Virginia đọc danh mục sản phẩm từ Aurora",
      boxes: BOXES,
      nodes: [
        { id: "us-u", x: X.us + UX, y: UY, l1: "Người dùng Hoa Kỳ", user: true },
        { id: "us", x: X.us + TX, y: TY, w: 170, l1: agd ? "Aurora secondary" : "(chưa có bản sao)", l2: agd ? "chỉ đọc" : undefined },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: "Aurora primary", l2: "schema quan hệ" },
      ],
      links: [["us-u", "us"], ["us", "sg"]],
    }),
    run: (agd) => agd
      ? { steps: [
            { at: "us", state: "pass", flash: "~10 ms", msg: "Secondary tại Virginia phản hồi. Dữ liệu được sao chép ở tầng storage, độ trễ thường dưới một giây." },
          ], ok: true, result: "Giữ nguyên schema, JOIN và câu SQL, không phải viết lại ứng dụng. Khi chỉ cần **đọc** tại Region gần người dùng, Aurora Global Database là đủ." }
      : { steps: [
            { at: "us", state: "skip", msg: "Chưa có bản sao nào tại Hoa Kỳ." },
            { at: "sg", state: "wait", flash: "~220 ms", msg: "Mỗi truy vấn phải truyền qua nửa vòng trái đất tới Singapore." },
          ], ok: false, result: "Trang danh mục có độ trễ cao đối với người dùng tại Hoa Kỳ. Bật Aurora Global Database để có bản sao chỉ đọc tại Region của người dùng." },
  },
  {
    name: "Region Singapore gặp sự cố",
    request: "GetItem Carts  KH#4521  từ Việt Nam",
    toggle: { label: "Bảng đã được cấu hình global table", initial: false },
    action: "Truy xuất giỏ hàng",
    layout: (gt) => ({
      viewBox: VB,
      aria: "Người dùng tại Việt Nam đọc giỏ hàng khi Region Singapore gặp sự cố",
      boxes: BOXES,
      nodes: [
        { id: "vn", x: X.sg + UX, y: UY, l1: "Người dùng VN", user: true },
        { id: "sg", x: X.sg + TX, y: TY, w: 170, l1: gt ? "Replica" : "Table Carts", l2: "Region đang sự cố" },
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
            { at: "sg", state: "block", flash: "lỗi", msg: "Region Singapore không phản hồi." },
            { at: "fra", state: "pass", msg: "Ứng dụng chuyển sang Frankfurt (ví dụ bằng Route 53 failover). Replica tại đây có sẵn dữ liệu, đọc và ghi được ngay." },
          ], ok: true, result: "Người dùng vẫn mua hàng bình thường. Global tables có SLA 99,999%, cao hơn mức 99,99% của bảng một Region." }
      : { steps: [
            { at: "sg", state: "block", flash: "lỗi", msg: "Bảng chỉ tồn tại tại Singapore. Khi Region gặp sự cố, không còn vị trí nào lưu dữ liệu." },
          ], ok: false, result: "Toàn bộ hệ thống ngừng bán hàng cho tới khi Region phục hồi. Nếu tự xây dựng Streams + Lambda để sao chép sang Region khác, cần tự xử lý retry, xung đột và vòng lặp sao chép; global tables đã tích hợp sẵn các cơ chế này." },
  },
];

export default function MultiRegionSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống khi ShopViet vận hành tại ba Region, gửi request, sau đó bật tuỳ chọn cấu hình để so sánh." />;
}
