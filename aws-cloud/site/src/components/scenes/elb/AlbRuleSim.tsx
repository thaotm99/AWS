import PacketSim, { type PLayout, type PScenario, type PStep } from "./PacketSim";
import { useLang } from "../../../lib/lang";

// One HTTPS request through the listener of ShopViet's ALB: certificate chosen by SNI,
// AWS WAF, login with a Cognito user pool, then listener rules (path, host, wildcard
// host) pick a target group.

type Lang = ReturnType<typeof useLang>;

const G = { w: 84, h: 70 };
const layout = (L: Lang): PLayout => ({
  viewBox: "0 40 840 225",
  aria: L({ vi: "Request đi qua listener HTTPS của ALB: chứng chỉ SNI, AWS WAF, Cognito, listener rule, sau đó tới target group",
    en: "A request passes through the ALB's HTTPS listener: SNI certificate, AWS WAF, Cognito, listener rule, then on to a target group" }),
  boxes: [{ x: 118, y: 58, w: 420, h: 190, label: "Application Load Balancer · listener HTTPS :443" }],
  nodes: [
    { id: "c", x: 52, y: 155, l1: L({ vi: "Người dùng", en: "User" }), user: true },
    { id: "sni", x: 178, y: 155, ...G, l1: L({ vi: "Chứng chỉ", en: "Certificate" }), l2: L({ vi: "chọn theo SNI", en: "chosen by SNI" }) },
    { id: "waf", x: 278, y: 155, ...G, l1: "AWS WAF", l2: "web ACL" },
    { id: "auth", x: 378, y: 155, ...G, l1: "Action", l2: "authenticate" },
    { id: "rule", x: 478, y: 155, ...G, l1: "Rule", l2: "forward" },
    { id: "orders", x: 710, y: 82, w: 170, l1: "TG orders", l2: "path /orders/*" },
    { id: "products", x: 710, y: 155, w: 170, l1: "TG products", l2: "path /products/*" },
    { id: "sub", x: 710, y: 228, w: 170, l1: "TG microsite", l2: "host *.shopviet.vn" },
  ],
  links: [["c", "sni"], ["sni", "waf"], ["waf", "auth"], ["auth", "rule"], ["rule", "orders"], ["rule", "products"], ["rule", "sub"]],
});

