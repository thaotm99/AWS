// Practice test 5, question 26: two SQS queues decouple job intake from job processing; each Auto Scaling group scales
// on the number of messages in its queue. Captions follow the question's explanation. Additional source:
// - Scaling an Auto Scaling group on the SQS queue backlog:
//   https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html
import type { IllustrationSpec, StepSpec } from "../types";

const intake: StepSpec = {
  flow: ["client", "q1", "intake"],
  times: 3,
  caption: {
    vi: "Queue thứ nhất nhận job từ khách hàng; nhóm EC2 tiếp nhận poll queue này.",
    en: "The first queue collects jobs from clients; the intake EC2 group polls it.",
  },
};
const handOff: StepSpec = {
  flow: ["intake", "q2", "proc"],
  times: 2,
  caption: {
    vi: "Job được đưa vào queue thứ hai để chờ xử lý; nhóm EC2 xử lý poll queue này. Khi bước xử lý chậm lại, job nằm chờ trong queue thay vì bị mất.",
    en: "Jobs go into the second queue to await processing; the processing EC2 group polls it. When processing slows down, jobs wait in the queue instead of being lost.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119517591,
  cols: 4,
  rows: 2.6,
  nodes: [
    { id: "client", label: { vi: "Khách hàng", en: "Clients" }, sub: "jobs", kind: "actor", at: [0, 0.3] },
    { id: "q1", label: "SQS queue", sub: { vi: "job mới", en: "incoming jobs" }, at: [1, 0.3] },
    { id: "intake", label: { vi: "ASG tiếp nhận", en: "Intake ASG" }, sub: "EC2", at: [2, 0.3] },
    { id: "q2", label: "SQS queue", sub: { vi: "job chờ xử lý", en: "jobs to process" }, at: [3, 0.3] },
    { id: "proc", label: { vi: "ASG xử lý", en: "Processing ASG" }, sub: { vi: "EC2 · chậm hơn", en: "EC2 · slower" }, at: [3, 1.8] },
    { id: "procSingle", label: { vi: "ASG xử lý", en: "Processing ASG" }, sub: { vi: "EC2 · chậm hơn", en: "EC2 · slower" }, at: [2, 1.8] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["procSingle"],
      steps: [
        intake,
        handOff,
        {
          mark: ["intake", "proc"],
          tone: "ok",
          badge: { vi: "scale theo số message", en: "scale on backlog" },
          caption: {
            vi: "Mỗi Auto Scaling group scale theo số message trong queue của mình, nên từng bước mở rộng độc lập theo nhu cầu thực tế mà không cấp dư tài nguyên.",
            en: "Each Auto Scaling group scales on the number of messages in its own queue, so each stage grows independently with real demand, without over-provisioning.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tách rời hai bước, giữ được job và mở rộng theo tải.",
          en: "Decoupled stages, jobs preserved, scaling with demand.",
        },
      },
    },
    {
      option: "a",
      hide: ["q2", "proc"],
      steps: [
        {
          flow: [
            ["client", "q1", "intake"],
            ["q1", "procSingle"],
          ],
          times: 2,
          tone: "warn",
          caption: {
            vi: "Một queue duy nhất nhận cả job mới lẫn job chờ xử lý, và mọi EC2 instance đều poll cùng queue đó.",
            en: "A single queue holds both incoming jobs and jobs to process, and every EC2 instance polls that one queue.",
          },
        },
        {
          flow: ["intake", "q1"],
          tone: "bad",
          caption: {
            vi: "Không thể phân biệt, ưu tiên hay scale riêng từng bước; nhóm xử lý có thể nhận nhầm message tiếp nhận và ngược lại nếu không có logic lọc tuỳ chỉnh phức tạp.",
            en: "The stages cannot be told apart, prioritized or scaled separately; processing instances may pick up intake messages and vice versa without complex custom filtering.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Hai bước khác nhau bị gắn chặt vào một queue.",
          en: "Two distinct stages are coupled to one queue.",
        },
      },
    },
    {
      option: "b",
      hide: ["q1", "q2", "procSingle"],
      steps: [
        {
          flow: ["client", "intake", "proc"],
          times: 2,
          tone: "warn",
          badge: { vi: "cố định", en: "fixed size" },
          caption: {
            vi: "Mỗi Auto Scaling group giữ kích thước tối đa dự kiến bằng minimum capacity cố định; cách này thiếu linh hoạt và dễ cấp dư tài nguyên, tốn chi phí.",
            en: "Each Auto Scaling group is pinned at its expected maximum with a fixed minimum capacity; this is inflexible and tends to over-provision, which costs money.",
          },
        },
        {
          mark: "proc",
          tone: "bad",
          badge: { vi: "mất job", en: "jobs lost" },
          caption: {
            vi: "Không có queue làm vùng đệm, nên không có gì bảo đảm job còn nguyên nếu instance bị terminate bất ngờ khi đang xử lý.",
            en: "With no queue buffering, nothing keeps the jobs if an instance terminates unexpectedly during processing.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Tốn kém và không giữ được job khi instance bị terminate.",
          en: "Costly, and jobs are not kept when instances terminate.",
        },
      },
    },
    {
      option: "c",
      hide: ["procSingle"],
      steps: [
        intake,
        handOff,
        {
          mark: ["q1", "q2"],
          tone: "bad",
          badge: { vi: "không gửi thông báo", en: "no notifications" },
          caption: {
            vi: "Việc tách queue là đúng, nhưng SQS queue không gửi thông báo để kích hoạt scale; cách đáng tin cậy là scale theo số message đang chờ trong mỗi queue.",
            en: "Splitting the queues is right, but SQS queues do not send notifications to drive scaling; the reliable approach is to scale on the pending messages in each queue.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "SQS queue không phát thông báo để scale.",
          en: "SQS queues do not emit notifications to scale on.",
        },
      },
    },
  ],
};

export default spec;
