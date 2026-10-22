import PacketSim, { type PLayout, type PNode, type PScenario } from "./PacketSim";

// ALB or NLB for one ShopViet need at a time. The switch swaps the load balancer;
// the packet shows what each one can and cannot do (layer 7 routing, static IP,
// TCP-only traffic, PrivateLink, TLS offload with private instances).

const lb = (nlb: boolean, x = 320, y = 140): PNode => nlb
  ? { id: "lb", x, y, w: 150, l1: "Network LB", l2: "tầng 4 · TCP/UDP" }
  : { id: "lb", x, y, w: 150, l1: "Application LB", l2: "tầng 7 · HTTP/HTTPS" };

const SWITCH = { label: "Sử dụng Network Load Balancer", initial: false };

function twoTargets(nlb: boolean, client: PNode, t1: string, t2: string, extra: PNode[] = [], links: [string, string][] = []): PLayout {
  return {
    viewBox: "0 40 820 210",
    aria: "Request đi từ client qua load balancer tới các EC2 phía sau",
    boxes: [{ x: 520, y: 58, w: 280, h: 172, label: "Target group" }],
    nodes: [client, lb(nlb), { id: "t1", x: 660, y: 112, w: 170, l1: t1, l2: "AZ a" }, { id: "t2", x: 660, y: 188, w: 170, l1: t2, l2: "AZ b" }, ...extra],
    links: [[client.id, extra[0]?.id ?? "lb"], ...links, ["lb", "t1"], ["lb", "t2"]],
  };
}

