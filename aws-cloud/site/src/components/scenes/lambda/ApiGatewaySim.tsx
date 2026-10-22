import PacketSim, { type PLayout, type PScenario, type PStep } from "../elb/PacketSim";

// A request to ShopViet's public API passes the checks API Gateway runs before any
// code: resource policy (IP ranges), JWT authorizer, usage plan + API key, cache. Then
// it reaches Lambda, or goes straight into SQS for slow work.

const G = { w: 84, h: 70 };
const LAYOUT: PLayout = {
  viewBox: "0 40 840 225",
  aria: "Request đi qua API Gateway: resource policy, authorizer, usage plan, cache, rồi tới Lambda hoặc SQS",
  boxes: [{ x: 118, y: 58, w: 420, h: 190, label: "API Gateway · api.shopviet.vn" }],
  nodes: [
    { id: "c", x: 52, y: 155, l1: "Client", user: true },
    { id: "ip", x: 178, y: 155, ...G, l1: "Resource", l2: "policy" },
    { id: "auth", x: 278, y: 155, ...G, l1: "Authorizer", l2: "JWT" },
    { id: "plan", x: 378, y: 155, ...G, l1: "Usage plan", l2: "API key" },
    { id: "cache", x: 478, y: 155, ...G, l1: "Cache", l2: "theo stage" },
    { id: "fn", x: 710, y: 95, w: 170, l1: "Lambda", l2: "xử lý request" },
    { id: "sqs", x: 710, y: 215, w: 170, l1: "Amazon SQS", l2: "hàng đợi phản hồi" },
  ],
  links: [["c", "ip"], ["ip", "auth"], ["auth", "plan"], ["plan", "cache"], ["cache", "fn"], ["cache", "sqs"], ["sqs", "fn"]],
};

const IP_OPEN: PStep = { at: "ip", state: "skip", msg: "API công khai, không giới hạn IP." };
const NO_JWT: PStep = { at: "auth", state: "skip", msg: "Route này không cần đăng nhập." };
const NO_PLAN: PStep = { at: "plan", state: "skip", msg: "Route này không yêu cầu API key." };
const NO_CACHE: PStep = { at: "cache", state: "skip", msg: "Không cache route này." };

const SCENARIOS: PScenario[] = [
  {
    name: "Danh sách sản phẩm bị gọi liên tục",
    request: "GET /products?category=ao",
    from: "từ app, hàng nghìn lần mỗi phút",
    toggle: { label: "Bật API caching", initial: false },
    run: (cache) => cache
      ? { steps: [IP_OPEN, NO_JWT, NO_PLAN, { at: "cache", state: "pass", tag: "HIT", flash: "HIT", msg: "Kết quả đã có trong **cache của API Gateway** (TTL 300 giây)." }],
          ok: true, result: "200 ngay từ API Gateway. Lambda và database không phải chạy lại cùng một truy vấn." }
      : { steps: [IP_OPEN, NO_JWT, NO_PLAN, NO_CACHE,
            { at: "fn", state: "change", tag: "TỐN", msg: "Mỗi request đều chạy Lambda và truy vấn database, dù kết quả giống hệt." }],
          ok: false, result: "Database quá tải vì request lặp lại. Bật caching là cách sửa ít nhất." },
  },
  {
    name: "Đối tác dùng hết quota",
    request: "GET /v1/stock   x-api-key: doi-tac-B",
    from: "từ hệ thống đối tác B",
    toggle: { label: "Đối tác B đã dùng hết 10.000 request hôm nay", initial: true },
    run: (over) => over
      ? { steps: [IP_OPEN, NO_JWT, { at: "plan", state: "block", flash: "429", msg: "API key này thuộc usage plan **Basic**: 50 request/giây, 10.000 request/ngày. Đã hết quota." }],
          ok: true, result: "429: đối tác B bị giới hạn, các đối tác khác không bị ảnh hưởng. Mỗi khách một **usage plan + API key**." }
      : { steps: [IP_OPEN, NO_JWT, { at: "plan", state: "pass", msg: "Còn quota trong usage plan Basic." }, NO_CACHE,
            { at: "fn", state: "pass", msg: "Trả số tồn kho." }],
          ok: true, result: "200: đối tác gói Pro có thể có quota cao hơn với API key khác." },
  },
  {
    name: "API nội bộ gọi từ IP lạ",
    request: "POST /admin/refund",
    from: "từ một IP ngoài văn phòng",
    toggle: { label: "Gọi từ mạng văn phòng 203.0.113.0/24", initial: false },
    run: (office) => office
      ? { steps: [{ at: "ip", state: "pass", msg: "IP nằm trong dải được phép của **resource policy**." }, NO_JWT, NO_PLAN, NO_CACHE,
            { at: "fn", state: "pass", msg: "Xử lý hoàn tiền." }],
          ok: true, result: "200: chỉ mạng văn phòng gọi được API quản trị." }
      : { steps: [{ at: "ip", state: "block", flash: "403", msg: "Resource policy từ chối mọi IP ngoài dải `203.0.113.0/24`." }],
          ok: true, result: "403: request bị chặn trước khi chạy bất kỳ dòng code nào." },
  },
  {
    name: "Khách đăng nhập xem đơn",
    request: "GET /me/orders   Authorization: Bearer eyJ…",
    from: "từ app",
    toggle: { label: "Token còn hạn", initial: true },
    run: (valid) => valid
      ? { steps: [IP_OPEN, { at: "auth", state: "pass", msg: "**HTTP API** kiểm tra JWT của OIDC provider bằng **JWT authorizer** có sẵn, không cần viết code." }, NO_PLAN, NO_CACHE,
            { at: "fn", state: "pass", msg: "Lambda nhận thông tin người dùng đã xác thực." }],
          ok: true, result: "200: đơn hàng của đúng khách đó." }
      : { steps: [IP_OPEN, { at: "auth", state: "block", flash: "401", msg: "Token hết hạn. Authorizer từ chối." }],
          ok: true, result: "401: app xin token mới rồi gọi lại." },
  },
  {
    name: "Khách gửi đánh giá",
    request: "POST /feedback  { text: \"Giao nhanh, áo đẹp\" }",
    from: "từ app",
    run: () => ({
      steps: [IP_OPEN, NO_JWT, NO_PLAN, NO_CACHE,
        { at: "sqs", state: "change", tag: "VÀO HÀNG", msg: "API Gateway đẩy thẳng message vào **SQS** rồi trả 200 cho khách ngay." },
        { at: "fn", state: "pass", msg: "Lambda đọc hàng đợi, gọi **Amazon Comprehend** để phân tích cảm xúc." }],
      ok: true,
      back: false,
      result: "Khách không phải chờ phần phân tích. Việc chậm chạy bất đồng bộ phía sau hàng đợi.",
    }),
  },
];

export default function ApiGatewaySim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} />;
}
