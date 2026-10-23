import PacketSim, { type PLayout, type PNode, type PScenario } from "./PacketSim";
import { useLang } from "../../../lib/lang";

// ALB or NLB for one ShopViet need at a time. The switch swaps the load balancer;
// the packet shows what each one can and cannot do (layer 7 routing, static IP,
// TCP-only traffic, PrivateLink, TLS offload with private instances).

type Lang = ReturnType<typeof useLang>;

const lb = (L: Lang, nlb: boolean, x = 320, y = 140): PNode => nlb
  ? { id: "lb", x, y, w: 150, l1: "Network LB", l2: L({ vi: "tầng 4 · TCP/UDP/TLS", en: "layer 4 · TCP/UDP/TLS" }) }
  : { id: "lb", x, y, w: 150, l1: "Application LB", l2: L({ vi: "tầng 7 · HTTP/HTTPS", en: "layer 7 · HTTP/HTTPS" }) };

function twoTargets(L: Lang, nlb: boolean, client: PNode, t1: string, t2: string, extra: PNode[] = [], links: [string, string][] = []): PLayout {
  return {
    viewBox: "0 40 820 210",
    aria: L({ vi: "Request đi từ client qua load balancer tới các EC2 phía sau", en: "A request goes from the client through the load balancer to the EC2 instances behind it" }),
    boxes: [{ x: 520, y: 58, w: 280, h: 172, label: "Target group" }],
    nodes: [client, lb(L, nlb), { id: "t1", x: 660, y: 112, w: 170, l1: t1, l2: "AZ a" }, { id: "t2", x: 660, y: 188, w: 170, l1: t2, l2: "AZ b" }, ...extra],
    links: [[client.id, extra[0]?.id ?? "lb"], ...links, ["lb", "t1"], ["lb", "t2"]],
  };
}

