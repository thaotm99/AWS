import PacketSim, { type PLayout, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";
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
    name: "Client bất kỳ → port 80",
    request: "TCP 80 từ 14.232.8.9",
    layout: layout("Client", "IP bất kỳ"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 1", msg: "`FromPort: 80, ToPort: 80, CidrIp: 0.0.0.0/0`: mọi địa chỉ IP được phép truy cập port 80." },
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
      ok: true, result: "Chỉ một địa chỉ IP được phép SSH. Rule này không ảnh hưởng tới port 80.",
    }),
  },
  {
    name: "Nguồn không xác định → SSH 22",
    request: "TCP 22 từ 198.51.100.7",
    layout: layout("Nguồn lạ", "198.51.100.7"),
    run: () => ({
      steps: [
        { at: "sg", state: "block", tag: "KHÔNG KHỚP", msg: "Port 22 chỉ có rule cho 203.0.113.25/32. Gói tin không khớp rule cho phép nào sẽ bị loại bỏ." }],
      ok: true, result: "Security group chỉ hỗ trợ rule **cho phép**. Không thể khai báo rule từ chối; mọi traffic không được cho phép đều bị chặn.",
    }),
  },
  {
    name: "EC2 instance tải package từ bên ngoài",
    action: "Gửi request ra ngoài",
    request: "EC2 web → HTTPS 443 tới package repository",
    layout: layout("Internet", "package repository", true),
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

function layoutEn(src: string, sub: string, outbound = false): PLayout {
  const base = layout(src, sub, outbound);
  return {
    ...base,
    aria: "Traffic is evaluated against the security group declared in the CloudFormation template",
    nodes: base.nodes.map((n) => n.id === "sg" ? { ...n, l2: outbound ? "outbound: allowed by default" : "inbound: 2 rules in the template" }
      : n.id === "src" && outbound ? { ...n, l2: "package repository" } : n),
  };
}

const SCENARIOS_EN: PScenario[] = [
  {
    name: "Any client → port 80",
    request: "TCP 80 from 14.232.8.9",
    layout: layoutEn("Client", "any IP"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 1", msg: "`FromPort: 80, ToPort: 80, CidrIp: 0.0.0.0/0`: every IP address is allowed to reach port 80." },
        { at: "ec2", state: "pass", flash: "200", msg: "Nginx returns the home page." }],
      ok: true, result: "0.0.0.0/0 means **every** IPv4 address, not one specific IP address 0.0.0.0.",
    }),
  },
  {
    name: "Office → SSH 22",
    request: "TCP 22 from 203.0.113.25",
    layout: layoutEn("Office", "203.0.113.25"),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "RULE 2", msg: "`FromPort: 22, ToPort: 22, CidrIp: 203.0.113.25/32`: /32 corresponds to exactly **one** IP address." },
        { at: "ec2", state: "pass", msg: "The SSH connection succeeds." }],
      ok: true, result: "Only one IP address is allowed to SSH. This rule does not affect port 80.",
    }),
  },
  {
    name: "Unknown source → SSH 22",
    request: "TCP 22 from 198.51.100.7",
    layout: layoutEn("Unknown source", "198.51.100.7"),
    run: () => ({
      steps: [
        { at: "sg", state: "block", tag: "NO MATCH", msg: "Port 22 has a rule only for 203.0.113.25/32. Packets that match no allow rule are dropped." }],
      ok: true, result: "Security groups support **allow** rules only. You cannot declare deny rules; all traffic that is not allowed is blocked.",
    }),
  },
  {
    name: "EC2 instance downloads packages from outside",
    action: "Send outbound request",
    request: "EC2 web → HTTPS 443 to the package repository",
    layout: layoutEn("Internet", "package repository", true),
    run: () => ({
      steps: [
        { at: "sg", state: "pass", tag: "EGRESS", msg: "The snippet declares only `SecurityGroupIngress`. When no egress is declared, the security group keeps its default rule: **allow all outbound traffic**." },
        { at: "src", state: "pass", msg: "The package downloads successfully." }],
      ok: true, result: "These are **security group** inbound rules, not a network ACL. Security groups are stateful: responses to allowed connections are automatically allowed out.",
    }),
  },
];

const SNIPPET_EN = SNIPPET.replace("GroupDescription: web của ShopViet", "GroupDescription: ShopViet web");

export default function SgRuleSim() {
  const L = useLang();
  return (
    <>
      <pre className="sgr-template" aria-label={L({ vi: "Đoạn template khai báo security group", en: "Template snippet that declares the security group" })}>{L({ vi: SNIPPET, en: SNIPPET_EN })}</pre>
      <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} action={L({ vi: "Gửi request", en: "Send request" })} hint={L({ vi: "Chọn một kết nối, sau đó chọn Gửi request để xác định rule nào trong template cho phép kết nối.", en: "Choose a connection, then choose Send request to find which rule in the template allows it." })} />
    </>
  );
}
