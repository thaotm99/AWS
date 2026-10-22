// Practice test 6, question 32: two SQS standard queues (pro and lite) with workers that poll the pro queue first.
// Captions follow the question's explanation and its references:
//   https://aws.amazon.com/sqs/features/
//   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const polling = (option: string, pro: string, lite: string, intro: Bilingual): ScenarioSpec => ({
  option,
  hide: ["proQ", "liteQ", "proF", "liteF", "one"].filter((id) => id !== pro && id !== lite),
  steps: [
    { flow: [["pro", pro], ["lite", lite]], times: 2, caption: intro },
    {
      flow: [[pro, "workers"], [lite, "workers"]],
      tone: "warn",
      badge: { vi: "không ưu tiên", en: "no priority" },
      caption: {
        vi: "Short polling trả về ngay cả khi queue trống; long polling chờ tới khi có message hoặc hết thời gian chờ. Cả hai không ảnh hưởng tới thứ tự ưu tiên xử lý giữa hai queue.",
        en: "Short polling returns at once even when the queue is empty; long polling waits until a message arrives or the poll times out. Neither changes the processing priority between the queues.",
      },
    },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Kiểu polling không tạo ra ưu tiên cho ảnh của người dùng pro.",
      en: "The polling type does not prioritize pro users' photos.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 130168973,
  cols: 4,
  rows: 2.5,
  nodes: [
    { id: "pro", label: { vi: "Người dùng pro", en: "Pro users" }, kind: "actor", at: [0, 0.3] },
    { id: "lite", label: { vi: "Người dùng lite", en: "Lite users" }, kind: "actor", at: [0, 1.7] },
    { id: "proQ", label: "SQS standard", sub: "pro", kind: "data", at: [1.5, 0.3] },
    { id: "liteQ", label: "SQS standard", sub: "lite", kind: "data", at: [1.5, 1.7] },
    { id: "proF", label: "SQS FIFO", sub: "pro", kind: "data", at: [1.5, 0.3] },
    { id: "liteF", label: "SQS FIFO", sub: "lite", kind: "data", at: [1.5, 1.7] },
    { id: "one", label: "SQS standard", sub: { vi: "một queue chung", en: "one shared queue" }, kind: "data", at: [1.5, 1] },
    { id: "workers", label: "EC2 workers", sub: { vi: "xử lý ảnh", en: "photo jobs" }, at: [3, 1] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["proF", "liteF", "one"],
      steps: [
        {
          flow: [["pro", "proQ"], ["lite", "liteQ"]],
          times: 2,
          caption: {
            vi: "Thông tin job được gửi vào hai SQS standard queue riêng: một cho pro, một cho lite. AWS khuyến nghị dùng các queue riêng để ưu tiên công việc.",
            en: "Job information goes into two separate SQS standard queues, one for pro and one for lite. AWS recommends separate queues to prioritize work.",
          },
        },
        {
          flow: ["proQ", "workers"],
          times: 2,
          badge: { vi: "ưu tiên", en: "first" },
          caption: {
            vi: "Các EC2 instance được cấu hình ưu tiên poll queue pro trước.",
            en: "The EC2 instances are configured to poll the pro queue first.",
          },
        },
        {
          flow: ["liteQ", "workers"],
          badge: { vi: "sau", en: "then" },
          caption: {
            vi: "Ảnh của người dùng lite được xử lý sau ảnh của người dùng pro.",
            en: "Lite users' photos are processed after pro users' photos.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Ảnh của người dùng pro được xử lý trước.",
          en: "Pro users' photos are processed first.",
        },
      },
    },
    polling("a", "proQ", "liteQ", {
      vi: "Hai SQS standard queue riêng; queue lite dùng short polling, queue pro dùng long polling.",
      en: "Two separate SQS standard queues; the lite queue uses short polling and the pro queue long polling.",
    }),
    polling("c", "proF", "liteF", {
      vi: "Hai SQS FIFO queue riêng; queue lite dùng short polling, queue pro dùng long polling.",
      en: "Two separate SQS FIFO queues; the lite queue uses short polling and the pro queue long polling.",
    }),
    {
      option: "d",
      hide: ["proQ", "liteQ", "proF", "liteF"],
      steps: [
        {
          flow: [["pro", "one"], ["lite", "one"]],
          times: 2,
          caption: {
            vi: "Mọi job đi vào một queue chung; ảnh pro được đặt visibility timeout bằng 0.",
            en: "All jobs go into one shared queue; pro photos get a visibility timeout of zero.",
          },
        },
        {
          flow: ["one", "workers"],
          times: 2,
          tone: "bad",
          badge: "×2",
          caption: {
            vi: "Visibility timeout ngăn consumer khác nhận lại message đang xử lý; đặt bằng 0 có thể khiến cùng một ảnh pro bị nhiều consumer xử lý, và không tạo ra ưu tiên.",
            en: "The visibility timeout keeps other consumers from receiving a message in progress; at zero, the same pro photo can be processed by more than one consumer, and nothing is prioritized.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Gây xử lý trùng lặp mà không ưu tiên ảnh pro.",
          en: "Duplicate processing, and no priority for pro photos.",
        },
      },
    },
  ],
};

export default spec;
