import PacketSim, { type PLayout, type PScenario, type PStep } from "./PacketSim";
import { useLang } from "../../../lib/lang";

// Inbound inspection with a Gateway Load Balancer (gateway/introduction.html,
// privatelink/gateway-load-balancer-endpoints.html, gateway/target-groups.html):
// the internet gateway route table sends traffic for the application subnet to the GWLB endpoint;
// the endpoint sends it to the GWLB in the security VPC; the GWLB (layer 3, all IP packets, all
// ports) wraps it in GENEVE on port 6081 and picks one healthy appliance, keeping the flow on the
// same appliance (5-tuple stickiness by default); the traffic comes back the same way and the
// endpoint delivers it to the application subnet. Existing flows stay on an unhealthy appliance
// unless target_failover is set to rebalance (default no_rebalance).

type Lang = ReturnType<typeof useLang>;

const layout = (L: Lang): PLayout => ({
  viewBox: "0 30 840 250",
  aria: L({ vi: "Traffic từ Internet đi qua internet gateway, GWLB endpoint, Gateway Load Balancer và firewall appliance rồi mới tới EC2 ứng dụng",
    en: "Traffic from the internet passes the internet gateway, the GWLB endpoint, the Gateway Load Balancer and a firewall appliance before reaching the application EC2 instances" }),
  boxes: [
    { x: 105, y: 48, w: 300, h: 222, label: L({ vi: "VPC ứng dụng ShopViet", en: "ShopViet application VPC" }) },
    { x: 450, y: 48, w: 375, h: 222, label: L({ vi: "VPC bảo mật (appliance)", en: "Security VPC (appliances)" }), edge: true },
  ],
  nodes: [
    { id: "c", x: 50, y: 160, l1: "Internet", user: true },
    { id: "igw", x: 170, y: 160, w: 100, l1: "Internet", l2: "gateway" },
    { id: "gwlbe", x: 330, y: 105, w: 130, l1: "GWLB endpoint", l2: L({ vi: "subnet endpoint", en: "endpoint subnet" }) },
    { id: "app", x: 330, y: 220, w: 130, l1: L({ vi: "EC2 ứng dụng", en: "Application EC2" }), l2: L({ vi: "subnet ứng dụng", en: "application subnet" }) },
    { id: "gwlb", x: 545, y: 160, w: 140, l1: "Gateway LB", l2: L({ vi: "tầng 3 · GENEVE 6081", en: "layer 3 · GENEVE 6081" }) },
    { id: "fw1", x: 735, y: 105, w: 140, l1: "Firewall A", l2: L({ vi: "appliance bên thứ ba", en: "third-party appliance" }) },
    { id: "fw2", x: 735, y: 220, w: 140, l1: "Firewall B", l2: L({ vi: "appliance bên thứ ba", en: "third-party appliance" }) },
  ],
  links: [["c", "igw"], ["igw", "gwlbe"], ["igw", "app"], ["gwlbe", "gwlb"], ["gwlb", "fw1"], ["gwlb", "fw2"], ["gwlbe", "app"]],
});

