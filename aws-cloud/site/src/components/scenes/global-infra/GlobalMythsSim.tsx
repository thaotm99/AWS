import CaseSim, { type CaseScenario } from "./CaseSim";

// Four things that are easy to get wrong when ShopViet spreads across Regions and
// AZs: EFS across Regions, where a NAT gateway lives, AZ names vs AZ IDs, and
// using CloudFront together with S3 Transfer Acceleration.

const SCENARIOS: CaseScenario[] = [
  {
    name: "Server tại Singapore đọc EFS tại us-east-1",
    request: "mount fs-0a1b.efs.us-east-1",
    from: "từ EC2 báo cáo tại Singapore",
    boxes: [
      { x: 20, y: 16, w: 300, h: 206, label: "Region Singapore" },
      { x: 500, y: 16, w: 300, h: 206, label: "Region N. Virginia (us-east-1)" },
    ],
    nodes: [
      { id: "ec2", x: 90, y: 50, w: 160, l1: "EC2 báo cáo", l2: "VPC Singapore" },
      { id: "copy", x: 90, y: 150, w: 160, l1: "EFS mới", l2: "bản sao dữ liệu" },
      { id: "efs", x: 570, y: 96, w: 160, l1: "EFS", l2: "dữ liệu gốc" },
    ],
    links: [
      { id: "peer", a: "ec2", b: "efs", label: "inter-region VPC peering", lx: 410, ly: 76 },
      { a: "ec2", b: "copy" },
      { a: "copy", b: "efs", dashed: true, label: "copy lại khi thay đổi", lx: 410, ly: 185 },
    ],
    start: "ec2",
    choices: { label: "Phương án", options: ["Copy dữ liệu sang EFS tại Singapore", "Mount qua VPC peering"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["peer"], back: false,
          steps: [
            { at: "copy", state: "pass", msg: "Đọc được bản sao tại Singapore." },
            { at: "efs", state: "change", tag: "SAI LỆCH", msg: "Mỗi khi dữ liệu gốc thay đổi, dữ liệu phải được copy lại; hai bản dễ mất đồng bộ." },
          ],
          ok: false, result: "Hoạt động được nhưng phát sinh tác vụ không cần thiết. EFS là tài nguyên cấp Region nhưng không bị giới hạn truy cập trong Region đó." }
      : { hide: ["copy"],
          steps: [{ at: "efs", state: "pass", msg: "Mount trực tiếp EFS tại us-east-1 qua **inter-region VPC peering**." }],
          ok: true, result: "Chỉ duy trì một bản dữ liệu; server tại Region khác vẫn sử dụng chung được." },
  },
  {
    name: "Worker trong private subnet tải bản vá",
    request: "GET https://updates.example.com (IPv4)",
    from: "từ worker EC2",
    boxes: [
      { x: 20, y: 6, w: 560, h: 228, label: "VPC ShopViet · AZ a" },
      { x: 40, y: 28, w: 520, h: 84, label: "public subnet · route 0.0.0.0/0 → IGW" },
      { x: 40, y: 126, w: 520, h: 96, label: "private subnet" },
    ],
    nodes: [
      { id: "worker", x: 60, y: 158, w: 130, l1: "Worker EC2", l2: "chỉ có private IP" },
      { id: "natPriv", x: 270, y: 158, w: 140, l1: "NAT gateway", l2: "đặt trong private subnet" },
      { id: "eigw", x: 270, y: 158, w: 140, l1: "Egress-only IGW", l2: "chỉ dành cho IPv6" },
      { id: "natPub", x: 270, y: 50, w: 140, l1: "NAT gateway", l2: "đặt trong public subnet" },
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
    choices: { label: "Cổng ra internet", options: ["NAT gateway trong private subnet", "NAT gateway trong public subnet", "Egress-only IGW"], initial: 0 },
    run: (v) => {
      if (v === 0) return { hide: ["natPub", "eigw"],
        steps: [
          { at: "natPriv", state: "pass", msg: "Route `0.0.0.0/0` của private subnet trỏ tới NAT gateway." },
          { at: "natPriv", state: "block", msg: "NAT gateway nằm trong private subnet, và subnet này không có route tới Internet Gateway." },
        ],
        ok: false, result: "Không truy cập được internet. Public NAT gateway ở chế độ zonal phải nằm trong **public subnet**." };
      if (v === 1) return { hide: ["natPriv", "eigw"],
        steps: [
          { at: "natPub", via: [[125, 73]], state: "change", tag: "NAT", msg: "NAT gateway thay thế private IP của worker bằng Elastic IP của NAT gateway." },
          { at: "igw", state: "pass", msg: "Public subnet có route tới Internet Gateway." },
          { at: "net", state: "pass", msg: "Bản vá được tải về. Internet không thể khởi tạo kết nối ngược vào worker." },
        ],
        ok: true, result: "Truy cập internet thành công. Zonal NAT gateway thuộc một AZ, do đó mỗi AZ cần một NAT gateway để chịu được sự cố AZ; chế độ regional NAT gateway tự động mở rộng sang các AZ có workload." };
      return { hide: ["natPriv", "natPub"],
        steps: [{ at: "eigw", state: "block", flash: "IPv4?", msg: "Egress-only internet gateway chỉ cho phép traffic **IPv6** đi ra." }],
        ok: false, result: "Không truy cập được internet bằng IPv4. Kết nối internet một chiều với IPv4 sử dụng NAT gateway." };
    },
  },
  {
    name: "Đặt server cùng AZ với server đối tác",
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
    choices: { label: "Định danh AZ", options: ["Tên AZ (us-east-1a)", "AZ ID (use1-az2)"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["near"],
          steps: [{ at: "far", state: "change", tag: "KHÁC AZ", msg: "Cùng tên `us-east-1a`, nhưng tại account B tên này ánh xạ tới **use1-az4**." }],
          ok: false, result: "Hai server nằm tại hai AZ khác nhau: phát sinh thêm độ trễ và phí data transfer giữa các AZ." }
      : { hide: ["far"],
          steps: [{ at: "near", state: "pass", msg: "Cả hai account chọn subnet theo **AZ ID** `use1-az2`." }],
          ok: true, result: "Hai server nằm trong cùng một AZ vật lý. Tại các Region ánh xạ AZ độc lập theo account như us-east-1, cùng một tên AZ có thể trỏ tới AZ vật lý khác nhau; AZ ID thì nhất quán giữa mọi account." },
  },
  {
    name: "Người dùng vừa truy xuất vừa tải lên ảnh",
    request: "GET /images/*  +  PUT /uploads/*",
    from: "từ Úc",
    nodes: [
      { id: "user", x: 30, y: 97, w: 60, l1: "Người dùng", user: true },
      { id: "cf", x: 300, y: 28, w: 170, l1: "CloudFront", l2: "edge gần người dùng" },
      { id: "s3ta", x: 300, y: 166, w: 170, l1: "S3 Transfer Acceleration", l2: "edge gần người dùng" },
      { id: "s3", x: 640, y: 97, w: 150, l1: "S3 bucket", l2: "Singapore" },
    ],
    links: [
      { a: "user", b: "cf" }, { a: "cf", b: "s3" },
      { a: "user", b: "s3ta" }, { a: "s3ta", b: "s3" },
      { id: "direct", a: "user", b: "s3", dashed: true, label: "internet đường dài", lx: 385, ly: 114 },
    ],
    start: "user",
    choices: { label: "Kích hoạt", options: ["Chỉ CloudFront", "Chỉ S3 Transfer Acceleration", "Cả hai"], initial: 0 },
    run: (v) => {
      const view = [
        { at: "cf", state: "pass" as const, tag: "HIT", msg: "Ảnh có sẵn trong edge cache." },
        { at: "user", state: "pass" as const, tag: "NHẬN", msg: "Ảnh được hiển thị ngay." },
      ];
      const fastUp = [
        { at: "s3ta", state: "change" as const, tag: "TĂNG TỐC", msg: "Dữ liệu được tải lên edge location gần nhất, sau đó truyền qua mạng AWS." },
        { at: "s3", state: "pass" as const, msg: "Ảnh mới được ghi vào bucket." },
      ];
      if (v === 0) return { hide: ["s3ta"], back: false,
        steps: [...view, { at: "s3", state: "change", tag: "CHẬM", msg: "Dữ liệu tải lên được truyền qua internet đường dài tới Singapore." }],
        ok: false, result: "Truy xuất nhanh nhưng tải lên vẫn chậm. Cần bổ sung S3 Transfer Acceleration." };
      if (v === 1) return { hide: ["cf"], back: false,
        steps: [
          { at: "s3", state: "change", tag: "CHẬM", msg: "Không có cache: mọi request truy xuất đều được chuyển về Singapore." },
          { at: "user", state: "pass", tag: "NHẬN", msg: "Ảnh hiển thị với độ trễ cao." },
          ...fastUp,
        ],
        ok: false, result: "Tải lên nhanh nhưng truy xuất vẫn chậm. Cần bổ sung CloudFront." };
      return { hide: ["direct"], back: false, steps: [...view, ...fastUp],
        ok: true, result: "Cả hai chiều đều được tăng tốc: CloudFront cho chiều tải xuống, S3 Transfer Acceleration cho chiều tải lên." };
    },
  },
];

export default function GlobalMythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Bốn lỗi cấu hình thường gặp khi triển khai ShopViet trên nhiều Region" action="Chạy mô phỏng" />;
}