const SCENARIOS: PScenario[] = [
  {
    name: "Truy xuất trang sản phẩm",
    request: "GET https://shopviet.vn/products/ao-thun",
    from: "nguồn: trình duyệt",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 70, y: 140, l1: "Người dùng", user: true }, "EC2 products", "EC2 orders"),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: "NLB chỉ nhận biết kết nối TCP cổng 443; không phân tích được URL nên không xác định được path `/products`." },
            { at: "t2", state: "block", flash: "404", msg: "Kết nối được chuyển tới máy chủ **orders**, vốn không phục vụ trang sản phẩm." },
          ], ok: false, result: "Người dùng nhận lỗi khi request được chuyển tới sai máy chủ. Định tuyến theo path của URL yêu cầu **ALB**." }
      : { steps: [
            { at: "lb", state: "pass", msg: "ALB phân tích path `/products/*` và định tuyến tới target group **products**." },
            { at: "t1", state: "pass", msg: "Máy chủ sản phẩm trả về trang." },
          ], ok: true, result: "200 OK: ALB hoạt động ở tầng 7 nên định tuyến được theo path, host và header." },
  },
  {
    name: "Firewall ngân hàng chỉ chấp nhận IP cố định",
    request: "POST https://pay.shopviet.vn/callback",
    from: "nguồn: hệ thống ngân hàng",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 60, y: 140, l1: "Ngân hàng", user: true }, "EC2 thanh toán", "EC2 thanh toán",
      [{ id: "fw", x: 170, y: 140, w: 110, l1: "Firewall", l2: "allow list IP" }], [["fw", "lb"]]),
    run: (nlb) => nlb
      ? { steps: [
            { at: "fw", state: "pass", msg: "NLB có **một IP tĩnh cho mỗi AZ** (hỗ trợ gắn Elastic IP). Ngân hàng đã đưa hai IP này vào allow list." },
            { at: "lb", state: "pass", msg: "Chuyển kết nối tới máy chủ thanh toán healthy." },
            { at: "t1", state: "pass", msg: "Callback được tiếp nhận. ASG phía sau vẫn tự động scale." },
          ], ok: true, result: "Ngân hàng kết nối thành công. **NLB + Auto Scaling group** cung cấp IP cố định, đồng thời đảm bảo khả năng chịu lỗi và khả năng mở rộng." }
      : { steps: [
            { at: "fw", state: "block", flash: "DROP", msg: "IP của ALB do AWS cấp phát và **thay đổi theo thời gian**. IP này không có trong allow list của firewall ngân hàng." },
          ], ok: false, result: "Callback thanh toán bị chặn. Không thể cung cấp cho đối tác một IP cố định của ALB." },
  },
  {
    name: "SSH vào bastion",
    request: "ssh ec2-user@bastion.shopviet.vn   # TCP 22",
    from: "nguồn: máy trạm kỹ sư",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 70, y: 140, l1: "Kỹ sư", user: true }, "Bastion", "Bastion"),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: "Listener **TCP 22** chuyển tiếp kết nối mà không cần phân tích giao thức tầng ứng dụng." },
            { at: "t1", state: "pass", msg: "Bastion trong Auto Scaling group tiếp nhận phiên SSH. Khi một instance lỗi, ASG thay thế bằng instance mới." },
          ], ok: true, result: "Kết nối SSH thành công. Đặt NLB trước ASG chạy bastion đảm bảo bastion luôn sẵn sàng." }
      : { steps: [
            { at: "lb", state: "block", flash: "✕", msg: "ALB chỉ hỗ trợ listener HTTP và HTTPS. SSH không phải giao thức HTTP nên không được chuyển tiếp." },
          ], ok: false, result: "Không thể SSH qua ALB. Với traffic TCP hoặc UDP thuần, sử dụng **NLB**." },
  },
  {
    name: "VPC đối tác gọi API private",
    request: "GET https://api.shopviet.internal/stock",
    from: "nguồn: VPC của đối tác",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 60, y: 140, l1: "VPC đối tác", user: true }, "EC2 kho hàng", "EC2 kho hàng",
      [{ id: "ep", x: 170, y: 140, w: 110, l1: "Interface", l2: "endpoint" }], [["ep", "lb"]]),
    run: (nlb) => nlb
      ? { steps: [
            { at: "ep", state: "pass", msg: "Interface endpoint trong VPC đối tác kết nối tới **endpoint service** (PrivateLink) của ShopViet." },
            { at: "lb", state: "pass", msg: "Endpoint service sử dụng NLB làm backend." },
            { at: "t1", state: "pass", msg: "API tồn kho phản hồi. Không cần VPC peering, không đi qua Internet." },
          ], ok: true, result: "Đối tác gọi được API qua mạng nội bộ của AWS. Phía cung cấp dịch vụ PrivateLink sử dụng **NLB**." }
      : { steps: [
            { at: "ep", state: "block", msg: "Không tạo được endpoint service trỏ tới ALB. PrivateLink yêu cầu NLB (hoặc Gateway Load Balancer) ở phía cung cấp dịch vụ." },
          ], ok: false, result: "Đối tác chưa kết nối được. Cần đặt NLB trước dịch vụ, sau đó tạo endpoint service." },
  },
  {
    name: "Ẩn máy chủ khỏi Internet",
    request: "HTTPS (TLS) tới api.shopviet.vn",
    from: "nguồn: người dùng và một client không xác định",
    toggle: { label: "EC2 nằm trong private subnet", initial: false },
    layout: () => ({
      viewBox: "0 40 820 210",
      aria: "NLB tại public subnet thực hiện TLS termination, các EC2 nằm ở subnet phía sau, một client không xác định thử kết nối trực tiếp tới EC2",
      boxes: [{ x: 230, y: 58, w: 180, h: 172, label: "Public subnet" }, { x: 520, y: 58, w: 280, h: 172, label: "Subnet của EC2" }],
      nodes: [
        { id: "c", x: 70, y: 92, l1: "Người dùng", user: true },
        lb(true, 320, 140),
        { id: "t1", x: 660, y: 112, w: 170, l1: "EC2 API", l2: "Auto Scaling group" },
        { id: "t2", x: 660, y: 188, w: 170, l1: "EC2 API", l2: "Auto Scaling group" },
        { id: "x", x: 70, y: 188, l1: "Client ngoài", user: true },
      ],
      links: [["c", "lb"], ["lb", "t1"], ["lb", "t2"], ["x", "t2"]],
    }),
    run: (priv) => ({
      steps: [
        { at: "lb", state: "change", tag: "GIẢI MÃ", msg: "NLB có listener **TLS**: giải mã được thực hiện tại load balancer, EC2 không tiêu tốn CPU cho tác vụ này." },
        { at: "t1", state: "pass", msg: "Máy chủ tiếp nhận request đã giải mã." },
        priv
          ? { at: "t2", from: "x", state: "block", flash: "✕", msg: "EC2 trong **private subnet** không có public IP; client bên ngoài không có đường truy cập trực tiếp." }
          : { at: "t2", from: "x", state: "pass", msg: "EC2 trong public subnet có public IP; client bên ngoài truy cập trực tiếp được và bỏ qua load balancer." },
      ],
      ok: priv,
      result: priv
        ? "Cấu hình an toàn: chỉ NLB tại public subnet tiếp nhận traffic; ASG nằm trong private subnet."
        : "Máy chủ bị lộ ra Internet. Cần chuyển Auto Scaling group sang private subnet, chỉ giữ NLB tại public subnet.",
    }),
  },
];

export default function LbTypeSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một yêu cầu của ShopViet, sau đó nhấn Gửi request (cấu hình hiện tại: ALB). Bật tuỳ chọn để chuyển sang NLB." />;
}
