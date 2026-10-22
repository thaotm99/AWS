import HopSim, { type HopScenario } from "../security/HopSim";

// Network between ShopViet servers: cluster placement group + EFA for tightly coupled jobs,
// private IP for replication traffic, EC2 Instance Connect, and a highly available bastion.
// Practice-test sources (build-time only): exam1_q23, exam4_q20, exam4_q60, exam6_q36, exam6_q57, exam6_q59.

const SCENARIOS: HopScenario[] = [
  {
    name: "Mô phỏng cần mạng nhanh nhất",
    story: "ShopViet chạy mô phỏng dự báo tồn kho trên nhiều node. Các node trao đổi dữ liệu liên tục, cần **độ trễ thấp nhất** giữa chúng.",
    request: "Node 1 ↔ Node 2 ↔ Node 3",
    toggle: { label: "Cluster placement group + EFA", initial: false },
    start: "n1",
    boxes: [{ x: 20, y: 28, w: 780, h: 200, label: "Region ap-southeast-1" }],
    nodes: [
      { id: "n1", x: 130, y: 130, label: "Node 1", sub: "AZ a", kind: "app" },
      { id: "n2", x: 410, y: 130, label: "Node 2", sub: "AZ a", kind: "app" },
      { id: "n3", x: 690, y: 130, label: "Node 3", sub: "AZ a", kind: "app" },
      { id: "s2", x: 410, y: 130, label: "Node 2", sub: "AZ b", kind: "app" },
      { id: "s3", x: 690, y: 130, label: "Node 3", sub: "AZ c", kind: "app" },
    ],
    hidden: (on) => (on ? ["s2", "s3"] : ["n2", "n3"]),
    run: (on) => on
      ? { hops: [
          { to: "n2", state: "pass", times: 3, tag: "CỰC NHANH", msg: "Cùng một cluster placement group: các instance nằm sát nhau trong một AZ." },
          { to: "n3", state: "pass", times: 3, tag: "EFA", msg: "Elastic Fabric Adapter cho giao tiếp giữa các node với độ trễ rất thấp." },
        ], ok: true, result: "Hiệu năng mạng cao nhất: **cluster placement group** (+ EFA cho HPC). Đổi lại, cả nhóm cùng chịu rủi ro của một AZ." }
      : { hops: [
          { to: "s2", state: "alert", times: 3, tag: "CHẬM", msg: "Đi qua AZ khác, độ trễ cao hơn nhiều." },
          { to: "s3", state: "alert", times: 3, tag: "CHẬM", msg: "Mỗi bước trao đổi đều phải chờ." },
        ], ok: false, result: "Trải node ra nhiều AZ hợp cho độ sẵn sàng, không hợp cho job cần mạng nhanh. Dùng cluster placement group." },
  },
  {
    name: "Đồng bộ dữ liệu giữa hai server",
    story: "Hai server cache của ShopViet trong cùng VPC đồng bộ dữ liệu cho nhau mỗi phút. Hoá đơn data transfer cao bất thường.",
    request: "Replicate 200 GB / ngày",
    toggle: { label: "Dùng private IP", initial: false },
    start: "a",
    nodes: [
      { id: "a", x: 120, y: 190, label: "Cache A", sub: "10.0.1.15", kind: "app" },
      { id: "b", x: 700, y: 190, w: 120, label: "Cache B", sub: "10.0.2.20", kind: "app" },
      { id: "igw", x: 410, y: 60, label: "Internet gateway", sub: "đi ra public IP", kind: "aws" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "b", state: "pass", times: 3, tag: "PRIVATE IP", msg: "Đi thẳng trong VPC." },
        ], ok: true, result: "Dùng private IP: traffic ở lại trong mạng AWS và rẻ hơn." }
      : { hops: [
          { to: "igw", state: "alert", times: 3, tag: "RA NGOÀI", msg: "Gọi bằng public IP, traffic đi ra rồi vào lại." },
          { to: "b", state: "alert", times: 3, tag: "TÍNH PHÍ", msg: "Bị tính phí data transfer." },
        ], ok: false, result: "Đổi cấu hình replication sang private IP." },
  },
  {
    name: "SSH vào server từ Console",
    story: "Kỹ sư mới cần SSH vào một server để xem log. ShopViet không muốn gửi file `.pem` dùng chung qua chat nữa.",
    request: "ssh ec2-user@shop-web",
    toggle: { label: "Dùng EC2 Instance Connect", initial: false },
    start: "eng",
    nodes: [
      { id: "eng", x: 110, y: 130, label: "Kỹ sư mới", kind: "user" },
      { id: "eic", x: 400, y: 60, label: "EC2 Instance Connect", sub: "key tạm 60 giây", kind: "svc" },
      { id: "pem", x: 400, y: 205, label: "File .pem dùng chung", sub: "gửi qua chat", kind: "bad" },
      { id: "ec2", x: 690, y: 130, w: 120, label: "shop-web", kind: "app" },
    ],
    hidden: (on) => (on ? ["pem"] : ["eic"]),
    run: (on) => on
      ? { hops: [
          { to: "eic", state: "pass", tag: "IAM", msg: "Quyền SSH kiểm tra bằng IAM policy." },
          { to: "ec2", state: "change", tag: "KEY TẠM", msg: "Đẩy public key tạm thời vào instance, rồi SSH." },
        ], ok: true, result: "Không còn key dùng chung. Ai được SSH do IAM quyết định, và có log trong CloudTrail." }
      : { hops: [
          { to: "pem", state: "alert", tag: "LỘ KEY", msg: "Key dài hạn nằm trong lịch sử chat." },
          { to: "ec2", state: "pass", tag: "VÀO", msg: "Vào được, nhưng ai có file cũng vào được." },
        ], ok: false, result: "Dùng EC2 Instance Connect để SSH bằng key tạm thời." },
  },
  {
    name: "Bastion host không được chết",
    story: "Đội vận hành SSH vào mạng riêng qua một bastion host. Bastion hỏng là cả đội đứng hình.",
    request: "ssh qua bastion",
    toggle: { label: "NLB + bastion trong Auto Scaling group", initial: false },
    start: "ops",
    nodes: [
      { id: "ops", x: 100, y: 130, label: "Đội vận hành", kind: "user" },
      { id: "nlb", x: 330, y: 130, label: "NLB public", sub: "TCP 22", kind: "svc" },
      { id: "b1", x: 560, y: 60, label: "Bastion 1", sub: "hỏng", kind: "bad" },
      { id: "b2", x: 560, y: 200, label: "Bastion 2", sub: "ASG vừa thay", kind: "app" },
      { id: "priv", x: 740, y: 130, w: 110, label: "Server riêng", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["nlb", "b2"]),
    run: (on) => on
      ? { hops: [
          { to: "nlb", state: "pass", tag: "TCP", msg: "NLB chuyển tiếp kết nối SSH." },
          { to: "b1", state: "skip", tag: "BỎ QUA", msg: "Health check thấy bastion 1 hỏng." },
          { from: "nlb", to: "b2", state: "pass", tag: "KHOẺ", msg: "Đi tới bastion khoẻ do ASG vừa tạo." },
          { to: "priv", state: "pass", tag: "VÀO", msg: "Vào được server trong private subnet." },
        ], ok: true, result: "NLB public đứng trước, bastion nằm trong Auto Scaling group trải nhiều AZ." }
      : { hops: [
          { to: "b1", state: "block", tag: "HẾT ĐƯỜNG", flash: "✕", msg: "Bastion duy nhất hỏng." },
        ], ok: false, result: "Một bastion là một điểm chết. Đặt NLB phía trước và để ASG giữ bastion luôn chạy." },
  },
];

export default function Ec2NetSim() {
  return <HopSim scenarios={SCENARIOS} action="Gửi traffic" height={250}
    label="Traffic giữa các server của ShopViet: placement group, private IP, Instance Connect và bastion" />;
}
