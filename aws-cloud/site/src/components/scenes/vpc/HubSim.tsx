import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// MFTech's network grows to many VPCs, a second data center and a second Region.
// - Transit VIF to a Direct Connect gateway associated with a transit gateway; VPC attachments propagate
//   their CIDRs to the transit gateway route table (directconnect/.../WorkingWithVirtualInterfaces.html,
//   direct-connect-transit-gateways.html, tgw/how-transit-gateways-work.html). Source: exam3_q16.
// - Centralized interface endpoints in a shared services VPC, private DNS off, a private hosted zone
//   associated with the spoke VPCs (whitepaper: centralized-access-to-vpc-private-endpoints.html). Source: exam2_q21.
// - Two data centers, two Regions: private VIFs to one Direct Connect gateway, VGWs in both Regions;
//   VGW-to-VGW traffic is not allowed through the gateway; SiteLink links Direct Connect locations
//   (direct-connect-gateways-intro.html, WorkingWithVirtualInterfaces.html). Source: exam4_q7.

function scenarios(L: Lang): CaseScenario[] {
  const toVpc1: [number, number][] = [[650, 120], [650, 53]];
  const toVpc2: [number, number][] = [[650, 120], [650, 187]];
  return [
    {
      name: L({ vi: "25 VPC và data center qua Direct Connect", en: "25 VPCs and the data center over Direct Connect" }),
      request: "GET http://10.12.0.8/stock",
      from: L({ vi: "từ data center, tới VPC kho Đà Nẵng", en: "from the data center to the Da Nang warehouse VPC" }),
      nodes: [
        { id: "dc", x: 20, y: 97, w: 130, l1: "Data center", l2: L({ vi: "router BGP", en: "BGP router" }) },
        { id: "dx", x: 190, y: 97, w: 130, l1: "Direct Connect", l2: "10 Gbps" },
        { id: "vgws", x: 370, y: 97, w: 250, l1: L({ vi: "25 private VIF → 25 VGW", en: "25 private VIFs → 25 VGWs" }), l2: L({ vi: "mỗi VPC một VIF và một VGW", en: "one VIF and one VGW per VPC" }) },
        { id: "dxgw", x: 360, y: 97, w: 150, l1: "Direct Connect gateway", l2: "transit VIF" },
        { id: "tgw", x: 530, y: 97, w: 110, l1: "Transit Gateway", l2: "route table" },
        { id: "vpc1", x: 680, y: 30, w: 130, l1: L({ vi: "VPC kho Đà Nẵng", en: "Da Nang warehouse VPC" }), l2: "10.12.0.0/16" },
        { id: "vpc2", x: 680, y: 164, w: 130, l1: L({ vi: "… 24 VPC khác", en: "… 24 other VPCs" }), l2: "10.x.0.0/16" },
      ],
      links: [
        { a: "dc", b: "dx" },
        { a: "dx", b: "vgws" }, { a: "vgws", b: "vpc1", via: toVpc1 }, { a: "vgws", b: "vpc2", via: toVpc2 },
        { a: "dx", b: "dxgw" }, { a: "dxgw", b: "tgw" }, { a: "tgw", b: "vpc1", via: toVpc1 }, { a: "tgw", b: "vpc2", via: toVpc2 },
      ],
      start: "dc",
      choices: { label: L({ vi: "Thiết kế", en: "Design" }), options: [L({ vi: "Private VIF cho từng VPC", en: "A private VIF per VPC" }), L({ vi: "Transit VIF + Transit Gateway", en: "Transit VIF + Transit Gateway" })], initial: 0 },
      run: (v) => v === 0
        ? { hide: ["dxgw", "tgw"], steps: [
              { at: "dx", state: "pass", msg: L({ vi: "Traffic đi trên kết nối Direct Connect.", en: "Traffic travels over the Direct Connect connection." }) },
              { at: "vgws", state: "change", tag: "×25", msg: L({ vi: "**Private VIF** truy cập một VPC bằng private IP. 25 VPC cần 25 VIF, 25 phiên BGP và 25 VGW; mỗi VPC mới lại thêm một VIF.", en: "A **private VIF** reaches one VPC over private IPs. 25 VPCs need 25 VIFs, 25 BGP sessions and 25 VGWs; every new VPC adds another VIF." }) },
              { at: "vpc1", via: toVpc1, state: "pass", msg: L({ vi: "Data center tới được VPC kho, nhưng các VPC vẫn không giao tiếp được với nhau: VGW không định tuyến giữa các VPC.", en: "The data center reaches the warehouse VPC, but the VPCs still cannot talk to each other: a VGW does not route between VPCs." }) },
            ],
            ok: false, result: L({ vi: "Hoạt động cho từng VPC, nhưng không có kết nối full mesh giữa 25 VPC và chi phí vận hành tăng theo số VPC.", en: "It works VPC by VPC, but there is no full-mesh connectivity between the 25 VPCs, and the operational effort grows with every VPC." }) }
        : { hide: ["vgws"], steps: [
              { at: "dx", state: "pass", msg: L({ vi: "Một **transit VIF** trên kết nối Direct Connect sẵn có (dùng được với connection dedicated hoặc hosted ở mọi tốc độ).", en: "One **transit VIF** on the existing Direct Connect connection (usable with a dedicated or hosted connection of any speed)." }) },
              { at: "dxgw", state: "pass", msg: L({ vi: "Transit VIF kết thúc tại **Direct Connect gateway**; gateway này được associate với Transit Gateway.", en: "The transit VIF terminates on a **Direct Connect gateway**, which is associated with the transit gateway." }) },
              { at: "tgw", state: "change", tag: "PROPAGATED", msg: L({ vi: "25 VPC attachment bật **route propagation**: CIDR của từng VPC tự động có trong route table của Transit Gateway; prefix on-premises học qua BGP từ Direct Connect gateway attachment cũng được propagate.", en: "The 25 VPC attachments have **route propagation** enabled: each VPC CIDR is installed in the transit gateway route table automatically; on-premises prefixes learned over BGP from the Direct Connect gateway attachment are propagated too." }) },
              { at: "vpc1", via: toVpc1, state: "pass", msg: L({ vi: "Traffic tới VPC kho. Các VPC cũng giao tiếp với nhau qua cùng Transit Gateway.", en: "Traffic reaches the warehouse VPC. The VPCs also talk to each other through the same transit gateway." }) },
            ],
            ok: true, result: L({ vi: "Một transit VIF, một Transit Gateway: full mesh giữa 25 VPC và data center; thêm VPC chỉ cần một attachment.", en: "One transit VIF, one transit gateway: full mesh between the 25 VPCs and the data center; a new VPC needs only one attachment." }) },
    },
    {
      name: L({ vi: "Endpoint dùng chung cho nhiều VPC", en: "Endpoints shared by many VPCs" }),
      request: "kms:Decrypt",
      from: L({ vi: "từ VPC đơn hàng (không có internet)", en: "from the orders VPC (no internet access)" }),
      nodes: [
        { id: "spoke", x: 20, y: 30, w: 150, l1: L({ vi: "VPC đơn hàng", en: "Orders VPC" }), l2: "spoke" },
        { id: "spoke2", x: 20, y: 164, w: 150, l1: L({ vi: "… 24 VPC khác", en: "… 24 other VPCs" }), l2: "spoke" },
        { id: "local", x: 250, y: 30, w: 220, l1: L({ vi: "Interface endpoint tại từng VPC", en: "Interface endpoint in every VPC" }), l2: L({ vi: "25 VPC × 4 dịch vụ", en: "25 VPCs × 4 services" }) },
        { id: "tgw", x: 230, y: 97, w: 120, l1: "Transit Gateway" },
        { id: "shared", x: 400, y: 97, w: 200, l1: "Shared services VPC", l2: L({ vi: "interface endpoint tập trung", en: "centralized interface endpoints" }) },
        { id: "svc", x: 660, y: 97, w: 140, l1: "AWS KMS", l2: "kms.ap-southeast-1" },
      ],
      links: [
        { a: "spoke", b: "local" }, { a: "local", b: "svc", via: [[730, 53]] },
        { a: "spoke", b: "tgw", via: [[290, 53]] }, { a: "spoke2", b: "tgw", via: [[290, 187]] }, { a: "tgw", b: "shared" }, { a: "shared", b: "svc" },
      ],
      start: "spoke",
      choices: { label: L({ vi: "Thiết kế", en: "Design" }), options: [L({ vi: "Endpoint tại từng VPC", en: "Endpoints in every VPC" }), "Shared services VPC"], initial: 0 },
      run: (v) => v === 0
        ? { hide: ["tgw", "shared"], steps: [
              { at: "local", state: "change", tag: "×100", msg: L({ vi: "Theo mặc định, mỗi VPC cần một interface endpoint cho mỗi dịch vụ: 100 endpoint, mỗi endpoint tính phí theo giờ kèm phí xử lý dữ liệu.", en: "By default, every VPC needs an interface endpoint for each service: 100 endpoints, each charged per hour plus data processing." }) },
              { at: "svc", via: [[730, 53]], state: "pass", msg: L({ vi: "Request tới KMS qua mạng AWS.", en: "The request reaches KMS over the AWS network." }) },
            ],
            ok: false, result: L({ vi: "Hoạt động, nhưng chi phí và khối lượng quản trị tăng theo số VPC.", en: "It works, but cost and administration grow with the number of VPCs." }) }
        : { hide: ["local"], steps: [
              { at: "tgw", via: [[290, 53]], state: "pass", msg: L({ vi: "Spoke VPC gửi traffic tới Transit Gateway.", en: "The spoke VPC sends traffic to the transit gateway." }) },
              { at: "shared", state: "change", tag: "DNS", msg: L({ vi: "Endpoint trong shared services VPC tắt private DNS; một **Route 53 private hosted zone** mang tên endpoint của dịch vụ (alias tới endpoint) được associate với các spoke VPC, nên `kms.ap-southeast-1.amazonaws.com` phân giải ra private IP của endpoint tập trung.", en: "The endpoints in the shared services VPC have private DNS turned off; a **Route 53 private hosted zone** named after the service endpoint (alias to the endpoint) is associated with the spoke VPCs, so `kms.ap-southeast-1.amazonaws.com` resolves to the private IP of the central endpoint." }) },
              { at: "svc", state: "pass", msg: L({ vi: "Request tới KMS, không đi qua internet.", en: "The request reaches KMS without crossing the internet." }) },
            ],
            ok: true, result: L({ vi: "Mỗi dịch vụ một endpoint dùng chung cho mọi VPC: giảm chi phí và khối lượng quản trị. Shared services VPC cũng là nơi đặt các dịch vụ dùng chung khác như directory service.", en: "One endpoint per service shared by every VPC: lower cost and administration. The shared services VPC also hosts other shared services such as directory services." }) },
    },
    {
      name: L({ vi: "Hai data center, hai Region", en: "Two data centers, two Regions" }),
      request: "GET http://10.50.0.9/catalog",
      from: L({ vi: "từ data center Hà Nội, tới VPC tại Frankfurt", en: "from the Hanoi data center to the VPC in Frankfurt" }),
      nodes: [
        { id: "dc1", x: 20, y: 30, w: 140, l1: "Data center HN" },
        { id: "dc2", x: 20, y: 164, w: 140, l1: "Data center EU", l2: L({ vi: "công ty được sáp nhập", en: "acquired company" }) },
        { id: "dx1", x: 200, y: 30, w: 140, l1: "Direct Connect 1", l2: "private VIF" },
        { id: "dx2", x: 200, y: 164, w: 140, l1: "Direct Connect 2", l2: "private VIF" },
        { id: "dxgw", x: 385, y: 97, w: 150, l1: "Direct Connect gateway", l2: L({ vi: "tài nguyên toàn cầu", en: "global resource" }) },
        { id: "vpcS", x: 640, y: 30, w: 160, l1: "VPC ap-southeast-1", l2: "VGW" },
        { id: "vpcF", x: 640, y: 164, w: 160, l1: "VPC eu-central-1", l2: "VGW · 10.50.0.0/16" },
      ],
      links: [
        { a: "dc1", b: "dx1" }, { a: "dc2", b: "dx2" },
        { id: "a1", a: "dx1", b: "vpcS" }, { id: "a2", a: "dx2", b: "vpcF" },
        { a: "dx1", b: "dxgw", via: [[460, 53]] }, { a: "dx2", b: "dxgw", via: [[460, 187]] },
        { a: "dxgw", b: "vpcS", via: [[460, 53]] }, { a: "dxgw", b: "vpcF", via: [[460, 187]] },
      ],
      start: "dc1",
      choices: { label: L({ vi: "Thiết kế", en: "Design" }), options: [L({ vi: "Private VIF gắn thẳng VGW", en: "Private VIF straight to a VGW" }), L({ vi: "Direct Connect gateway dùng chung", en: "Shared Direct Connect gateway" })], initial: 0 },
      run: (v) => v === 0
        ? { hide: ["dxgw"], steps: [
              { at: "dx1", state: "pass", msg: L({ vi: "Private VIF của kết nối 1 gắn trực tiếp với VGW của VPC Singapore.", en: "Connection 1's private VIF is attached directly to the VGW of the Singapore VPC." }) },
              { at: "dx1", state: "block", flash: "eu-central-1?", msg: L({ vi: "Không có đường tới VGW tại eu-central-1: mỗi VIF gắn thẳng VGW chỉ phục vụ một VPC trong cùng Region.", en: "There is no path to the VGW in eu-central-1: a VIF attached straight to a VGW serves only one VPC in that Region." }) },
            ],
            ok: false, result: L({ vi: "Mỗi data center chỉ tới được VPC của chính mình.", en: "Each data center reaches only its own VPC." }) }
        : { hide: ["a1", "a2"], steps: [
              { at: "dx1", state: "pass", msg: L({ vi: "Private VIF của **cả hai** kết nối gắn với cùng một Direct Connect gateway.", en: "The private VIFs of **both** connections attach to the same Direct Connect gateway." }) },
              { at: "dxgw", via: [[460, 53]], state: "pass", msg: L({ vi: "Direct Connect gateway là tài nguyên toàn cầu: associate được VGW ở mọi Region (trừ các Region Trung Quốc).", en: "A Direct Connect gateway is a global resource: it can be associated with VGWs in any Region (except the China Regions)." }) },
              { at: "vpcF", via: [[460, 187]], state: "pass", msg: L({ vi: "Traffic tới VPC tại Frankfurt.", en: "Traffic reaches the VPC in Frankfurt." }) },
            ],
            ok: true, result: L({ vi: "Mọi data center tới được mọi VPC. Lưu ý: Direct Connect gateway không cho phép traffic giữa hai VGW gắn với nó (VPC tới VPC dùng Transit Gateway hoặc VPC peering); data center tới data center qua mạng AWS dùng tính năng **SiteLink** trên private VIF hoặc transit VIF.", en: "Every data center reaches every VPC. Note: a Direct Connect gateway does not allow traffic between two VGWs associated with it (VPC to VPC uses Transit Gateway or VPC peering); data center to data center over the AWS network uses **SiteLink** on private or transit VIFs." }) },
    },
  ];
}

export default function HubSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Mạng trung tâm của MFTech: Direct Connect, Transit Gateway và shared services VPC", en: "MFTech's network hub: Direct Connect, Transit Gateway and a shared services VPC" })} action={L({ vi: "Gửi request", en: "Send request" })} />;
}
