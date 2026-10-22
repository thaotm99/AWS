// Practice test 4, question 46: asynchronous, retried image compression jobs at low cost with SQS and EC2 Spot Instances.
// Captions follow the question's explanation. Additional sources:
// - Spot Instances are returned when EC2 needs the capacity back (a Spot Instance interruption):
//   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-interruptions.html
// - A message not deleted before the visibility timeout expires becomes visible again for another consumer:
//   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
import type { IllustrationSpec, ScenarioSpec, StepSpec } from "../types";

const enqueue: StepSpec = {
  flow: ["clients", "sqs"],
  times: 3,
  caption: {
    vi: "Yêu cầu nén ảnh được đưa vào hàng đợi SQS và xử lý bất đồng bộ; khách hàng chấp nhận chờ kết quả.",
    en: "Compression jobs are buffered in the SQS queue and processed asynchronously; clients are willing to wait.",
  },
};

const spotSteps: StepSpec[] = [
  enqueue,
  {
    flow: [["sqs", "spot1"], ["sqs", "spot2"]],
    caption: {
      vi: "Các Spot Instance, rẻ hơn nhiều so với On-Demand và không cần cam kết dài hạn, lấy job từ hàng đợi.",
      en: "Spot Instances, far cheaper than On-Demand with no long-term commitment, pull jobs from the queue.",
    },
  },
  {
    mark: "spot1",
    tone: "bad",
    badge: "interrupted",
    caption: {
      vi: "Amazon EC2 thu hồi một Spot Instance khi cần lại dung lượng; job đang xử lý dở chưa bị xoá khỏi hàng đợi.",
      en: "Amazon EC2 reclaims a Spot Instance when it needs the capacity back; the unfinished job is never deleted from the queue.",
    },
  },
  {
    flow: ["sqs", "spot2"],
    badge: "retry",
    caption: {
      vi: "Hết visibility timeout, message xuất hiện lại trong hàng đợi và được một worker khác xử lý lại.",
      en: "When the visibility timeout expires, the message becomes visible again and another worker retries it.",
    },
  },
];

const spot = (option: string, vi: string, en: string): ScenarioSpec => ({
  option,
  hide: ["sns", "ri1", "ri2", "od1", "od2"],
  steps: spotSteps,
  verdict: { works: true, caption: { vi, en } },
});

const spec: IllustrationSpec = {
  questionId: 119516249,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "clients", label: { vi: "Khách hàng", en: "Clients" }, sub: { vi: "ảnh cần nén", en: "images to compress" }, kind: "actor", at: [0, 1] },
    { id: "sqs", label: "Amazon SQS", sub: "queue", at: [1.4, 1] },
    { id: "sns", label: "Amazon SNS", sub: "topic", at: [1.4, 1] },
    { id: "spot1", label: "EC2 Spot", at: [2.9, 0.2] },
    { id: "spot2", label: "EC2 Spot", at: [2.9, 1.8] },
    { id: "ri1", label: "EC2 Reserved", at: [2.9, 0.2] },
    { id: "ri2", label: "EC2 Reserved", at: [2.9, 1.8] },
    { id: "od1", label: "EC2 On-Demand", at: [2.9, 0.2] },
    { id: "od2", label: "EC2 On-Demand", at: [2.9, 1.8] },
  ],
  scenarios: [
    spot(
      "b",
      "Spot Instances cho chi phí xử lý thấp nhất; SQS lo phần bất đồng bộ và thử lại.",
      "Spot Instances give the lowest compute cost; SQS provides asynchrony and retries.",
    ),
    spot(
      "c",
      "SQS đệm job, xử lý bất đồng bộ, có sẵn cơ chế thử lại và mở rộng liền mạch.",
      "SQS buffers the jobs, processes them asynchronously, retries built in, and scales seamlessly.",
    ),
    {
      option: "a",
      hide: ["sqs", "ri1", "ri2", "od1", "od2"],
      steps: [
        {
          flow: [["clients", "sns", "spot1"], ["sns", "spot2"]],
          tone: "warn",
          caption: {
            vi: "SNS là dịch vụ pub/sub kiểu push, đẩy message tới nhiều subscriber.",
            en: "SNS is push-based pub/sub messaging to many subscribers.",
          },
        },
        {
          mark: "sns",
          tone: "bad",
          badge: { vi: "không phải queue", en: "not a queue" },
          caption: {
            vi: "SNS không phải cơ chế hàng đợi, nên không đệm job để xử lý bất đồng bộ.",
            en: "SNS is not a queuing mechanism, so it does not buffer jobs for asynchronous processing.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Cần hàng đợi, không phải pub/sub.", en: "A queue is needed, not pub/sub." },
      },
    },
    {
      option: "d",
      hide: ["sns", "spot1", "spot2", "od1", "od2"],
      steps: [
        enqueue,
        {
          flow: [["sqs", "ri1"], ["sqs", "ri2"]],
          tone: "warn",
          caption: {
            vi: "Reserved Instances giảm chi phí đổi lại cam kết cấu hình instance trong 1 hoặc 3 năm.",
            en: "Reserved Instances cut cost in exchange for a 1- or 3-year commitment to an instance configuration.",
          },
        },
        {
          mark: ["ri1", "ri2"],
          tone: "bad",
          badge: { vi: "1–3 năm", en: "1–3 years" },
          caption: {
            vi: "Với khối lượng job khó dự đoán, cam kết dài hạn như vậy không phù hợp.",
            en: "With an unpredictable job volume, such a long commitment is not desirable.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Cam kết dài hạn không phù hợp.", en: "The long commitment does not fit." },
      },
    },
    {
      option: "e",
      hide: ["sns", "spot1", "spot2", "ri1", "ri2"],
      steps: [
        enqueue,
        {
          flow: [["sqs", "od1"], ["sqs", "od2"]],
          tone: "warn",
          caption: {
            vi: "On-Demand tính phí theo giây, không cam kết; AWS khuyến nghị dùng cho workload ngắn hạn, không đều và không được phép gián đoạn.",
            en: "On-Demand is billed per second with no commitment; AWS recommends it for short-term, irregular workloads that cannot be interrupted.",
          },
        },
        {
          mark: ["od1", "od2"],
          tone: "bad",
          badge: "$$",
          caption: {
            vi: "Job ở đây chịu được gián đoạn nhờ hàng đợi thử lại, nên Spot Instance rẻ hơn là lựa chọn phù hợp hơn.",
            en: "These jobs tolerate interruption thanks to the queue's retries, so cheaper Spot Instances are the better fit.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Đắt hơn Spot Instance.", en: "Costs more than Spot." },
      },
    },
  ],
};

export default spec;
