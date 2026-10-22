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
    aria: "Traffic đi qua security group được khai báo trong template CloudFormation",
    nodes: outbound ? [nodes[2], nodes[1], { ...nodes[0], l1: "Internet", l2: "kho package" }] : nodes,
    links: [["src", "sg"], ["sg", "ec2"]],
  };
}

const SCENARIOS: PScenario[] = [
  {
    name: "Khách bất kỳ → cổng 80",
    request: "TCP 80 từ 14.232.8.9",
    layout: layout("Khách", "IP bất kỳ"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 1", msg: "`FromPort: 80, ToPort: 80, CidrIp: 0.0.0.0/0`: mọi IP được vào cổng 80." },
        { at: "ec2", state: "pass", flash: "200", msg: "Nginx trả trang chủ." }],
      ok: true, result: "0.0.0.0/0 nghĩa là **mọi** địa chỉ IPv4, không phải một IP tên là 0.0.0.0.",
    }),
  },
  {
    name: "Văn phòng → SSH 22",
    request: "TCP 22 từ 203.0.113.25",
    layout: layout("Văn phòng", "203.0.113.25"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 2", msg: "`FromPort: 22, ToPort: 22, CidrIp: 203.0.113.25/32`: /32 là đúng **một** IP." },
        { at: "ec2", state: "pass", msg: "SSH vào được." }],
      ok: true, result: "Chỉ một IP được SSH. Rule này không ảnh hưởng tới cổng 80.",
    }),
  },
  {
    name: "Máy lạ → SSH 22",
    request: "TCP 22 từ 198.51.100.7",
    layout: layout("Máy lạ", "198.51.100.7"),
    run: () => ({
      steps: [
        { at: "sg", state: "block", tag: "KHÔNG KHỚP", msg: "Cổng 22 chỉ có rule cho 203.0.113.25/32. Không rule nào cho phép thì gói tin bị bỏ." }],
      ok: true, result: "Security group chỉ có rule **cho phép**. Không viết được rule chặn; cái gì không được cho phép thì bị chặn.",
    }),
  },
  {
    name: "Server tải package ra ngoài",
    action: "Gửi ra ngoài",
    request: "EC2 web → HTTPS 443 tới kho package",
    layout: layout("Internet", "kho package", true),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "EGRESS", msg: "Snippet chỉ khai báo `SecurityGroupIngress`. Không khai báo egress thì security group giữ rule mặc định: **cho phép mọi outbound**." },
        { at: "src", state: "pass", msg: "Tải package được." }],
      ok: true, result: "Đây là inbound rule của **security group**, không phải network ACL. Security group là stateful: trả lời của kết nối được phép tự đi ra.",
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
      <PacketSim scenarios={SCENARIOS} hint="Chọn một kết nối rồi bấm Gửi request để xem rule nào trong template cho nó qua." />
    </>
  );
}
