import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// Seven VPC settings that look fine but behave differently from what people expect,
// each tried on ShopViet's network.

function scenarios(L: Lang): CaseScenario[] {
return [
  {
    name: L({ vi: "Tên miền nội bộ không phân giải được", en: "Internal domain name does not resolve" }),
    request: "dig api.shopviet.internal",
    from: L({ vi: "từ EC2 trong VPC", en: "from EC2 in the VPC" }),
    boxes: [{ x: 20, y: 30, w: 520, h: 180, label: "VPC ShopViet" }],
    nodes: [
      { id: "ec2", x: 50, y: 97, w: 130, l1: "EC2 web", l2: L({ vi: "gửi truy vấn DNS", en: "sends DNS query" }) },
      { id: "res", x: 280, y: 97, w: 180, l1: "Route 53 Resolver", l2: L({ vi: "địa chỉ VPC +2", en: "VPC base address +2" }) },
      { id: "phz", x: 620, y: 97, w: 170, l1: "Private hosted zone", l2: "shopviet.internal" },
    ],
    links: [{ a: "ec2", b: "res" }, { a: "res", b: "phz" }],
    start: "ec2",
    toggle: { label: L({ vi: "Bật enableDnsHostnames và enableDnsSupport", en: "Enable enableDnsHostnames and enableDnsSupport" }), initial: false },
    run: (on) => on
      ? { steps: [
            { at: "res", state: "pass", msg: L({ vi: "VPC đã bật cả hai thuộc tính DNS.", en: "The VPC has both DNS attributes enabled." }) },
            { at: "phz", state: "pass", msg: L({ vi: "Trả về `10.0.2.40` cho `api.shopviet.internal`.", en: "Returns `10.0.2.40` for `api.shopviet.internal`." }) },
          ],
          ok: true, result: L({ vi: "Phân giải thành công. Private hosted zone yêu cầu VPC bật **cả** enableDnsHostnames và enableDnsSupport.", en: "Resolution succeeds. A private hosted zone requires the VPC to enable **both** enableDnsHostnames and enableDnsSupport." }) }
      : { steps: [{ at: "res", state: "block", flash: "NXDOMAIN", msg: L({ vi: "VPC chưa bật đồng thời `enableDnsHostnames` và `enableDnsSupport`.", en: "The VPC does not have both `enableDnsHostnames` and `enableDnsSupport` enabled." }) }],
          ok: false, result: L({ vi: "Không phân giải được dù private hosted zone đã được liên kết với VPC.", en: "Resolution fails even though the private hosted zone is associated with the VPC." }) },
  },
  {
    name: L({ vi: "Worker chỉ dùng IPv4 cần truy cập internet", en: "An IPv4-only worker needs internet access" }),
    request: "GET https://pypi.org (IPv4)",
    from: L({ vi: "từ worker trong private subnet", en: "from a worker in a private subnet" }),
    nodes: [
      { id: "worker", x: 30, y: 97, w: 140, l1: "Worker EC2", l2: "private subnet" },
      { id: "eigw", x: 290, y: 97, w: 180, l1: "Egress-only IGW", l2: L({ vi: "chỉ dành cho IPv6", en: "IPv6 only" }) },
      { id: "nat", x: 290, y: 97, w: 180, l1: "NAT gateway", l2: "public subnet" },
      { id: "net", x: 620, y: 97, w: 160, l1: "Internet" },
    ],
    links: [{ a: "worker", b: "eigw" }, { a: "worker", b: "nat" }, { a: "eigw", b: "net" }, { a: "nat", b: "net" }],
    start: "worker",
    choices: { label: L({ vi: "Cổng ra internet", en: "Internet exit" }), options: ["Egress-only internet gateway", "NAT gateway"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["nat"], steps: [{ at: "eigw", state: "block", flash: "IPv4?", msg: L({ vi: "Egress-only internet gateway chỉ xử lý **IPv6**.", en: "An egress-only internet gateway handles only **IPv6**." }) }],
          ok: false, result: L({ vi: "Gói IPv4 không ra được internet.", en: "IPv4 packets cannot reach the internet." }) }
      : { hide: ["eigw"], steps: [
            { at: "nat", state: "change", tag: "NAT", msg: L({ vi: "Chuyển đổi private IP thành Elastic IP của NAT gateway.", en: "Translates the private IP to the NAT gateway's Elastic IP." }) },
            { at: "net", state: "pass", msg: L({ vi: "Gói cài đặt được tải về.", en: "The installation package is downloaded." }) },
          ],
          ok: true, result: L({ vi: "Kết nối internet một chiều bằng IPv4: NAT gateway. Egress-only IGW là thành phần tương đương cho IPv6.", en: "One-way internet access over IPv4: NAT gateway. An egress-only IGW is the equivalent for IPv6." }) },
  },
  {
    name: L({ vi: "Yêu cầu port forwarding trên thiết bị NAT", en: "Port forwarding required on the NAT device" }),
    request: "ssh -p 2222 nat.shopviet.vn",
    from: L({ vi: "từ máy quản trị", en: "from the admin machine" }),
    nodes: [
      { id: "admin", x: 30, y: 97, w: 60, l1: L({ vi: "Quản trị viên", en: "Administrator" }), user: true },
      { id: "natgw", x: 250, y: 97, w: 180, l1: "NAT gateway", l2: L({ vi: "do AWS quản lý", en: "managed by AWS" }) },
      { id: "natinst", x: 250, y: 97, w: 180, l1: "NAT instance", l2: L({ vi: "EC2 tự vận hành", en: "self-managed EC2" }) },
      { id: "app", x: 620, y: 97, w: 160, l1: L({ vi: "Server nội bộ", en: "Internal server" }), l2: "private subnet" },
    ],
    links: [{ a: "admin", b: "natgw" }, { a: "admin", b: "natinst" }, { a: "natgw", b: "app" }, { a: "natinst", b: "app" }],
    start: "admin",
    choices: { label: L({ vi: "Thành phần", en: "Component" }), options: ["NAT gateway", "NAT instance"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["natinst"], steps: [{ at: "natgw", state: "block", msg: L({ vi: "NAT gateway không hỗ trợ gắn Security Group, port forwarding hoặc vai trò bastion.", en: "A NAT gateway does not support security groups, port forwarding or acting as a bastion." }) }],
          ok: false, result: L({ vi: "Không truy cập được. NAT gateway chỉ hỗ trợ kết nối đi ra.", en: "Access fails. A NAT gateway supports only outbound connections." }) }
      : { hide: ["natgw"], steps: [
            { at: "natinst", state: "change", tag: "FORWARD", msg: L({ vi: "NAT instance là EC2: hỗ trợ gắn Security Group, cấu hình port forwarding và đóng vai trò bastion.", en: "A NAT instance is an EC2 instance: it supports security groups, port forwarding and acting as a bastion." }) },
            { at: "app", state: "pass", msg: L({ vi: "Kết nối tới server nội bộ thành công.", en: "The connection to the internal server succeeds." }) },
          ],
          ok: true, result: L({ vi: "Đáp ứng yêu cầu, nhưng việc vá lỗi, khả năng chịu lỗi và băng thông của instance do tổ chức tự đảm nhận.", en: "This meets the requirement, but patching, fault tolerance and the instance's bandwidth are the organization's own responsibility." }) },
  },
  {
    name: L({ vi: "Launch EC2 trong VPC dedicated", en: "Launch EC2 in a dedicated VPC" }),
    request: "RunInstances (template: tenancy = default)",
    from: L({ vi: "từ Auto Scaling group", en: "from the Auto Scaling group" }),
    nodes: [
      { id: "lt", x: 30, y: 97, w: 170, l1: "Launch template", l2: "tenancy: default" },
      { id: "vpc", x: 300, y: 97, w: 180, l1: "VPC ShopViet" },
      { id: "ec2", x: 600, y: 97, w: 190, l1: L({ vi: "EC2 mới", en: "New EC2" }) },
    ],
    links: [{ a: "lt", b: "vpc" }, { a: "vpc", b: "ec2" }],
    start: "lt",
    choices: { label: L({ vi: "Tenancy của VPC", en: "VPC tenancy" }), options: ["default", "dedicated"], initial: 1 },
    run: (v) => v === 1
      ? { back: false, steps: [
            { at: "vpc", state: "change", tag: "DEDICATED", msg: L({ vi: "Tenancy của VPC là **dedicated**: được ưu tiên hơn giá trị trong launch template.", en: "The VPC tenancy is **dedicated**: it takes precedence over the value in the launch template." }) },
            { at: "ec2", state: "change", tag: "DEDICATED", msg: L({ vi: "Instance chạy trên phần cứng dành riêng, chi phí cao hơn.", en: "The instance runs on dedicated hardware, at a higher cost." }) },
          ],
          ok: false, result: L({ vi: "Mọi instance trong VPC dedicated đều chạy ở chế độ dedicated, dù template khai báo default. Để chạy instance thông thường, đổi tenancy của VPC về default.", en: "Every instance in a dedicated VPC runs as dedicated, even if the template declares default. To run regular instances, change the VPC tenancy to default." }) }
      : { back: false, steps: [
            { at: "vpc", state: "pass", msg: L({ vi: "Tenancy của VPC là default, áp dụng giá trị trong template.", en: "The VPC tenancy is default, so the value in the template applies." }) },
            { at: "ec2", state: "pass", msg: L({ vi: "Instance chạy trên phần cứng dùng chung, chi phí tiêu chuẩn.", en: "The instance runs on shared hardware, at the standard cost." }) },
          ],
          ok: true, result: L({ vi: "Template khai báo default và VPC default: instance thông thường.", en: "Template declares default and VPC is default: regular instance." }) },
  },
  {
    name: L({ vi: "Cho phép truy cập web bằng Security Group", en: "Allow web access with a security group" }),
    request: "GET https://shopviet.vn",
    from: L({ vi: "từ người dùng", en: "from users" }),
    nodes: [
      { id: "user", x: 30, y: 97, w: 60, l1: L({ vi: "Người dùng", en: "Users" }), user: true },
      { id: "igw", x: 200, y: 97, w: 150, l1: "Internet Gateway" },
      { id: "sg", x: 420, y: 97, w: 180, l1: "Security Group", l2: "rule inbound 443" },
      { id: "web", x: 660, y: 97, w: 130, l1: "Web EC2" },
    ],
    links: [{ a: "user", b: "igw" }, { a: "igw", b: "sg" }, { a: "sg", b: "web" }],
    start: "user",
    choices: { label: L({ vi: "Source của rule", en: "Rule source" }), options: [L({ vi: "igw-0abc (ID của Internet Gateway)", en: "igw-0abc (internet gateway ID)" }), "0.0.0.0/0"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "igw", state: "pass", msg: L({ vi: "Traffic đi vào VPC.", en: "Traffic enters the VPC." }) },
            { at: "sg", state: "block", flash: "?", msg: L({ vi: "Source chỉ chấp nhận **CIDR, Security Group khác hoặc prefix list**; không chấp nhận ID của Internet Gateway.", en: "The source accepts only **a CIDR, another security group or a prefix list**; it does not accept an internet gateway ID." }) },
          ],
          ok: false, result: L({ vi: "Rule này không tạo được, do đó cổng 443 không được mở.", en: "This rule cannot be created, so port 443 is not opened." }) }
      : { steps: [
            { at: "igw", state: "pass", msg: L({ vi: "Traffic đi vào VPC.", en: "Traffic enters the VPC." }) },
            { at: "sg", state: "pass", msg: L({ vi: "Rule `443 từ 0.0.0.0/0` khớp.", en: "The rule `443 from 0.0.0.0/0` matches." }) },
            { at: "web", state: "pass", msg: L({ vi: "Trang chủ được trả về.", en: "The home page is returned." }) },
          ],
          ok: true, result: L({ vi: "Người dùng truy cập thành công. Với ứng dụng nhiều tầng, chỉ tầng ngoài cùng (ALB) được phép mở cho 0.0.0.0/0.", en: "Users connect successfully. In a multi-tier application, only the outermost tier (the ALB) may be open to 0.0.0.0/0." }) },
  },
  {
    name: L({ vi: "Hai server đồng bộ dữ liệu", en: "Two servers synchronize data" }),
    request: L({ vi: "rsync 200 GB/ngày", en: "rsync 200 GB/day" }),
    from: L({ vi: "giữa hai EC2 cùng Region", en: "between two EC2 instances in the same Region" }),
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
    choices: { label: L({ vi: "Địa chỉ đích", en: "Destination address" }), options: [L({ vi: "Public IP của EC2 B", en: "Public IP of EC2 B" }), L({ vi: "Private IP của EC2 B", en: "Private IP of EC2 B" })], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["priv"], back: false, steps: [
            { at: "igw", via: [[135, 36]], state: "change", tag: L({ vi: "TÍNH PHÍ", en: "CHARGED" }), msg: L({ vi: "Instance truy cập instance khác qua public IP bị tính phí data transfer regional hoặc internet.", en: "An instance accessing another instance over its public IP incurs regional or internet data transfer charges." }) },
            { at: "b", via: [[685, 36]], state: "pass", msg: L({ vi: "Dữ liệu tới đích, nhưng lượng data transfer này bị tính phí.", en: "The data arrives, but this data transfer is charged." }) },
          ],
          ok: false, result: L({ vi: "Hoạt động được nhưng phát sinh chi phí và đường truyền không tối ưu.", en: "It works but incurs charges and the path is not optimal." }) }
      : { hide: ["pub"], back: false, steps: [{ at: "b", state: "pass", msg: L({ vi: "Traffic đi trực tiếp trong VPC qua private IP.", en: "Traffic goes directly within the VPC over the private IP." }) }],
          ok: true, result: L({ vi: "Chi phí thấp hơn và traffic không rời khỏi mạng riêng. Lưu ý: nếu EC2 A và EC2 B ở hai AZ khác nhau, data transfer giữa các AZ vẫn bị tính phí theo GB.", en: "Lower cost, and traffic does not leave the private network. Note: if EC2 A and EC2 B are in two different AZs, data transfer between the AZs is still charged per GB." }) },
  },
  {
    name: L({ vi: "Không ping được EC2 có Elastic IP", en: "Cannot ping an EC2 instance with an Elastic IP" }),
    request: "ping 54.x.x.x",
    from: L({ vi: "từ máy quản trị", en: "from the admin machine" }),
    nodes: [
      { id: "admin", x: 30, y: 97, w: 60, l1: L({ vi: "Quản trị viên", en: "Administrator" }), user: true },
      { id: "igw", x: 170, y: 97, w: 170, l1: "Internet Gateway", l2: L({ vi: "route 0.0.0.0/0 có sẵn", en: "route 0.0.0.0/0 in place" }) },
      { id: "srcdst", x: 400, y: 97, w: 190, l1: "Source/dest. check", l2: L({ vi: "thuộc tính của ENI", en: "an ENI attribute" }) },
      { id: "sg", x: 400, y: 97, w: 190, l1: "Security Group", l2: L({ vi: "chỉ có rule 443", en: "only a 443 rule" }) },
      { id: "ec2", x: 650, y: 97, w: 140, l1: "EC2", l2: "Elastic IP" },
    ],
    links: [{ a: "admin", b: "igw" }, { a: "igw", b: "srcdst" }, { a: "igw", b: "sg" }, { a: "srcdst", b: "ec2" }, { a: "sg", b: "ec2" }],
    start: "admin",
    choices: { label: L({ vi: "Thay đổi", en: "Change" }), options: [L({ vi: "Tắt source/destination check", en: "Disable source/destination check" }), L({ vi: "Thêm rule ICMP Echo Request vào Security Group", en: "Add an ICMP Echo Request rule to the security group" })], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["sg"], steps: [
            { at: "igw", state: "pass", msg: L({ vi: "Route tới Internet Gateway và Elastic IP đều đã có.", en: "The route to the internet gateway and the Elastic IP are both in place." }) },
            { at: "srcdst", state: "skip", msg: L({ vi: "Source/destination check (bật mặc định) yêu cầu instance là nguồn hoặc đích của traffic. Chỉ tắt khi instance làm NAT, router hoặc firewall; ở đây instance chính là đích của gói ping nên thuộc tính này không liên quan.", en: "Source/destination check (enabled by default) requires the instance to be the source or destination of its traffic. Disable it only when the instance does NAT, routing or firewalling; here the instance is the destination of the ping, so this attribute is irrelevant." }) },
            { at: "ec2", state: "block", flash: "ICMP?", msg: L({ vi: "Security Group không có rule inbound cho ICMP nên gói ping bị loại bỏ.", en: "The security group has no inbound ICMP rule, so the ping packet is dropped." }) },
          ],
          ok: false, result: L({ vi: "Vẫn không ping được. `ping` là traffic **ICMP**, không phải TCP 443.", en: "Ping still fails. `ping` is **ICMP** traffic, not TCP 443." }) }
      : { hide: ["srcdst"], steps: [
            { at: "igw", state: "pass", msg: L({ vi: "Route tới Internet Gateway và Elastic IP đều đã có.", en: "The route to the internet gateway and the Elastic IP are both in place." }) },
            { at: "sg", state: "change", tag: "ICMP", msg: L({ vi: "Thêm rule inbound **Custom ICMP - IPv4: Echo Request** (hoặc All ICMP - IPv4) từ IP của máy quản trị. Security Group là stateful nên Echo Reply tự động được cho phép.", en: "Add an inbound rule **Custom ICMP - IPv4: Echo Request** (or All ICMP - IPv4) from the admin machine's IP. Security groups are stateful, so the Echo Reply is allowed automatically." }) },
            { at: "ec2", state: "pass", msg: L({ vi: "Instance trả lời ping.", en: "The instance answers the ping." }) },
          ],
          ok: true, result: L({ vi: "Khi không ping được instance public: kiểm tra route tới Internet Gateway trong route table của subnet, rule ICMP trong Security Group, và NACL (stateless) cho cả hai chiều.", en: "When a public instance does not answer ping: check the route to the internet gateway in the subnet route table, the ICMP rule in the security group, and the NACL (stateless) in both directions." }) },
  },
];
}

export default function VpcMythsSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Bảy lỗi cấu hình VPC thường gặp", en: "Seven common VPC configuration mistakes" })} action={L({ vi: "Chạy mô phỏng", en: "Run simulation" })} />;
}