const scenarios = (L: Lang): PScenario[] => {
  const IGW: PStep = { at: "igw", state: "pass", label: "Internet gateway", msg: L({ vi: "Route table gắn với internet gateway: đích là CIDR của subnet ứng dụng, target là **GWLB endpoint**.", en: "Route table associated with the internet gateway: destination is the application subnet CIDR, target is the **GWLB endpoint**." }) };
  const EP: PStep = { at: "gwlbe", state: "pass", msg: L({ vi: "GWLB endpoint (một VPC endpoint dùng AWS PrivateLink) chuyển traffic sang Gateway Load Balancer ở VPC bảo mật.", en: "The GWLB endpoint (a VPC endpoint powered by AWS PrivateLink) sends the traffic to the Gateway Load Balancer in the security VPC." }) };
  const LB = (to: string): PStep => ({ at: "gwlb", state: "change", tag: "GENEVE", msg: L({ vi: `GWLB nhận mọi gói IP trên mọi cổng, đóng gói GENEVE (cổng 6081) và gửi tới **${to}**; mọi gói của cùng flow (5-tuple) đi tới cùng appliance.`, en: `The GWLB accepts every IP packet on every port, wraps it in GENEVE (port 6081) and sends it to **${to}**; every packet of the same flow (5-tuple) goes to the same appliance.` }) });
  const BACK: PStep = { at: "gwlb", state: "pass", label: "Gateway LB", msg: L({ vi: "Appliance trả gói tin đã kiểm tra về GWLB.", en: "The appliance returns the inspected packet to the GWLB." }) };
  const EP2: PStep = { at: "gwlbe", state: "pass", label: "GWLB endpoint", msg: L({ vi: "Gói tin quay lại VPC ứng dụng qua endpoint.", en: "The packet comes back into the application VPC through the endpoint." }) };
  return [
  {
    name: L({ vi: "Kiểm tra traffic vào", en: "Inspect inbound traffic" }),
    request: "TCP 443 → 10.0.2.15",
    from: L({ vi: "nguồn: khách hàng trên Internet", en: "source: customer on the internet" }),
    toggle: { label: L({ vi: "Route table của internet gateway trỏ tới GWLB endpoint", en: "Internet gateway route table points to the GWLB endpoint" }), initial: true },
    run: (routed) => routed
      ? { steps: [IGW, EP, LB("Firewall A"),
            { at: "fw1", state: "pass", msg: L({ vi: "Firewall bên thứ ba giải gói GENEVE, kiểm tra gói tin gốc và cho phép.", en: "The third-party firewall unwraps GENEVE, inspects the original packet and allows it." }) },
            BACK, EP2,
            { at: "app", state: "pass", msg: L({ vi: "Gói tin tới EC2 ứng dụng. Ứng dụng không cần thay đổi: GWLB trong suốt với cả hai phía.", en: "The packet reaches the application EC2 instance. The application needs no change: the GWLB is transparent to both sides." }) }],
          back: false, ok: true, result: L({ vi: "Mọi traffic vào đều đi qua firewall trước khi tới ứng dụng. Thêm appliance vào target group để tăng năng lực kiểm tra.", en: "All inbound traffic passes the firewall before reaching the application. Add appliances to the target group to scale inspection." }) }
      : { steps: [
            { at: "igw", state: "pass", label: "Internet gateway", msg: L({ vi: "Route table của internet gateway không có route tới GWLB endpoint; traffic dùng route local của VPC.", en: "The internet gateway route table has no route to the GWLB endpoint; traffic uses the VPC's local route." }) },
            { at: "app", state: "pass", msg: L({ vi: "Gói tin tới thẳng EC2, không qua firewall nào.", en: "The packet goes straight to EC2 without passing any firewall." }) }],
          back: false, ok: false, result: L({ vi: "Firewall đã chạy nhưng không kiểm tra được gì. Với GWLB, traffic chỉ đi qua appliance khi route table chọn GWLB endpoint làm next hop (cả chiều vào lẫn chiều ra).", en: "The firewalls are running but inspect nothing. With a GWLB, traffic passes the appliances only when route tables use the GWLB endpoint as the next hop (both inbound and outbound)." }) },
  },
  {
    name: L({ vi: "Gói tin khớp chữ ký tấn công", en: "Packet matches an attack signature" }),
    request: "TCP 443 → 10.0.2.15 (exploit)",
    from: L({ vi: "nguồn: máy chủ độc hại", en: "source: malicious host" }),
    run: () => ({
      steps: [IGW, EP, LB("Firewall A"),
        { at: "fw1", state: "block", flash: "DROP", msg: L({ vi: "Hệ thống IPS trên appliance phát hiện chữ ký tấn công và huỷ gói tin. GWLB không tự lọc nội dung: quyết định do phần mềm appliance đưa ra.", en: "The IPS software on the appliance detects the attack signature and drops the packet. The GWLB itself does not filter content: the appliance software decides." }) }],
      ok: true, result: L({ vi: "Gói tin bị huỷ tại firewall và không tới được ứng dụng.", en: "The packet is dropped at the firewall and never reaches the application." }),
    }),
  },
  {
    name: L({ vi: "Firewall A gặp sự cố", en: "Firewall A fails" }),
    request: L({ vi: "TCP 443 → 10.0.2.15 (flow mới)", en: "TCP 443 → 10.0.2.15 (new flow)" }),
    from: L({ vi: "nguồn: khách hàng trên Internet", en: "source: customer on the internet" }),
    toggle: { label: L({ vi: "Firewall A không vượt qua health check", en: "Firewall A fails its health check" }), initial: true },
    run: (down) => down
      ? { steps: [IGW, EP,
            { at: "fw1", state: "block", jump: true, tag: "UNHEALTHY", msg: L({ vi: "GWLB health check đánh dấu Firewall A là unhealthy.", en: "The GWLB health check marks Firewall A as unhealthy." }) },
            LB("Firewall B"),
            { at: "fw2", state: "pass", msg: L({ vi: "Flow mới được chuyển tới appliance healthy còn lại. Flow đang mở trên Firewall A chỉ được chuyển khi target_failover = rebalance (mặc định no_rebalance).", en: "The new flow goes to the remaining healthy appliance. Flows already open on Firewall A move only when target_failover = rebalance (default no_rebalance)." }) },
            { ...BACK, msg: L({ vi: "Firewall B trả gói tin đã kiểm tra về GWLB.", en: "Firewall B returns the inspected packet to the GWLB." }) }, EP2,
            { at: "app", state: "pass", msg: L({ vi: "Ứng dụng vẫn nhận traffic đã kiểm tra.", en: "The application still receives inspected traffic." }) }],
          back: false, ok: true, result: L({ vi: "GWLB chỉ định tuyến tới appliance healthy, nên nhóm firewall có khả năng chịu lỗi như một target group thông thường.", en: "The GWLB routes only to healthy appliances, so the firewall fleet is fault tolerant like any target group." }) }
      : { steps: [IGW, EP, LB("Firewall A"),
            { at: "fw1", state: "pass", msg: L({ vi: "Cả hai appliance đều healthy; flow được gửi tới Firewall A.", en: "Both appliances are healthy; the flow is sent to Firewall A." }) },
            BACK, EP2,
            { at: "app", state: "pass", msg: L({ vi: "Ứng dụng nhận traffic đã kiểm tra.", en: "The application receives inspected traffic." }) }],
          back: false, ok: true, result: L({ vi: "Hoạt động bình thường. Bật tuỳ chọn để mô phỏng sự cố của Firewall A.", en: "Normal operation. Turn on the option to simulate a Firewall A failure." }) },
  },
  ];
};

export default function GwlbSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)} layout={layout(L)} action={L({ vi: "Gửi gói tin", en: "Send packet" })} />;
}
