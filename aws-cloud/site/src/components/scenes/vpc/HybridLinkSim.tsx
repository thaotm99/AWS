import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

// ShopViet's office talks to its VPCs. Each situation is a real need: connect this
// week, encrypt a private line, survive a Direct Connect cut, reach two Regions,
// read S3, let branches talk, get more VPN bandwidth.

type P = [number, number];
const OFFICE: CaseNode = { id: "office", x: 20, y: 97, w: 150, l1: "Văn phòng ShopViet", l2: "customer gateway" };
const VPN: CaseNode = { id: "vpn", x: 240, y: 28, w: 160, l1: "Site-to-Site VPN", l2: "IPsec qua internet" };
const DX: CaseNode = { id: "dx", x: 240, y: 166, w: 160, l1: "Direct Connect", l2: "đường riêng" };
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
    name: "Cần nối ngay trong tuần",
    request: "ssh 10.0.1.25",
    from: "từ máy kế toán",
    choices: { label: "Kết nối bằng", options: ["Direct Connect", "Site-to-Site VPN"], initial: 0 },
    run: (v) => v === 0
      ? { back: false, steps: [
            { at: "dx", via: DOWN, state: "change", tag: "CHỜ", msg: "Đường riêng phải đặt với nhà mạng, thường mất vài tuần tới vài tháng." },
          ],
          ok: false, result: "Chưa dùng được trong tuần này. Cần nhanh và rẻ: Site-to-Site VPN." }
      : { steps: [
            { at: "vpn", via: UP, state: "pass", msg: "Dựng trong vài giờ trên đường internet sẵn có, mã hóa **IPsec**." },
            { at: "gw", via: VPN_GW, state: "pass", msg: "Phía AWS là **virtual private gateway** (hoặc Transit Gateway)." },
            { at: "vpc", state: "pass", msg: "Tới server trong VPC." },
          ],
          ok: true, result: "Kết nối xong trong ngày, có mã hóa, chi phí thấp." },
  },
  {
    ...base,
    name: "Dữ liệu nhạy cảm, cần đường ổn định",
    request: "sync payroll.csv",
    from: "từ máy chủ nhân sự",
    choices: { label: "Kết nối bằng", options: ["Chỉ Direct Connect", "Direct Connect + VPN"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "dx", via: DOWN, state: "change", tag: "CHƯA MÃ HÓA", msg: "Băng thông riêng, ổn định. Nhưng Direct Connect **không tự mã hóa** dữ liệu." },
            { at: "gw", via: DX_GW, state: "pass", msg: "Vào VPC qua private VIF." },
            { at: "vpc", state: "pass", msg: "Dữ liệu tới nơi dưới dạng không mã hóa." },
          ],
          ok: false, result: "Ổn định nhưng chưa đạt yêu cầu mã hóa." }
      : { steps: [
            { at: "dx", via: DOWN, state: "change", tag: "IPsec", msg: "Chạy **VPN bên trên Direct Connect**: vừa đường riêng, vừa mã hóa." },
            { at: "gw", via: DX_GW, state: "pass", msg: "Tunnel VPN kết thúc ở VGW." },
            { at: "vpc", state: "pass", msg: "Dữ liệu tới nơi đã được mã hóa suốt đường đi." },
          ],
          ok: true, result: "Ổn định và có mã hóa." },
  },
  {
    ...base,
    name: "Đường Direct Connect bị đứt",
    request: "GET http://10.0.1.25/orders",
    from: "từ văn phòng",
    choices: { label: "Dự phòng", options: ["Không có", "Site-to-Site VPN làm backup"], initial: 0 },
    run: (v) => v === 0
      ? { marks: { dx: "down", "dx-gw": "down", "office-dx": "down" },
          steps: [{ at: "dx", via: DOWN, state: "down", flash: "đứt", msg: "Đường chính bị đứt, không còn đường nào khác." }],
          ok: false, result: "Văn phòng mất kết nối tới VPC cho tới khi nhà mạng sửa xong." }
      : { marks: { dx: "down", "dx-gw": "down", "office-dx": "down" },
          steps: [
            { at: "vpn", via: UP, state: "pass", msg: "Route tự chuyển sang VPN qua internet." },
            { at: "gw", via: VPN_GW, state: "pass", msg: "Cùng VGW nhận traffic từ tunnel VPN." },
            { at: "vpc", state: "pass", msg: "Vẫn tới được server." },
          ],
          ok: true, result: "Chậm hơn một chút nhưng không mất kết nối. VPN là đường dự phòng rẻ cho Direct Connect." },
  },
  {
    ...base,
    name: "Thêm VPC ở Tokyo",
    request: "GET http://10.1.0.8/report",
    from: "từ văn phòng",
    nodes: [OFFICE, VPN, DX,
      { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: "chỉ của VPC Singapore" },
      { id: "dxgw", x: 460, y: 97, w: 160, l1: "Direct Connect gateway", l2: "dùng cho nhiều Region" },
      { ...VPC, y: 50 }, { id: "tokyo", x: 660, y: 150, w: 140, l1: "VPC Tokyo", l2: "10.1.0.0/16" }],
    links: [
      { a: "office", b: "vpn", via: UP }, { a: "office", b: "dx", via: DOWN },
      { a: "vpn", b: "gw", via: VPN_GW }, { a: "dx", b: "gw", via: DX_GW }, { a: "dx", b: "dxgw", via: DX_GW },
      { a: "gw", b: "vpc", via: [[640, 120], [640, 73]] }, { a: "dxgw", b: "vpc", via: [[640, 120], [640, 73]] },
      { a: "dxgw", b: "tokyo", via: [[640, 120], [640, 173]] },
    ],
    choices: { label: "Phía AWS dùng", options: ["VGW của từng VPC", "Direct Connect gateway"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["dxgw"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Đi trên đường Direct Connect sẵn có." },
            { at: "gw", via: DX_GW, state: "block", msg: "VGW này chỉ gắn với VPC Singapore. Muốn vào Tokyo phải kéo thêm một đường nữa." },
          ],
          ok: false, result: "Không tới được VPC Tokyo bằng đường hiện có." }
      : { hide: ["gw"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Một đường Direct Connect duy nhất." },
            { at: "dxgw", via: DX_GW, state: "pass", msg: "**Direct Connect gateway** gắn với VGW của cả hai Region." },
            { at: "tokyo", via: [[640, 120], [640, 173]], state: "pass", msg: "Tới VPC Tokyo." },
          ],
          ok: true, result: "Một đường Direct Connect phục vụ VPC ở nhiều Region. Nhiều VPC hơn nữa thì kết hợp Transit Gateway." },
  },
  {
    ...base,
    name: "Đọc S3 qua Direct Connect",
    request: "GET s3://shopviet-reports/may.csv",
    from: "từ văn phòng",
    nodes: [OFFICE, VPN, DX, VGW, VPC, { id: "s3", x: 660, y: 20, w: 140, h: 40, l1: "Amazon S3", l2: "endpoint public" }],
    links: [...BASE_LINKS, { id: "pub", a: "dx", b: "s3", via: [[440, 189], [440, 40]], dashed: true, label: "public VIF", lx: 470, ly: 34 }],
    choices: { label: "Virtual interface", options: ["Private VIF", "Public VIF"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["pub"], steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Đi trên Direct Connect." },
            { at: "gw", via: DX_GW, state: "pass", msg: "**Private VIF** chỉ dẫn vào VPC." },
            { at: "gw", state: "block", flash: "S3?", msg: "S3 là endpoint public, không nằm trong VPC nên private VIF không tới được." },
          ],
          ok: false, result: "Không đọc được S3 qua đường này." }
      : { steps: [
            { at: "dx", via: DOWN, state: "pass", msg: "Đi trên Direct Connect." },
            { at: "s3", via: [[440, 189], [440, 40]], state: "pass", msg: "**Public VIF** tới các endpoint public của AWS như S3." },
          ],
          ok: true, result: "Đọc S3 trên đường riêng, không qua internet." },
  },
  {
    name: "Ba chi nhánh cần nói chuyện với nhau",
    request: "Hà Nội → Đà Nẵng: GET /stock",
    from: "giữa hai chi nhánh",
    nodes: [
      { id: "hn", x: 20, y: 20, w: 150, l1: "Chi nhánh Hà Nội", l2: "VPN" },
      { id: "dn", x: 20, y: 97, w: 150, l1: "Chi nhánh Đà Nẵng", l2: "VPN" },
      { id: "hcm", x: 20, y: 174, w: 150, l1: "Chi nhánh TP.HCM", l2: "VPN" },
      { id: "gw", x: 360, y: 97, w: 170, l1: "VGW", l2: "hub ở AWS" },
      VPC,
    ],
    links: [{ a: "hn", b: "gw" }, { a: "dn", b: "gw" }, { a: "hcm", b: "gw" }, { a: "gw", b: "vpc" }],
    start: "hn",
    choices: { label: "Cấu hình", options: ["Mỗi chi nhánh một VPN riêng lẻ", "AWS VPN CloudHub"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "gw", state: "pass", msg: "Tới VGW qua VPN của Hà Nội." },
            { at: "gw", state: "block", msg: "Các tunnel chưa quảng bá route cho nhau, VGW không biết đường tới Đà Nẵng." },
          ],
          ok: false, result: "Chi nhánh chỉ vào được VPC, không nói chuyện được với nhau." }
      : { steps: [
            { at: "gw", state: "change", tag: "HUB", msg: "**VPN CloudHub**: các customer gateway dùng BGP, VGW quảng bá route giữa các chi nhánh." },
            { at: "dn", state: "pass", msg: "Tới Đà Nẵng qua hub, không cần đường riêng giữa hai chi nhánh." },
          ],
          ok: true, result: "Mô hình hub-and-spoke: mọi chi nhánh nói chuyện được với nhau và với VPC." },
  },
  {
    ...base,
    name: "VPN quá chậm",
    request: "backup 2 TB/đêm",
    from: "từ văn phòng",
    nodes: [OFFICE, VPN, DX,
      { id: "gw", x: 460, y: 97, w: 160, l1: "VGW", l2: "1 tunnel đang dùng" },
      { id: "tgw", x: 460, y: 97, w: 160, l1: "Transit Gateway", l2: "ECMP" }, VPC],
    links: [...BASE_LINKS, { a: "vpn", b: "tgw", via: VPN_GW }, { a: "tgw", b: "vpc" }],
    choices: { label: "Phía AWS dùng", options: ["VGW, một tunnel", "Transit Gateway + nhiều tunnel"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["tgw"], steps: [
            { at: "vpn", via: UP, state: "change", tag: "~1,25 Gbps", msg: "Mỗi tunnel VPN có giới hạn băng thông." },
            { at: "gw", via: VPN_GW, state: "pass", msg: "VGW chỉ dùng một tunnel tại một thời điểm." },
            { at: "vpc", state: "pass", msg: "Backup chạy không xong trong đêm." },
          ],
          ok: false, result: "Thêm tunnel vào VGW không cộng thêm băng thông." }
      : { hide: ["gw"], steps: [
            { at: "vpn", via: UP, state: "change", tag: "ECMP", msg: "Nhiều tunnel VPN chạy song song." },
            { at: "tgw", via: VPN_GW, state: "pass", msg: "**Transit Gateway** cộng dồn băng thông các tunnel bằng equal-cost multipath." },
            { at: "vpc", state: "pass", msg: "Backup xong trong đêm." },
          ],
          ok: true, result: "Băng thông tăng theo số tunnel." },
  },
];

export default function HybridLinkSim() {
  return <CaseSim scenarios={SCENARIOS} label="Văn phòng ShopViet nối vào VPC qua Site-to-Site VPN hoặc Direct Connect" />;
}
