import CaseSim, { type CaseScenario } from "./CaseSim";

// Four things that are easy to get wrong when ShopViet spreads across Regions and
// AZs: EFS across Regions, where a NAT gateway lives, AZ names vs AZ IDs, and
// using CloudFront together with S3 Transfer Acceleration.

const SCENARIOS: CaseScenario[] = [
  {
    name: "Server Singapore đọc EFS ở Mỹ",
    request: "mount fs-0a1b.efs.us-east-1",
    from: "từ EC2 báo cáo ở Singapore",
    boxes: [
      { x: 20, y: 16, w: 300, h: 206, label: "Region Singapore" },
      { x: 500, y: 16, w: 300, h: 206, label: "Region N. Virginia (us-east-1)" },
    ],
    nodes: [
      { id: "ec2", x: 90, y: 50, w: 160, l1: "EC2 báo cáo", l2: "VPC Singapore" },
      { id: "copy", x: 90, y: 150, w: 160, l1: "EFS mới", l2: "bản copy" },
      { id: "efs", x: 570, y: 96, w: 160, l1: "EFS", l2: "dữ liệu gốc" },
    ],
    links: [
      { id: "peer", a: "ec2", b: "efs", label: "inter-region VPC peering", lx: 410, ly: 76 },
      { a: "ec2", b: "copy" },
      { a: "copy", b: "efs", dashed: true, label: "copy lại mỗi lần đổi", lx: 410, ly: 185 },
    ],
    start: "ec2",
    choices: { label: "Cách làm", options: ["Copy dữ liệu sang EFS ở Singapore", "Mount qua VPC peering"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["peer"], back: false,
          steps: [
            { at: "copy", state: "pass", msg: "Đọc được bản copy ở Singapore." },
            { at: "efs", state: "change", tag: "LỆCH", msg: "Dữ liệu gốc đổi thì lại phải copy. Hai bản dễ lệch nhau." },
          ],
          ok: false, result: "Chạy được nhưng thừa việc. EFS là tài nguyên cấp Region, nhưng không bị khóa trong Region đó." }
      : { hide: ["copy"],
          steps: [{ at: "efs", state: "pass", msg: "Mount thẳng EFS ở us-east-1 qua **inter-region VPC peering**." }],
          ok: true, result: "Một bản dữ liệu duy nhất, server ở Region khác vẫn dùng chung được." },
  },
  {
    name: "Worker ở private subnet tải bản vá",
    request: "GET https://updates.example.com (IPv4)",
    from: "từ worker EC2",
    boxes: [
      { x: 20, y: 6, w: 560, h: 228, label: "VPC ShopViet · AZ a" },
      { x: 40, y: 28, w: 520, h: 84, label: "public subnet · route 0.0.0.0/0 → IGW" },
      { x: 40, y: 126, w: 520, h: 96, label: "private subnet" },
    ],
    nodes: [
      { id: "worker", x: 60, y: 158, w: 130, l1: "Worker EC2", l2: "chỉ có private IP" },
      { id: "natPriv", x: 270, y: 158, w: 140, l1: "NAT gateway", l2: "đặt ở private subnet" },
      { id: "eigw", x: 270, y: 158, w: 140, l1: "Egress-only IGW", l2: "chỉ cho IPv6" },
      { id: "natPub", x: 270, y: 50, w: 140, l1: "NAT gateway", l2: "đặt ở public subnet" },
      { id: "igw", x: 620, y: 50, w: 140, l1: "Internet Gateway" },
      { id: "net", x: 620, y: 158, w: 140, l1: "Internet", l2: "máy chủ bản vá" },
    ],
    links: [
      { a: "worker", b: "natPriv" },
      { a: "worker", b: "eigw" },
      { a: "worker", b: "natPub", via: [[125, 73]] },
      { a: "natPub", b: "igw" },
      { a: "igw", b: "net" },
      { a: "eigw", b: "net" },
    ],
    start: "worker",
    choices: { label: "Đặt lối ra", options: ["NAT gateway ở private subnet", "NAT gateway ở public subnet", "Egress-only IGW"], initial: 0 },
    run: (v) => {
      if (v === 0) return { hide: ["natPub", "eigw"],
        steps: [
          { at: "natPriv", state: "pass", msg: "Route `0.0.0.0/0` của private subnet trỏ tới NAT gateway." },
          { at: "natPriv", state: "block", msg: "Nhưng NAT gateway nằm trong private subnet, subnet này không có route tới Internet Gateway." },
        ],
        ok: false, result: "Không ra được internet. NAT gateway phải nằm ở **public subnet**." };
      if (v === 1) return { hide: ["natPriv", "eigw"],
        steps: [
          { at: "natPub", via: [[125, 73]], state: "change", tag: "NAT", msg: "NAT gateway thay private IP của worker bằng Elastic IP của nó." },
          { at: "igw", state: "pass", msg: "Public subnet có route tới Internet Gateway." },
          { at: "net", state: "pass", msg: "Tải bản vá. Internet không chủ động gọi ngược vào worker được." },
        ],
        ok: true, result: "Ra được internet. NAT gateway thuộc một AZ, nên mỗi AZ cần một cái để chịu lỗi AZ." };
      return { hide: ["natPriv", "natPub"],
        steps: [{ at: "eigw", state: "block", flash: "IPv4?", msg: "Egress-only internet gateway chỉ cho **IPv6** đi ra." }],
        ok: false, result: "Không ra được bằng IPv4. Ra internet một chiều với IPv4 thì dùng NAT gateway." };
    },
  },
  {
    name: "Đặt server cạnh server đối tác",
    request: "ping 10.20.0.15",
    from: "từ account ShopViet tới account đối tác",
    boxes: [
      { x: 20, y: 16, w: 370, h: 206, label: "AZ vật lý use1-az2" },
      { x: 430, y: 16, w: 370, h: 206, label: "AZ vật lý use1-az4" },
    ],
    nodes: [
      { id: "shop", x: 40, y: 96, w: 160, l1: "Server ShopViet", l2: "account A: us-east-1a" },
      { id: "near", x: 215, y: 96, w: 160, l1: "Server đối tác", l2: "account B: use1-az2" },
      { id: "far", x: 560, y: 96, w: 180, l1: "Server đối tác", l2: "account B: us-east-1a" },
    ],
    links: [{ a: "shop", b: "near" }, { a: "shop", b: "far" }],
    start: "shop",
    choices: { label: "Hẹn nhau theo", options: ["Tên AZ (us-east-1a)", "AZ ID (use1-az2)"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["near"],
          steps: [{ at: "far", state: "change", tag: "KHÁC AZ", msg: "Cùng tên `us-east-1a`, nhưng ở account B tên này ứng với **use1-az4**." }],
          ok: false, result: "Hai server nằm ở hai AZ khác nhau: thêm độ trễ và phí data transfer giữa AZ." }
      : { hide: ["far"],
          steps: [{ at: "near", state: "pass", msg: "Cả hai account chọn subnet theo **AZ ID** `use1-az2`." }],
          ok: true, result: "Hai server nằm đúng cùng một AZ vật lý. Tên AZ được xáo khác nhau ở mỗi account, AZ ID thì không." },
  },
  {
    name: "Khách vừa xem vừa upload ảnh",
    request: "GET /images/*  +  PUT /uploads/*",
    from: "từ Úc",
    nodes: [
      { id: "user", x: 30, y: 97, w: 60, l1: "Khách", user: true },
      { id: "cf", x: 300, y: 28, w: 170, l1: "CloudFront", l2: "edge gần khách" },
      { id: "s3ta", x: 300, y: 166, w: 170, l1: "S3 Transfer Acceleration", l2: "edge gần khách" },
      { id: "s3", x: 640, y: 97, w: 150, l1: "S3 bucket", l2: "Singapore" },
    ],
    links: [
      { a: "user", b: "cf" }, { a: "cf", b: "s3" },
      { a: "user", b: "s3ta" }, { a: "s3ta", b: "s3" },
      { id: "direct", a: "user", b: "s3", dashed: true, label: "internet đường dài", lx: 385, ly: 114 },
    ],
    start: "user",
    choices: { label: "Bật", options: ["Chỉ CloudFront", "Chỉ S3 Transfer Acceleration", "Cả hai"], initial: 0 },
    run: (v) => {
      const view = [
        { at: "cf", state: "pass" as const, tag: "HIT", msg: "Ảnh có sẵn trong cache ở edge." },
        { at: "user", state: "pass" as const, tag: "NHẬN", msg: "Ảnh hiện ngay." },
      ];
      const fastUp = [
        { at: "s3ta", state: "change" as const, tag: "TĂNG TỐC", msg: "Upload vào edge gần nhất, rồi chạy trên mạng AWS." },
        { at: "s3", state: "pass" as const, msg: "Ảnh mới được ghi vào bucket." },
      ];
      if (v === 0) return { hide: ["s3ta"], back: false,
        steps: [...view, { at: "s3", state: "change", tag: "CHẬM", msg: "Upload đi internet đường dài tới Singapore." }],
        ok: false, result: "Xem nhanh nhưng upload vẫn chậm. Cần thêm S3 Transfer Acceleration." };
      if (v === 1) return { hide: ["cf"], back: false,
        steps: [
          { at: "s3", state: "change", tag: "CHẬM", msg: "Không có cache: lần xem nào cũng chạy về Singapore." },
          { at: "user", state: "pass", tag: "NHẬN", msg: "Ảnh hiện chậm." },
          ...fastUp,
        ],
        ok: false, result: "Upload nhanh nhưng xem vẫn chậm. Cần thêm CloudFront." };
      return { hide: ["direct"], back: false, steps: [...view, ...fastUp],
        ok: true, result: "Cả hai chiều đều nhanh: CloudFront cho tải về, S3 Transfer Acceleration cho tải lên." };
    },
  },
];

export default function GlobalMythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Bốn tình huống dễ làm sai khi dựng ShopViet ở nhiều Region" action="Chạy thử" />;
}
