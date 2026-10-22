import HopSim, { type HopScenario } from "../security/HopSim";

// Network between ShopViet servers: cluster placement group + EFA for tightly coupled jobs,
// private IP for replication traffic, EC2 Instance Connect, and a highly available bastion.
// Practice-test sources (build-time only): exam1_q23, exam4_q20, exam4_q60, exam6_q36, exam6_q57, exam6_q59.

const SCENARIOS: HopScenario[] = [
  {
    name: "Tác vụ mô phỏng cần độ trễ thấp nhất",
    story: "ShopViet chạy mô phỏng dự báo tồn kho trên nhiều node. Các node trao đổi dữ liệu liên tục và yêu cầu **độ trễ thấp nhất** giữa chúng.",
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
          { to: "n2", state: "pass", times: 3, tag: "ĐỘ TRỄ THẤP", msg: "Cùng một cluster placement group: các instance được đặt gần nhau trong một AZ." },
          { to: "n3", state: "pass", times: 3, tag: "EFA", msg: "Elastic Fabric Adapter cung cấp độ trễ thấp và ổn định hơn cho giao tiếp giữa các node HPC." },
        ], ok: true, result: "Hiệu năng mạng cao nhất: **cluster placement group** (+ EFA cho HPC). Đánh đổi: toàn bộ nhóm instance cùng chịu rủi ro sự cố của một AZ." }
      : { hops: [
          { to: "s2", state: "alert", times: 3, tag: "ĐỘ TRỄ CAO", msg: "Traffic đi qua AZ khác, độ trễ cao hơn đáng kể." },
          { to: "s3", state: "alert", times: 3, tag: "ĐỘ TRỄ CAO", msg: "Mỗi bước trao đổi dữ liệu đều phải chờ." },
        ], ok: false, result: "Phân tán node trên nhiều AZ phù hợp cho tính sẵn sàng, không phù hợp cho job yêu cầu độ trễ mạng thấp. Giải pháp: cluster placement group." },
  },
  {
    name: "Đồng bộ dữ liệu giữa hai instance",
    story: "Hai máy chủ cache của ShopViet trong cùng VPC đồng bộ dữ liệu với nhau mỗi phút. Chi phí data transfer cao bất thường.",
    request: "Replicate 200 GB / ngày",
    toggle: { label: "Sử dụng private IP", initial: false },
    start: "a",
    nodes: [
      { id: "a", x: 120, y: 190, label: "Cache A", sub: "10.0.1.15", kind: "app" },
      { id: "b", x: 700, y: 190, w: 120, label: "Cache B", sub: "10.0.2.20", kind: "app" },
      { id: "igw", x: 410, y: 60, label: "Public IP", sub: "định tuyến qua địa chỉ public", kind: "aws" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "b", state: "pass", times: 3, tag: "PRIVATE IP", msg: "Traffic được định tuyến trực tiếp trong VPC." },
        ], ok: true, result: "Sử dụng private IP: traffic đi trực tiếp trong VPC, không phát sinh phí data transfer qua địa chỉ public." }
      : { hops: [
          { to: "igw", state: "alert", times: 3, tag: "RA NGOÀI", msg: "Kết nối tới instance kia qua địa chỉ public thay vì private IP." },
          { to: "b", state: "alert", times: 3, tag: "TÍNH PHÍ", msg: "Theo AWS, instance truy cập instance khác qua địa chỉ public bị tính phí data transfer (regional hoặc Internet)." },
        ], ok: false, result: "Cần chuyển cấu hình replication sang private IP." },
  },
  {
    name: "SSH vào instance từ Console",
    story: "Kỹ sư mới cần SSH vào một instance để xem log. ShopViet muốn chấm dứt việc chia sẻ file `.pem` dùng chung qua ứng dụng chat.",
    request: "ssh ec2-user@shop-web",
    toggle: { label: "Sử dụng EC2 Instance Connect", initial: false },
    start: "eng",
    nodes: [
      { id: "eng", x: 110, y: 130, label: "Kỹ sư mới", kind: "user" },
      { id: "eic", x: 400, y: 60, label: "EC2 Instance Connect", sub: "key tạm 60 giây", kind: "svc" },
      { id: "pem", x: 400, y: 205, label: "File .pem dùng chung", sub: "chia sẻ qua chat", kind: "bad" },
      { id: "ec2", x: 690, y: 130, w: 120, label: "shop-web", kind: "app" },
    ],
    hidden: (on) => (on ? ["pem"] : ["eic"]),
    run: (on) => on
      ? { hops: [
          { to: "eic", state: "pass", tag: "IAM", msg: "Quyền SSH được kiểm tra bằng IAM policy." },
          { to: "ec2", state: "change", tag: "KEY TẠM", msg: "Public key tạm thời được đẩy vào instance metadata và tồn tại 60 giây; SSH được thiết lập trong khoảng thời gian đó." },
        ], ok: true, result: "Loại bỏ key dùng chung. Quyền SSH do IAM policy quyết định; mọi yêu cầu kết nối qua EC2 Instance Connect được ghi log trong CloudTrail." }
      : { hops: [
          { to: "pem", state: "alert", tag: "LỘ KEY", msg: "Key dài hạn tồn tại trong lịch sử chat." },
          { to: "ec2", state: "pass", tag: "TRUY CẬP", msg: "Truy cập thành công, nhưng bất kỳ ai có file cũng truy cập được." },
        ], ok: false, result: "Giải pháp: EC2 Instance Connect để SSH bằng key tạm thời." },
  },
  {
    name: "Bastion host có tính sẵn sàng cao",
    story: "Đội vận hành SSH vào mạng riêng thông qua một bastion host. Khi bastion gặp sự cố, toàn bộ đội vận hành mất quyền truy cập.",
    request: "ssh qua bastion",
    toggle: { label: "NLB + bastion trong Auto Scaling group", initial: false },
    start: "ops",
    nodes: [
      { id: "ops", x: 100, y: 130, label: "Đội vận hành", kind: "user" },
      { id: "nlb", x: 330, y: 130, label: "NLB public", sub: "TCP 22", kind: "svc" },
      { id: "b1", x: 560, y: 60, label: "Bastion 1", sub: "hỏng", kind: "bad" },
      { id: "b2", x: 560, y: 200, label: "Bastion 2", sub: "ASG vừa thay thế", kind: "app" },
      { id: "priv", x: 740, y: 130, w: 110, label: "Máy chủ private", kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["nlb", "b2"]),
    run: (on) => on
      ? { hops: [
          { to: "nlb", state: "pass", tag: "TCP", msg: "NLB chuyển tiếp kết nối SSH." },
          { to: "b1", state: "skip", tag: "BỎ QUA", msg: "Health check phát hiện bastion 1 lỗi." },
          { from: "nlb", to: "b2", state: "pass", tag: "HEALTHY", msg: "Kết nối được chuyển tới bastion healthy do ASG vừa khởi tạo." },
          { to: "priv", state: "pass", tag: "TRUY CẬP", msg: "Truy cập được máy chủ trong private subnet." },
        ], ok: true, result: "NLB public đặt phía trước; bastion nằm trong Auto Scaling group phân bổ trên nhiều AZ." }
      : { hops: [
          { to: "b1", state: "block", tag: "MẤT KẾT NỐI", flash: "✕", msg: "Bastion duy nhất gặp sự cố." },
        ], ok: false, result: "Một bastion duy nhất là single point of failure. Cần đặt NLB phía trước và dùng ASG để duy trì bastion luôn hoạt động." },
  },
];

export default function Ec2NetSim() {
  return <HopSim scenarios={SCENARIOS} action="Gửi traffic" height={250}
    label="Traffic giữa các instance của ShopViet: placement group, private IP, Instance Connect và bastion" />;
}
