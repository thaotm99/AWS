import PacketSim, { type PLayout, type PScenario, type PStep } from "./PacketSim";

// One HTTPS request through the listener of ShopViet's ALB: certificate chosen by SNI,
// AWS WAF, login with a Cognito user pool, then listener rules (path, host, wildcard
// host) pick a target group.

const G = { w: 84, h: 70 };
const LAYOUT: PLayout = {
  viewBox: "0 40 840 225",
  aria: "Request đi qua listener HTTPS của ALB: chứng chỉ SNI, AWS WAF, Cognito, listener rule, sau đó tới target group",
  boxes: [{ x: 118, y: 58, w: 420, h: 190, label: "Application Load Balancer · listener HTTPS :443" }],
  nodes: [
    { id: "c", x: 52, y: 155, l1: "Người dùng", user: true },
    { id: "sni", x: 178, y: 155, ...G, l1: "Chứng chỉ", l2: "chọn theo SNI" },
    { id: "waf", x: 278, y: 155, ...G, l1: "AWS WAF", l2: "web ACL" },
    { id: "auth", x: 378, y: 155, ...G, l1: "Xác thực", l2: "Cognito" },
    { id: "rule", x: 478, y: 155, ...G, l1: "Listener", l2: "rules" },
    { id: "orders", x: 710, y: 82, w: 170, l1: "TG orders", l2: "path /orders/*" },
    { id: "products", x: 710, y: 155, w: 170, l1: "TG products", l2: "path /products/*" },
    { id: "sub", x: 710, y: 228, w: 170, l1: "TG microsite", l2: "host *.shopviet.vn" },
  ],
  links: [["c", "sni"], ["sni", "waf"], ["waf", "auth"], ["auth", "rule"], ["rule", "orders"], ["rule", "products"], ["rule", "sub"]],
};

const SNI: PStep = { at: "sni", state: "pass", msg: "Client gửi tên miền `shopviet.vn` qua SNI; ALB chọn chứng chỉ tương ứng." };
const WAF: PStep = { at: "waf", state: "pass", msg: "Request không khớp rule chặn nào trong web ACL." };
const PUBLIC: PStep = { at: "auth", state: "skip", msg: "Trang công khai, không yêu cầu xác thực." };

