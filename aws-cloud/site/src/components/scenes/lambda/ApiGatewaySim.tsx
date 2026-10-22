import PacketSim, { type PLayout, type PScenario, type PStep } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// A request to ShopViet's public API passes the checks API Gateway runs before any
// code on a REST API: resource policy (IP ranges), Cognito user pool authorizer, usage plan + API key, cache. Then
// it reaches Lambda, or goes straight into SQS for slow work.

type Lang = ReturnType<typeof useLang>;

const G = { w: 84, h: 70 };
const layout = (L: Lang): PLayout => ({
  viewBox: "0 40 840 225",
  aria: L({ vi: "Request đi qua REST API trên API Gateway: resource policy, Cognito authorizer, usage plan, cache, sau đó tới Lambda hoặc SQS",
    en: "A request passes through a REST API on API Gateway: resource policy, Cognito authorizer, usage plan, cache, then on to Lambda or SQS" }),
  boxes: [{ x: 118, y: 58, w: 420, h: 190, label: "API Gateway REST API · api.shopviet.vn" }],
  nodes: [
    { id: "c", x: 52, y: 155, l1: "Client", user: true },
    { id: "ip", x: 178, y: 155, ...G, l1: "Resource", l2: "policy" },
    { id: "auth", x: 278, y: 155, ...G, l1: "Authorizer", l2: "Cognito" },
    { id: "plan", x: 378, y: 155, ...G, l1: "Usage plan", l2: "API key" },
    { id: "cache", x: 478, y: 155, ...G, l1: "Cache", l2: L({ vi: "theo stage", en: "per stage" }) },
    { id: "fn", x: 710, y: 95, w: 170, l1: "Lambda", l2: L({ vi: "xử lý request", en: "handles the request" }) },
    { id: "sqs", x: 710, y: 215, w: 170, l1: "Amazon SQS", l2: L({ vi: "hàng đợi feedback", en: "feedback queue" }) },
  ],
  links: [["c", "ip"], ["ip", "auth"], ["auth", "plan"], ["plan", "cache"], ["cache", "fn"], ["cache", "sqs"], ["sqs", "fn"]],
});

