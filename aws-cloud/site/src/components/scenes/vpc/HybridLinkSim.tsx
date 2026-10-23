import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// ShopViet's office talks to its VPCs. Each situation is a real need: connect this
// week, encrypt a private line, survive a Direct Connect cut, reach two Regions,
// read S3, let branches talk, get more VPN bandwidth.

type P = [number, number];
const UP: P[] = [[95, 51]];
const DOWN: P[] = [[95, 189]];
const VPN_GW: P[] = [[540, 51]];
const DX_GW: P[] = [[540, 189]];

function scenarios(L: Lang): CaseScenario[] {
const OFFICE: CaseNode = { id: "office", x: 20, y: 97, w: 150, l1: L({ vi: "Văn phòng ShopViet", en: "ShopViet office" }), l2: "customer gateway" };
const VPN: CaseNode = { id: "vpn", x: 240, y: 28, w: 160, l1: "Site-to-Site VPN", l2: L({ vi: "IPsec qua internet", en: "IPsec over the internet" }) };
const DX: CaseNode = { id: "dx", x: 240, y: 166, w: 160, l1: "Direct Connect", l2: L({ vi: "kết nối chuyên dụng", en: "dedicated connection" }) };
const VGW: CaseNode = { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: "virtual private gateway" };
const VPC: CaseNode = { id: "vpc", x: 660, y: 97, w: 140, l1: "VPC Singapore", l2: "10.0.0.0/16" };

const BASE_LINKS: CaseLink[] = [
  { a: "office", b: "vpn", via: UP },
  { a: "office", b: "dx", via: DOWN },
  { a: "vpn", b: "gw", via: VPN_GW },
  { a: "dx", b: "gw", via: DX_GW },
  { a: "gw", b: "vpc" },
];
const base = { nodes: [OFFICE, VPN, DX, VGW, VPC], links: BASE_LINKS, start: "office" };

return [
  {
    ...base,
    name: L({ vi: "Kết nối trong vòng một tuần", en: "Connect within one week" }),
    request: "ssh 10.0.1.25",
    from: L({ vi: "từ máy kế toán", en: "from the accounting PC" }),
    choices: { label: L({ vi: "Phương thức kết nối", en: "Connection method" }), options: ["Direct Connect", "Site-to-Site VPN"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, steps: [
            { at: "dx", via: DOWN, state: "change", tag: L({ vi: "CHỜ", en: "WAITING" }), msg: L({ vi: "Kết nối chuyên dụng cần được cấp port tại Direct Connect location hoặc qua đối tác Direct Connect, kèm cross-connect vật lý; thời gian triển khai dài hơn nhiều so với VPN.", en: "A dedicated connection needs a port provisioned at a Direct Connect location or through a Direct Connect partner, plus a physical cross-connect; it takes much longer to deploy than a VPN." }) },
          ],
          ok: false, result: L({ vi: "Không sẵn sàng trong tuần này. Yêu cầu triển khai nhanh, chi phí thấp: Site-to-Site VPN.", en: "Not ready this week. For fast deployment at low cost: Site-to-Site VPN." }) }
      : { steps: [
            { at: "vpn", via: UP, state: "pass", msg: L({ vi: "Phía văn phòng: **customer gateway device** (thiết bị vật lý hoặc phần mềm do ShopViet quản lý) thiết lập hai tunnel **IPsec** qua internet. Trong AWS, tạo tài nguyên **customer gateway** mô tả thiết bị này (ví dụ public IP); tài nguyên này không tự cấu hình thiết bị.", en: "Office side: a **customer gateway device** (a physical or software appliance that ShopViet manages) brings up two **IPsec** tunnels over the internet. In AWS you create a **customer gateway** resource that describes the device (for example its public IP); the resource does not configure the device." }) },
            { at: "gw", via: VPN_GW, state: "pass", msg: L({ vi: "Phía AWS: **virtual private gateway** gắn với VPC (hoặc một transit gateway). Hai tunnel kết thúc tại đây; một tunnel gặp sự cố thì traffic chuyển sang tunnel còn lại.", en: "AWS side: a **virtual private gateway** attached to the VPC (or a transit gateway). Both tunnels terminate here; if one tunnel fails, traffic moves to the other." }) },
            { at: "vpc", state: "pass", msg: L({ vi: "Traffic tới EC2 instance trong VPC.", en: "Traffic reaches the EC2 instance in the VPC." }) },
          ],
          ok: true, result: L({ vi: "Kết nối sẵn sàng nhanh, có mã hóa, chi phí thấp.", en: "The connection is ready quickly, encrypted, at low cost." }) },
  },
  {
    ...base,
    name: L({ vi: "Dữ liệu nhạy cảm, yêu cầu kết nối ổn định", en: "Sensitive data, stable connection required" }),
    request: "sync payroll.csv",
    from: L({ vi: "từ server nhân sự", en: "from the HR server" }),
    choices: { label: L({ vi: "Phương thức kết nối", en: "Connection method" }), options: [L({ vi: "Chỉ Direct Connect", en: "Direct Connect only" }), "Direct Connect + VPN"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "dx", via: DOWN, state: "change", tag: L({ vi: "CHƯA MÃ HÓA", en: "UNENCRYPTED" }), msg: L({ vi: "Băng thông chuyên dụng, ổn định. Tuy nhiên Direct Connect **mặc định không mã hóa** dữ liệu đang truyền.", en: "Dedicated, consistent bandwidth. However, Direct Connect **does not encrypt** data in transit **by default**." }) },
            { at: "gw", via: DX_GW, state: "pass", msg: L({ vi: "Traffic vào VPC qua private VIF.", en: "Traffic enters the VPC through a private VIF." }) },
            { at: "vpc", state: "pass", msg: L({ vi: "Dữ liệu tới đích ở dạng không mã hóa.", en: "The data arrives unencrypted." }) },
          ],
          ok: false, result: L({ vi: "Kết nối ổn định nhưng không đáp ứng yêu cầu mã hóa.", en: "The connection is stable but does not meet the encryption requirement." }) }
      : { steps: [
            { at: "dx", via: DOWN, state: "change", tag: "IPsec", msg: L({ vi: "Thiết lập **VPN trên Direct Connect**: kết hợp kết nối chuyên dụng và mã hóa.", en: "Set up a **VPN over Direct Connect**: a dedicated connection combined with encryption." }) },
            { at: "gw", via: DX_GW, state: "pass", msg: L({ vi: "Tunnel VPN kết thúc tại VGW.", en: "The VPN tunnel terminates at the VGW." }) },
            { at: "vpc", state: "pass", msg: L({ vi: "Dữ liệu được mã hóa trên toàn bộ đường truyền.", en: "The data is encrypted along the entire path." }) },
          ],
          ok: true, result: L({ vi: "Kết nối ổn định và có mã hóa. Với một số kết nối dedicated, MACsec là lựa chọn mã hóa khác.", en: "The connection is stable and encrypted. For some dedicated connections, MACsec is another encryption option." }) },
  },
  {
    ...base,
    name: L({ vi: "Sự cố kết nối Direct Connect", en: "Direct Connect connection failure" }),
    request: "GET http://10.0.1.25/orders",
    from: L({ vi: "từ văn phòng", en: "from the office" }),
    choices: { label: L({ vi: "Dự phòng", en: "Backup" }), options: [L({ vi: "Không có", en: "None" }), L({ vi: "Site-to-Site VPN làm backup", en: "Site-to-Site VPN as backup" })], initial: 0 },
    run: (v) => v === 0
      ? { marks: { dx: "down", "dx-gw": "down", "office-dx": "down" },
          steps: [{ at: "dx", via: DOWN, state: "down", flash: L({ vi: "sự cố", en: "down" }), msg: L({ vi: "Kết nối chính gặp sự cố, không có kết nối dự phòng.", en: "The primary connection fails, and there is no backup connection." }) }],
          ok: false, result: L({ vi: "Văn phòng mất kết nối tới VPC cho tới khi nhà cung cấp mạng khắc phục sự cố.", en: "The office loses connectivity to the VPC until the network provider fixes the failure." }) }
      : { marks: { dx: "down", "dx-gw": "down", "office-dx": "down" },
          steps: [
            { at: "vpn", via: UP, state: "pass", msg: L({ vi: "Định tuyến tự động chuyển sang VPN qua internet.", en: "Routing automatically fails over to the VPN over the internet." }) },
            { at: "gw", via: VPN_GW, state: "pass", msg: L({ vi: "VGW tiếp nhận traffic từ tunnel VPN.", en: "The VGW receives traffic from the VPN tunnel." }) },
            { at: "vpc", state: "pass", msg: L({ vi: "Traffic vẫn tới được EC2 instance.", en: "Traffic still reaches the EC2 instance." }) },
          ],
          ok: true, result: L({ vi: "Độ trễ cao hơn nhưng không mất kết nối. VPN là phương án dự phòng chi phí thấp cho Direct Connect.", en: "Latency is higher, but connectivity is not lost. A VPN is a low-cost backup for Direct Connect." }) },
  },
  {
    ...base,
    name: L({ vi: "Bổ sung VPC tại Tokyo", en: "Add a VPC in Tokyo" }),
    request: "GET http://10.1.0.8/report",
    from: L({ vi: "từ văn phòng", en: "from the office" }),
    nodes: [OFFICE, VPN, DX,
      { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: L({ vi: "chỉ thuộc VPC Singapore", en: "only for VPC Singapore" }) },
      { id: "dxgw", x: 460, y: 97, w: 160, l1: "Direct Connect gateway", l2: L({ vi: "dùng cho nhiều Region", en: "for multiple Regions" }) },
      { ...VPC, y: 50 }, { id: "tokyo", x: 660, y: 150, w: 140, l1: "VPC Tokyo", l2: "10.1.0.0/16" }],
    links: [
      { a: "office", b: "vpn", via: UP }, { a: "office", b: "dx", via: DOWN },
      { a: "vpn", b: "gw", via: VPN_GW }, { a: "dx", b: "gw", via: DX_GW }, { a: "dx", b: "dxgw", via: DX_GW },
      { a: "gw", b: "vpc", via: [[640, 120], [640, 73]] }, { a: "dxgw", b: "vpc", via: [[640, 120], [640, 73]] },
      { a: "dxgw", b: "tokyo", via: [[640, 120], [640, 173]] },
    ],
    choices: { label: L({ vi: "Thành phần phía AWS", en: "AWS-side component" }), options: [L({ vi: "VGW của từng VPC", en: "A VGW per VPC" }), "Direct Connect gateway"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["dxgw"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: L({ vi: "Traffic đi trên kết nối Direct Connect sẵn có.", en: "Traffic travels over the existing Direct Connect connection." }) },
            { at: "gw", via: DX_GW, state: "block", msg: L({ vi: "VGW này chỉ gắn với VPC Singapore. Để truy cập Tokyo, cần thiết lập thêm một kết nối.", en: "This VGW is attached only to VPC Singapore. To reach Tokyo, another connection must be set up." }) },
          ],
          ok: false, result: L({ vi: "Không truy cập được VPC Tokyo bằng kết nối hiện có.", en: "VPC Tokyo cannot be reached over the existing connection." }) }
      : { hide: ["gw"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: L({ vi: "Sử dụng một kết nối Direct Connect duy nhất.", en: "Use a single Direct Connect connection." }) },
            { at: "dxgw", via: DX_GW, state: "pass", msg: L({ vi: "**Private VIF** gắn với **Direct Connect gateway** (tài nguyên toàn cầu); gateway này được associate với VGW của cả hai Region.", en: "The **private VIF** attaches to a **Direct Connect gateway** (a global resource), which is associated with the VGWs in both Regions." }) },
            { at: "tokyo", via: [[640, 120], [640, 173]], state: "pass", msg: L({ vi: "Traffic tới VPC Tokyo.", en: "Traffic reaches VPC Tokyo." }) },
          ],
          ok: true, result: L({ vi: "Một kết nối Direct Connect phục vụ VPC tại nhiều Region. Với số lượng VPC lớn hơn, kết hợp Transit Gateway.", en: "One Direct Connect connection serves VPCs in multiple Regions. With a larger number of VPCs, combine it with Transit Gateway." }) },
  },
  {
    ...base,
    name: L({ vi: "Truy cập S3 qua Direct Connect", en: "Access S3 over Direct Connect" }),
    request: "GET s3://shopviet-reports/may.csv",
    from: L({ vi: "từ văn phòng", en: "from the office" }),
    nodes: [OFFICE, VPN, DX, VGW, VPC, { id: "s3", x: 660, y: 20, w: 140, h: 40, l1: "Amazon S3", l2: "public endpoint" }],
    links: [...BASE_LINKS, { id: "pub", a: "dx", b: "s3", via: [[440, 189], [440, 40]], dashed: true, label: "public VIF", lx: 470, ly: 34 }],
    choices: { label: "Virtual interface", options: ["Private VIF", "Public VIF"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["pub"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: L({ vi: "Traffic đi trên Direct Connect.", en: "Traffic travels over Direct Connect." }) },
            { at: "gw", via: DX_GW, state: "pass", msg: L({ vi: "**Private VIF** chỉ kết nối vào VPC.", en: "A **private VIF** connects only to the VPC." }) },
            { at: "gw", state: "block", flash: "S3?", msg: L({ vi: "S3 là public endpoint, không nằm trong VPC nên private VIF không truy cập được.", en: "S3 is a public endpoint and is not in the VPC, so a private VIF cannot reach it." }) },
          ],
          ok: false, result: L({ vi: "Không truy cập được S3 qua kết nối này.", en: "S3 cannot be reached over this connection." }) }
      : { steps: [
            { at: "dx", via: DOWN, state: "pass", msg: L({ vi: "Traffic đi trên Direct Connect.", en: "Traffic travels over Direct Connect." }) },
            { at: "s3", via: [[440, 189], [440, 40]], state: "pass", msg: L({ vi: "**Public VIF** kết nối tới các public endpoint của AWS như S3.", en: "A **public VIF** connects to AWS public endpoints such as S3." }) },
          ],
          ok: true, result: L({ vi: "Truy cập S3 qua kết nối chuyên dụng, không qua internet.", en: "S3 is accessed over the dedicated connection, not over the internet." }) },
  },
  {
    name: L({ vi: "Ba chi nhánh cần giao tiếp với nhau", en: "Three branches need to talk to each other" }),
    request: L({ vi: "Hà Nội → Đà Nẵng: GET /stock", en: "Hanoi → Da Nang: GET /stock" }),
    from: L({ vi: "giữa hai chi nhánh", en: "between two branches" }),
    nodes: [
      { id: "hn", x: 20, y: 20, w: 150, l1: L({ vi: "Chi nhánh Hà Nội", en: "Hanoi branch" }), l2: "VPN" },
      { id: "dn", x: 20, y: 97, w: 150, l1: L({ vi: "Chi nhánh Đà Nẵng", en: "Da Nang branch" }), l2: "VPN" },
      { id: "hcm", x: 20, y: 174, w: 150, l1: L({ vi: "Chi nhánh TP.HCM", en: "Ho Chi Minh City branch" }), l2: "VPN" },
      { id: "gw", x: 360, y: 97, w: 170, l1: "VGW", l2: L({ vi: "hub tại AWS", en: "hub at AWS" }) },
      VPC,
    ],
    links: [{ a: "hn", b: "gw" }, { a: "dn", b: "gw" }, { a: "hcm", b: "gw" }, { a: "gw", b: "vpc" }],
    start: "hn",
    choices: { label: L({ vi: "Cấu hình", en: "Configuration" }), options: [L({ vi: "VPN riêng lẻ cho từng chi nhánh", en: "A separate VPN per branch" }), "AWS VPN CloudHub"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "gw", state: "pass", msg: L({ vi: "Traffic tới VGW qua VPN của chi nhánh Hà Nội.", en: "Traffic reaches the VGW over the Hanoi branch's VPN." }) },
            { at: "gw", state: "block", msg: L({ vi: "Các tunnel không quảng bá route cho nhau; VGW không có route tới Đà Nẵng.", en: "The tunnels do not advertise routes to each other; the VGW has no route to Da Nang." }) },
          ],
          ok: false, result: L({ vi: "Các chi nhánh chỉ truy cập được VPC, không giao tiếp được với nhau.", en: "The branches can reach only the VPC, not each other." }) }
      : { steps: [
            { at: "gw", state: "change", tag: "HUB", msg: L({ vi: "**VPN CloudHub**: các customer gateway dùng BGP, VGW quảng bá route giữa các chi nhánh.", en: "**VPN CloudHub**: the customer gateways use BGP, and the VGW advertises routes between the branches." }) },
            { at: "dn", state: "pass", msg: L({ vi: "Traffic tới Đà Nẵng qua hub, không cần kết nối riêng giữa hai chi nhánh.", en: "Traffic reaches Da Nang through the hub, without a separate connection between the two branches." }) },
          ],
          ok: true, result: L({ vi: "Mô hình hub-and-spoke: mọi chi nhánh giao tiếp được với nhau và với VPC.", en: "Hub-and-spoke model: every branch can talk to the others and to the VPC." }) },
  },
  {
    ...base,
    name: L({ vi: "Thông lượng VPN không đủ", en: "Insufficient VPN throughput" }),
    request: L({ vi: "backup 2 TB/đêm", en: "backup 2 TB/night" }),
    from: L({ vi: "từ văn phòng", en: "from the office" }),
    nodes: [OFFICE, VPN, DX,
      { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: L({ vi: "1 tunnel đang hoạt động", en: "1 active tunnel" }) },
      { id: "tgw", x: 460, y: 97, w: 160, l1: "Transit Gateway", l2: "ECMP" }, VPC],
    links: [...BASE_LINKS, { a: "vpn", b: "tgw", via: VPN_GW }, { a: "tgw", b: "vpc" }],
    choices: { label: L({ vi: "Thành phần phía AWS", en: "AWS-side component" }), options: [L({ vi: "VGW, một tunnel", en: "VGW, one tunnel" }), L({ vi: "Transit Gateway + nhiều tunnel", en: "Transit Gateway + many tunnels" })], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["tgw"], steps: [
            { at: "vpn", via: UP, state: "change", tag: L({ vi: "≤1,25 Gbps", en: "≤1.25 Gbps" }), msg: L({ vi: "Mỗi tunnel VPN tiêu chuẩn đạt tối đa 1,25 Gbps.", en: "Each standard VPN tunnel supports up to 1.25 Gbps." }) },
            { at: "gw", via: VPN_GW, state: "pass", msg: L({ vi: "Với VGW, traffic từ AWS về on-premises ưu tiên một tunnel. ECMP để cộng dồn thông lượng được hỗ trợ cho VPN gắn với Transit Gateway; Large Bandwidth Tunnel không hỗ trợ VGW.", en: "With a VGW, traffic from AWS to on premises prefers one tunnel. ECMP to aggregate throughput is supported for VPNs attached to a transit gateway; Large Bandwidth Tunnels do not support a VGW." }) },
            { at: "vpc", state: "pass", msg: L({ vi: "Tác vụ backup không hoàn tất trong đêm.", en: "The backup job does not finish overnight." }) },
          ],
          ok: false, result: L({ vi: "Bổ sung VPN connection vào VGW không cộng dồn được thông lượng như ECMP trên Transit Gateway.", en: "Adding VPN connections to the VGW cannot aggregate throughput the way ECMP on Transit Gateway does." }) }
      : { hide: ["gw"], steps: [
            { at: "vpn", via: UP, state: "change", tag: "ECMP", msg: L({ vi: "Nhiều tunnel VPN hoạt động song song.", en: "Several VPN tunnels run in parallel." }) },
            { at: "tgw", via: VPN_GW, state: "pass", msg: L({ vi: "**Transit Gateway** cộng dồn thông lượng của các tunnel bằng ECMP (yêu cầu dynamic routing/BGP). Transit Gateway cũng hỗ trợ Large Bandwidth Tunnel tới 5 Gbps mỗi tunnel.", en: "**Transit Gateway** aggregates the tunnels' throughput with ECMP (requires dynamic routing/BGP). Transit Gateway also supports Large Bandwidth Tunnels of up to 5 Gbps per tunnel." }) },
            { at: "vpc", state: "pass", msg: L({ vi: "Tác vụ backup hoàn tất trong đêm.", en: "The backup job finishes overnight." }) },
          ],
          ok: true, result: L({ vi: "Thông lượng tăng theo số lượng tunnel.", en: "Throughput grows with the number of tunnels." }) },
  },
];
}

export default function HybridLinkSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Văn phòng ShopViet kết nối vào VPC qua Site-to-Site VPN hoặc Direct Connect", en: "ShopViet's office connects to the VPC through Site-to-Site VPN or Direct Connect" })} />;
}
