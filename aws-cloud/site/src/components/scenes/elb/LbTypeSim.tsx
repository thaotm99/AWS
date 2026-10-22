import PacketSim, { type PLayout, type PNode, type PScenario } from "./PacketSim";

// ALB or NLB for one ShopViet need at a time. The switch swaps the load balancer;
// the packet shows what each one can and cannot do (layer 7 routing, static IP,
// TCP-only traffic, PrivateLink, TLS offload with private instances).

const lb = (nlb: boolean, x = 320, y = 140): PNode => nlb
  ? { id: "lb", x, y, w: 150, l1: "Network LB", l2: "tầng 4 · TCP/UDP" }
  : { id: "lb", x, y, w: 150, l1: "Application LB", l2: "tầng 7 · HTTP/HTTPS" };

const SWITCH = { label: "Dùng Network Load Balancer", initial: false };

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
    name: "Khách mở trang sản phẩm",
    request: "GET https://shopviet.vn/products/ao-thun",
    from: "từ trình duyệt",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 70, y: 140, l1: "Khách", user: true }, "EC2 products", "EC2 orders"),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: "NLB chỉ thấy kết nối TCP cổng 443. Nó không đọc được URL nên không biết đây là `/products`." },
            { at: "t2", state: "block", flash: "404", msg: "Kết nối rơi vào server **orders**. Server này không có trang sản phẩm." },
          ], ok: false, result: "Khách gặp lỗi khi rơi vào sai server. Muốn chia theo đường dẫn URL thì cần **ALB**." }
      : { steps: [
            { at: "lb", state: "pass", msg: "ALB đọc đường dẫn `/products/*` và gửi tới target group **products**." },
            { at: "t1", state: "pass", msg: "Server sản phẩm trả trang." },
          ], ok: true, result: "200: ALB làm việc ở tầng 7 nên chia được theo path, host và header." },
  },
  {
    name: "Ngân hàng chỉ mở firewall cho IP cố định",
    request: "POST https://pay.shopviet.vn/callback",
    from: "từ hệ thống ngân hàng",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 60, y: 140, l1: "Ngân hàng", user: true }, "EC2 thanh toán", "EC2 thanh toán",
      [{ id: "fw", x: 170, y: 140, w: 110, l1: "Firewall", l2: "chỉ mở IP đã khai" }], [["fw", "lb"]]),
    run: (nlb) => nlb
      ? { steps: [
            { at: "fw", state: "pass", msg: "NLB có **một IP tĩnh cho mỗi AZ** (gắn được Elastic IP). Ngân hàng đã khai hai IP này từ trước." },
            { at: "lb", state: "pass", msg: "Chuyển kết nối tới server thanh toán khỏe." },
            { at: "t1", state: "pass", msg: "Nhận callback. ASG phía sau vẫn tự scale được." },
          ], ok: true, result: "Ngân hàng gọi được. **NLB + Auto Scaling group** cho IP cố định mà vẫn chịu lỗi và co giãn." }
      : { steps: [
            { at: "fw", state: "block", flash: "DROP", msg: "IP của ALB do AWS cấp và **thay đổi theo thời gian**. Firewall ngân hàng không có IP này trong danh sách." },
          ], ok: false, result: "Callback thanh toán bị chặn. Không thể đưa IP của ALB cho đối tác giữ cố định." },
  },
  {
    name: "Kỹ sư SSH vào bastion",
    request: "ssh ec2-user@bastion.shopviet.vn   # TCP 22",
    from: "từ máy kỹ sư",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 70, y: 140, l1: "Kỹ sư", user: true }, "Bastion", "Bastion"),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: "Listener **TCP 22** chuyển tiếp kết nối, không cần hiểu giao thức bên trong." },
            { at: "t1", state: "pass", msg: "Bastion trong Auto Scaling group nhận phiên SSH. Một máy hỏng thì ASG thay máy mới." },
          ], ok: true, result: "SSH vào được. NLB đứng trước ASG chạy bastion là cách giữ bastion luôn sẵn sàng." }
      : { steps: [
            { at: "lb", state: "block", flash: "✕", msg: "ALB chỉ có listener HTTP và HTTPS. SSH không phải HTTP nên không đi qua được." },
          ], ok: false, result: "Không SSH được qua ALB. Với TCP hoặc UDP thuần thì dùng **NLB**." },
  },
  {
    name: "Cho VPC đối tác gọi API riêng",
    request: "GET https://api.shopviet.internal/stock",
    from: "từ VPC của đối tác",
    toggle: SWITCH,
    layout: (nlb) => twoTargets(nlb, { id: "c", x: 60, y: 140, l1: "VPC đối tác", user: true }, "EC2 kho hàng", "EC2 kho hàng",
      [{ id: "ep", x: 170, y: 140, w: 110, l1: "Interface", l2: "endpoint" }], [["ep", "lb"]]),
    run: (nlb) => nlb
      ? { steps: [
            { at: "ep", state: "pass", msg: "Endpoint trong VPC đối tác nối tới **endpoint service** (PrivateLink) của ShopViet." },
            { at: "lb", state: "pass", msg: "Endpoint service đứng sau NLB." },
            { at: "t1", state: "pass", msg: "API tồn kho trả lời. Không cần peering, không đi qua internet." },
          ], ok: true, result: "Đối tác gọi được API qua mạng riêng của AWS. Phía cung cấp PrivateLink dùng **NLB**." }
      : { steps: [
            { at: "ep", state: "block", msg: "Không tạo được endpoint service trỏ vào ALB. PrivateLink cần NLB (hoặc Gateway Load Balancer) phía cung cấp." },
          ], ok: false, result: "Đối tác chưa kết nối được. Đặt NLB trước dịch vụ rồi tạo endpoint service." },
  },
  {
    name: "Giấu server khỏi internet",
    request: "HTTPS (TLS) tới api.shopviet.vn",
    from: "khách và một người lạ",
    toggle: { label: "EC2 nằm trong private subnet", initial: false },
    layout: () => ({
      viewBox: "0 40 820 210",
      aria: "NLB ở public subnet giải mã TLS, các EC2 ở subnet phía sau, một người lạ thử gọi thẳng vào EC2",
      boxes: [{ x: 230, y: 58, w: 180, h: 172, label: "Public subnet" }, { x: 520, y: 58, w: 280, h: 172, label: "Subnet của EC2" }],
      nodes: [
        { id: "c", x: 70, y: 92, l1: "Khách", user: true },
        lb(true, 320, 140),
        { id: "t1", x: 660, y: 112, w: 170, l1: "EC2 API", l2: "Auto Scaling group" },
        { id: "t2", x: 660, y: 188, w: 170, l1: "EC2 API", l2: "Auto Scaling group" },
        { id: "x", x: 70, y: 188, l1: "Người lạ", user: true },
      ],
      links: [["c", "lb"], ["lb", "t1"], ["lb", "t2"], ["x", "t2"]],
    }),
    run: (priv) => ({
      steps: [
        { at: "lb", state: "change", tag: "GIẢI MÃ", msg: "NLB có listener **TLS**: giải mã ngay tại load balancer, EC2 không phải tốn CPU cho việc này." },
        { at: "t1", state: "pass", msg: "Server nhận request đã giải mã." },
        priv
          ? { at: "t2", from: "x", state: "block", flash: "✕", msg: "EC2 trong **private subnet** không có IP public. Người lạ không có đường vào." }
          : { at: "t2", from: "x", state: "pass", msg: "EC2 ở public subnet có IP public. Người lạ gọi thẳng được, bỏ qua load balancer." },
      ],
      ok: priv,
      result: priv
        ? "An toàn: chỉ NLB ở public subnet nhận traffic, còn ASG nằm ở private subnet."
        : "Server bị lộ. Chuyển Auto Scaling group sang private subnet, chỉ để NLB ở public subnet.",
    }),
  },
];

export default function LbTypeSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một việc ShopViet cần làm rồi bấm Gửi request (đang dùng ALB). Bật công tắc để đổi sang NLB." />;
}
