// Practice test 5, question 44: a dead-letter queue isolates messages that cannot be processed.
// Captions follow the question's explanation. Additional source:
// - "The maxReceiveCount is the number of times a consumer can receive a message from a source queue before it is moved
//   to a dead-letter queue.": https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const send: StepSpec = {
  flow: ["producer", "queue"],
  times: 2,
  caption: {
    vi: "Dịch vụ đặt hàng gửi message đơn hàng vào SQS queue.",
    en: "The order service sends order messages to the SQS queue.",
  },
};
const failing: StepSpec = {
  mark: "consumer",
  tone: "bad",
  badge: { vi: "xử lý lỗi", en: "fails" },
  caption: {
    vi: "Một message không xử lý được, chẳng hạn khi dữ liệu nó tham chiếu đã bị xoá.",
    en: "One message cannot be processed, for example because the data it refers to has been deleted.",
  },
};
const polling = (badge: Bilingual, caption: Bilingual): StepSpec[] => [
  send,
  { flow: ["queue", "consumer"], back: true, badge, caption },
  failing,
  {
    flow: ["queue", "consumer"],
    tone: "bad",
    caption: {
      vi: "Short polling hay long polling chỉ quyết định cách nhận message từ queue; không cách nào dùng được để xử lý message lỗi.",
      en: "Short or long polling only decides how messages are received from the queue; neither can be used to handle processing failures.",
    },
  },
];
const pollVerdict = {
  works: false,
  caption: {
    vi: "Polling không xử lý lỗi khi xử lý message.",
    en: "Polling does not handle processing failures.",
  } as Bilingual,
};

const spec: IllustrationSpec = {
  questionId: 119517501,
  cols: 3.6,
  rows: 2.3,
  nodes: [
    { id: "producer", label: { vi: "Dịch vụ đặt hàng", en: "Order service" }, kind: "actor", at: [0, 0.3] },
    { id: "queue", label: "SQS queue", sub: "source queue", at: [1.3, 0.3] },
    { id: "consumer", label: "Consumer", sub: { vi: "xử lý đơn", en: "order processing" }, at: [2.6, 0.3] },
    { id: "dlq", label: "Dead-letter queue", kind: "data", at: [1.3, 1.6] },
    { id: "tmp", label: "Temporary queue", sub: "request-response", kind: "ghost", at: [1.3, 1.6] },
    { id: "dev", label: { vi: "Kỹ sư", en: "Engineers" }, sub: "debugging", kind: "actor", at: [2.6, 1.6] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["tmp"],
      steps: [
        send,
        { flow: ["queue", "consumer"], caption: { vi: "Consumer nhận message để xử lý.", en: "The consumer receives messages to process." } },
        failing,
        {
          flow: ["queue", "dlq"],
          badge: "maxReceiveCount",
          caption: {
            vi: "Redrive policy đặt maxReceiveCount: sau số lần nhận đó mà vẫn chưa xử lý xong, SQS chuyển message sang dead-letter queue.",
            en: "The redrive policy sets maxReceiveCount: once a message has been received that many times without success, SQS moves it to the dead-letter queue.",
          },
        },
        {
          flow: ["dlq", "dev"],
          caption: {
            vi: "Message lỗi được cô lập trong dead-letter queue để tìm nguyên nhân, trong khi các message khác tiếp tục được xử lý.",
            en: "The failing message is isolated in the dead-letter queue to find out why, while other messages keep flowing.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Dead-letter queue cô lập message lỗi để gỡ lỗi.",
          en: "A dead-letter queue isolates failing messages for debugging.",
        },
      },
    },
    {
      option: "a",
      hide: ["dlq", "dev"],
      steps: [
        send,
        failing,
        {
          mark: "tmp",
          tone: "bad",
          caption: {
            vi: "Temporary queue chủ yếu dùng cho mô hình request-response, ví dụ nhận phản hồi cho một yêu cầu đăng nhập; nó không dùng để xử lý message lỗi.",
            en: "Temporary queues are mainly for the request-response pattern, such as receiving the reply to a login request; they do not handle processing failures.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Temporary queue không xử lý message lỗi.",
          en: "Temporary queues do not handle failures.",
        },
      },
    },
    {
      option: "c",
      hide: ["dlq", "tmp", "dev"],
      steps: polling(
        { vi: "trả về ngay", en: "returns at once" },
        {
          vi: "Với short polling (mặc định), SQS trả phản hồi ngay cả khi không tìm thấy message nào.",
          en: "With short polling (the default), SQS responds right away, even if it found no messages.",
        },
      ),
      verdict: pollVerdict,
    },
    {
      option: "d",
      hide: ["dlq", "tmp", "dev"],
      steps: polling(
        { vi: "chờ message", en: "waits" },
        {
          vi: "Với long polling, SQS chỉ phản hồi khi đã có ít nhất một message, hoặc khi hết thời gian chờ.",
          en: "With long polling, SQS responds once at least one message is available, or when the wait time expires.",
        },
      ),
      verdict: pollVerdict,
    },
  ],
};

export default spec;
