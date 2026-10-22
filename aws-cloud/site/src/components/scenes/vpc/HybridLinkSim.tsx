import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

// ShopViet's office talks to its VPCs. Each situation is a real need: connect this
// week, encrypt a private line, survive a Direct Connect cut, reach two Regions,
// read S3, let branches talk, get more VPN bandwidth.

type P = [number, number];
const OFFICE: CaseNode = { id: "office", x: 20, y: 97, w: 150, l1: "Văn phòng ShopViet", l2: "customer gateway" };
const VPN: CaseNode = { id: "vpn", x: 240, y: 28, w: 160, l1: "Site-to-Site VPN", l2: "IPsec qua internet" };
const DX: CaseNode = { id: "dx", x: 240, y: 166, w: 160, l1: "Direct Connect", l2: "kết nối chuyên dụng" };
const VGW: CaseNode = { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: "virtual private gateway" };
const VPC: CaseNode = { id: "vpc", x: 660, y: 97, w: 140, l1: "VPC Singapore", l2: "10.0.0.0/16" };

const UP: P[] = [[95, 51]];
const DOWN: P[] = [[95, 189]];
const VPN_GW: P[] = [[540, 51]];
const DX_GW: P[] = [[540, 189]];

const BASE_LINKS: CaseLink[] = [
  { a: "office", b: "vpn", via: UP },
  { a: "office", b: "dx", via: DOWN },
  { a: "vpn", b: "gw", via: VPN_GW },
  { a: "dx", b: "gw", via: DX_GW },
  { a: "gw", b: "vpc" },
];
const base = { nodes: [OFFICE, VPN, DX, VGW, VPC], links: BASE_LINKS, start: "office" };

