import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "./CaseSim";

// ShopViet has customers far from Singapore. Each situation needs one of the three
// services that use AWS edge locations: CloudFront (cache, HTTP), S3 Transfer
// Acceleration (uploads into S3) or Global Accelerator (static IPs, TCP/UDP,
// fast failover between Regions). Pick one and watch the traffic.

const NODES: CaseNode[] = [
  { id: "user", x: 30, y: 97, w: 60, l1: "Khách", user: true },
  { id: "edge", x: 200, y: 97, w: 120, l1: "Edge location", l2: "gần khách" },
  { id: "s3", x: 595, y: 28, w: 170, l1: "S3 bucket", l2: "ảnh, video" },
  { id: "sg", x: 595, y: 97, w: 170, l1: "Singapore", l2: "ALB / NLB / EC2" },
  { id: "fra", x: 595, y: 184, w: 170, l1: "Frankfurt", l2: "ALB / NLB / EC2" },
];
const BOXES = [
  { x: 580, y: 4, w: 200, h: 150, label: "Region Singapore" },
  { x: 580, y: 162, w: 200, h: 74, label: "Region Frankfurt" },
];
const LINKS: CaseLink[] = [
  { a: "user", b: "edge" },
  { a: "edge", b: "sg", label: "mạng riêng của AWS", lx: 440, ly: 112 },
  { a: "edge", b: "s3", via: [[450, 120], [450, 51]] },
  { a: "edge", b: "fra", via: [[450, 120], [450, 207]] },
];
const TO_S3: [number, number][] = [[450, 120], [450, 51]];
const TO_FRA: [number, number][] = [[450, 120], [450, 207]];
const SERVICES = { label: "Dùng dịch vụ", options: ["CloudFront", "S3 Transfer Acceleration", "Global Accelerator"] };
const base = { nodes: NODES, boxes: BOXES, links: LINKS, start: "user" };

const GA_NO_S3 = { at: "s3", via: TO_S3, state: "block" as const, flash: "?", msg: "Global Accelerator chỉ trỏ tới **ALB, NLB, EC2 hoặc Elastic IP**, không trỏ tới S3." };

