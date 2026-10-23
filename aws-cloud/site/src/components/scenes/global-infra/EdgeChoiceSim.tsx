import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "./CaseSim";

// MFTECH has customers far from Singapore. Each situation needs one of the three
// services that use AWS edge locations: CloudFront (cache, HTTP), S3 Transfer
// Acceleration (long-distance transfers to/from S3) or Global Accelerator (static IPs, TCP/UDP,
// fast failover between Regions). Pick one and watch the traffic.

type Lang = ReturnType<typeof useLang>;

const TO_S3: [number, number][] = [[450, 120], [450, 51]];
const TO_FRA: [number, number][] = [[450, 120], [450, 207]];

function scenarios(L: Lang): CaseScenario[] {
  const NODES: CaseNode[] = [
    { id: "user", x: 30, y: 97, w: 60, l1: L({ vi: "Người dùng", en: "Users" }), user: true },
    { id: "edge", x: 200, y: 97, w: 120, l1: "Edge location", l2: L({ vi: "gần người dùng", en: "near users" }) },
    { id: "s3", x: 595, y: 28, w: 170, l1: "S3 bucket", l2: L({ vi: "ảnh, video", en: "images, video" }) },
    { id: "sg", x: 595, y: 97, w: 170, l1: "Singapore", l2: "ALB / NLB / EC2" },
    { id: "fra", x: 595, y: 184, w: 170, l1: "Frankfurt", l2: "ALB / NLB / EC2" },
  ];
  const BOXES = [
    { x: 580, y: 4, w: 200, h: 150, label: L({ vi: "Region Singapore", en: "Singapore Region" }) },
    { x: 580, y: 162, w: 200, h: 74, label: L({ vi: "Region Frankfurt", en: "Frankfurt Region" }) },
  ];
  const LINKS: CaseLink[] = [
    { a: "user", b: "edge" },
    { a: "edge", b: "sg", label: L({ vi: "mạng riêng của AWS", en: "AWS private network" }), lx: 440, ly: 112 },
    { a: "edge", b: "s3", via: [[450, 120], [450, 51]] },
    { a: "edge", b: "fra", via: [[450, 120], [450, 207]] },
  ];
  const SERVICES = { label: L({ vi: "Dịch vụ", en: "Service" }), options: ["CloudFront", "S3 Transfer Acceleration", "Global Accelerator"] };
  const base = { nodes: NODES, boxes: BOXES, links: LINKS, start: "user" };

  const GA_NO_S3 = { at: "s3", via: TO_S3, state: "block" as const, flash: "?", msg: L({ vi: "Endpoint của Global Accelerator chỉ có thể là **ALB, NLB, EC2 hoặc Elastic IP**, không hỗ trợ S3.", en: "A Global Accelerator endpoint can only be an **ALB, NLB, EC2 instance or Elastic IP**; S3 is not supported." }) };

  return [
    {
      ...base,
      name: L({ vi: "Người dùng tại Đức truy xuất ảnh sản phẩm", en: "Users in Germany fetch product images" }),
      request: "GET /images/ao-thun.jpg",
      from: L({ vi: "từ Đức", en: "from Germany" }),
      choices: { ...SERVICES, initial: 1 },
      run: (v) => {
        if (v === 0) return {
          steps: [
            { at: "edge", state: "change", tag: "MISS", msg: L({ vi: "Request đầu tiên: ảnh chưa có trong cache, CloudFront truy xuất từ S3.", en: "First request: the image is not in the cache yet, so CloudFront fetches it from S3." }) },
            { at: "s3", via: TO_S3, state: "pass", msg: L({ vi: "S3 trả về ảnh; CloudFront lưu object tại edge cache.", en: "S3 returns the image; CloudFront stores the object in the edge cache." }) },
          ],
          ok: true, result: L({ vi: "200 OK: ảnh được trả về với độ trễ thấp. Các request tiếp theo từ người dùng trong khu vực được phục vụ trực tiếp từ edge cache.", en: "200 OK: the image is returned with low latency. Later requests from users in the area are served directly from the edge cache." }),
        };
        if (v === 1) return {
          steps: [
            { at: "edge", state: "pass", msg: L({ vi: "S3 Transfer Acceleration cũng đi qua edge location nhưng **không cache** nội dung.", en: "S3 Transfer Acceleration also goes through an edge location but **does not cache** content." }) },
            { at: "s3", via: TO_S3, state: "pass", msg: L({ vi: "Mọi request đều phải đọc từ bucket tại Singapore.", en: "Every request must read from the bucket in Singapore." }) },
          ],
          ok: false, result: L({ vi: "Ảnh vẫn được trả về, nhưng các request sau không nhanh hơn. S3 Transfer Acceleration tăng tốc truyền dữ liệu tới và từ bucket nhưng không cache; phân phối ảnh cho nhiều người dùng nên sử dụng CloudFront.", en: "The image is still returned, but later requests are no faster. S3 Transfer Acceleration speeds up transfers to and from the bucket but does not cache; to distribute images to many users, use CloudFront." }),
        };
        return { steps: [{ at: "edge", state: "pass", msg: L({ vi: "Traffic đi vào mạng AWS qua IP anycast, không có cache.", en: "Traffic enters the AWS network through the anycast IPs, with no cache." }) }, GA_NO_S3], ok: false,
          result: L({ vi: "Không áp dụng được. Global Accelerator không cache và không hỗ trợ S3 làm endpoint. Ảnh, trang, video: sử dụng CloudFront.", en: "Not applicable. Global Accelerator does not cache and does not support S3 as an endpoint. Images, pages, video: use CloudFront." }) };
      },
    },
    {
      ...base,
      name: L({ vi: "Nhà cung cấp tại Hoa Kỳ tải lên video 5 GB", en: "A supplier in the US uploads a 5 GB video" }),
      request: "PUT /uploads/catalog.mp4 (5 GB)",
      from: L({ vi: "từ Hoa Kỳ", en: "from the US" }),
      choices: { ...SERVICES, initial: 0 },
      run: (v) => {
        if (v === 0) return {
          steps: [
            { at: "edge", state: "skip", msg: L({ vi: "CloudFront có thể chuyển request PUT tới origin qua edge location, nhưng dữ liệu tải lên không được cache.", en: "CloudFront can forward PUT requests to the origin through the edge location, but uploaded data is not cached." }) },
            { at: "s3", via: TO_S3, state: "pass", msg: L({ vi: "Tệp được ghi vào bucket thông qua distribution; phải cấu hình thêm allowed methods và quyền ghi cho origin.", en: "The file is written to the bucket through the distribution; allowed methods and write permissions on the origin must also be configured." }) },
          ],
          ok: false, result: L({ vi: "Hoạt động được nhưng không phải phương án được thiết kế cho bài toán này: tài liệu S3 nêu S3 Transfer Acceleration cho trường hợp tải lên bucket tập trung từ nhiều nơi trên thế giới. Thế mạnh chính của CloudFront là cache và phân phối nội dung.", en: "It works, but it is not the option designed for this problem: the S3 documentation names S3 Transfer Acceleration for uploads to a centralized bucket from many places around the world. CloudFront's main strength is caching and distributing content." }),
        };
        if (v === 1) return {
          steps: [
            { at: "edge", state: "change", tag: L({ vi: "TĂNG TỐC", en: "ACCELERATED" }), msg: L({ vi: "Dữ liệu được tải lên edge location gần nguồn gửi qua endpoint `s3-accelerate`.", en: "Data is uploaded to the edge location near the sender through the `s3-accelerate` endpoint." }) },
            { at: "s3", via: TO_S3, state: "pass", msg: L({ vi: "Dữ liệu được truyền qua mạng riêng của AWS tới bucket. Kết hợp **multipart upload** để gửi nhiều phần song song.", en: "Data travels over the AWS private network to the bucket. Combine with **multipart upload** to send several parts in parallel." }) },
          ],
          ok: true, result: L({ vi: "200 OK: tốc độ tải lên cao và ổn định hơn nhiều so với truyền qua internet đường dài.", en: "200 OK: upload speed is much higher and more consistent than a long-distance transfer over the internet." }),
        };
        return { steps: [{ at: "edge", state: "pass", msg: L({ vi: "Traffic đi vào mạng AWS qua IP anycast.", en: "Traffic enters the AWS network through the anycast IPs." }) }, GA_NO_S3], ok: false,
          result: L({ vi: "Không áp dụng được. Tải lên tệp dung lượng lớn vào S3: S3 Transfer Acceleration kết hợp multipart upload.", en: "Not applicable. Uploading large files to S3: S3 Transfer Acceleration combined with multipart upload." }) };
      },
    },
    {
      ...base,
      name: L({ vi: "Minigame khuyến mãi sử dụng UDP", en: "Promotional minigame using UDP" }),
      request: "UDP :7777 (game)",
      from: L({ vi: "từ Nhật Bản", en: "from Japan" }),
      choices: { ...SERVICES, initial: 0 },
      run: (v) => {
        if (v === 2) return {
          steps: [
            { at: "edge", state: "pass", msg: L({ vi: "Global Accelerator tiếp nhận traffic **TCP và UDP** tại edge location gần nhất.", en: "Global Accelerator accepts **TCP and UDP** traffic at the nearest edge location." }) },
            { at: "sg", state: "pass", msg: L({ vi: "Traffic được truyền qua mạng riêng của AWS tới NLB tại Region gần nhất.", en: "Traffic travels over the AWS private network to the NLB in the nearest Region." }) },
          ],
          ok: true, result: L({ vi: "Kết nối ổn định, độ trễ thấp hơn so với truyền qua internet công cộng.", en: "The connection is stable, with lower latency than over the public internet." }),
        };
        return {
          steps: [{ at: "edge", state: "block", flash: "UDP?", msg: v === 0 ? L({ vi: "CloudFront chỉ tiếp nhận request **HTTP/HTTPS** (bao gồm WebSocket và gRPC).", en: "CloudFront accepts only **HTTP/HTTPS** requests (including WebSocket and gRPC)." }) : L({ vi: "S3 Transfer Acceleration chỉ dùng để truyền dữ liệu tới và từ S3 bucket.", en: "S3 Transfer Acceleration is used only for transfers to and from an S3 bucket." }) }],
          ok: false, result: L({ vi: "Gói UDP bị loại bỏ. Ứng dụng game, IoT, VoIP sử dụng UDP hoặc TCP thuần: sử dụng Global Accelerator.", en: "The UDP packets are dropped. Gaming, IoT and VoIP applications that use UDP or plain TCP: use Global Accelerator." }),
        };
      },
    },
    {
      ...base,
      name: L({ vi: "Firewall của đối tác chỉ cho phép IP cố định", en: "A partner's firewall allows only fixed IPs" }),
      request: "POST /api/orders",
      from: L({ vi: "từ server của đối tác", en: "from the partner's server" }),
      choices: { ...SERVICES, initial: 0 },
      run: (v) => {
        if (v === 2) return {
          steps: [
            { at: "edge", state: "pass", msg: L({ vi: "Global Accelerator cung cấp **2 IP tĩnh anycast**. Đối tác chỉ cần cho phép 2 địa chỉ IP này.", en: "Global Accelerator provides **2 static anycast IPs**. The partner only needs to allow these 2 IP addresses." }) },
            { at: "sg", state: "pass", msg: L({ vi: "Traffic tới ALB tại Singapore. Khi IP của ALB thay đổi, IP tĩnh của accelerator vẫn giữ nguyên.", en: "Traffic reaches the ALB in Singapore. When the ALB's IPs change, the accelerator's static IPs stay the same." }) },
          ],
          ok: true, result: L({ vi: "200 OK: request đặt hàng của đối tác được firewall cho phép.", en: "200 OK: the partner's order request is allowed by the firewall." }),
        };
        return {
          steps: [{ at: "edge", state: "block", flash: "IP?", msg: v === 0 ? L({ vi: "Với cấu hình mặc định, distribution không có danh sách IP cố định dành riêng. CloudFront hỗ trợ **Anycast static IP list** (21 địa chỉ) nhưng phải gửi yêu cầu tới CloudFront support và chờ phê duyệt.", en: "With the default configuration, a distribution has no dedicated list of fixed IPs. CloudFront supports an **Anycast static IP list** (21 addresses), but you must submit a request to CloudFront support and wait for approval." }) : L({ vi: "S3 Transfer Acceleration không đặt trước API.", en: "S3 Transfer Acceleration does not sit in front of an API." }) }],
          ok: false, result: L({ vi: "Firewall của đối tác chặn request. Yêu cầu IP cố định phía trước ALB với cấu hình đơn giản nhất: sử dụng Global Accelerator, accelerator được cấp IP tĩnh ngay khi tạo.", en: "The partner's firewall blocks the request. For fixed IPs in front of an ALB with the simplest configuration: use Global Accelerator; the accelerator gets its static IPs as soon as it is created." }),
        };
      },
    },
    {
      ...base,
      name: L({ vi: "Region Singapore gặp sự cố", en: "The Singapore Region fails" }),
      request: "GET /api/cart",
      from: L({ vi: "từ Việt Nam", en: "from Vietnam" }),
      choices: { label: L({ vi: "Phương thức định tuyến", en: "Routing method" }), options: [L({ vi: "Route 53 (chỉ DNS)", en: "Route 53 (DNS only)" }), "Global Accelerator"], initial: 0 },
      run: (v) => v === 0
        ? { marks: { sg: "down", edge: "skip" },
            steps: [{ at: "sg", state: "down", flash: "timeout", msg: L({ vi: "DNS record đã được chuyển sang Frankfurt, nhưng thiết bị client vẫn giữ IP cũ trong cache cho tới khi hết TTL.", en: "The DNS record has been switched to Frankfurt, but client devices keep the old IP in their cache until the TTL expires." }) }],
            ok: false, result: L({ vi: "Nhiều người dùng tiếp tục gửi request tới Region đang gặp sự cố. Failover bằng DNS phụ thuộc vào thời điểm cache hết hạn.", en: "Many users keep sending requests to the failed Region. DNS failover depends on when caches expire." }) }
        : { marks: { sg: "down" },
            steps: [
              { at: "edge", state: "pass", msg: L({ vi: "Health check xác định Singapore unhealthy.", en: "Health checks mark Singapore as unhealthy." }) },
              { at: "fra", via: TO_FRA, state: "pass", msg: L({ vi: "Traffic được chuyển ngay sang Frankfurt. Client vẫn kết nối tới 2 IP tĩnh ban đầu.", en: "Traffic is shifted to Frankfurt immediately. Clients still connect to the same 2 static IPs." }) },
            ],
            ok: true, result: L({ vi: "200 OK: người dùng không nhận lỗi, không phụ thuộc vào DNS.", en: "200 OK: users get no errors, with no dependence on DNS." }) },
    },
  ];
}

export default function EdgeChoiceSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Traffic của người dùng đi qua edge location tới S3 hoặc Region của MFTECH", en: "User traffic goes through an edge location to S3 or a MFTECH Region" })} action={L({ vi: "Gửi traffic", en: "Send traffic" })} />;
}
