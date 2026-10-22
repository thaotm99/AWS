import PacketSim, { type PLayout, type PScenario, type PStep } from "./PacketSim";

// One HTTPS request through the listener of ShopViet's ALB: certificate chosen by SNI,
// AWS WAF, login with a Cognito user pool, then listener rules (path, host, wildcard
// host) pick a target group.

const G = { w: 84, h: 70 };
const LAYOUT: PLayout = {
  viewBox: "0 40 840 225",
  aria: "Request đi qua listener HTTPS của ALB: chứng chỉ SNI, AWS WAF, Cognito, listener rule, rồi tới target group",
  boxes: [{ x: 118, y: 58, w: 420, h: 190, label: "Application Load Balancer · listener HTTPS :443" }],
  nodes: [
    { id: "c", x: 52, y: 155, l1: "Khách", user: true },
    { id: "sni", x: 178, y: 155, ...G, l1: "Chứng chỉ", l2: "chọn theo SNI" },
    { id: "waf", x: 278, y: 155, ...G, l1: "AWS WAF", l2: "rule chặn" },
    { id: "auth", x: 378, y: 155, ...G, l1: "Đăng nhập", l2: "Cognito" },
    { id: "rule", x: 478, y: 155, ...G, l1: "Listener", l2: "rules" },
    { id: "orders", x: 710, y: 82, w: 170, l1: "TG orders", l2: "path /orders/*" },
    { id: "products", x: 710, y: 155, w: 170, l1: "TG products", l2: "path /products/*" },
    { id: "sub", x: 710, y: 228, w: 170, l1: "TG microsite", l2: "host *.shopviet.vn" },
  ],
  links: [["c", "sni"], ["sni", "waf"], ["waf", "auth"], ["auth", "rule"], ["rule", "orders"], ["rule", "products"], ["rule", "sub"]],
};

const SNI: PStep = { at: "sni", state: "pass", msg: "Client gửi tên `shopviet.vn`, ALB chọn chứng chỉ khớp tên đó." };
const WAF: PStep = { at: "waf", state: "pass", msg: "Không khớp rule chặn nào." };
const PUBLIC: PStep = { at: "auth", state: "skip", msg: "Trang công khai, không cần đăng nhập." };

const SCENARIOS: PScenario[] = [
  {
    name: "Xem sản phẩm",
    request: "GET https://shopviet.vn/products/ao-thun",
    from: "từ Việt Nam",
    run: () => ({
      steps: [SNI, WAF, PUBLIC,
        { at: "rule", state: "pass", msg: "Rule **path** `/products/*` khớp." },
        { at: "products", state: "pass", msg: "Một EC2 khỏe trong target group trả trang sản phẩm." }],
      ok: true, result: "200: một ALB chia được nhiều service theo đường dẫn URL (**path-based routing**).",
    }),
  },
  {
    name: "Xem đơn hàng của tôi",
    request: "GET https://shopviet.vn/orders/1024",
    from: "từ Việt Nam",
    toggle: { label: "Khách đã đăng nhập", initial: false },
    run: (logged) => logged
      ? { steps: [SNI, WAF,
            { at: "auth", state: "pass", msg: "Cookie phiên hợp lệ. ALB thêm thông tin người dùng vào header rồi cho đi tiếp." },
            { at: "rule", state: "pass", msg: "Rule **path** `/orders/*` khớp." },
            { at: "orders", state: "pass", msg: "Service đơn hàng nhận request đã xác thực." }],
          ok: true, result: "200: app đơn hàng không phải tự viết phần đăng nhập." }
      : { steps: [SNI, WAF,
            { at: "auth", state: "block", flash: "302", tag: "ĐĂNG NHẬP", msg: "Rule có action **authenticate**: ALB chuyển khách tới trang đăng nhập của **Cognito user pool**." }],
          ok: true, result: "Khách thấy trang đăng nhập. Đăng nhập xong, ALB đưa khách quay lại `/orders/1024`." },
  },
  {
    name: "Mở blog ở tên miền riêng",
    request: "GET https://blog.shopviet.vn/",
    from: "từ Việt Nam",
    toggle: { label: "Đã thêm chứng chỉ blog.shopviet.vn vào listener", initial: false },
    run: (cert) => cert
      ? { steps: [
            { at: "sni", state: "pass", msg: "Listener có nhiều chứng chỉ. Nhờ **SNI**, client báo tên `blog.shopviet.vn` và ALB chọn đúng chứng chỉ." },
            WAF, PUBLIC,
            { at: "rule", state: "pass", msg: "Rule **host** `*.shopviet.vn` khớp." },
            { at: "sub", state: "pass", msg: "Blog nằm trong target group microsite, trả trang chủ." }],
          ok: true, result: "200: một ALB, một listener HTTPS, nhiều tên miền. Không phải tạo thêm load balancer." }
      : { steps: [
            { at: "sni", state: "block", flash: "TLS", msg: "Listener chỉ có chứng chỉ `shopviet.vn`. Tên không khớp nên trình duyệt báo lỗi bảo mật." }],
          ok: false, result: "Khách thấy cảnh báo chứng chỉ. Thêm chứng chỉ của blog vào listener; ALB dùng SNI để chọn." },
  },
  {
    name: "Wildcard trong host rule",
    request: (apex) => (apex ? "GET https://shopviet.vn/" : "GET https://khuyenmai.shopviet.vn/"),
    from: "từ Việt Nam",
    toggle: { label: "Đổi sang tên gốc shopviet.vn", initial: false },
    run: (apex) => apex
      ? { steps: [SNI, WAF, PUBLIC,
            { at: "rule", state: "pass", msg: "`*.shopviet.vn` cần ít nhất một ký tự trước `.shopviet.vn`, nên **không khớp** tên gốc `shopviet.vn`. Request rơi xuống default action." },
            { at: "products", state: "pass", msg: "Default action gửi về trang chủ shop." }],
          ok: true, result: "200: tên gốc đi theo default action. Muốn tên gốc vào microsite thì phải thêm rule riêng cho `shopviet.vn`." }
      : { steps: [SNI, WAF, PUBLIC,
            { at: "rule", state: "pass", msg: "Rule **host** `*.shopviet.vn` khớp `khuyenmai.shopviet.vn` (dấu `*` khớp 0 hoặc nhiều ký tự)." },
            { at: "sub", state: "pass", msg: "Microsite khuyến mãi trả trang." }],
          ok: true, result: "200: một host rule dùng chung cho mọi subdomain, không phải thêm rule cho từng trang khuyến mãi mới." },
  },
  {
    name: "Truy cập từ nước ShopViet chưa bán",
    request: "GET https://shopviet.vn/",
    from: "từ một nước chưa mở bán",
    toggle: { label: "Gắn AWS WAF có geo match rule", initial: true },
    run: (waf) => waf
      ? { steps: [SNI, { at: "waf", state: "block", flash: "403", msg: "Rule **geo match** của AWS WAF chặn quốc gia này." }],
          ok: true, result: "403: chặn ngay tại ALB, server không phải xử lý." }
      : { steps: [SNI, { at: "waf", state: "skip", msg: "Chưa gắn web ACL nào." }, PUBLIC,
            { at: "rule", state: "pass", msg: "Default rule gửi tới trang chủ." },
            { at: "products", state: "pass", msg: "Server vẫn phải trả lời." }],
          ok: false, result: "Request tới tận server. Gắn AWS WAF vào ALB để chặn theo quốc gia." },
  },
];

export default function AlbRuleSim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} />;
}
