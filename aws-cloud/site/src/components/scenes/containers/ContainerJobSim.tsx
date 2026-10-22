import PacketSim, { type PScenario } from "../elb/PacketSim";

// Five jobs ShopViet runs in containers. Each switch is the AWS feature that fixes the
// problem: shared storage with EFS, a cron job with EventBridge Scheduler + Fargate,
// a 30-minute job on Fargate instead of Lambda, one IAM role per Pod (IRSA), and the
// Cluster Autoscaler for Pods stuck in Pending.

const VB = "0 40 820 215";

const SCENARIOS: PScenario[] = [
  {
    name: "Ảnh do người bán tải lên",
    request: "POST /seller/upload  sau đó  GET /seller/photos/1.jpg",
    toggle: { label: "Mount Amazon EFS vào các task", initial: false },
    action: "Tải ảnh lên và truy xuất lại",
    layout: (efs) => ({
      viewBox: VB,
      aria: "Người bán tải ảnh qua ALB tới hai task Fargate; ảnh được lưu trên ephemeral storage hoặc EFS dùng chung",
      boxes: [{ x: 340, y: 50, w: 230, h: 196, label: "ECS service trên Fargate" }],
      nodes: [
        { id: "u", x: 60, y: 148, l1: "Người bán", user: true },
        { id: "alb", x: 220, y: 148, w: 110, l1: "ALB" },
        { id: "t1", x: 455, y: 104, w: 150, l1: "Task web 1", l2: efs ? "mount /data → EFS" : "ephemeral storage" },
        { id: "t2", x: 455, y: 200, w: 150, l1: "Task web 2", l2: efs ? "mount /data → EFS" : "ephemeral storage" },
        { id: "efs", x: 710, y: 148, w: 150, l1: efs ? "Amazon EFS" : "(chưa cấu hình)", l2: efs ? "file system dùng chung" : "lưu trữ bền vững" },
      ],
      links: [["u", "alb"], ["alb", "t1"], ["alb", "t2"], ...(efs ? [["t1", "efs"], ["t2", "efs"]] as [string, string][] : [])],
    }),
    run: (efs) => efs
      ? { steps: [
            { at: "alb", state: "pass", msg: "Request upload được định tuyến tới task 1." },
            { at: "t1", state: "pass", msg: "Task ghi ảnh vào `/data`." },
            { at: "efs", state: "pass", roundTrip: true, msg: "Tệp được lưu trên **EFS**: bền vững, không bị mất khi task dừng." },
            { at: "alb", from: "u", state: "pass", msg: "Request truy xuất được định tuyến tới task 2." },
            { at: "t2", state: "pass", msg: "Task 2 mount cùng file system." },
            { at: "efs", state: "pass", msg: "Đọc được ảnh vừa tải lên." },
          ], ok: true, result: "Ảnh được trả về bất kể task nào tiếp nhận request. Task Fargate cần lưu trữ bền vững và dùng chung: mount **Amazon EFS**." }
      : { steps: [
            { at: "alb", state: "pass", msg: "Request upload được định tuyến tới task 1." },
            { at: "t1", state: "pass", roundTrip: true, msg: "Ảnh được lưu vào ephemeral storage của task 1." },
            { at: "alb", from: "u", state: "pass", msg: "Request truy xuất được định tuyến tới task 2." },
            { at: "t2", state: "block", flash: "404", msg: "Task 2 không có ảnh này. Ephemeral storage của task 1 cũng bị mất khi task bị thay thế." },
          ], ok: false, result: "Ảnh hiển thị không nhất quán đối với người bán. Ephemeral storage của task chỉ là lưu trữ tạm thời và không được dùng chung." },
  },
  {
    name: "Báo cáo doanh thu lúc 2 giờ sáng",
    request: "cron(0 2 * * ? *)  →  report.py (10 phút)",
    toggle: { label: "Sử dụng EventBridge Scheduler + task Fargate", initial: false },
    action: "Mô phỏng 2 giờ sáng",
    layout: (sched) => ({
      viewBox: VB,
      aria: "Lịch chạy báo cáo hằng đêm khởi chạy container và ghi kết quả vào S3",
      nodes: sched
        ? [
            { id: "clock", x: 110, y: 148, w: 170, l1: "EventBridge Scheduler", l2: "cron 2:00 mỗi ngày" },
            { id: "run", x: 410, y: 148, w: 170, l1: "Task Fargate", l2: "dừng khi hoàn tất" },
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
            { at: "run", state: "pass", msg: "Scheduler khởi chạy một task ECS trên **Fargate** đúng 2:00." },
            { at: "s3", state: "pass", msg: "Báo cáo được ghi ra; task dừng và ngừng phát sinh chi phí." },
          ], ok: true, result: "Chỉ phát sinh chi phí cho 10 phút chạy mỗi đêm; không có máy chủ cần vá lỗi." }
      : { steps: [
            { at: "run", state: "change", tag: "24/7", msg: "Instance chạy liên tục chỉ để chờ một job 10 phút; phải tự vá hệ điều hành." },
            { at: "s3", state: "pass", msg: "Báo cáo vẫn được tạo." },
          ], ok: false, result: "Giải pháp hoạt động nhưng phát sinh chi phí và công sức vận hành. Giải pháp phù hợp: EventBridge Scheduler khởi chạy task Fargate." },
  },
  {
    name: "Xử lý stream kéo dài 30 phút",
    request: "Kinesis Data Streams → job tổng hợp (30 phút)",
    toggle: { label: "Chạy job trên ECS Fargate", initial: false },
    action: "Chạy job",
    layout: (fg) => ({
      viewBox: VB,
      aria: "Dữ liệu từ Kinesis Data Streams được xử lý bởi Lambda hoặc task Fargate, sau đó ghi kết quả",
      nodes: [
        { id: "kds", x: 110, y: 148, w: 170, l1: "Kinesis Data Streams", l2: "lượt xem sản phẩm" },
        { id: "run", x: 410, y: 148, w: 170, l1: fg ? "Task Fargate" : "Lambda", l2: fg ? "không giới hạn thời gian" : "tối đa 15 phút" },
        { id: "out", x: 700, y: 148, w: 150, l1: "DynamoDB", l2: "bảng xếp hạng" },
      ],
      links: [["kds", "run"], ["run", "out"]],
    }),
    run: (fg) => fg
      ? { steps: [
            { at: "run", state: "pass", msg: "Task chạy đủ 30 phút. Vẫn là serverless: không có node cần quản lý." },
            { at: "out", state: "pass", msg: "Bảng xếp hạng được ghi." },
          ], ok: true, result: "Job hoàn tất. Tác vụ dài hơn 15 phút nhưng vẫn yêu cầu serverless: container trên Fargate." }
      : { steps: [
            { at: "run", state: "block", flash: "15:00", tag: "TIMEOUT", msg: "Mỗi lần thực thi Lambda tối đa **15 phút**; job bị dừng giữa chừng." },
          ], ok: false, result: "Bảng xếp hạng không bao giờ được cập nhật." },
  },
  {
    name: "Pod chỉ được đọc bucket được cấp quyền",
    request: "order-service đọc s3://shopviet-orders",
    toggle: { label: "Sử dụng IAM Roles for Service Accounts", initial: false },
    action: "Gọi S3",
    layout: (irsa) => ({
      viewBox: VB,
      aria: "Pod trên EKS nhận quyền IAM và đọc hai bucket S3",
      nodes: [
        { id: "pod", x: 100, y: 148, w: 150, l1: "Pod order-service", l2: "trên EKS" },
        { id: "role", x: 360, y: 148, w: 170, l1: irsa ? "IAM role riêng" : "IAM role của node", l2: irsa ? "qua service account" : "dùng chung cho mọi Pod" },
        { id: "orders", x: 660, y: 95, w: 190, l1: "S3 shopviet-orders" },
        { id: "pay", x: 660, y: 200, w: 190, l1: "S3 shopviet-payments" },
      ],
      links: [["pod", "role"], ["role", "orders"], ["role", "pay"]],
    }),
    run: (irsa) => irsa
      ? { steps: [
            { at: "role", state: "pass", msg: "Service account của Pod được ánh xạ tới một IAM role chỉ có quyền đọc bucket orders." },
            { at: "orders", state: "pass", roundTrip: true, msg: "Đọc thành công." },
            { at: "pay", from: "role", state: "block", flash: "403", msg: "AccessDenied: role của Pod không có quyền truy cập dữ liệu thanh toán." },
          ], ok: true, result: "Mỗi Pod chỉ có đúng quyền cần thiết (least privilege) nhờ **IRSA**." }
      : { steps: [
            { at: "role", state: "change", tag: "DÙNG CHUNG", msg: "Pod sử dụng role của node. Role này phải bao gồm quyền của mọi Pod chạy trên node." },
            { at: "orders", state: "pass", roundTrip: true, msg: "Đọc thành công." },
            { at: "pay", from: "role", state: "pass", msg: "Pod cũng đọc được dữ liệu thanh toán, dù order-service không có nhu cầu." },
          ], ok: false, result: "Khi một Pod bị xâm nhập, dữ liệu của mọi service đều bị lộ. Giải pháp: IAM Roles for Service Accounts." },
  },
  {
    name: "Pod mới ở trạng thái Pending",
    request: "kubectl scale deploy/web --replicas=6",
    toggle: { label: "Kích hoạt Cluster Autoscaler", initial: false },
    action: "Thêm Pod",
    layout: () => ({
      viewBox: "0 36 820 228",
      aria: "Pod mới tìm node còn tài nguyên trong cluster EKS",
      boxes: [{ x: 300, y: 44, w: 230, h: 212, label: "EC2 Auto Scaling group của node" }],
      nodes: [
        { id: "pod", x: 100, y: 160, w: 140, l1: "Pod web mới", l2: "cần 1 vCPU" },
        { id: "n1", x: 415, y: 100, w: 170, l1: "Node 1", l2: "hết CPU" },
        { id: "n2", x: 415, y: 160, w: 170, l1: "Node 2", l2: "hết CPU" },
        { id: "n3", x: 415, y: 220, w: 170, l1: "Node 3", l2: "chưa khởi tạo" },
        { id: "ca", x: 700, y: 160, w: 160, l1: "Cluster Autoscaler" },
      ],
      links: [["pod", "n1"], ["pod", "n2"], ["pod", "n3"], ["ca", "n1"], ["ca", "n2"], ["ca", "n3"]],
    }),
    run: (ca) => ({
      steps: [
        { at: "n1", state: "block", msg: "Node 1 không còn CPU khả dụng." },
        { at: "n2", state: "block", msg: "Node 2 cũng không còn CPU khả dụng. Pod ở trạng thái **Pending**." },
        ...(ca
          ? [
              { at: "n3", from: "ca", state: "change" as const, tag: "THÊM NODE", label: "Cluster Autoscaler", relabel: { l1: "Node 3 (mới)", l2: "còn tài nguyên" }, msg: "Cluster Autoscaler phát hiện Pod đang chờ và tăng desired capacity của Auto Scaling group thêm một node." },
              { at: "n3", from: "pod", state: "pass" as const, msg: "Pod được lập lịch lên node mới." },
            ]
          : []),
      ],
      ok: ca,
      back: false,
      result: ca ? "Pod được khởi chạy. Cluster tự động mở rộng theo số Pod." : "Pod ở trạng thái chờ cho tới khi có node được bổ sung thủ công.",
    }),
  },
];

export default function ContainerJobSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tác vụ ShopViet chạy bằng container và nhấn nút để chạy. Bật tuỳ chọn và chạy lại để so sánh kết quả." />;
}
