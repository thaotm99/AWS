import PacketSim, { type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// Five jobs MFTECH runs in containers. Each switch is the AWS feature that fixes the
// problem: shared storage with EFS, a cron job with EventBridge Scheduler + Fargate,
// a 2-hour job on Fargate instead of Lambda, one IAM role per Pod (IRSA), and the
// Cluster Autoscaler for Pods stuck in Pending.

const VB = "0 40 820 215";

type Lang = ReturnType<typeof useLang>;

const scenarios = (L: Lang): PScenario[] => [
  {
    name: L({ vi: "Ảnh do người bán tải lên", en: "Photos uploaded by sellers" }),
    request: L({ vi: "POST /seller/upload  sau đó  GET /seller/photos/1.jpg", en: "POST /seller/upload  then  GET /seller/photos/1.jpg" }),
    toggle: { label: L({ vi: "Mount Amazon EFS vào các task", en: "Mount Amazon EFS in the tasks" }), initial: false },
    action: L({ vi: "Tải ảnh lên và truy xuất lại", en: "Upload and fetch the photo" }),
    layout: (efs) => ({
      viewBox: VB,
      aria: L({ vi: "Người bán tải ảnh qua ALB tới hai task Fargate; ảnh được lưu trên ephemeral storage hoặc EFS dùng chung",
        en: "A seller uploads a photo through an ALB to two Fargate tasks; the photo is stored on ephemeral storage or on shared EFS" }),
      boxes: [{ x: 340, y: 50, w: 230, h: 196, label: L({ vi: "ECS service trên Fargate", en: "ECS service on Fargate" }) }],
      nodes: [
        { id: "u", x: 60, y: 148, l1: L({ vi: "Người bán", en: "Seller" }), user: true },
        { id: "alb", x: 220, y: 148, w: 110, l1: "ALB" },
        { id: "t1", x: 455, y: 104, w: 150, l1: "Task web 1", l2: efs ? "mount /data → EFS" : "ephemeral storage" },
        { id: "t2", x: 455, y: 200, w: 150, l1: "Task web 2", l2: efs ? "mount /data → EFS" : "ephemeral storage" },
        { id: "efs", x: 710, y: 148, w: 150, l1: efs ? "Amazon EFS" : L({ vi: "(chưa cấu hình)", en: "(not configured)" }), l2: efs ? L({ vi: "file system dùng chung", en: "shared file system" }) : L({ vi: "lưu trữ bền vững", en: "durable storage" }) },
      ],
      links: [["u", "alb"], ["alb", "t1"], ["alb", "t2"], ...(efs ? [["t1", "efs"], ["t2", "efs"]] as [string, string][] : [])],
    }),
    run: (efs) => efs
      ? { steps: [
            { at: "alb", state: "pass", msg: L({ vi: "Request upload được định tuyến tới task 1.", en: "The upload request is routed to task 1." }) },
            { at: "t1", state: "pass", msg: L({ vi: "Task ghi ảnh vào `/data`.", en: "The task writes the photo to `/data`." }) },
            { at: "efs", state: "pass", roundTrip: true, msg: L({ vi: "Tệp được lưu trên **EFS**: bền vững, không bị mất khi task dừng.", en: "The file is stored on **EFS**: durable, not lost when the task stops." }) },
            { at: "alb", from: "u", state: "pass", msg: L({ vi: "Request truy xuất được định tuyến tới task 2.", en: "The fetch request is routed to task 2." }) },
            { at: "t2", state: "pass", msg: L({ vi: "Task 2 mount cùng file system.", en: "Task 2 mounts the same file system." }) },
            { at: "efs", state: "pass", msg: L({ vi: "Đọc được ảnh vừa tải lên.", en: "Reads the photo that was just uploaded." }) },
          ], ok: true, result: L({ vi: "Ảnh được trả về bất kể task nào tiếp nhận request. Task Fargate cần lưu trữ bền vững và dùng chung: mount **Amazon EFS**.", en: "The photo is returned no matter which task receives the request. Fargate tasks that need durable, shared storage: mount **Amazon EFS**." }) }
      : { steps: [
            { at: "alb", state: "pass", msg: L({ vi: "Request upload được định tuyến tới task 1.", en: "The upload request is routed to task 1." }) },
            { at: "t1", state: "pass", roundTrip: true, msg: L({ vi: "Ảnh được lưu vào ephemeral storage của task 1.", en: "The photo is saved to task 1's ephemeral storage." }) },
            { at: "alb", from: "u", state: "pass", msg: L({ vi: "Request truy xuất được định tuyến tới task 2.", en: "The fetch request is routed to task 2." }) },
            { at: "t2", state: "block", flash: "404", msg: L({ vi: "Task 2 không có ảnh này. Ephemeral storage của task 1 cũng bị mất khi task bị thay thế.", en: "Task 2 does not have this photo. Task 1's ephemeral storage is also lost when the task is replaced." }) },
          ], ok: false, result: L({ vi: "Ảnh hiển thị không nhất quán đối với người bán. Ephemeral storage của task chỉ là lưu trữ tạm thời và không được dùng chung.", en: "Sellers see their photos inconsistently. A task's ephemeral storage is only temporary and is not shared." }) },
  },
  {
    name: L({ vi: "Báo cáo doanh thu lúc 2 giờ sáng", en: "Revenue report at 2 a.m." }),
    request: L({ vi: "cron(0 2 * * ? *)  →  report.py (10 phút)", en: "cron(0 2 * * ? *)  →  report.py (10 minutes)" }),
    toggle: { label: L({ vi: "Sử dụng EventBridge Scheduler + task Fargate", en: "Use EventBridge Scheduler + a Fargate task" }), initial: false },
    action: L({ vi: "Mô phỏng 2 giờ sáng", en: "Simulate 2 a.m." }),
    layout: (sched) => ({
      viewBox: VB,
      aria: L({ vi: "Lịch chạy báo cáo hằng đêm khởi chạy container và ghi kết quả vào S3", en: "A nightly report schedule starts a container and writes the result to S3" }),
      nodes: sched
        ? [
            { id: "clock", x: 110, y: 148, w: 170, l1: "EventBridge Scheduler", l2: L({ vi: "cron 2:00 mỗi ngày", en: "cron 2:00 daily" }) },
            { id: "run", x: 410, y: 148, w: 170, l1: L({ vi: "Task Fargate", en: "Fargate task" }), l2: L({ vi: "dừng khi hoàn tất", en: "stops when done" }) },
            { id: "s3", x: 700, y: 148, w: 150, l1: "S3", l2: L({ vi: "báo cáo.csv", en: "report.csv" }) },
          ]
        : [
            { id: "clock", x: 110, y: 148, w: 170, l1: "crontab", l2: L({ vi: "trên EC2", en: "on EC2" }) },
            { id: "run", x: 410, y: 148, w: 170, l1: L({ vi: "EC2 bật 24/7", en: "EC2 on 24/7" }), l2: L({ vi: "chạy Docker", en: "runs Docker" }) },
            { id: "s3", x: 700, y: 148, w: 150, l1: "S3", l2: L({ vi: "báo cáo.csv", en: "report.csv" }) },
          ],
      links: [["clock", "run"], ["run", "s3"]],
    }),
    run: (sched) => sched
      ? { steps: [
            { at: "run", state: "pass", msg: L({ vi: "Scheduler khởi chạy một task ECS trên **Fargate** đúng 2:00.", en: "The scheduler starts an ECS task on **Fargate** at exactly 2:00." }) },
            { at: "s3", state: "pass", msg: L({ vi: "Báo cáo được ghi ra; task dừng và ngừng phát sinh chi phí.", en: "The report is written; the task stops and stops incurring cost." }) },
          ], ok: true, result: L({ vi: "Chỉ phát sinh chi phí cho 10 phút chạy mỗi đêm; không có máy chủ cần vá lỗi.", en: "You pay only for 10 minutes of running each night; there is no server to patch." }) }
      : { steps: [
            { at: "run", state: "change", tag: "24/7", msg: L({ vi: "Instance chạy liên tục chỉ để chờ một job 10 phút; phải tự vá hệ điều hành.", en: "The instance runs all the time just to wait for a 10-minute job; you must patch the operating system yourself." }) },
            { at: "s3", state: "pass", msg: L({ vi: "Báo cáo vẫn được tạo.", en: "The report is still produced." }) },
          ], ok: false, result: L({ vi: "Giải pháp hoạt động nhưng phát sinh chi phí và công sức vận hành. Giải pháp phù hợp: EventBridge Scheduler khởi chạy task Fargate.", en: "This works but adds cost and operational effort. The right solution: EventBridge Scheduler starts a Fargate task." }) },
  },
  {
    name: L({ vi: "Xử lý stream kéo dài 2 giờ", en: "2-hour stream processing" }),
    request: L({ vi: "Kinesis Data Streams → job tổng hợp (2 giờ)", en: "Kinesis Data Streams → aggregation job (2 hours)" }),
    toggle: { label: L({ vi: "Chạy job trên ECS Fargate", en: "Run the job on ECS Fargate" }), initial: false },
    action: L({ vi: "Chạy job", en: "Run job" }),
    layout: (fg) => ({
      viewBox: VB,
      aria: L({ vi: "Dữ liệu từ Kinesis Data Streams được xử lý bởi Lambda hoặc task Fargate, sau đó ghi kết quả", en: "Data from Kinesis Data Streams is processed by Lambda or a Fargate task, which then writes the result" }),
      nodes: [
        { id: "kds", x: 110, y: 148, w: 170, l1: "Kinesis Data Streams", l2: L({ vi: "lượt xem sản phẩm", en: "product views" }) },
        { id: "run", x: 410, y: 148, w: 170, l1: fg ? L({ vi: "Task Fargate", en: "Fargate task" }) : "Lambda", l2: fg ? L({ vi: "chạy tới khi job kết thúc", en: "runs until the job ends" }) : L({ vi: "tối đa 15 phút", en: "up to 15 minutes" }) },
        { id: "out", x: 700, y: 148, w: 150, l1: "DynamoDB", l2: L({ vi: "bảng xếp hạng", en: "leaderboard" }) },
      ],
      links: [["kds", "run"], ["run", "out"]],
    }),
    run: (fg) => fg
      ? { steps: [
            { at: "run", state: "pass", msg: L({ vi: "Task chạy đủ 2 giờ rồi dừng khi job kết thúc. Fargate không có máy chủ hay node cần quản lý.", en: "The task runs the full 2 hours and stops when the job ends. Fargate has no servers or nodes to manage." }) },
            { at: "out", state: "pass", msg: L({ vi: "Bảng xếp hạng được ghi.", en: "The leaderboard is written." }) },
          ], ok: true, result: L({ vi: "Job hoàn tất. Tác vụ dài hơn giới hạn thời gian của Lambda nhưng vẫn không muốn quản lý máy chủ: container trên Fargate.", en: "The job completes. A task longer than Lambda's time limit, with no wish to manage servers: a container on Fargate." }) }
      : { steps: [
            { at: "run", state: "block", flash: "15:00", tag: "TIMEOUT", msg: L({ vi: "Lambda function tiêu chuẩn tối đa **15 phút** mỗi lần thực thi (Lambda Managed Instances: tối đa 90 phút với một số kiểu gọi); job 2 giờ bị dừng giữa chừng.", en: "A standard Lambda function runs at most **15 minutes** per invocation (Lambda Managed Instances: up to 90 minutes for some invocation types); the 2-hour job is stopped partway." }) },
          ], ok: false, result: L({ vi: "Bảng xếp hạng không bao giờ được cập nhật.", en: "The leaderboard is never updated." }) },
  },
  {
    name: L({ vi: "Pod chỉ được đọc bucket được cấp quyền", en: "Pod reads only its permitted bucket" }),
    request: L({ vi: "order-service đọc s3://mftech-orders", en: "order-service reads s3://mftech-orders" }),
    toggle: { label: L({ vi: "Sử dụng IAM Roles for Service Accounts", en: "Use IAM Roles for Service Accounts" }), initial: false },
    action: L({ vi: "Gọi S3", en: "Call S3" }),
    layout: (irsa) => ({
      viewBox: VB,
      aria: L({ vi: "Pod trên EKS nhận quyền IAM và đọc hai bucket S3", en: "A Pod on EKS gets IAM permissions and reads two S3 buckets" }),
      nodes: [
        { id: "pod", x: 100, y: 148, w: 150, l1: "Pod order-service", l2: L({ vi: "trên EKS", en: "on EKS" }) },
        { id: "role", x: 360, y: 148, w: 170, l1: irsa ? L({ vi: "IAM role riêng", en: "Dedicated IAM role" }) : L({ vi: "IAM role của node", en: "Node IAM role" }), l2: irsa ? L({ vi: "qua service account", en: "via service account" }) : L({ vi: "dùng chung cho mọi Pod", en: "shared by every Pod" }) },
        { id: "orders", x: 660, y: 95, w: 190, l1: "S3 mftech-orders" },
        { id: "pay", x: 660, y: 200, w: 190, l1: "S3 mftech-payments" },
      ],
      links: [["pod", "role"], ["role", "orders"], ["role", "pay"]],
    }),
    run: (irsa) => irsa
      ? { steps: [
            { at: "role", state: "pass", msg: L({ vi: "Service account của Pod được ánh xạ tới một IAM role chỉ có quyền đọc bucket orders.", en: "The Pod's service account is mapped to an IAM role that can only read the orders bucket." }) },
            { at: "orders", state: "pass", roundTrip: true, msg: L({ vi: "Đọc thành công.", en: "Read succeeds." }) },
            { at: "pay", from: "role", state: "block", flash: "403", msg: L({ vi: "AccessDenied: role của Pod không có quyền truy cập dữ liệu thanh toán.", en: "AccessDenied: the Pod's role has no access to payment data." }) },
          ], ok: true, result: L({ vi: "Mỗi Pod chỉ có đúng quyền cần thiết (least privilege) nhờ **IRSA**.", en: "Each Pod has exactly the permissions it needs (least privilege) thanks to **IRSA**." }) }
      : { steps: [
            { at: "role", state: "change", tag: L({ vi: "DÙNG CHUNG", en: "SHARED" }), msg: L({ vi: "Pod sử dụng role của node. Role này phải bao gồm quyền của mọi Pod chạy trên node.", en: "The Pod uses the node's role. That role must include the permissions of every Pod running on the node." }) },
            { at: "orders", state: "pass", roundTrip: true, msg: L({ vi: "Đọc thành công.", en: "Read succeeds." }) },
            { at: "pay", from: "role", state: "pass", msg: L({ vi: "Pod cũng đọc được dữ liệu thanh toán, dù order-service không có nhu cầu.", en: "The Pod can also read payment data, although order-service does not need it." }) },
          ], ok: false, result: L({ vi: "Khi một Pod bị xâm nhập, dữ liệu của mọi service đều bị lộ. Giải pháp: IAM Roles for Service Accounts.", en: "When one Pod is compromised, every service's data is exposed. Solution: IAM Roles for Service Accounts." }) },
  },
  {
    name: L({ vi: "Pod mới ở trạng thái Pending", en: "New Pod stuck in Pending" }),
    request: "kubectl scale deploy/web --replicas=6",
    toggle: { label: L({ vi: "Kích hoạt Cluster Autoscaler", en: "Enable Cluster Autoscaler" }), initial: false },
    action: L({ vi: "Thêm Pod", en: "Add Pod" }),
    layout: () => ({
      viewBox: "0 36 820 228",
      aria: L({ vi: "Pod mới tìm node còn tài nguyên trong cluster EKS", en: "A new Pod looks for a node with free resources in the EKS cluster" }),
      boxes: [{ x: 300, y: 44, w: 230, h: 212, label: L({ vi: "EC2 Auto Scaling group của node", en: "Node EC2 Auto Scaling group" }) }],
      nodes: [
        { id: "pod", x: 100, y: 160, w: 140, l1: L({ vi: "Pod web mới", en: "New web Pod" }), l2: L({ vi: "cần 1 vCPU", en: "needs 1 vCPU" }) },
        { id: "n1", x: 415, y: 100, w: 170, l1: "Node 1", l2: L({ vi: "hết CPU", en: "out of CPU" }) },
        { id: "n2", x: 415, y: 160, w: 170, l1: "Node 2", l2: L({ vi: "hết CPU", en: "out of CPU" }) },
        { id: "n3", x: 415, y: 220, w: 170, l1: "Node 3", l2: L({ vi: "chưa khởi tạo", en: "not launched" }) },
        { id: "ca", x: 700, y: 160, w: 160, l1: "Cluster Autoscaler" },
      ],
      links: [["pod", "n1"], ["pod", "n2"], ["pod", "n3"], ["ca", "n1"], ["ca", "n2"], ["ca", "n3"]],
    }),
    run: (ca) => ({
      steps: [
        { at: "n1", state: "block", msg: L({ vi: "Node 1 không còn CPU khả dụng.", en: "Node 1 has no CPU available." }) },
        { at: "n2", state: "block", msg: L({ vi: "Node 2 cũng không còn CPU khả dụng. Pod ở trạng thái **Pending**.", en: "Node 2 has no CPU available either. The Pod is **Pending**." }) },
        ...(ca
          ? [
              { at: "n3", from: "ca", state: "change" as const, tag: L({ vi: "THÊM NODE", en: "ADD NODE" }), label: "Cluster Autoscaler", relabel: { l1: L({ vi: "Node 3 (mới)", en: "Node 3 (new)" }), l2: L({ vi: "còn tài nguyên", en: "has resources" }) }, msg: L({ vi: "Cluster Autoscaler phát hiện Pod không lập lịch được và tăng desired capacity của Auto Scaling group thêm một node.", en: "Cluster Autoscaler detects a Pod that cannot be scheduled and raises the Auto Scaling group's desired capacity by one node." }) },
              { at: "n3", from: "pod", state: "pass" as const, msg: L({ vi: "Pod được lập lịch lên node mới.", en: "The Pod is scheduled onto the new node." }) },
            ]
          : []),
      ],
      ok: ca,
      back: false,
      result: ca ? L({ vi: "Pod được khởi chạy. Cluster tự động mở rộng theo số Pod.", en: "The Pod starts. The cluster scales out automatically with the number of Pods." }) : L({ vi: "Pod ở trạng thái Pending cho tới khi có node được bổ sung thủ công.", en: "The Pod stays in the Pending state until a node is added manually." }),
    }),
  },
];

export default function ContainerJobSim() {
  const L = useLang();
  return <PacketSim scenarios={scenarios(L)}
    hint={L({ vi: "Chọn một tác vụ MFTECH chạy bằng container và nhấn nút để chạy. Bật tuỳ chọn và chạy lại để so sánh kết quả.", en: "Pick a MFTECH container task and press the button to run it. Turn on the option and run again to compare the results." })} />;
}