const SCENARIOS: CaseScenario[] = [
  {
    ...base,
    name: "Khách ở Đức xem ảnh sản phẩm",
    request: "GET /images/ao-thun.jpg",
    from: "từ Đức",
    choices: { ...SERVICES, initial: 1 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "edge", state: "change", tag: "MISS", msg: "Lần đầu chưa có ảnh trong cache, CloudFront lấy từ S3." },
          { at: "s3", via: TO_S3, state: "pass", msg: "S3 trả ảnh, CloudFront lưu lại ở edge." },
        ],
        ok: true, result: "200: ảnh về nhanh. Những lần sau, khách ở gần đó nhận ảnh ngay từ cache ở edge.",
      };
      if (v === 1) return {
        steps: [
          { at: "edge", state: "pass", msg: "Transfer Acceleration cũng đi qua edge nhưng **không cache**." },
          { at: "s3", via: TO_S3, state: "pass", msg: "Lần nào cũng phải đọc từ bucket ở Singapore." },
        ],
        ok: false, result: "Ảnh vẫn tới, nhưng không nhanh hơn ở lần sau. Transfer Acceleration dành cho **upload** vào S3. Xem ảnh thì dùng CloudFront.",
      };
      return { steps: [{ at: "edge", state: "pass", msg: "Vào mạng AWS qua IP anycast, không có cache." }, GA_NO_S3], ok: false,
        result: "Không dùng được. Global Accelerator không cache và không đặt trước S3. Ảnh, trang, video: dùng CloudFront." };
    },
  },
  {
    ...base,
    name: "Nhà cung cấp ở Mỹ upload video 5 GB",
    request: "PUT /uploads/catalog.mp4 (5 GB)",
    from: "từ Mỹ",
    choices: { ...SERVICES, initial: 0 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "edge", state: "skip", msg: "CloudFront chuyển PUT về origin được, nhưng cache không giúp gì cho dữ liệu đi lên." },
          { at: "s3", via: TO_S3, state: "pass", msg: "File tới bucket, tốc độ gần như không đổi." },
        ],
        ok: false, result: "Chạy được nhưng không giải quyết việc upload chậm. CloudFront tối ưu cho **tải về**.",
      };
      if (v === 1) return {
        steps: [
          { at: "edge", state: "change", tag: "TĂNG TỐC", msg: "Upload vào edge gần người gửi qua endpoint `s3-accelerate`." },
          { at: "s3", via: TO_S3, state: "pass", msg: "Dữ liệu chạy trên mạng riêng của AWS tới bucket. Thêm **multipart upload** để gửi nhiều phần song song." },
        ],
        ok: true, result: "200: upload nhanh và ổn định hơn nhiều so với đi internet đường dài.",
      };
      return { steps: [{ at: "edge", state: "pass", msg: "Vào mạng AWS qua IP anycast." }, GA_NO_S3], ok: false,
        result: "Không dùng được. Upload file lớn vào S3: S3 Transfer Acceleration và multipart upload." };
    },
  },
  {
    ...base,
    name: "Minigame khuyến mãi dùng UDP",
    request: "UDP :7777 (game)",
    from: "từ Nhật",
    choices: { ...SERVICES, initial: 0 },
    run: (v) => {
      if (v === 2) return {
        steps: [
          { at: "edge", state: "pass", msg: "Global Accelerator nhận **TCP và UDP** ở edge gần nhất." },
          { at: "sg", state: "pass", msg: "Đi trên mạng riêng của AWS tới NLB ở Region gần nhất." },
        ],
        ok: true, result: "Kết nối ổn định, độ trễ thấp hơn đi internet công cộng.",
      };
      return {
        steps: [{ at: "edge", state: "block", flash: "UDP?", msg: v === 0 ? "CloudFront chỉ phục vụ **HTTP/HTTPS**." : "S3 Transfer Acceleration chỉ dùng để gửi file vào S3." }],
        ok: false, result: "Gói UDP bị bỏ. Game, IoT, VoIP dùng UDP hoặc TCP thuần: chọn Global Accelerator.",
      };
    },
  },
  {
    ...base,
    name: "Đối tác chỉ mở firewall cho IP cố định",
    request: "POST /api/orders",
    from: "từ máy chủ đối tác",
    choices: { ...SERVICES, initial: 0 },
    run: (v) => {
      if (v === 2) return {
        steps: [
          { at: "edge", state: "pass", msg: "Global Accelerator cấp **2 IP tĩnh anycast**. Đối tác chỉ cần mở 2 IP này." },
          { at: "sg", state: "pass", msg: "Tới ALB ở Singapore. IP của ALB đổi cũng không sao, IP tĩnh vẫn giữ nguyên." },
        ],
        ok: true, result: "200: đơn hàng của đối tác đi qua firewall bình thường.",
      };
      return {
        steps: [{ at: "edge", state: "block", flash: "IP?", msg: v === 0 ? "CloudFront dùng rất nhiều IP và chúng thay đổi. Đối tác không whitelist được." : "S3 Transfer Acceleration không đứng trước API." }],
        ok: false, result: "Firewall của đối tác chặn. Cần IP cố định trước ALB: Global Accelerator.",
      };
    },
  },
  {
    ...base,
    name: "Region Singapore gặp sự cố",
    request: "GET /api/cart",
    from: "từ Việt Nam",
    choices: { label: "Định tuyến bằng", options: ["Route 53 (chỉ DNS)", "Global Accelerator"], initial: 0 },
    run: (v) => v === 0
      ? { marks: { sg: "down", edge: "skip" },
          steps: [{ at: "sg", state: "down", flash: "timeout", msg: "Đã đổi DNS sang Frankfurt, nhưng điện thoại vẫn giữ IP cũ trong cache tới khi hết TTL." }],
          ok: false, result: "Nhiều khách tiếp tục gọi vào Region đang hỏng. Failover bằng DNS phải chờ cache hết hạn." }
      : { marks: { sg: "down" },
          steps: [
            { at: "edge", state: "pass", msg: "Health check thấy Singapore hỏng." },
            { at: "fra", via: TO_FRA, state: "pass", msg: "Chuyển sang Frankfurt ngay. Khách vẫn gọi đúng 2 IP tĩnh cũ." },
          ],
          ok: true, result: "200: khách không thấy lỗi, không cần chờ DNS." },
  },
];

export default function EdgeChoiceSim() {
  return <CaseSim scenarios={SCENARIOS} label="Khách đi qua edge location tới S3 hoặc Region của ShopViet" action="Gửi traffic" />;
}