const SCENARIOS: PScenario[] = [
  {
    name: "Truy xuất trang sản phẩm",
    request: "GET https://shopviet.vn/products/ao-thun",
    from: "nguồn: Việt Nam",
    run: () => ({
      steps: [SNI, WAF, PUBLIC,
        { at: "rule", state: "pass", msg: "Request khớp rule **path** `/products/*`." },
        { at: "products", state: "pass", msg: "Một EC2 healthy trong target group trả về trang sản phẩm." }],
      ok: true, result: "200 OK: một ALB định tuyến tới nhiều service theo path của URL (**path-based routing**).",
    }),
  },
  {
    name: "Truy xuất đơn hàng cá nhân",
    request: "GET https://shopviet.vn/orders/1024",
    from: "nguồn: Việt Nam",
    toggle: { label: "Người dùng đã đăng nhập", initial: false },
    run: (logged) => logged
      ? { steps: [SNI, WAF,
            { at: "auth", state: "pass", msg: "Session cookie hợp lệ. ALB bổ sung thông tin người dùng vào header và chuyển tiếp request." },
            { at: "rule", state: "pass", msg: "Request khớp rule **path** `/orders/*`." },
            { at: "orders", state: "pass", msg: "Service đơn hàng tiếp nhận request đã xác thực." }],
          ok: true, result: "200 OK: ứng dụng đơn hàng không cần tự triển khai chức năng xác thực." }
      : { steps: [SNI, WAF,
            { at: "auth", state: "block", flash: "302", tag: "XÁC THỰC", msg: "Rule có action **authenticate**: ALB chuyển hướng người dùng tới trang đăng nhập của **Cognito user pool**." }],
          ok: true, result: "Người dùng được chuyển tới trang đăng nhập. Sau khi xác thực thành công, ALB chuyển hướng người dùng trở lại `/orders/1024`." },
  },
  {
    name: "Blog trên tên miền riêng",
    request: "GET https://blog.shopviet.vn/",
    from: "nguồn: Việt Nam",
    toggle: { label: "Đã thêm chứng chỉ blog.shopviet.vn vào listener", initial: false },
    run: (cert) => cert
      ? { steps: [
            { at: "sni", state: "pass", msg: "Listener có nhiều chứng chỉ. Thông qua **SNI**, client gửi tên miền `blog.shopviet.vn` và ALB chọn chứng chỉ tương ứng." },
            WAF, PUBLIC,
            { at: "rule", state: "pass", msg: "Request khớp rule **host** `*.shopviet.vn`." },
            { at: "sub", state: "pass", msg: "Blog thuộc target group microsite, trả về trang chủ." }],
          ok: true, result: "200 OK: một ALB, một listener HTTPS phục vụ nhiều tên miền; không cần tạo thêm load balancer." }
      : { steps: [
            { at: "sni", state: "block", flash: "TLS", msg: "Listener chỉ có chứng chỉ `shopviet.vn`. Tên miền không khớp nên trình duyệt báo lỗi bảo mật." }],
          ok: false, result: "Người dùng nhận cảnh báo chứng chỉ. Cần thêm chứng chỉ của blog vào listener; ALB sử dụng SNI để lựa chọn." },
  },
  {
    name: "Wildcard trong host rule",
    request: (apex) => (apex ? "GET https://shopviet.vn/" : "GET https://khuyenmai.shopviet.vn/"),
    from: "nguồn: Việt Nam",
    toggle: { label: "Chuyển sang tên miền gốc shopviet.vn", initial: false },
    run: (apex) => apex
      ? { steps: [SNI, WAF, PUBLIC,
            { at: "rule", state: "pass", msg: "`*.shopviet.vn` yêu cầu ít nhất một ký tự trước `.shopviet.vn`, do đó **không khớp** tên miền gốc `shopviet.vn`. Request được xử lý bởi default action." },
            { at: "products", state: "pass", msg: "Default action chuyển request tới trang chủ cửa hàng." }],
          ok: true, result: "200 OK: tên miền gốc được xử lý bởi default action. Để định tuyến tên miền gốc tới microsite, cần thêm rule riêng cho `shopviet.vn`." }
      : { steps: [SNI, WAF, PUBLIC,
            { at: "rule", state: "pass", msg: "Rule **host** `*.shopviet.vn` khớp `khuyenmai.shopviet.vn` (ký tự `*` khớp 0 hoặc nhiều ký tự)." },
            { at: "sub", state: "pass", msg: "Microsite khuyến mãi trả về nội dung." }],
          ok: true, result: "200 OK: một host rule áp dụng cho mọi subdomain; không cần thêm rule cho từng trang khuyến mãi mới." },
  },
  {
    name: "Truy cập từ quốc gia chưa kinh doanh",
    request: "GET https://shopviet.vn/",
    from: "nguồn: quốc gia chưa kinh doanh",
    toggle: { label: "Liên kết AWS WAF có geo match rule", initial: true },
    run: (waf) => waf
      ? { steps: [SNI, { at: "waf", state: "block", flash: "403", msg: "Rule **geo match** của AWS WAF chặn request từ quốc gia này." }],
          ok: true, result: "403 Forbidden: request bị chặn tại ALB, không phát sinh tải cho máy chủ." }
      : { steps: [SNI, { at: "waf", state: "skip", msg: "Chưa liên kết web ACL nào." }, PUBLIC,
            { at: "rule", state: "pass", msg: "Default rule chuyển request tới trang chủ." },
            { at: "products", state: "pass", msg: "Máy chủ vẫn phải xử lý request." }],
          ok: false, result: "Request được chuyển tới máy chủ. Cần liên kết AWS WAF với ALB để chặn theo quốc gia." },
  },
];

export default function AlbRuleSim() {
  return <PacketSim scenarios={SCENARIOS} layout={LAYOUT} />;
}
