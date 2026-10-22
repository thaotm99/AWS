import PacketSim, { type PScenario } from "../elb/PacketSim";

// Five jobs ShopViet runs in containers. Each switch is the AWS feature that fixes the
// problem: shared storage with EFS, a cron job with EventBridge Scheduler + Fargate,
// a 30-minute job on Fargate instead of Lambda, one IAM role per Pod (IRSA), and the
// Cluster Autoscaler for Pods stuck in Pending.

const VB = "0 40 820 215";

const SCENARIOS: PScenario[] = [
  {
    name: "Ảnh người bán tải lên",
    request: "POST /seller/upload  rồi  GET /seller/photos/1.jpg",
    toggle: { label: "Mount Amazon EFS vào các task", initial: false },
    action: "Tải ảnh lên rồi xem lại",
    layout: (efs) => ({
      viewBox: VB,
      aria: "Người bán tải ảnh qua ALB tới hai task Fargate, ảnh lưu ở ổ tạm hoặc ở EFS dùng chung",
      boxes: [{ x: 340, y: 50, w: 230, h: 196, label: "ECS service trên Fargate" }],
      nodes: [
        { id: "u", x: 60, y: 148, l1: "Người bán", user: true },
        { id: "alb", x: 220, y: 148, w: 110, l1: "ALB" },
        { id: "t1", x: 455, y: 104, w: 150, l1: "Task web 1", l2: efs ? "mount /data → EFS" : "ổ tạm của task" },
        { id: "t2", x: 455, y: 200, w: 150, l1: "Task web 2", l2: efs ? "mount /data → EFS" : "ổ tạm của task" },
        { id: "efs", x: 710, y: 148, w: 150, l1: efs ? "Amazon EFS" : "(chưa có)", l2: efs ? "file system dùng chung" : "lưu trữ bền" },
      ],
      links: [["u", "alb"], ["alb", "t1"], ["alb", "t2"], ...(efs ? [["t1", "efs"], ["t2", "efs"]] as [string, string][] : [])],
    }),
    run: (efs) => efs
      ? { steps: [
            { at: "alb", state: "pass", msg: "Request upload được chia vào task 1." },
            { at: "t1", state: "pass", msg: "Task ghi ảnh vào `/data`." },
            { at: "efs", state: "pass", roundTrip: true, msg: "File nằm trên **EFS**: bền, không mất khi task dừng." },
            { at: "alb", from: "u", state: "pass", msg: "Lần xem lại rơi vào task 2." },
            { at: "t2", state: "pass", msg: "Task 2 mount cùng file system." },
            { at: "efs", state: "pass", msg: "Đọc được ảnh vừa tải." },
          ], ok: true, result: "Ảnh hiện ra, dù task nào nhận request. Task Fargate cần lưu trữ bền và dùng chung: mount **Amazon EFS**." }
      : { steps: [
            { at: "alb", state: "pass", msg: "Request upload được chia vào task 1." },
            { at: "t1", state: "pass", roundTrip: true, msg: "Ảnh lưu vào ổ tạm của task 1." },
            { at: "alb", from: "u", state: "pass", msg: "Lần xem lại rơi vào task 2." },
            { at: "t2", state: "block", flash: "404", msg: "Task 2 không có ảnh này. Ổ tạm của task 1 cũng mất khi task bị thay." },
          ], ok: false, result: "Người bán thấy ảnh lúc có lúc không. Ổ tạm của task chỉ là tạm thời và không dùng chung." },
  },
  {
    name: "Báo cáo doanh thu lúc 2 giờ sáng",
    request: "cron(0 2 * * ? *)  →  report.py (10 phút)",
    toggle: { label: "Dùng EventBridge Scheduler + task Fargate", initial: false },
    action: "Tới 2 giờ sáng",
    layout: (sched) => ({
      viewBox: VB,
      aria: "Lịch chạy báo cáo mỗi đêm gọi container rồi ghi kết quả vào S3",
      nodes: sched
        ? [
            { id: "clock", x: 110, y: 148, w: 170, l1: "EventBridge Scheduler", l2: "cron 2:00 mỗi ngày" },
            { id: "run", x: 410, y: 148, w: 170, l1: "Task Fargate", l2: "chạy xong thì dừng" },
            { id: "s3", x: 700, y: 148, w: 150, l1: "S3", l2: "báo cáo.csv" },
          ]
        : [
            { id: "clock", x: 110, y: 148, w: 170, l1: "crontab", l2: "trên EC2" },
            { id: "run", x: 410, y: 148, w: 170, l1: "EC2 bật 24/7", l2: "chạy Docker" },
            { id: "s3", x: 700, y: 148, w: 150, l1: "S3", l2: "báo cáo.csv" },
          ],
      links: [["clock", "run"], ["run", "s3"]],
    }),
    run: (sched) => sched
      ? { steps: [
            { at: "run", state: "pass", msg: "Scheduler khởi động một task ECS trên **Fargate** đúng 2:00." },
            { at: "s3", state: "pass", msg: "Ghi báo cáo. Task dừng, hết tính tiền." },
          ], ok: true, result: "Chỉ trả tiền cho 10 phút chạy mỗi đêm, không có server để vá." }
      : { steps: [
            { at: "run", state: "change", tag: "24/7", msg: "Máy chạy cả ngày chỉ để đợi một job 10 phút. Phải tự vá hệ điều hành." },
            { at: "s3", state: "pass", msg: "Báo cáo vẫn ra." },
          ], ok: false, result: "Chạy được nhưng tốn tiền và công vận hành. Dùng EventBridge Scheduler gọi task Fargate." },
  },
  {
    name: "Xử lý stream mất 30 phút",
    request: "Kinesis Data Streams → job tổng hợp (30 phút)",
    toggle: { label: "Chạy job trên ECS Fargate", initial: false },
    action: "Chạy job",
    layout: (fg) => ({
      viewBox: VB,
      aria: "Dữ liệu từ Kinesis Data Streams đi vào Lambda hoặc task Fargate rồi ghi kết quả",
      nodes: [
        { id: "kds", x: 110, y: 148, w: 170, l1: "Kinesis Data Streams", l2: "lượt xem sản phẩm" },
        { id: "run", x: 410, y: 148, w: 170, l1: fg ? "Task Fargate" : "Lambda", l2: fg ? "không giới hạn thời gian" : "tối đa 15 phút" },
        { id: "out", x: 700, y: 148, w: 150, l1: "DynamoDB", l2: "bảng xếp hạng" },
      ],
      links: [["kds", "run"], ["run", "out"]],
    }),
    run: (fg) => fg
      ? { steps: [
            { at: "run", state: "pass", msg: "Task chạy đủ 30 phút. Vẫn serverless: không có node để quản lý." },
            { at: "out", state: "pass", msg: "Ghi bảng xếp hạng." },
          ], ok: true, result: "Job xong. Việc dài hơn 15 phút mà vẫn muốn serverless: container trên Fargate." }
      : { steps: [
            { at: "run", state: "block", flash: "15:00", tag: "TIMEOUT", msg: "Một lần chạy Lambda tối đa **15 phút**. Job bị dừng giữa chừng." },
          ], ok: false, result: "Bảng xếp hạng không bao giờ được cập nhật." },
  },
  {
    name: "Pod chỉ được đọc bucket của nó",
    request: "order-service đọc s3://shopviet-orders",
    toggle: { label: "Dùng IAM Roles for Service Accounts", initial: false },
    action: "Gọi S3",
    layout: (irsa) => ({
      viewBox: VB,
      aria: "Pod trên EKS lấy quyền IAM rồi đọc hai bucket S3",
      nodes: [
        { id: "pod", x: 100, y: 148, w: 150, l1: "Pod order-service", l2: "trên EKS" },
        { id: "role", x: 360, y: 148, w: 170, l1: irsa ? "IAM role riêng" : "IAM role của node", l2: irsa ? "qua service account" : "mọi Pod dùng chung" },
        { id: "orders", x: 660, y: 95, w: 190, l1: "S3 shopviet-orders" },
        { id: "pay", x: 660, y: 200, w: 190, l1: "S3 shopviet-payments" },
      ],
      links: [["pod", "role"], ["role", "orders"], ["role", "pay"]],
    }),
    run: (irsa) => irsa
      ? { steps: [
            { at: "role", state: "pass", msg: "Service account của Pod được map tới một IAM role chỉ có quyền đọc bucket orders." },
            { at: "orders", state: "pass", roundTrip: true, msg: "Đọc được." },
            { at: "pay", from: "role", state: "block", flash: "403", msg: "AccessDenied: role của Pod này không có quyền với dữ liệu thanh toán." },
          ], ok: true, result: "Mỗi Pod đúng quyền của nó (least privilege) nhờ **IRSA**." }
      : { steps: [
            { at: "role", state: "change", tag: "DÙNG CHUNG", msg: "Pod dùng role của node. Role này phải gộp quyền của mọi Pod chạy trên node." },
            { at: "orders", state: "pass", roundTrip: true, msg: "Đọc được." },
            { at: "pay", from: "role", state: "pass", msg: "Cũng đọc được dữ liệu thanh toán, dù order-service không cần." },
          ], ok: false, result: "Một Pod bị chiếm là lộ dữ liệu của mọi service. Dùng IAM Roles for Service Accounts." },
  },
  {
    name: "Pod mới nằm Pending",
    request: "kubectl scale deploy/web --replicas=6",
    toggle: { label: "Bật Cluster Autoscaler", initial: false },
    action: "Thêm Pod",
    layout: () => ({
      viewBox: "0 36 820 228",
      aria: "Pod mới tìm node còn chỗ trong cluster EKS",
      boxes: [{ x: 300, y: 44, w: 230, h: 212, label: "EC2 Auto Scaling group của node" }],
      nodes: [
        { id: "pod", x: 100, y: 160, w: 140, l1: "Pod web mới", l2: "cần 1 vCPU" },
        { id: "n1", x: 415, y: 100, w: 170, l1: "Node 1", l2: "hết CPU" },
        { id: "n2", x: 415, y: 160, w: 170, l1: "Node 2", l2: "hết CPU" },
        { id: "n3", x: 415, y: 220, w: 170, l1: "Node 3", l2: "chưa tạo" },
        { id: "ca", x: 700, y: 160, w: 160, l1: "Cluster Autoscaler" },
      ],
      links: [["pod", "n1"], ["pod", "n2"], ["pod", "n3"], ["ca", "n1"], ["ca", "n2"], ["ca", "n3"]],
    }),
    run: (ca) => ({
      steps: [
        { at: "n1", state: "block", msg: "Node 1 không còn CPU trống." },
        { at: "n2", state: "block", msg: "Node 2 cũng vậy. Pod ở trạng thái **Pending**." },
        ...(ca
          ? [
              { at: "n3", from: "ca", state: "change" as const, tag: "THÊM NODE", label: "Cluster Autoscaler", relabel: { l1: "Node 3 (mới)", l2: "còn chỗ" }, msg: "Cluster Autoscaler thấy Pod chờ, tăng desired capacity của Auto Scaling group thêm một node." },
              { at: "n3", from: "pod", state: "pass" as const, msg: "Pod được xếp lên node mới." },
            ]
          : []),
      ],
      ok: ca,
      back: false,
      result: ca ? "Pod chạy. Cluster tự lớn theo số Pod." : "Pod chờ mãi cho tới khi có người thêm node bằng tay.",
    }),
  },
];

export default function ContainerJobSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một việc ShopViet chạy bằng container, bấm nút để chạy. Bật công tắc rồi chạy lại để so sánh." />;
}
