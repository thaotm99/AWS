import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

// Six VPC settings that look fine but behave differently from what people expect,
// each tried on ShopViet's network.

const SCENARIOS: CaseScenario[] = [
  {
    name: "Tên nội bộ không phân giải được",
    request: "dig api.shopviet.internal",
    from: "từ EC2 trong VPC",
    boxes: [{ x: 20, y: 30, w: 520, h: 180, label: "VPC ShopViet" }],
    nodes: [
      { id: "ec2", x: 50, y: 97, w: 130, l1: "EC2 web", l2: "hỏi DNS" },
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
          ok: true, result: "Phân giải được. Private hosted zone cần VPC bật **cả** enableDnsHostnames và enableDnsSupport." }
      : { steps: [{ at: "res", state: "block", flash: "NXDOMAIN", msg: "VPC chưa bật đủ `enableDnsHostnames` và `enableDnsSupport`." }],
          ok: false, result: "Không phân giải được dù private hosted zone đã gắn vào VPC." },
  },
  {
    name: "Worker chỉ dùng IPv4 cần ra internet",
    request: "GET https://pypi.org (IPv4)",
    from: "từ worker ở private subnet",
    nodes: [
      { id: "worker", x: 30, y: 97, w: 140, l1: "Worker EC2", l2: "private subnet" },
      { id: "eigw", x: 290, y: 97, w: 180, l1: "Egress-only IGW", l2: "chỉ cho IPv6" },
      { id: "nat", x: 290, y: 97, w: 180, l1: "NAT gateway", l2: "public subnet" },
      { id: "net", x: 620, y: 97, w: 160, l1: "Internet" },
    ],
    links: [{ a: "worker", b: "eigw" }, { a: "worker", b: "nat" }, { a: "eigw", b: "net" }, { a: "nat", b: "net" }],
    start: "worker",
    choices: { label: "Lối ra", options: ["Egress-only internet gateway", "NAT gateway"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["nat"], steps: [{ at: "eigw", state: "block", flash: "IPv4?", msg: "Egress-only internet gateway chỉ xử lý **IPv6**." }],
          ok: false, result: "Gói IPv4 không ra được." }
      : { hide: ["eigw"], steps: [
            { at: "nat", state: "change", tag: "NAT", msg: "Đổi private IP thành Elastic IP của NAT gateway." },
            { at: "net", state: "pass", msg: "Tải gói cài đặt về." },
          ],
          ok: true, result: "Ra internet một chiều bằng IPv4: NAT gateway. Egress-only IGW là bản tương tự cho IPv6." },
  },
  {
    name: "Cần port forwarding cho máy NAT",
    request: "ssh -p 2222 nat.shopviet.vn",
    from: "từ máy quản trị",
    nodes: [
      { id: "admin", x: 30, y: 97, w: 60, l1: "Quản trị viên", user: true },
      { id: "natgw", x: 250, y: 97, w: 180, l1: "NAT gateway", l2: "AWS quản lý" },
      { id: "natinst", x: 250, y: 97, w: 180, l1: "NAT instance", l2: "EC2 tự quản lý" },
      { id: "app", x: 620, y: 97, w: 160, l1: "Server nội bộ", l2: "private subnet" },
    ],
    links: [{ a: "admin", b: "natgw" }, { a: "admin", b: "natinst" }, { a: "natgw", b: "app" }, { a: "natinst", b: "app" }],
    start: "admin",
    choices: { label: "Dùng", options: ["NAT gateway", "NAT instance"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["natinst"], steps: [{ at: "natgw", state: "block", msg: "NAT gateway không gắn Security Group, không port forwarding, không làm bastion." }],
          ok: false, result: "Không vào được. NAT gateway chỉ cho đi ra." }
      : { hide: ["natgw"], steps: [
            { at: "natinst", state: "change", tag: "FORWARD", msg: "NAT instance là EC2: gắn được Security Group, cấu hình port forwarding, kiêm bastion." },
            { at: "app", state: "pass", msg: "Vào tới server nội bộ." },
          ],
          ok: true, result: "Làm được, nhưng bạn tự lo vá lỗi, tự lo chịu lỗi và băng thông cho instance đó." },
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
            { at: "vpc", state: "change", tag: "DEDICATED", msg: "Tenancy của VPC là **dedicated**: thắng giá trị trong launch template." },
            { at: "ec2", state: "change", tag: "DEDICATED", msg: "Instance chạy trên phần cứng riêng, giá cao hơn." },
          ],
          ok: false, result: "Mọi instance trong VPC dedicated đều là dedicated, dù template ghi default. Muốn instance thường thì đổi tenancy của VPC về default." }
      : { back: false, steps: [
            { at: "vpc", state: "pass", msg: "Tenancy của VPC là default, dùng theo template." },
            { at: "ec2", state: "pass", msg: "Instance chạy trên phần cứng dùng chung, giá thường." },
          ],
          ok: true, result: "Template ghi default và VPC default: instance thường." },
  },
  {
    name: "Mở web cho khách bằng Security Group",
    request: "GET https://shopviet.vn",
    from: "từ khách",
    nodes: [
      { id: "user", x: 30, y: 97, w: 60, l1: "Khách", user: true },
      { id: "igw", x: 200, y: 97, w: 150, l1: "Internet Gateway" },
      { id: "sg", x: 420, y: 97, w: 180, l1: "Security Group", l2: "rule inbound 443" },
      { id: "web", x: 660, y: 97, w: 130, l1: "Web EC2" },
    ],
    links: [{ a: "user", b: "igw" }, { a: "igw", b: "sg" }, { a: "sg", b: "web" }],
    start: "user",
    choices: { label: "Source của rule", options: ["igw-0abc (ID của Internet Gateway)", "0.0.0.0/0"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "igw", state: "pass", msg: "Vào VPC." },
            { at: "sg", state: "block", flash: "?", msg: "Source chỉ nhận **CIDR, Security Group khác hoặc prefix list**. Không nhận ID của Internet Gateway." },
          ],
          ok: false, result: "Rule này không tạo được, nên không có gì mở cổng 443." }
      : { steps: [
            { at: "igw", state: "pass", msg: "Vào VPC." },
            { at: "sg", state: "pass", msg: "Rule `443 từ 0.0.0.0/0` khớp." },
            { at: "web", state: "pass", msg: "Trả trang chủ." },
          ],
          ok: true, result: "Khách vào được. Với ứng dụng nhiều tầng, chỉ tầng ngoài cùng (ALB) mới mở cho 0.0.0.0/0." },
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
    choices: { label: "Gửi tới", options: ["Public IP của EC2 B", "Private IP của EC2 B"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["priv"], back: false, steps: [
            { at: "igw", via: [[135, 36]], state: "change", tag: "TÍNH PHÍ", msg: "Gửi tới public IP: traffic ra Internet Gateway rồi vào lại." },
            { at: "b", via: [[685, 36]], state: "pass", msg: "Tới nơi, nhưng phần data transfer này bị tính phí." },
          ],
          ok: false, result: "Chạy được nhưng tốn tiền và đi đường vòng." }
      : { hide: ["pub"], back: false, steps: [{ at: "b", state: "pass", msg: "Đi thẳng trong VPC bằng private IP." }],
          ok: true, result: "Rẻ hơn và không rời khỏi mạng riêng." },
  },
];

export default function VpcMythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Sáu cấu hình VPC dễ làm sai" action="Chạy thử" />;
}
