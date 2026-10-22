import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

// Six VPC settings that look fine but behave differently from what people expect,
// each tried on ShopViet's network.

const SCENARIOS: CaseScenario[] = [
  {
    name: "Tên miền nội bộ không phân giải được",
    request: "dig api.shopviet.internal",
    from: "từ EC2 trong VPC",
    boxes: [{ x: 20, y: 30, w: 520, h: 180, label: "VPC ShopViet" }],
    nodes: [
      { id: "ec2", x: 50, y: 97, w: 130, l1: "EC2 web", l2: "gửi truy vấn DNS" },
      { id: "res", x: 280, y: 97, w: 180, l1: "Route 53 Resolver", l2: "địa chỉ VPC +2" },
      { id: "phz", x: 620, y: 97, w: 170, l1: "Private hosted zone", l2: "shopviet.internal" },
    ],
    links: [{ a: "ec2", b: "res" }, { a: "res", b: "phz" }],
    start: "ec2",
    toggle: { label: "Bật enableDnsHostnames và enableDnsSupport", initial: false },
    run: (on) => on
      ? { steps: [
            { at: "res", state: "pass", msg: "VPC đã bật cả hai thuộc tính DNS." },
            { at: "phz", state: "pass", msg: "Trả về `10.0.2.40` cho `api.shopviet.internal`." },
          ],
          ok: true, result: "Phân giải thành công. Private hosted zone yêu cầu VPC bật **cả** enableDnsHostnames và enableDnsSupport." }
      : { steps: [{ at: "res", state: "block", flash: "NXDOMAIN", msg: "VPC chưa bật đồng thời `enableDnsHostnames` và `enableDnsSupport`." }],
          ok: false, result: "Không phân giải được dù private hosted zone đã được liên kết với VPC." },
  },
  {
    name: "Worker chỉ dùng IPv4 cần truy cập internet",
    request: "GET https://pypi.org (IPv4)",
    from: "từ worker trong private subnet",
    nodes: [
      { id: "worker", x: 30, y: 97, w: 140, l1: "Worker EC2", l2: "private subnet" },
      { id: "eigw", x: 290, y: 97, w: 180, l1: "Egress-only IGW", l2: "chỉ dành cho IPv6" },
      { id: "nat", x: 290, y: 97, w: 180, l1: "NAT gateway", l2: "public subnet" },
      { id: "net", x: 620, y: 97, w: 160, l1: "Internet" },
    ],
    links: [{ a: "worker", b: "eigw" }, { a: "worker", b: "nat" }, { a: "eigw", b: "net" }, { a: "nat", b: "net" }],
    start: "worker",
    choices: { label: "Cổng ra internet", options: ["Egress-only internet gateway", "NAT gateway"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["nat"], steps: [{ at: "eigw", state: "block", flash: "IPv4?", msg: "Egress-only internet gateway chỉ xử lý **IPv6**." }],
          ok: false, result: "Gói IPv4 không ra được internet." }
      : { hide: ["eigw"], steps: [
            { at: "nat", state: "change", tag: "NAT", msg: "Chuyển đổi private IP thành Elastic IP của NAT gateway." },
            { at: "net", state: "pass", msg: "Gói cài đặt được tải về." },
          ],
          ok: true, result: "Kết nối internet một chiều bằng IPv4: NAT gateway. Egress-only IGW là thành phần tương đương cho IPv6." },
  },
  {
    name: "Yêu cầu port forwarding trên thiết bị NAT",
    request: "ssh -p 2222 nat.shopviet.vn",
    from: "từ máy quản trị",
    nodes: [
      { id: "admin", x: 30, y: 97, w: 60, l1: "Quản trị viên", user: true },
      { id: "natgw", x: 250, y: 97, w: 180, l1: "NAT gateway", l2: "do AWS quản lý" },
      { id: "natinst", x: 250, y: 97, w: 180, l1: "NAT instance", l2: "EC2 tự vận hành" },
      { id: "app", x: 620, y: 97, w: 160, l1: "Server nội bộ", l2: "private subnet" },
    ],
    links: [{ a: "admin", b: "natgw" }, { a: "admin", b: "natinst" }, { a: "natgw", b: "app" }, { a: "natinst", b: "app" }],
    start: "admin",
    choices: { label: "Thành phần", options: ["NAT gateway", "NAT instance"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["natinst"], steps: [{ at: "natgw", state: "block", msg: "NAT gateway không hỗ trợ gắn Security Group, port forwarding hoặc vai trò bastion." }],
          ok: false, result: "Không truy cập được. NAT gateway chỉ hỗ trợ kết nối đi ra." }
      : { hide: ["natgw"], steps: [
            { at: "natinst", state: "change", tag: "FORWARD", msg: "NAT instance là EC2: hỗ trợ gắn Security Group, cấu hình port forwarding và đóng vai trò bastion." },
            { at: "app", state: "pass", msg: "Kết nối tới server nội bộ thành công." },
          ],
          ok: true, result: "Đáp ứng yêu cầu, nhưng việc vá lỗi, khả năng chịu lỗi và băng thông của instance do tổ chức tự đảm nhận." },
  },
  {
    name: "Launch EC2 trong VPC dedicated",
    request: "RunInstances (template: tenancy = default)",
    from: "từ Auto Scaling group",
    nodes: [
      { id: "lt", x: 30, y: 97, w: 170, l1: "Launch template", l2: "tenancy: default" },
      { id: "vpc", x: 300, y: 97, w: 180, l1: "VPC ShopViet" },
      { id: "ec2", x: 600, y: 97, w: 190, l1: "EC2 mới" },
    ],
    links: [{ a: "lt", b: "vpc" }, { a: "vpc", b: "ec2" }],
    start: "lt",
    choices: { label: "Tenancy của VPC", options: ["default", "dedicated"], initial: 1 },
    run: (v) => v === 1
      ? { back: false, steps: [
            { at: "vpc", state: "change", tag: "DEDICATED", msg: "Tenancy của VPC là **dedicated**: được ưu tiên hơn giá trị trong launch template." },
            { at: "ec2", state: "change", tag: "DEDICATED", msg: "Instance chạy trên phần cứng dành riêng, chi phí cao hơn." },
          ],
          ok: false, result: "Mọi instance trong VPC dedicated đều chạy ở chế độ dedicated, dù template khai báo default. Để chạy instance thông thường, đổi tenancy của VPC về default." }
      : { back: false, steps: [
            { at: "vpc", state: "pass", msg: "Tenancy của VPC là default, áp dụng giá trị trong template." },
            { at: "ec2", state: "pass", msg: "Instance chạy trên phần cứng dùng chung, chi phí tiêu chuẩn." },
          ],
          ok: true, result: "Template khai báo default và VPC default: instance thông thường." },
  },
  {
    name: "Cho phép truy cập web bằng Security Group",
    request: "GET https://shopviet.vn",
    from: "từ người dùng",
    nodes: [
      { id: "user", x: 30, y: 97, w: 60, l1: "Người dùng", user: true },
      { id: "igw", x: 200, y: 97, w: 150, l1: "Internet Gateway" },
      { id: "sg", x: 420, y: 97, w: 180, l1: "Security Group", l2: "rule inbound 443" },
      { id: "web", x: 660, y: 97, w: 130, l1: "Web EC2" },
    ],
    links: [{ a: "user", b: "igw" }, { a: "igw", b: "sg" }, { a: "sg", b: "web" }],
    start: "user",
    choices: { label: "Source của rule", options: ["igw-0abc (ID của Internet Gateway)", "0.0.0.0/0"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "igw", state: "pass", msg: "Traffic đi vào VPC." },
            { at: "sg", state: "block", flash: "?", msg: "Source chỉ chấp nhận **CIDR, Security Group khác hoặc prefix list**; không chấp nhận ID của Internet Gateway." },
          ],
          ok: false, result: "Rule này không tạo được, do đó cổng 443 không được mở." }
      : { steps: [
            { at: "igw", state: "pass", msg: "Traffic đi vào VPC." },
            { at: "sg", state: "pass", msg: "Rule `443 từ 0.0.0.0/0` khớp." },
            { at: "web", state: "pass", msg: "Trang chủ được trả về." },
          ],
          ok: true, result: "Người dùng truy cập thành công. Với ứng dụng nhiều tầng, chỉ tầng ngoài cùng (ALB) được phép mở cho 0.0.0.0/0." },
  },
  {
    name: "Hai server đồng bộ dữ liệu",
    request: "rsync 200 GB/ngày",
    from: "giữa hai EC2 cùng Region",
    boxes: [{ x: 20, y: 70, w: 780, h: 160, label: "VPC ShopViet" }],
    nodes: [
      { id: "a", x: 60, y: 140, w: 150, l1: "EC2 A" },
      { id: "igw", x: 335, y: 16, w: 150, h: 40, l1: "Internet Gateway" },
      { id: "b", x: 610, y: 140, w: 150, l1: "EC2 B" },
    ],
    links: [
      { id: "pub", a: "a", b: "b", via: [[135, 36], [685, 36]], dashed: true },
      { id: "priv", a: "a", b: "b" },
    ],
    start: "a",
    choices: { label: "Địa chỉ đích", options: ["Public IP của EC2 B", "Private IP của EC2 B"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["priv"], back: false, steps: [
            { at: "igw", via: [[135, 36]], state: "change", tag: "TÍNH PHÍ", msg: "Khi gửi tới public IP, traffic đi ra Internet Gateway rồi quay lại VPC." },
            { at: "b", via: [[685, 36]], state: "pass", msg: "Dữ liệu tới đích, nhưng lượng data transfer này bị tính phí." },
          ],
          ok: false, result: "Hoạt động được nhưng phát sinh chi phí và đường truyền không tối ưu." }
      : { hide: ["pub"], back: false, steps: [{ at: "b", state: "pass", msg: "Traffic đi trực tiếp trong VPC qua private IP." }],
          ok: true, result: "Chi phí thấp hơn và traffic không rời khỏi mạng riêng." },
  },
];

export default function VpcMythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Sáu lỗi cấu hình VPC thường gặp" action="Chạy mô phỏng" />;
}