const scenarios = (L: Lang): PScenario[] => {
  const IP_OPEN: PStep = { at: "ip", state: "skip", msg: L({ vi: "API công khai, không giới hạn theo IP.", en: "Public API, no IP restriction." }) };
  const NO_JWT: PStep = { at: "auth", state: "skip", msg: L({ vi: "Route này không yêu cầu xác thực.", en: "This route requires no authentication." }) };
  const NO_PLAN: PStep = { at: "plan", state: "skip", msg: L({ vi: "Route này không yêu cầu API key.", en: "This route requires no API key." }) };
  const NO_CACHE: PStep = { at: "cache", state: "skip", msg: L({ vi: "Route này không được cache.", en: "This route is not cached." }) };
  const APP = L({ vi: "nguồn: ứng dụng", en: "source: app" });
  return [
  {
    name: L({ vi: "Danh sách sản phẩm được gọi liên tục", en: "Product list called constantly" }),
    request: "GET /products?category=ao",
    from: L({ vi: "nguồn: ứng dụng, hàng nghìn lần mỗi phút", en: "source: app, thousands of times a minute" }),
    toggle: { label: L({ vi: "Kích hoạt API caching", en: "Enable API caching" }), initial: false },
    run: (cache) => cache
      ? { steps: [IP_OPEN, NO_JWT, NO_PLAN, { at: "cache", state: "pass", tag: "HIT", flash: "HIT", msg: L({ vi: "Kết quả đã có trong **cache của API Gateway** (TTL 300 giây).", en: "The result is already in the **API Gateway cache** (TTL 300 seconds)." }) }],
          ok: true, result: L({ vi: "200 OK được trả về trực tiếp từ API Gateway. Lambda và database không phải xử lý lặp lại cùng một truy vấn.", en: "200 OK is returned directly from API Gateway. Lambda and the database do not have to process the same query again." }) }
      : { steps: [IP_OPEN, NO_JWT, NO_PLAN, NO_CACHE,
            { at: "fn", state: "change", tag: L({ vi: "LÃNG PHÍ", en: "WASTE" }), msg: L({ vi: "Mỗi request đều thực thi Lambda và truy vấn database, dù kết quả giống hệt nhau.", en: "Every request invokes Lambda and queries the database, even though the results are identical." }) }],
          ok: false, result: L({ vi: "Database quá tải do request lặp lại. Kích hoạt caching là giải pháp ít thay đổi nhất.", en: "The database is overloaded by repeated requests. Enabling caching is the solution with the fewest changes." }) },
  },
  {
    name: L({ vi: "Đối tác sử dụng hết quota", en: "Partner uses up its quota" }),
    request: "GET /v1/stock   x-api-key: doi-tac-B",
    from: L({ vi: "nguồn: hệ thống đối tác B", en: "source: partner B's system" }),
    toggle: { label: L({ vi: "Đối tác B đã sử dụng hết 10.000 request trong ngày", en: "Partner B has used all 10,000 requests for the day" }), initial: true },
    run: (over) => over
      ? { steps: [IP_OPEN, NO_JWT, { at: "plan", state: "block", flash: "429", msg: L({ vi: "API key này thuộc usage plan **Basic** (ví dụ: throttle 50 request/giây, quota 10.000 request/ngày). Quota đã được sử dụng hết.", en: "This API key belongs to the **Basic** usage plan (for example: throttle 50 requests/second, quota 10,000 requests/day). The quota has been used up." }) }],
          ok: true, result: L({ vi: "429 Too Many Requests: đối tác B bị giới hạn, các đối tác khác không bị ảnh hưởng. Mỗi client sử dụng một **usage plan + API key** riêng.", en: "429 Too Many Requests: partner B is limited, other partners are unaffected. Each client uses its own **usage plan + API key**." }) }
      : { steps: [IP_OPEN, NO_JWT, { at: "plan", state: "pass", msg: L({ vi: "Usage plan Basic vẫn còn quota.", en: "The Basic usage plan still has quota left." }) }, NO_CACHE,
            { at: "fn", state: "pass", msg: L({ vi: "Trả về số lượng tồn kho.", en: "Returns the stock level." }) }],
          ok: true, result: L({ vi: "200 OK: đối tác thuộc gói Pro có thể có quota cao hơn với API key khác.", en: "200 OK: partners on the Pro plan can have a higher quota with a different API key." }) },
  },
  {
    name: L({ vi: "API nội bộ được gọi từ IP bên ngoài", en: "Internal API called from an outside IP" }),
    request: "POST /admin/refund",
    from: L({ vi: "nguồn: một IP ngoài văn phòng", en: "source: an IP outside the office" }),
    toggle: { label: L({ vi: "Request từ mạng văn phòng 203.0.113.0/24", en: "Request from the office network 203.0.113.0/24" }), initial: false },
    run: (office) => office
      ? { steps: [{ at: "ip", state: "pass", msg: L({ vi: "IP thuộc dải được phép trong **resource policy**.", en: "The IP is in a range allowed by the **resource policy**." }) }, NO_JWT, NO_PLAN, NO_CACHE,
            { at: "fn", state: "pass", msg: L({ vi: "Yêu cầu hoàn tiền được xử lý.", en: "The refund request is processed." }) }],
          ok: true, result: L({ vi: "200 OK: chỉ mạng văn phòng gọi được API quản trị.", en: "200 OK: only the office network can call the admin API." }) }
      : { steps: [{ at: "ip", state: "block", flash: "403", msg: L({ vi: "Resource policy từ chối mọi IP ngoài dải `203.0.113.0/24`.", en: "The resource policy denies every IP outside `203.0.113.0/24`." }) }],
          ok: true, result: L({ vi: "403 Forbidden: request bị chặn trước khi bất kỳ dòng mã nào được thực thi.", en: "403 Forbidden: the request is blocked before any code runs." }) },
  },
  {
    name: L({ vi: "Người dùng đã đăng nhập truy xuất đơn hàng", en: "Signed-in user fetches orders" }),
    request: "GET /me/orders   Authorization: Bearer eyJ…",
    from: APP,
    toggle: { label: L({ vi: "Token còn hiệu lực", en: "Token is still valid" }), initial: true },
    run: (valid) => valid
      ? { steps: [IP_OPEN, { at: "auth", state: "pass", msg: L({ vi: "**Cognito user pool authorizer** của REST API kiểm tra token do user pool phát hành trong header Authorization, không cần viết mã. (HTTP API có **JWT authorizer** tương đương nhưng không hỗ trợ resource policy, API key và caching.)", en: "The REST API's **Cognito user pool authorizer** validates the token issued by the user pool in the Authorization header, with no code to write. (HTTP APIs have an equivalent **JWT authorizer** but do not support resource policies, API keys or caching.)" }) }, NO_PLAN, NO_CACHE,
            { at: "fn", state: "pass", msg: L({ vi: "Lambda nhận thông tin người dùng đã xác thực.", en: "Lambda receives the authenticated user's information." }) }],
          ok: true, result: L({ vi: "200 OK: trả về đơn hàng của đúng người dùng đó.", en: "200 OK: returns that user's own orders." }) }
      : { steps: [IP_OPEN, { at: "auth", state: "block", flash: "401", msg: L({ vi: "Token đã hết hạn, không hợp lệ; authorizer từ chối request.", en: "The token has expired and is invalid; the authorizer rejects the request." }) }],
          ok: true, result: L({ vi: "401 Unauthorized: ứng dụng yêu cầu token mới và gọi lại.", en: "401 Unauthorized: the app requests a new token and calls again." }) },
  },
  {
    name: L({ vi: "Người dùng gửi đánh giá", en: "User submits a review" }),
    request: L({ vi: "POST /feedback  { text: \"Giao nhanh, áo đẹp\" }", en: "POST /feedback  { text: \"Fast delivery, nice shirt\" }" }),
    from: APP,
    run: () => ({
      steps: [IP_OPEN, NO_JWT, NO_PLAN, NO_CACHE,
        { at: "sqs", state: "change", tag: "ENQUEUE", msg: L({ vi: "AWS service integration của API Gateway gửi message trực tiếp vào **SQS** (SendMessage) và trả 200 cho người dùng ngay.", en: "An API Gateway AWS service integration sends the message directly to **SQS** (SendMessage) and returns 200 to the user immediately." }) },
        { at: "fn", state: "pass", msg: L({ vi: "Lambda đọc hàng đợi và gọi **Amazon Comprehend** để phân tích cảm xúc.", en: "Lambda reads the queue and calls **Amazon Comprehend** for sentiment analysis." }) }],
      ok: true,
      back: false,
      result: L({ vi: "Người dùng không phải chờ quá trình phân tích. Tác vụ xử lý lâu được thực hiện bất đồng bộ phía sau hàng đợi.", en: "The user does not wait for the analysis. Long-running work is done asynchronously behind the queue." }),
    }),
  },
  ];
};

export default function ApiGatewaySim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} layout={layout(L)} />;
}
