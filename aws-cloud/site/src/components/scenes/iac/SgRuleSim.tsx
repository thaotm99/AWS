import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import "./iac-sims.css";

// Reading the SecurityGroupIngress block of a ShopViet template by sending traffic at
// it. Rule 1 lets anyone reach port 80; rule 2 lets one office IP reach port 22.
// Anything not allowed is dropped (security groups only have allow rules), and
// outbound traffic is allowed by default because the block says nothing about egress.

function layout(src: string, sub: string, outbound = false): PLayout {
  const nodes = [
    { id: "src", x: 80, y: 130, l1: src, l2: sub, user: true },
    { id: "sg", x: 360, y: 130, w: 200, l1: "Security group sg-web", l2: outbound ? "outbound: mặc định cho phép" : "inbound: 2 rule trong template" },
    { id: "ec2", x: 650, y: 130, w: 150, l1: "EC2 web", l2: "Nginx :80, SSH :22" },
  ];
  return {
    viewBox: "0 50 820 160",
    aria: "Traffic được đánh giá qua security group khai báo trong template CloudFormation",
    nodes: outbound ? [nodes[2], nodes[1], { ...nodes[0], l1: "Internet", l2: "kho package" }] : nodes,
    links: [["src", "sg"], ["sg", "ec2"]],
  };
}

const SCENARIOS: PScenario[] = [
  {
    name: "Client bất kỳ → cổng 80",
    request: "TCP 80 từ 14.232.8.9",
    layout: layout("Client", "IP bất kỳ"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 1", msg: "`FromPort: 80, ToPort: 80, CidrIp: 0.0.0.0/0`: mọi địa chỉ IP được phép truy cập cổng 80." },
        { at: "ec2", state: "pass", flash: "200", msg: "Nginx trả về trang chủ." }],
      ok: true, result: "0.0.0.0/0 biểu thị **mọi** địa chỉ IPv4, không phải một địa chỉ IP cụ thể là 0.0.0.0.",
    }),
  },
  {
    name: "Văn phòng → SSH 22",
    request: "TCP 22 từ 203.0.113.25",
    layout: layout("Văn phòng", "203.0.113.25"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 2", msg: "`FromPort: 22, ToPort: 22, CidrIp: 203.0.113.25/32`: /32 tương ứng với đúng **một** địa chỉ IP." },
        { at: "ec2", state: "pass", msg: "Kết nối SSH thành công." }],
      ok: true, result: "Chỉ một địa chỉ IP được phép SSH. Rule này không ảnh hưởng tới cổng 80.",
    }),
  },
  {
    name: "Nguồn không xác định → SSH 22",
    request: "TCP 22 từ 198.51.100.7",
    layout: layout("Nguồn lạ", "198.51.100.7"),
    run: () => ({
      steps: [
        { at: "sg", state: "block", tag: "KHÔNG KHỚP", msg: "Cổng 22 chỉ có rule cho 203.0.113.25/32. Gói tin không khớp rule cho phép nào sẽ bị loại bỏ." }],
      ok: true, result: "Security group chỉ hỗ trợ rule **cho phép**. Không thể khai báo rule từ chối; mọi traffic không được cho phép đều bị chặn.",
    }),
  },
  {
    name: "Máy chủ tải package từ bên ngoài",
    action: "Gửi request ra ngoài",
    request: "EC2 web → HTTPS 443 tới kho package",
    layout: layout("Internet", "kho package", true),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "EGRESS", msg: "Snippet chỉ khai báo `SecurityGroupIngress`. Khi không khai báo egress, security group giữ rule mặc định: **cho phép mọi outbound traffic**." },
        { at: "src", state: "pass", msg: "Tải package thành công." }],
      ok: true, result: "Đây là inbound rule của **security group**, không phải network ACL. Security group là stateful: response của kết nối đã được cho phép tự động được phép đi ra.",
    }),
  },
];

const SNIPPET = `WebSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: web của ShopViet
    VpcId: !Ref Vpc
    SecurityGroupIngress:
      - IpProtocol: tcp      # rule 1
        FromPort: 80
        ToPort: 80
        CidrIp: 0.0.0.0/0
      - IpProtocol: tcp      # rule 2
        FromPort: 22
        ToPort: 22
        CidrIp: 203.0.113.25/32`;

export default function SgRuleSim() {
  return (
    <>
      <pre className="sgr-template" aria-label="Đoạn template khai báo security group">{SNIPPET}</pre>
      <PacketSim scenarios={SCENARIOS} hint="Chọn một kết nối, sau đó chọn Gửi request để xác định rule nào trong template cho phép kết nối." />
    </>
  );
}