const scenarios = (L: Lang): PScenario[] => {
  const SNI: PStep = { at: "sni", state: "pass", msg: L({ vi: "Client gửi tên miền `shopviet.vn` qua SNI; ALB chọn chứng chỉ tương ứng.", en: "The client sends the domain name `shopviet.vn` through SNI; the ALB picks the matching certificate." }) };
  const WAF: PStep = { at: "waf", state: "pass", msg: L({ vi: "Request không khớp rule chặn nào trong web ACL.", en: "The request matches no blocking rule in the web ACL." }) };
  const PUBLIC: PStep = { at: "auth", state: "skip", msg: L({ vi: "Trang công khai, không yêu cầu xác thực.", en: "Public page; no authentication required." }) };
  const VN = L({ vi: "nguồn: Việt Nam", en: "source: Vietnam" });
  return [
  {
    name: L({ vi: "Truy xuất trang sản phẩm", en: "Fetch a product page" }),
    request: "GET https://shopviet.vn/products/ao-thun",
    from: VN,
    run: () => ({
      steps: [SNI, WAF, PUBLIC,
        { at: "rule", state: "pass", msg: L({ vi: "Request khớp rule **path** `/products/*`.", en: "The request matches the **path** rule `/products/*`." }) },
        { at: "products", state: "pass", msg: L({ vi: "Một EC2 healthy trong target group trả về trang sản phẩm.", en: "A healthy EC2 instance in the target group returns the product page." }) }],
      ok: true, result: L({ vi: "200 OK: một ALB định tuyến tới nhiều service theo path của URL (**path-based routing**).", en: "200 OK: one ALB routes to many services by URL path (**path-based routing**)." }),
    }),
  },
  {
    name: L({ vi: "Truy xuất đơn hàng cá nhân", en: "Fetch a personal order" }),
    request: "GET https://shopviet.vn/orders/1024",
    from: VN,
    toggle: { label: L({ vi: "Người dùng đã đăng nhập", en: "User is signed in" }), initial: false },
    run: (logged) => logged
      ? { steps: [SNI, WAF,
            { at: "auth", state: "pass", msg: L({ vi: "Session cookie hợp lệ. ALB bổ sung thông tin người dùng vào header và chuyển tiếp request.", en: "The session cookie is valid. The ALB adds the user's information to headers and forwards the request." }) },
            { at: "rule", state: "pass", msg: L({ vi: "Request khớp rule **path** `/orders/*`.", en: "The request matches the **path** rule `/orders/*`." }) },
            { at: "orders", state: "pass", msg: L({ vi: "Service đơn hàng tiếp nhận request đã xác thực.", en: "The orders service receives an authenticated request." }) }],
          ok: true, result: L({ vi: "200 OK: ứng dụng đơn hàng không cần tự triển khai chức năng xác thực.", en: "200 OK: the orders application does not need to implement authentication itself." }) }
      : { steps: [SNI, WAF,
            { at: "auth", state: "block", flash: "302", tag: L({ vi: "XÁC THỰC", en: "AUTHN" }), msg: L({ vi: "Rule có action **authenticate**: ALB chuyển hướng người dùng tới trang đăng nhập của **Cognito user pool**.", en: "The rule has an **authenticate** action: the ALB redirects the user to the **Cognito user pool** sign-in page." }) }],
          ok: true, result: L({ vi: "Người dùng được chuyển tới trang đăng nhập. Sau khi xác thực thành công, ALB chuyển hướng người dùng trở lại `/orders/1024`.", en: "The user is sent to the sign-in page. After successful authentication, the ALB redirects the user back to `/orders/1024`." }) },
  },
  {
    name: L({ vi: "Blog trên tên miền riêng", en: "Blog on its own domain" }),
    request: "GET https://blog.shopviet.vn/",
    from: VN,
    toggle: { label: L({ vi: "Đã thêm chứng chỉ blog.shopviet.vn vào listener", en: "blog.shopviet.vn certificate added to the listener" }), initial: false },
    run: (cert) => cert
      ? { steps: [
            { at: "sni", state: "pass", msg: L({ vi: "Listener có nhiều chứng chỉ. Thông qua **SNI**, client gửi tên miền `blog.shopviet.vn` và ALB chọn chứng chỉ tương ứng.", en: "The listener has multiple certificates. Through **SNI**, the client sends the domain name `blog.shopviet.vn` and the ALB picks the matching certificate." }) },
            WAF, PUBLIC,
            { at: "rule", state: "pass", msg: L({ vi: "Request khớp rule **host** `*.shopviet.vn`.", en: "The request matches the **host** rule `*.shopviet.vn`." }) },
            { at: "sub", state: "pass", msg: L({ vi: "Blog thuộc target group microsite, trả về trang chủ.", en: "The blog belongs to the microsite target group and returns its home page." }) }],
          ok: true, result: L({ vi: "200 OK: một ALB, một listener HTTPS phục vụ nhiều tên miền; không cần tạo thêm load balancer.", en: "200 OK: one ALB and one HTTPS listener serve multiple domains; no extra load balancer needed." }) }
      : { steps: [
            { at: "sni", state: "block", flash: "TLS", msg: L({ vi: "Listener chỉ có chứng chỉ `shopviet.vn`. Tên miền không khớp nên trình duyệt báo lỗi bảo mật.", en: "The listener has only the `shopviet.vn` certificate. The domain does not match, so the browser shows a security error." }) }],
          ok: false, result: L({ vi: "Người dùng nhận cảnh báo chứng chỉ. Cần thêm chứng chỉ của blog vào listener; ALB sử dụng SNI để lựa chọn.", en: "The user gets a certificate warning. Add the blog's certificate to the listener; the ALB uses SNI to choose." }) },
  },
  {
    name: L({ vi: "Wildcard trong host rule", en: "Wildcard in a host rule" }),
    request: (apex) => (apex ? "GET https://shopviet.vn/" : "GET https://khuyenmai.shopviet.vn/"),
    from: VN,
    toggle: { label: L({ vi: "Chuyển sang tên miền gốc shopviet.vn", en: "Switch to the apex domain shopviet.vn" }), initial: false },
    run: (apex) => apex
      ? { steps: [SNI, WAF, PUBLIC,
            { at: "rule", state: "pass", msg: L({ vi: "Theo tài liệu ALB, rule `*.shopviet.vn` **không khớp** tên miền gốc `shopviet.vn`: `*` khớp 0 hoặc nhiều ký tự, nhưng tên miền gốc không chứa chuỗi `.shopviet.vn` (có dấu chấm đứng trước). Request được xử lý bởi default action.",
              en: "According to the ALB documentation, the rule `*.shopviet.vn` **does not match** the apex domain `shopviet.vn`: `*` matches 0 or more characters, but the apex domain does not contain the string `.shopviet.vn` (with the leading dot). The request is handled by the default action." }) },
            { at: "products", state: "pass", msg: L({ vi: "Default action chuyển request tới trang chủ cửa hàng.", en: "The default action sends the request to the store's home page." }) }],
          ok: true, result: L({ vi: "200 OK: tên miền gốc được xử lý bởi default action. Để định tuyến tên miền gốc tới microsite, cần thêm rule riêng cho `shopviet.vn`.", en: "200 OK: the apex domain is handled by the default action. To route the apex domain to a microsite, add a separate rule for `shopviet.vn`." }) }
      : { steps: [SNI, WAF, PUBLIC,
            { at: "rule", state: "pass", msg: L({ vi: "Rule **host** `*.shopviet.vn` khớp `khuyenmai.shopviet.vn` (ký tự `*` khớp 0 hoặc nhiều ký tự).", en: "The **host** rule `*.shopviet.vn` matches `khuyenmai.shopviet.vn` (the `*` character matches 0 or more characters)." }) },
            { at: "sub", state: "pass", msg: L({ vi: "Microsite khuyến mãi trả về nội dung.", en: "The promotion microsite returns its content." }) }],
          ok: true, result: L({ vi: "200 OK: một host rule áp dụng cho mọi subdomain; không cần thêm rule cho từng trang khuyến mãi mới.", en: "200 OK: one host rule covers every subdomain; no new rule is needed for each new promotion site." }) },
  },
  {
    name: L({ vi: "Truy cập từ quốc gia chưa kinh doanh", en: "Access from an unserved country" }),
    request: "GET https://shopviet.vn/",
    from: L({ vi: "nguồn: quốc gia chưa kinh doanh", en: "source: unserved country" }),
    toggle: { label: L({ vi: "Liên kết AWS WAF có geo match rule", en: "Associate AWS WAF with a geo match rule" }), initial: true },
    run: (waf) => waf
      ? { steps: [SNI, { at: "waf", state: "block", flash: "403", msg: L({ vi: "Rule **geo match** của AWS WAF chặn request từ quốc gia này; phản hồi Block mặc định là 403 (Forbidden).", en: "The AWS WAF **geo match** rule blocks requests from this country; the default Block response is 403 (Forbidden)." }) }],
          ok: true, result: L({ vi: "403 Forbidden: request bị chặn tại ALB, không phát sinh tải cho máy chủ.", en: "403 Forbidden: the request is blocked at the ALB and puts no load on the servers." }) }
      : { steps: [SNI, { at: "waf", state: "skip", msg: L({ vi: "Chưa liên kết web ACL nào.", en: "No web ACL is associated." }) }, PUBLIC,
            { at: "rule", state: "pass", msg: L({ vi: "Default rule chuyển request tới trang chủ.", en: "The default rule sends the request to the home page." }) },
            { at: "products", state: "pass", msg: L({ vi: "Máy chủ vẫn phải xử lý request.", en: "The servers still have to process the request." }) }],
          ok: false, result: L({ vi: "Request được chuyển tới máy chủ. Cần liên kết AWS WAF với ALB để chặn theo quốc gia.", en: "The request reaches the servers. Associate AWS WAF with the ALB to block by country." }) },
  },
  {
    name: L({ vi: "Một IP gửi 100 request mỗi giây", en: "One IP sends 100 requests per second" }),
    request: L({ vi: "GET https://shopviet.vn/products/ao-thun × 100/giây", en: "GET https://shopviet.vn/products/ao-thun × 100/second" }),
    from: L({ vi: "nguồn: một IP (khách hàng thông thường: khoảng 5 request/giây)", en: "source: one IP (a normal customer: about 5 requests/second)" }),
    toggle: { label: L({ vi: "Web ACL có rate-based rule: 3.000 request / 5 phút / IP", en: "Web ACL has a rate-based rule: 3,000 requests / 5 minutes / IP" }), initial: false },
    run: (rate) => rate
      ? { steps: [SNI,
            { at: "waf", state: "block", flash: "403", msg: L({ vi: "**Rate-based rule** của AWS WAF đếm request theo IP nguồn trong evaluation window 5 phút: IP này gửi khoảng 30.000 request, vượt ngưỡng 3.000; khách hàng thông thường chỉ khoảng 1.500. Request vượt ngưỡng nhận action Block (403).",
              en: "The AWS WAF **rate-based rule** counts requests per source IP over a 5-minute evaluation window: this IP sends about 30,000 requests, above the 3,000 limit; a normal customer sends only about 1,500. Requests over the limit get the Block action (403)." }) }],
          ok: true, result: L({ vi: "Request vượt ngưỡng bị chặn tại ALB, máy chủ không bị quá tải; khách hàng thông thường không bị ảnh hưởng. Rate-based rule là tính năng của AWS WAF, không phải của ALB.", en: "Requests over the limit are blocked at the ALB and the servers are not overloaded; normal customers are not affected. The rate-based rule is an AWS WAF feature, not an ALB feature." }) }
      : { steps: [SNI, { at: "waf", state: "skip", msg: L({ vi: "Web ACL chưa có rule giới hạn tốc độ.", en: "The web ACL has no rate-limiting rule." }) }, PUBLIC,
            { at: "rule", state: "pass", msg: L({ vi: "Listener rule chỉ có điều kiện (host, path, header, method, query string, source IP) và action (forward, redirect, fixed-response, authenticate); không có thiết lập nào giới hạn số request.", en: "Listener rules only have conditions (host, path, header, method, query string, source IP) and actions (forward, redirect, fixed-response, authenticate); none of them limits the number of requests." }) },
            { at: "products", state: "block", flash: "503", msg: L({ vi: "Toàn bộ 100 request mỗi giây tới máy chủ sản phẩm; máy chủ quá tải và khách hàng thật bị ảnh hưởng.", en: "All 100 requests per second reach the product servers; the servers are overloaded and real customers are affected." }) }],
          ok: false, result: L({ vi: "ALB không có cơ chế giới hạn tốc độ request. Liên kết AWS WAF với ALB và thêm rate-based rule.", en: "The ALB has no built-in request rate limiting. Associate AWS WAF with the ALB and add a rate-based rule." }) },
  },
  ];
};

export default function AlbRuleSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} layout={layout(L)} />;
}