const SCENARIOS: CaseScenario[] = [
  {
    ...base,
    name: "Kết nối trong vòng một tuần",
    request: "ssh 10.0.1.25",
    from: "từ máy kế toán",
    choices: { label: "Phương thức kết nối", options: ["Direct Connect", "Site-to-Site VPN"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, steps: [
            { at: "dx", via: DOWN, state: "change", tag: "CHỜ", msg: "Kết nối chuyên dụng phải được đăng ký với nhà cung cấp mạng, thường mất từ vài tuần tới vài tháng." },
          ],
          ok: false, result: "Không sẵn sàng trong tuần này. Yêu cầu triển khai nhanh, chi phí thấp: Site-to-Site VPN." }
      : { steps: [
            { at: "vpn", via: UP, state: "pass", msg: "Thiết lập trong vài giờ trên kết nối internet sẵn có, mã hóa bằng **IPsec**." },
            { at: "gw", via: VPN_GW, state: "pass", msg: "Phía AWS là **virtual private gateway** (hoặc Transit Gateway)." },
            { at: "vpc", state: "pass", msg: "Traffic tới server trong VPC." },
          ],
          ok: true, result: "Kết nối hoàn tất trong ngày, có mã hóa, chi phí thấp." },
  },
  {
    ...base,
    name: "Dữ liệu nhạy cảm, yêu cầu kết nối ổn định",
    request: "sync payroll.csv",
    from: "từ máy chủ nhân sự",
    choices: { label: "Phương thức kết nối", options: ["Chỉ Direct Connect", "Direct Connect + VPN"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "dx", via: DOWN, state: "change", tag: "CHƯA MÃ HÓA", msg: "Băng thông chuyên dụng, ổn định. Tuy nhiên Direct Connect **không tự động mã hóa** dữ liệu." },
            { at: "gw", via: DX_GW, state: "pass", msg: "Traffic vào VPC qua private VIF." },
            { at: "vpc", state: "pass", msg: "Dữ liệu tới đích ở dạng không mã hóa." },
          ],
          ok: false, result: "Kết nối ổn định nhưng không đáp ứng yêu cầu mã hóa." }
      : { steps: [
            { at: "dx", via: DOWN, state: "change", tag: "IPsec", msg: "Thiết lập **VPN trên Direct Connect**: kết hợp kết nối chuyên dụng và mã hóa." },
            { at: "gw", via: DX_GW, state: "pass", msg: "Tunnel VPN kết thúc tại VGW." },
            { at: "vpc", state: "pass", msg: "Dữ liệu được mã hóa trên toàn bộ đường truyền." },
          ],
          ok: true, result: "Kết nối ổn định và có mã hóa." },
  },
  {
    ...base,
    name: "Sự cố kết nối Direct Connect",
    request: "GET http://10.0.1.25/orders",
    from: "từ văn phòng",
    choices: { label: "Dự phòng", options: ["Không có", "Site-to-Site VPN làm backup"], initial: 0 },
    run: (v) => v === 0
      ? { marks: { dx: "down", "dx-gw": "down", "office-dx": "down" },
          steps: [{ at: "dx", via: DOWN, state: "down", flash: "sự cố", msg: "Kết nối chính gặp sự cố, không có kết nối dự phòng." }],
          ok: false, result: "Văn phòng mất kết nối tới VPC cho tới khi nhà cung cấp mạng khắc phục sự cố." }
      : { marks: { dx: "down", "dx-gw": "down", "office-dx": "down" },
          steps: [
            { at: "vpn", via: UP, state: "pass", msg: "Định tuyến tự động chuyển sang VPN qua internet." },
            { at: "gw", via: VPN_GW, state: "pass", msg: "VGW tiếp nhận traffic từ tunnel VPN." },
            { at: "vpc", state: "pass", msg: "Traffic vẫn tới được server." },
          ],
          ok: true, result: "Độ trễ cao hơn nhưng không mất kết nối. VPN là phương án dự phòng chi phí thấp cho Direct Connect." },
  },
  {
    ...base,
    name: "Bổ sung VPC tại Tokyo",
    request: "GET http://10.1.0.8/report",
    from: "từ văn phòng",
    nodes: [OFFICE, VPN, DX,
      { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: "chỉ thuộc VPC Singapore" },
      { id: "dxgw", x: 460, y: 97, w: 160, l1: "Direct Connect gateway", l2: "dùng cho nhiều Region" },
      { ...VPC, y: 50 }, { id: "tokyo", x: 660, y: 150, w: 140, l1: "VPC Tokyo", l2: "10.1.0.0/16" }],
    links: [
      { a: "office", b: "vpn", via: UP }, { a: "office", b: "dx", via: DOWN },
      { a: "vpn", b: "gw", via: VPN_GW }, { a: "dx", b: "gw", via: DX_GW }, { a: "dx", b: "dxgw", via: DX_GW },
      { a: "gw", b: "vpc", via: [[640, 120], [640, 73]] }, { a: "dxgw", b: "vpc", via: [[640, 120], [640, 73]] },
      { a: "dxgw", b: "tokyo", via: [[640, 120], [640, 173]] },
    ],
    choices: { label: "Thành phần phía AWS", options: ["VGW của từng VPC", "Direct Connect gateway"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["dxgw"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Traffic đi trên kết nối Direct Connect sẵn có." },
            { at: "gw", via: DX_GW, state: "block", msg: "VGW này chỉ gắn với VPC Singapore. Để truy cập Tokyo, cần thiết lập thêm một kết nối." },
          ],
          ok: false, result: "Không truy cập được VPC Tokyo bằng kết nối hiện có." }
      : { hide: ["gw"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Sử dụng một kết nối Direct Connect duy nhất." },
            { at: "dxgw", via: DX_GW, state: "pass", msg: "**Direct Connect gateway** gắn với VGW của cả hai Region." },
            { at: "tokyo", via: [[640, 120], [640, 173]], state: "pass", msg: "Traffic tới VPC Tokyo." },
          ],
          ok: true, result: "Một kết nối Direct Connect phục vụ VPC tại nhiều Region. Với số lượng VPC lớn hơn, kết hợp Transit Gateway." },
  },
  {
    ...base,
    name: "Truy cập S3 qua Direct Connect",
    request: "GET s3://shopviet-reports/may.csv",
    from: "từ văn phòng",
    nodes: [OFFICE, VPN, DX, VGW, VPC, { id: "s3", x: 660, y: 20, w: 140, h: 40, l1: "Amazon S3", l2: "public endpoint" }],
    links: [...BASE_LINKS, { id: "pub", a: "dx", b: "s3", via: [[440, 189], [440, 40]], dashed: true, label: "public VIF", lx: 470, ly: 34 }],
    choices: { label: "Virtual interface", options: ["Private VIF", "Public VIF"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["pub"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Traffic đi trên Direct Connect." },
            { at: "gw", via: DX_GW, state: "pass", msg: "**Private VIF** chỉ kết nối vào VPC." },
            { at: "gw", state: "block", flash: "S3?", msg: "S3 là public endpoint, không nằm trong VPC nên private VIF không truy cập được." },
          ],
          ok: false, result: "Không truy cập được S3 qua kết nối này." }
      : { steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Traffic đi trên Direct Connect." },
            { at: "s3", via: [[440, 189], [440, 40]], state: "pass", msg: "**Public VIF** kết nối tới các public endpoint của AWS như S3." },
          ],
          ok: true, result: "Truy cập S3 qua kết nối chuyên dụng, không qua internet." },
  },
  {
    name: "Ba chi nhánh cần giao tiếp với nhau",
    request: "Hà Nội → Đà Nẵng: GET /stock",
    from: "giữa hai chi nhánh",
    nodes: [
      { id: "hn", x: 20, y: 20, w: 150, l1: "Chi nhánh Hà Nội", l2: "VPN" },
      { id: "dn", x: 20, y: 97, w: 150, l1: "Chi nhánh Đà Nẵng", l2: "VPN" },
      { id: "hcm", x: 20, y: 174, w: 150, l1: "Chi nhánh TP.HCM", l2: "VPN" },
      { id: "gw", x: 360, y: 97, w: 170, l1: "VGW", l2: "hub tại AWS" },
      VPC,
    ],
    links: [{ a: "hn", b: "gw" }, { a: "dn", b: "gw" }, { a: "hcm", b: "gw" }, { a: "gw", b: "vpc" }],
    start: "hn",
    choices: { label: "Cấu hình", options: ["VPN riêng lẻ cho từng chi nhánh", "AWS VPN CloudHub"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "gw", state: "pass", msg: "Traffic tới VGW qua VPN của chi nhánh Hà Nội." },
            { at: "gw", state: "block", msg: "Các tunnel không quảng bá route cho nhau; VGW không có route tới Đà Nẵng." },
          ],
          ok: false, result: "Các chi nhánh chỉ truy cập được VPC, không giao tiếp được với nhau." }
      : { steps: [
            { at: "gw", state: "change", tag: "HUB", msg: "**VPN CloudHub**: các customer gateway dùng BGP, VGW quảng bá route giữa các chi nhánh." },
            { at: "dn", state: "pass", msg: "Traffic tới Đà Nẵng qua hub, không cần kết nối riêng giữa hai chi nhánh." },
          ],
          ok: true, result: "Mô hình hub-and-spoke: mọi chi nhánh giao tiếp được với nhau và với VPC." },
  },
  {
    ...base,
    name: "Thông lượng VPN không đủ",
    request: "backup 2 TB/đêm",
    from: "từ văn phòng",
    nodes: [OFFICE, VPN, DX,
      { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: "1 tunnel đang hoạt động" },
      { id: "tgw", x: 460, y: 97, w: 160, l1: "Transit Gateway", l2: "ECMP" }, VPC],
    links: [...BASE_LINKS, { a: "vpn", b: "tgw", via: VPN_GW }, { a: "tgw", b: "vpc" }],
    choices: { label: "Thành phần phía AWS", options: ["VGW, một tunnel", "Transit Gateway + nhiều tunnel"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["tgw"], steps: [
            { at: "vpn", via: UP, state: "change", tag: "~1,25 Gbps", msg: "Mỗi tunnel VPN có giới hạn thông lượng." },
            { at: "gw", via: VPN_GW, state: "pass", msg: "VGW chỉ sử dụng một tunnel tại một thời điểm." },
            { at: "vpc", state: "pass", msg: "Tác vụ backup không hoàn tất trong đêm." },
          ],
          ok: false, result: "Bổ sung tunnel vào VGW không làm tăng tổng thông lượng." }
      : { hide: ["gw"], steps: [
            { at: "vpn", via: UP, state: "change", tag: "ECMP", msg: "Nhiều tunnel VPN hoạt động song song." },
            { at: "tgw", via: VPN_GW, state: "pass", msg: "**Transit Gateway** cộng dồn thông lượng của các tunnel bằng equal-cost multipath." },
            { at: "vpc", state: "pass", msg: "Tác vụ backup hoàn tất trong đêm." },
          ],
          ok: true, result: "Thông lượng tăng theo số lượng tunnel." },
  },
];

export default function HybridLinkSim() {
  return <CaseSim scenarios={SCENARIOS} label="Văn phòng ShopViet kết nối vào VPC qua Site-to-Site VPN hoặc Direct Connect" />;
}