const scenarios = (L: Lang): PScenario[] => {
  const SWITCH = { label: L({ vi: "Sử dụng Network Load Balancer", en: "Use a Network Load Balancer" }), initial: false };
  return [
  {
    name: L({ vi: "Truy xuất trang sản phẩm", en: "Fetch a product page" }),
    request: "GET https://shopviet.vn/products/ao-thun",
    from: L({ vi: "nguồn: trình duyệt", en: "source: browser" }),
    toggle: SWITCH,
    layout: (nlb) => twoTargets(L, nlb, { id: "c", x: 70, y: 140, l1: L({ vi: "Người dùng", en: "User" }), user: true }, "EC2 products", "EC2 orders"),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: L({ vi: "NLB chỉ nhận biết kết nối TCP cổng 443; không phân tích được URL nên không xác định được path `/products`.", en: "The NLB sees only a TCP connection on port 443; it cannot parse the URL, so it cannot identify the `/products` path." }) },
            { at: "t2", state: "block", flash: "404", msg: L({ vi: "Kết nối được chuyển tới target **orders**, vốn không phục vụ trang sản phẩm.", en: "The connection goes to the **orders** target, which does not serve product pages." }) },
          ], ok: false, result: L({ vi: "Người dùng nhận lỗi khi request được chuyển tới sai target. Định tuyến theo path của URL yêu cầu **ALB**.", en: "The user gets an error because the request went to the wrong target. Routing by URL path requires an **ALB**." }) }
      : { steps: [
            { at: "lb", state: "pass", msg: L({ vi: "ALB phân tích path `/products/*` và định tuyến tới target group **products**.", en: "The ALB parses the `/products/*` path and routes to the **products** target group." }) },
            { at: "t1", state: "pass", msg: L({ vi: "Target thuộc service sản phẩm trả về trang.", en: "A products target returns the page." }) },
          ], ok: true, result: L({ vi: "200 OK: ALB hoạt động ở tầng 7 nên định tuyến được theo path, host và header.", en: "200 OK: the ALB works at layer 7, so it can route by path, host and header." }) },
  },
  {
    name: L({ vi: "Firewall ngân hàng chỉ chấp nhận IP cố định", en: "Bank firewall accepts only fixed IPs" }),
    request: "POST https://pay.shopviet.vn/callback",
    from: L({ vi: "nguồn: hệ thống ngân hàng", en: "source: bank system" }),
    toggle: SWITCH,
    layout: (nlb) => twoTargets(L, nlb, { id: "c", x: 60, y: 140, l1: L({ vi: "Ngân hàng", en: "Bank" }), user: true }, L({ vi: "EC2 thanh toán", en: "EC2 payments" }), L({ vi: "EC2 thanh toán", en: "EC2 payments" }),
      [{ id: "fw", x: 170, y: 140, w: 110, l1: "Firewall", l2: "allow list IP" }], [["fw", "lb"]]),
    run: (nlb) => nlb
      ? { steps: [
            { at: "fw", state: "pass", msg: L({ vi: "NLB có **một IP cho mỗi AZ**; với NLB internet-facing, chọn một Elastic IP cho mỗi AZ để có IP tĩnh. Ngân hàng đã đưa hai IP này vào allow list.", en: "An NLB has **one IP per AZ**; for an internet-facing NLB, choose one Elastic IP per AZ to get static IPs. The bank has added these two IPs to its allow list." }) },
            { at: "lb", state: "pass", msg: L({ vi: "Chuyển kết nối tới một target thanh toán healthy.", en: "Forwards the connection to a healthy payment target." }) },
            { at: "t1", state: "pass", msg: L({ vi: "Callback được tiếp nhận. ASG phía sau vẫn tự động scale.", en: "The callback is received. The ASG behind it still scales automatically." }) },
          ], ok: true, result: L({ vi: "Ngân hàng kết nối thành công. **NLB + Auto Scaling group** cung cấp IP cố định, đồng thời đảm bảo khả năng chịu lỗi và khả năng mở rộng.", en: "The bank connects successfully. **NLB + Auto Scaling group** provides fixed IPs while keeping fault tolerance and scalability." }) }
      : { steps: [
            { at: "fw", state: "block", flash: "DROP", msg: L({ vi: "IP của ALB do dịch vụ ALB quản lý: không gán Elastic IP tự chọn được, và IP không còn sử dụng được trả lại pool. IP mới không có trong allow list của firewall ngân hàng.", en: "ALB IPs are managed by the ALB service: you cannot assign Elastic IPs of your choice, and IPs no longer in use go back to the pool. The new IP is not on the bank firewall's allow list." }) },
          ], ok: false, result: L({ vi: "Callback thanh toán bị chặn. Không thể cung cấp cho đối tác một IP cố định của ALB.", en: "The payment callback is blocked. You cannot give the partner a fixed IP for an ALB." }) },
  },
  {
    name: L({ vi: "SSH vào bastion", en: "SSH into a bastion" }),
    request: "ssh ec2-user@bastion.shopviet.vn   # TCP 22",
    from: L({ vi: "nguồn: máy trạm kỹ sư", en: "source: engineer workstation" }),
    toggle: SWITCH,
    layout: (nlb) => twoTargets(L, nlb, { id: "c", x: 70, y: 140, l1: L({ vi: "Kỹ sư", en: "Engineer" }), user: true }, "Bastion", "Bastion"),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: L({ vi: "Listener **TCP 22** chuyển tiếp kết nối mà không cần phân tích giao thức tầng ứng dụng.", en: "The **TCP 22** listener forwards the connection without parsing the application-layer protocol." }) },
            { at: "t1", state: "pass", msg: L({ vi: "Bastion trong Auto Scaling group tiếp nhận phiên SSH. Khi một instance lỗi, ASG thay thế bằng instance mới.", en: "A bastion in the Auto Scaling group accepts the SSH session. When an instance fails, the ASG replaces it with a new one." }) },
          ], ok: true, result: L({ vi: "Kết nối SSH thành công. Đặt NLB trước ASG chạy bastion đảm bảo bastion luôn sẵn sàng.", en: "The SSH connection succeeds. Putting an NLB in front of the bastion ASG keeps a bastion always available." }) }
      : { steps: [
            { at: "lb", state: "block", flash: "✕", msg: L({ vi: "ALB chỉ hỗ trợ listener HTTP và HTTPS. SSH không phải giao thức HTTP nên không được chuyển tiếp.", en: "An ALB supports only HTTP and HTTPS listeners. SSH is not HTTP, so it is not forwarded." }) },
          ], ok: false, result: L({ vi: "Không thể SSH qua ALB. Với traffic TCP hoặc UDP thuần, sử dụng **NLB**.", en: "You cannot SSH through an ALB. For plain TCP or UDP traffic, use an **NLB**." }) },
  },
  {
    name: L({ vi: "VPC đối tác gọi API private", en: "Partner VPC calls a private API" }),
    request: "GET https://api.shopviet.internal/stock",
    from: L({ vi: "nguồn: VPC của đối tác", en: "source: partner VPC" }),
    toggle: SWITCH,
    layout: (nlb) => twoTargets(L, nlb, { id: "c", x: 60, y: 140, l1: L({ vi: "VPC đối tác", en: "Partner VPC" }), user: true }, L({ vi: "EC2 kho hàng", en: "EC2 inventory" }), L({ vi: "EC2 kho hàng", en: "EC2 inventory" }),
      [{ id: "ep", x: 170, y: 140, w: 110, l1: "Interface", l2: "endpoint" }], [["ep", "lb"]]),
    run: (nlb) => nlb
      ? { steps: [
            { at: "ep", state: "pass", msg: L({ vi: "Interface endpoint trong VPC đối tác kết nối tới **endpoint service** (PrivateLink) của ShopViet.", en: "The interface endpoint in the partner VPC connects to ShopViet's **endpoint service** (PrivateLink)." }) },
            { at: "lb", state: "pass", msg: L({ vi: "Endpoint service sử dụng NLB làm backend.", en: "The endpoint service uses the NLB as its backend." }) },
            { at: "t1", state: "pass", msg: L({ vi: "API tồn kho phản hồi. Không cần VPC peering, không đi qua Internet.", en: "The inventory API responds. No VPC peering needed, no traffic over the internet." }) },
          ], ok: true, result: L({ vi: "Đối tác gọi được API qua mạng nội bộ của AWS. Phía cung cấp dịch vụ PrivateLink sử dụng **NLB**.", en: "The partner can call the API over the AWS internal network. The PrivateLink service provider side uses an **NLB**." }) }
      : { steps: [
            { at: "ep", state: "block", msg: L({ vi: "Không tạo được endpoint service trỏ tới ALB: endpoint service (PrivateLink) yêu cầu Network Load Balancer hoặc Gateway Load Balancer.", en: "You cannot create an endpoint service that points to an ALB: an endpoint service (PrivateLink) requires a Network Load Balancer or a Gateway Load Balancer." }) },
          ], ok: false, result: L({ vi: "Đối tác chưa kết nối được. Cần đặt NLB trước dịch vụ, sau đó tạo endpoint service.", en: "The partner cannot connect yet. Put an NLB in front of the service, then create the endpoint service." }) },
  },
  {
    name: L({ vi: "UDP tới máy chủ on-premises", en: "UDP to on-premises servers" }),
    request: L({ vi: "UDP 5000 → dịch vụ đồng bộ tồn kho", en: "UDP 5000 → inventory sync service" }),
    from: L({ vi: "nguồn: thiết bị tại cửa hàng", en: "source: in-store devices" }),
    toggle: SWITCH,
    layout: (nlb) => ({
      viewBox: "0 40 820 210",
      aria: L({ vi: "Traffic UDP đi qua load balancer, qua Direct Connect tới máy chủ trong data center", en: "UDP traffic goes through the load balancer and over Direct Connect to servers in the data center" }),
      boxes: [{ x: 520, y: 58, w: 280, h: 172, label: L({ vi: "Data center ShopViet", en: "ShopViet data center" }), edge: true }],
      nodes: [
        { id: "c", x: 60, y: 140, l1: L({ vi: "Cửa hàng", en: "Stores" }), user: true },
        lb(L, nlb, 240, 140),
        { id: "dx", x: 410, y: 140, w: 110, l1: "Direct Connect", l2: "/ Site-to-Site VPN" },
        { id: "t1", x: 660, y: 112, w: 170, l1: "10.20.0.11", l2: L({ vi: "máy chủ on-premises", en: "on-premises server" }) },
        { id: "t2", x: 660, y: 188, w: 170, l1: "10.20.0.12", l2: L({ vi: "máy chủ on-premises", en: "on-premises server" }) },
      ],
      links: [["c", "lb"], ["lb", "dx"], ["dx", "t1"], ["dx", "t2"]],
    }),
    run: (nlb) => nlb
      ? { steps: [
            { at: "lb", state: "pass", msg: L({ vi: "NLB có listener **UDP**; target group dùng target type **ip** với địa chỉ private 10.20.0.0/16 của data center.", en: "The NLB has a **UDP** listener; the target group uses the **ip** target type with the data center's private 10.20.0.0/16 addresses." }) },
            { at: "dx", state: "pass", msg: L({ vi: "Target type ip nhận tài nguyên on-premises kết nối qua Direct Connect hoặc Site-to-Site VPN, với IP thuộc dải RFC 1918 hoặc 100.64.0.0/10; không dùng được IP public.", en: "The ip target type accepts on-premises resources connected through Direct Connect or Site-to-Site VPN, with IPs in RFC 1918 ranges or 100.64.0.0/10; public IPs cannot be used." }) },
            { at: "t1", state: "pass", msg: L({ vi: "Máy chủ on-premises nhận datagram UDP.", en: "The on-premises server receives the UDP datagram." }) },
          ], ok: true, result: L({ vi: "NLB phân phối traffic UDP cho máy chủ on-premises. Đặt một NLB tại mỗi Region; Global Accelerator phía trước định tuyến người dùng tới endpoint phù hợp theo vị trí địa lý và tình trạng healthy.", en: "The NLB distributes UDP traffic to on-premises servers. Put one NLB in each Region; Global Accelerator in front routes users to the best endpoint by geographic proximity and health." }) }
      : { steps: [
            { at: "lb", state: "block", flash: "✕", msg: L({ vi: "ALB chỉ có listener HTTP và HTTPS; không nhận được datagram UDP, dù target group của ALB cũng hỗ trợ target type ip.", en: "An ALB has only HTTP and HTTPS listeners; it cannot accept UDP datagrams, even though ALB target groups also support the ip target type." }) },
          ], ok: false, result: L({ vi: "Dịch vụ UDP không dùng được ALB. Cần **NLB** với target group kiểu ip.", en: "A UDP service cannot use an ALB. Use an **NLB** with an ip target group." }) },
  },
  {
    name: L({ vi: "Ẩn EC2 instance khỏi Internet", en: "Hide EC2 instances from the internet" }),
    request: L({ vi: "HTTPS (TLS) tới api.shopviet.vn", en: "HTTPS (TLS) to api.shopviet.vn" }),
    from: L({ vi: "nguồn: người dùng và một client không xác định", en: "source: users and an unknown client" }),
    toggle: { label: L({ vi: "EC2 nằm trong private subnet", en: "EC2 in a private subnet" }), initial: false },
    layout: () => ({
      viewBox: "0 40 820 210",
      aria: L({ vi: "NLB tại public subnet thực hiện TLS termination, các EC2 nằm ở subnet phía sau, một client không xác định thử kết nối trực tiếp tới EC2",
        en: "An NLB in a public subnet terminates TLS, the EC2 instances sit in a subnet behind it, and an unknown client tries to connect directly to EC2" }),
      boxes: [{ x: 230, y: 58, w: 180, h: 172, label: "Public subnet" }, { x: 520, y: 58, w: 280, h: 172, label: L({ vi: "Subnet của EC2", en: "EC2 subnet" }) }],
      nodes: [
        { id: "c", x: 70, y: 92, l1: L({ vi: "Người dùng", en: "User" }), user: true },
        lb(L, true, 320, 140),
        { id: "t1", x: 660, y: 112, w: 170, l1: "EC2 API", l2: "Auto Scaling group" },
        { id: "t2", x: 660, y: 188, w: 170, l1: "EC2 API", l2: "Auto Scaling group" },
        { id: "x", x: 70, y: 188, l1: L({ vi: "Client ngoài", en: "Outside client" }), user: true },
      ],
      links: [["c", "lb"], ["lb", "t1"], ["lb", "t2"], ["x", "t2"]],
    }),
    run: (priv) => ({
      steps: [
        { at: "lb", state: "change", tag: L({ vi: "GIẢI MÃ", en: "DECRYPT" }), msg: L({ vi: "NLB có listener **TLS**: công việc mã hoá và giải mã được chuyển cho load balancer, ứng dụng trên EC2 tập trung vào nghiệp vụ.", en: "The NLB has a **TLS** listener: encryption and decryption are offloaded to the load balancer, and the application on EC2 focuses on business logic." }) },
        { at: "t1", state: "pass", msg: L({ vi: "EC2 instance tiếp nhận request đã giải mã.", en: "The EC2 instance receives the decrypted request." }) },
        priv
          ? { at: "t2", from: "x", state: "block", flash: "✕", msg: L({ vi: "EC2 trong **private subnet** không có public IP; client bên ngoài không có đường truy cập trực tiếp.", en: "EC2 in a **private subnet** has no public IP; an outside client has no direct path to it." }) }
          : { at: "t2", from: "x", state: "pass", msg: L({ vi: "EC2 trong public subnet có public IP; client bên ngoài truy cập trực tiếp được và bỏ qua load balancer.", en: "EC2 in a public subnet has a public IP; an outside client can reach it directly and bypass the load balancer." }) },
      ],
      ok: priv,
      result: priv
        ? L({ vi: "Cấu hình an toàn: chỉ NLB tại public subnet tiếp nhận traffic; ASG nằm trong private subnet.", en: "Secure configuration: only the NLB in the public subnet receives traffic; the ASG is in a private subnet." })
        : L({ vi: "EC2 instance bị lộ ra Internet. Cần chuyển Auto Scaling group sang private subnet, chỉ giữ NLB tại public subnet.", en: "The EC2 instances are exposed to the internet. Move the Auto Scaling group to a private subnet and keep only the NLB in the public subnet." }),
    }),
  },
  ];
};

export default function LbTypeSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} action={L({ vi: "Gửi request", en: "Send request" })}
    hint={L({ vi: "Chọn một yêu cầu của ShopViet, sau đó nhấn Gửi request (cấu hình hiện tại: ALB). Bật tuỳ chọn để chuyển sang NLB.",
      en: "Pick a ShopViet requirement, then press Send request (current configuration: ALB). Turn on the option to switch to an NLB." })} />;
}
