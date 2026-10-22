import PacketSim, { type PLayout, type PScenario, type PStep } from "../elb/PacketSim";

// A request to ShopViet's public API passes the checks API Gateway runs before any
// code: resource policy (IP ranges), JWT authorizer, usage plan + API key, cache. Then
// it reaches Lambda, or goes straight into SQS for slow work.

const G = { w: 84, h: 70 };
const LAYOUT: PLayout = {
  viewBox: "0 40 840 225",
  aria: "Request đi qua API Gateway: resource policy, authorizer, usage plan, cache, sau đó tới Lambda hoặc SQS",
  boxes: [{ x: 118, y: 58, w: 420, h: 190, label: "API Gateway · api.shopviet.vn" }],
  nodes: [
    { id: "c", x: 52, y: 155, l1: "Client", user: true },
    { id: "ip", x: 178, y: 155, ...G, l1: "Resource", l2: "policy" },
    { id: "auth", x: 278, y: 155, ...G, l1: "Authorizer", l2: "JWT" },
    { id: "plan", x: 378, y: 155, ...G, l1: "Usage plan", l2: "API key" },
    { id: "cache", x: 478, y: 155, ...G, l1: "Cache", l2: "theo stage" },
    { id: "fn", x: 710, y: 95, w: 170, l1: "Lambda", l2: "xử lý request" },
    { id: "sqs", x: 710, y: 215, w: 170, l1: "Amazon SQS", l2: "hàng đợi feedback" },
  ],
  links: [["c", "ip"], ["ip", "auth"], ["auth", "plan"], ["plan", "cache"], ["cache", "fn"], ["cache", "sqs"], ["sqs", "fn"]],
};

const IP_OPEN: PStep = { at: "ip", state: "skip", msg: "API công khai, không giới hạn theo IP." };
const NO_JWT: PStep = { at: "auth", state: "skip", msg: "Route này không yêu cầu xác thực." };
const NO_PLAN: PStep = { at: "plan", state: "skip", msg: "Route này không yêu cầu API key." };
const NO_CACHE: PStep = { at: "cache", state: "skip", msg: "Route này không được cache." };

const SCENARIOS: PScenario[] = [
  {
    name: "Danh sách sản phẩm được gọi liên tục",
    request: "GET /products?category=ao",
    from: "nguồn: ứng dụng, hàng nghìn lần mỗi phút",
    toggle: { label: "Kích hoạt API caching", initial: false },
    run: (cache) => cache
      ? { steps: [IP_OPEN, NO_JWT, NO_PLAN, { at: "cache", state: "pass", tag: "HIT", flash: "HIT", msg: "Kết quả đã có trong **cache của API Gateway** (TTL 300 giây)." }],
          ok: true, result: "200 OK được trả về trực tiếp từ API Gateway. Lambda và database không phải xử lý lặp lại cùng một truy vấn." }
      : { steps: [IP_OPEN, NO_JWT, NO_PLAN, NO_CACHE,
            { at: "fn", state: "change", tag: "LÃNG PHÍ", msg: "Mỗi request đều thực thi Lambda và truy vấn database, dù kết quả giống hệt nhau." }],
          ok: false, result: "Database quá tải do request lặp lại. Kích hoạt caching là giải pháp ít thay đổi nhất." },
  },
  {
    name: "Đối tác sử dụng hết quota",
    request: "GET /v1/stock   x-api-key: doi-tac-B",
    from: "nguồn: hệ thống đối tác B",
    toggle: { label: "Đối tác B đã sử dụng hết 10.000 request trong ngày", initial: true },
    run: (over) => over
      ? { steps: [IP_OPEN, NO_JWT, { at: "plan", state: "block", flash: "429", msg: "API key này thuộc usage plan **Basic**: 50 request/giây, 10.000 request/ngày. Quota đã được sử dụng hết." }],
          ok: true, result: "429 Too Many Requests: đối tác B bị giới hạn, các đối tác khác không bị ảnh hưởng. Mỗi client sử dụng một **usage plan + API key** riêng." }
      : { steps: [IP_OPEN, NO_JWT, { at: "plan", state: "pass", msg: "Usage plan Basic vẫn còn quota." }, NO_CACHE,
            { at: "fn", state: "pass", msg: "Trả về số lượng tồn kho." }],
          ok: true, result: "200 OK: đối tác thuộc gói Pro có thể có quota cao hơn với API key khác." },
  },
  {
    name: "API nội bộ được gọi từ IP bên ngoài",
    request: "POST /admin/refund",
    from: "nguồn: một IP ngoài văn phòng",
    toggle: { label: "Request từ mạng văn phòng 203.0.113.0/24", initial: false },
    run: (office) => office
      ? { steps: [{ at: "ip", state: "pass", msg: "IP thuộc dải được phép trong **resource policy**." }, NO_JWT, NO_PLAN, NO_CACHE,
            { at: "fn", state: "pass", msg: "Yêu cầu hoàn tiền được xử lý." }],
          ok: true, result: "200 OK: chỉ mạng văn phòng gọi được API quản trị." }
      : { steps: [{ at: "ip", state: "block", flash: "403", msg: "Resource policy từ chối mọi IP ngoài dải `203.0.113.0/24`." }],
          ok: true, result: "403 Forbidden: request bị chặn trước khi bất kỳ dòng mã nào được thực thi." },
  },
  {
    name: "Người dùng đã đăng nhập truy xuất đơn hàng",
    request: "GET /me/orders   Authorization: Bearer eyJ…",
    from: "nguồn: ứng dụng",
    toggle: { label: "Token còn hiệu lực", initial: true },
    run: (valid) => valid
      ? { steps: [IP_OPEN, { at: "auth", state: "pass", msg: "**HTTP API** xác thực JWT do OIDC provider phát hành bằng **JWT authorizer** tích hợp sẵn, không cần viết mã." }, NO_PLAN, NO_CACHE,
            { at: "fn", state: "pass", msg: "Lambda nhận thông tin người dùng đã xác thực." }],
          ok: true, result: "200 OK: trả về đơn hàng của đúng người dùng đó." }
      : { steps: [IP_OPEN, { at: "auth", state: "block", flash: "401", msg: "Token đã hết hạn; authorizer từ chối request." }],
          ok: true, result: "401 Unauthorized: ứng dụng yêu cầu token mới và gọi lại." },
  },
  {
    name: "Người dùng gửi đánh giá",
    request: "POST /feedback  { text: \"Giao nhanh, áo đẹp\" }",
    from: "nguồn: ứng dụng",
    run: () => ({
      steps: [IP_OPEN, NO_JWT, NO_PLAN, NO_CACHE,
        { at: "sqs", state: "change", tag: "ENQUEUE", msg: "API Gateway đẩy trực tiếp message vào **SQS** và trả 200 cho người dùng ngay lập tức." },
        { at: "fn", state: "pass", msg: "Lambda đọc hàng đợi và gọi **Amazon Comprehend** để phân tích cảm xúc." }],
      ok: true,
      back: false,
      result: "Người dùng không phải chờ quá trình phân tích. Tác vụ xử lý lâu được thực hiện bất đồng bộ phía sau hàng đợi.",
    }),
  },
];

export default function ApiGatewaySim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} />;
}
