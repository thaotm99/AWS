import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "./CaseSim";

// ShopViet has customers far from Singapore. Each situation needs one of the three
// services that use AWS edge locations: CloudFront (cache, HTTP), S3 Transfer
// Acceleration (uploads into S3) or Global Accelerator (static IPs, TCP/UDP,
// fast failover between Regions). Pick one and watch the traffic.

const NODES: CaseNode[] = [
  { id: "user", x: 30, y: 97, w: 60, l1: "Người dùng", user: true },
  { id: "edge", x: 200, y: 97, w: 120, l1: "Edge location", l2: "gần người dùng" },
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
const SERVICES = { label: "Dịch vụ", options: ["CloudFront", "S3 Transfer Acceleration", "Global Accelerator"] };
const base = { nodes: NODES, boxes: BOXES, links: LINKS, start: "user" };

const GA_NO_S3 = { at: "s3", via: TO_S3, state: "block" as const, flash: "?", msg: "Endpoint của Global Accelerator chỉ có thể là **ALB, NLB, EC2 hoặc Elastic IP**, không hỗ trợ S3." };

const SCENARIOS: CaseScenario[] = [
  {
    ...base,
    name: "Người dùng tại Đức truy xuất ảnh sản phẩm",
    request: "GET /images/ao-thun.jpg",
    from: "từ Đức",
    choices: { ...SERVICES, initial: 1 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "edge", state: "change", tag: "MISS", msg: "Request đầu tiên: ảnh chưa có trong cache, CloudFront truy xuất từ S3." },
          { at: "s3", via: TO_S3, state: "pass", msg: "S3 trả về ảnh; CloudFront lưu object tại edge cache." },
        ],
        ok: true, result: "200 OK: ảnh được trả về với độ trễ thấp. Các request tiếp theo từ người dùng trong khu vực được phục vụ trực tiếp từ edge cache.",
      };
      if (v === 1) return {
        steps: [
          { at: "edge", state: "pass", msg: "S3 Transfer Acceleration cũng đi qua edge location nhưng **không cache** nội dung." },
          { at: "s3", via: TO_S3, state: "pass", msg: "Mọi request đều phải đọc từ bucket tại Singapore." },
        ],
        ok: false, result: "Ảnh vẫn được trả về, nhưng các request sau không nhanh hơn. S3 Transfer Acceleration dành cho **tải lên** S3; truy xuất ảnh nên sử dụng CloudFront.",
      };
      return { steps: [{ at: "edge", state: "pass", msg: "Traffic đi vào mạng AWS qua IP anycast, không có cache." }, GA_NO_S3], ok: false,
        result: "Không áp dụng được. Global Accelerator không cache và không hỗ trợ S3 làm endpoint. Ảnh, trang, video: sử dụng CloudFront." };
    },
  },
  {
    ...base,
    name: "Nhà cung cấp tại Hoa Kỳ tải lên video 5 GB",
    request: "PUT /uploads/catalog.mp4 (5 GB)",
    from: "từ Hoa Kỳ",
    choices: { ...SERVICES, initial: 0 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "edge", state: "skip", msg: "CloudFront có thể chuyển request PUT tới origin, nhưng cache không mang lại lợi ích cho dữ liệu tải lên." },
          { at: "s3", via: TO_S3, state: "pass", msg: "Tệp được ghi vào bucket, tốc độ gần như không thay đổi." },
        ],
        ok: false, result: "Hoạt động được nhưng không giải quyết vấn đề tải lên chậm. CloudFront được tối ưu cho chiều **tải xuống**.",
      };
      if (v === 1) return {
        steps: [
          { at: "edge", state: "change", tag: "TĂNG TỐC", msg: "Dữ liệu được tải lên edge location gần nguồn gửi qua endpoint `s3-accelerate`." },
          { at: "s3", via: TO_S3, state: "pass", msg: "Dữ liệu được truyền qua mạng riêng của AWS tới bucket. Kết hợp **multipart upload** để gửi nhiều phần song song." },
        ],
        ok: true, result: "200 OK: tốc độ tải lên cao và ổn định hơn nhiều so với truyền qua internet đường dài.",
      };
      return { steps: [{ at: "edge", state: "pass", msg: "Traffic đi vào mạng AWS qua IP anycast." }, GA_NO_S3], ok: false,
        result: "Không áp dụng được. Tải lên tệp dung lượng lớn vào S3: S3 Transfer Acceleration kết hợp multipart upload." };
    },
  },
  {
    ...base,
    name: "Minigame khuyến mãi sử dụng UDP",
    request: "UDP :7777 (game)",
    from: "từ Nhật Bản",
    choices: { ...SERVICES, initial: 0 },
    run: (v) => {
      if (v === 2) return {
        steps: [
          { at: "edge", state: "pass", msg: "Global Accelerator tiếp nhận traffic **TCP và UDP** tại edge location gần nhất." },
          { at: "sg", state: "pass", msg: "Traffic được truyền qua mạng riêng của AWS tới NLB tại Region gần nhất." },
        ],
        ok: true, result: "Kết nối ổn định, độ trễ thấp hơn so với truyền qua internet công cộng.",
      };
      return {
        steps: [{ at: "edge", state: "block", flash: "UDP?", msg: v === 0 ? "CloudFront chỉ phục vụ **HTTP/HTTPS**." : "S3 Transfer Acceleration chỉ dùng để truyền tệp vào S3." }],
        ok: false, result: "Gói UDP bị loại bỏ. Ứng dụng game, IoT, VoIP sử dụng UDP hoặc TCP thuần: sử dụng Global Accelerator.",
      };
    },
  },
  {
    ...base,
    name: "Firewall của đối tác chỉ cho phép IP cố định",
    request: "POST /api/orders",
    from: "từ máy chủ đối tác",
    choices: { ...SERVICES, initial: 0 },
    run: (v) => {
      if (v === 2) return {
        steps: [
          { at: "edge", state: "pass", msg: "Global Accelerator cung cấp **2 IP tĩnh anycast**. Đối tác chỉ cần cho phép 2 địa chỉ IP này." },
          { at: "sg", state: "pass", msg: "Traffic tới ALB tại Singapore. Khi IP của ALB thay đổi, IP tĩnh của accelerator vẫn giữ nguyên." },
        ],
        ok: true, result: "200 OK: request đặt hàng của đối tác được firewall cho phép.",
      };
      return {
        steps: [{ at: "edge", state: "block", flash: "IP?", msg: v === 0 ? "CloudFront sử dụng nhiều địa chỉ IP và các địa chỉ này thay đổi; đối tác không thể đưa vào allow list." : "S3 Transfer Acceleration không đặt trước API." }],
        ok: false, result: "Firewall của đối tác chặn request. Yêu cầu IP cố định phía trước ALB: sử dụng Global Accelerator.",
      };
    },
  },
  {
    ...base,
    name: "Region Singapore gặp sự cố",
    request: "GET /api/cart",
    from: "từ Việt Nam",
    choices: { label: "Phương thức định tuyến", options: ["Route 53 (chỉ DNS)", "Global Accelerator"], initial: 0 },
    run: (v) => v === 0
      ? { marks: { sg: "down", edge: "skip" },
          steps: [{ at: "sg", state: "down", flash: "timeout", msg: "Bản ghi DNS đã được chuyển sang Frankfurt, nhưng thiết bị client vẫn giữ IP cũ trong cache cho tới khi hết TTL." }],
          ok: false, result: "Nhiều người dùng tiếp tục gửi request tới Region đang gặp sự cố. Failover bằng DNS phụ thuộc vào thời điểm cache hết hạn." }
      : { marks: { sg: "down" },
          steps: [
            { at: "edge", state: "pass", msg: "Health check xác định Singapore unhealthy." },
            { at: "fra", via: TO_FRA, state: "pass", msg: "Traffic được chuyển ngay sang Frankfurt. Client vẫn kết nối tới 2 IP tĩnh ban đầu." },
          ],
          ok: true, result: "200 OK: người dùng không nhận lỗi, không phụ thuộc vào DNS." },
  },
];

export default function EdgeChoiceSim() {
  return <CaseSim scenarios={SCENARIOS} label="Traffic của người dùng đi qua edge location tới S3 hoặc Region của ShopViet" action="Gửi traffic" />;
}
