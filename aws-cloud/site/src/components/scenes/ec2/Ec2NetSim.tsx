import HopSim, { type HopScenario } from "../security/HopSim";
import { useLang } from "../../../lib/lang";

// Network between ShopViet servers: cluster placement group + EFA for tightly coupled jobs,
// private IP for replication traffic, EC2 Instance Connect, and a highly available bastion.
// Practice-test sources (build-time only): exam1_q23, exam4_q20, exam4_q60, exam6_q36, exam6_q57, exam6_q59.

type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): HopScenario[] => [
  {
    name: L({ vi: "Tác vụ mô phỏng cần độ trễ thấp nhất", en: "Simulation job needs lowest latency" }),
    story: L({ vi: "ShopViet chạy mô phỏng dự báo tồn kho trên nhiều node. Các node trao đổi dữ liệu liên tục và yêu cầu **độ trễ thấp nhất** giữa chúng.",
      en: "ShopViet runs an inventory forecasting simulation on many nodes. The nodes exchange data constantly and need the **lowest latency** between them." }),
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
          { to: "n2", state: "pass", times: 3, tag: L({ vi: "ĐỘ TRỄ THẤP", en: "LOW LATENCY" }), msg: L({ vi: "Cùng một cluster placement group: các instance được đặt gần nhau trong một AZ.", en: "Same cluster placement group: the instances are placed close together in one AZ." }) },
          { to: "n3", state: "pass", times: 3, tag: "EFA", msg: L({ vi: "Elastic Fabric Adapter cung cấp độ trễ thấp và ổn định hơn cho giao tiếp giữa các node HPC.", en: "Elastic Fabric Adapter provides lower and more consistent latency for communication between HPC nodes." }) },
        ], ok: true, result: L({ vi: "Hiệu năng mạng cao nhất: **cluster placement group** (+ EFA cho HPC). Đánh đổi: toàn bộ nhóm instance cùng chịu rủi ro sự cố của một AZ.",
          en: "Highest network performance: **cluster placement group** (+ EFA for HPC). Trade-off: the whole group of instances shares the risk of a single-AZ failure." }) }
      : { hops: [
          { to: "s2", state: "alert", times: 3, tag: L({ vi: "ĐỘ TRỄ CAO", en: "HIGH LATENCY" }), msg: L({ vi: "Traffic đi qua AZ khác, độ trễ cao hơn đáng kể.", en: "Traffic crosses to another AZ; latency is significantly higher." }) },
          { to: "s3", state: "alert", times: 3, tag: L({ vi: "ĐỘ TRỄ CAO", en: "HIGH LATENCY" }), msg: L({ vi: "Mỗi bước trao đổi dữ liệu đều phải chờ.", en: "Every data exchange step has to wait." }) },
        ], ok: false, result: L({ vi: "Phân tán node trên nhiều AZ phù hợp cho tính sẵn sàng, không phù hợp cho job yêu cầu độ trễ mạng thấp. Giải pháp: cluster placement group.",
          en: "Spreading nodes across AZs suits availability, not jobs that need low network latency. Solution: cluster placement group." }) },
  },
  {
    name: L({ vi: "Đồng bộ dữ liệu giữa hai instance", en: "Data sync between two instances" }),
    story: L({ vi: "Hai máy chủ cache của ShopViet trong cùng VPC đồng bộ dữ liệu với nhau mỗi phút. Chi phí data transfer cao bất thường.",
      en: "Two ShopViet cache servers in the same VPC sync data with each other every minute. Data transfer costs are unusually high." }),
    request: L({ vi: "Replicate 200 GB / ngày", en: "Replicate 200 GB / day" }),
    toggle: { label: L({ vi: "Sử dụng private IP", en: "Use private IPs" }), initial: false },
    start: "a",
    nodes: [
      { id: "a", x: 120, y: 190, label: "Cache A", sub: "10.0.1.15", kind: "app" },
      { id: "b", x: 700, y: 190, w: 120, label: "Cache B", sub: "10.0.2.20", kind: "app" },
      { id: "igw", x: 410, y: 60, label: "Public IP", sub: L({ vi: "định tuyến qua địa chỉ public", en: "routed via public addresses" }), kind: "aws" },
    ],
    run: (on) => on
      ? { hops: [
          { to: "b", state: "pass", times: 3, tag: "PRIVATE IP", msg: L({ vi: "Traffic được định tuyến trực tiếp trong VPC.", en: "Traffic is routed directly within the VPC." }) },
        ], ok: true, result: L({ vi: "Sử dụng private IP: traffic đi trực tiếp trong VPC, không phát sinh phí data transfer qua địa chỉ public.",
          en: "Using private IPs: traffic stays within the VPC, with no data transfer charges for going through public addresses." }) }
      : { hops: [
          { to: "igw", state: "alert", times: 3, tag: L({ vi: "RA NGOÀI", en: "OUTBOUND" }), msg: L({ vi: "Kết nối tới instance kia qua địa chỉ public thay vì private IP.", en: "Connects to the other instance through its public address instead of its private IP." }) },
          { to: "b", state: "alert", times: 3, tag: L({ vi: "TÍNH PHÍ", en: "CHARGED" }), msg: L({ vi: "Theo AWS, instance truy cập instance khác qua địa chỉ public bị tính phí data transfer (regional hoặc Internet).", en: "According to AWS, an instance that reaches another instance through a public address is charged for data transfer (regional or internet)." }) },
        ], ok: false, result: L({ vi: "Cần chuyển cấu hình replication sang private IP.", en: "Switch the replication configuration to private IPs." }) },
  },
  {
    name: L({ vi: "SSH vào instance từ Console", en: "SSH into an instance from the console" }),
    story: L({ vi: "Kỹ sư mới cần SSH vào một instance để xem log. ShopViet muốn chấm dứt việc chia sẻ file `.pem` dùng chung qua ứng dụng chat.",
      en: "A new engineer needs to SSH into an instance to read logs. ShopViet wants to stop sharing a common `.pem` file over the chat app." }),
    request: "ssh ec2-user@shop-web",
    toggle: { label: L({ vi: "Sử dụng EC2 Instance Connect", en: "Use EC2 Instance Connect" }), initial: false },
    start: "eng",
    nodes: [
      { id: "eng", x: 110, y: 130, label: L({ vi: "Kỹ sư mới", en: "New engineer" }), kind: "user" },
      { id: "eic", x: 400, y: 60, label: "EC2 Instance Connect", sub: L({ vi: "key tạm 60 giây", en: "60-second temporary key" }), kind: "svc" },
      { id: "pem", x: 400, y: 205, label: L({ vi: "File .pem dùng chung", en: "Shared .pem file" }), sub: L({ vi: "chia sẻ qua chat", en: "shared over chat" }), kind: "bad" },
      { id: "ec2", x: 690, y: 130, w: 120, label: "shop-web", kind: "app" },
    ],
    hidden: (on) => (on ? ["pem"] : ["eic"]),
    run: (on) => on
      ? { hops: [
          { to: "eic", state: "pass", tag: "IAM", msg: L({ vi: "Quyền SSH được kiểm tra bằng IAM policy.", en: "SSH permission is checked with an IAM policy." }) },
          { to: "ec2", state: "change", tag: L({ vi: "KEY TẠM", en: "TEMP KEY" }), msg: L({ vi: "Public key tạm thời được đẩy vào instance metadata và tồn tại 60 giây; SSH được thiết lập trong khoảng thời gian đó.", en: "A temporary public key is pushed to the instance metadata and lasts 60 seconds; the SSH session is established within that time." }) },
        ], ok: true, result: L({ vi: "Loại bỏ key dùng chung. Quyền SSH do IAM policy quyết định; mọi yêu cầu kết nối qua EC2 Instance Connect được ghi log trong CloudTrail.",
          en: "No more shared keys. IAM policies decide SSH access; every connection request through EC2 Instance Connect is logged in CloudTrail." }) }
      : { hops: [
          { to: "pem", state: "alert", tag: L({ vi: "LỘ KEY", en: "KEY EXPOSED" }), msg: L({ vi: "Key dài hạn tồn tại trong lịch sử chat.", en: "A long-term key sits in the chat history." }) },
          { to: "ec2", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Truy cập thành công, nhưng bất kỳ ai có file cũng truy cập được.", en: "Access succeeds, but anyone who has the file can get in." }) },
        ], ok: false, result: L({ vi: "Giải pháp: EC2 Instance Connect để SSH bằng key tạm thời.", en: "Solution: EC2 Instance Connect to SSH with temporary keys." }) },
  },
  {
    name: L({ vi: "Bastion host có tính sẵn sàng cao", en: "Highly available bastion host" }),
    story: L({ vi: "Đội vận hành SSH vào mạng riêng thông qua một bastion host. Khi bastion gặp sự cố, toàn bộ đội vận hành mất quyền truy cập.",
      en: "The operations team connects over SSH to the private network through a bastion host. When the bastion fails, the whole operations team loses access." }),
    request: L({ vi: "ssh qua bastion", en: "ssh via bastion" }),
    toggle: { label: L({ vi: "NLB + bastion trong Auto Scaling group", en: "NLB + bastion in an Auto Scaling group" }), initial: false },
    start: "ops",
    nodes: [
      { id: "ops", x: 100, y: 130, label: L({ vi: "Đội vận hành", en: "Ops team" }), kind: "user" },
      { id: "nlb", x: 330, y: 130, label: "NLB public", sub: "TCP 22", kind: "svc" },
      { id: "b1", x: 560, y: 60, label: "Bastion 1", sub: L({ vi: "hỏng", en: "failed" }), kind: "bad" },
      { id: "b2", x: 560, y: 200, label: "Bastion 2", sub: L({ vi: "ASG vừa thay thế", en: "just replaced by ASG" }), kind: "app" },
      { id: "priv", x: 740, y: 130, w: 110, label: L({ vi: "Máy chủ private", en: "Private server" }), kind: "store" },
    ],
    hidden: (on) => (on ? [] : ["nlb", "b2"]),
    run: (on) => on
      ? { hops: [
          { to: "nlb", state: "pass", tag: "TCP", msg: L({ vi: "NLB chuyển tiếp kết nối SSH.", en: "The NLB forwards the SSH connection." }) },
          { to: "b1", state: "skip", tag: L({ vi: "BỎ QUA", en: "SKIPPED" }), msg: L({ vi: "Health check phát hiện bastion 1 lỗi.", en: "The health check detects that bastion 1 has failed." }) },
          { from: "nlb", to: "b2", state: "pass", tag: "HEALTHY", msg: L({ vi: "Kết nối được chuyển tới bastion healthy do ASG vừa khởi tạo.", en: "The connection goes to the healthy bastion that the ASG just launched." }) },
          { to: "priv", state: "pass", tag: L({ vi: "TRUY CẬP", en: "ACCESS" }), msg: L({ vi: "Truy cập được máy chủ trong private subnet.", en: "Reaches the server in the private subnet." }) },
        ], ok: true, result: L({ vi: "NLB public đặt phía trước; bastion nằm trong Auto Scaling group phân bổ trên nhiều AZ.",
          en: "A public NLB sits in front; the bastions are in an Auto Scaling group spread across multiple AZs." }) }
      : { hops: [
          { to: "b1", state: "block", tag: L({ vi: "MẤT KẾT NỐI", en: "DISCONNECTED" }), flash: "✕", msg: L({ vi: "Bastion duy nhất gặp sự cố.", en: "The only bastion fails." }) },
        ], ok: false, result: L({ vi: "Một bastion duy nhất là single point of failure. Cần đặt NLB phía trước và dùng ASG để duy trì bastion luôn hoạt động.",
          en: "A single bastion is a single point of failure. Put an NLB in front and use an ASG to keep a bastion running at all times." }) },
  },
];

export default function Ec2NetSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Gửi traffic", en: "Send traffic" })} height={250}
    label={L({ vi: "Traffic giữa các instance của ShopViet: placement group, private IP, Instance Connect và bastion",
      en: "Traffic between ShopViet instances: placement group, private IP, Instance Connect and bastion" })} />;
}
