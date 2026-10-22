// Practice test 3, question 31: web log archive with only frequently accessed logs cached on-premises, using
// Volume Gateway cached volumes. Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 121079003,
  cols: 4,
  rows: 1.6,
  nodes: [
    { id: "srv", label: "Web servers", sub: "logs", kind: "onprem", at: [0, 0.4] },
    { id: "cached", label: "Volume Gateway", sub: "cached volumes", at: [1.4, 0.4] },
    { id: "stored", label: "Volume Gateway", sub: "stored volumes", at: [1.4, 0.4] },
    { id: "dx", label: "Direct Connect", sub: { vi: "đường mạng riêng", en: "network link" }, kind: "ghost", at: [1.4, 0.4] },
    { id: "snow", label: "Snowball Edge", sub: "Storage Optimized", kind: "ghost", at: [1.4, 0.4] },
    { id: "s3", label: "Amazon S3", sub: { vi: "bucket của dịch vụ", en: "service bucket" }, kind: "data", at: [3, 0.4] },
  ],
  zones: [{ id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 0.4], to: [1.4, 0.4], pad: 12 }],
  scenarios: [
    {
      option: "d",
      hide: ["stored", "dx", "snow"],
      steps: [
        {
          flow: ["srv", "cached", "s3"],
          badge: { vi: "toàn bộ volume", en: "full volume" },
          caption: {
            vi: "Với cached volumes, Volume Gateway lưu toàn bộ volume, tức mọi log, trong bucket Amazon S3 của dịch vụ.",
            en: "With cached volumes, Volume Gateway stores the full volume, every log, in its Amazon S3 service bucket.",
          },
        },
        {
          flow: ["cached", "srv"],
          back: true,
          times: 3,
          badge: { vi: "cache cục bộ", en: "local cache" },
          caption: {
            vi: "Chỉ dữ liệu được truy cập gần đây được giữ trong cache cục bộ của gateway để truy cập với độ trễ thấp.",
            en: "Only recently accessed data is retained in the gateway's local cache for low-latency access.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Log dùng nhiều ở cục bộ, toàn bộ log trên S3.", en: "Hot logs local, all logs in S3." },
      },
    },
    {
      option: "b",
      hide: ["cached", "dx", "snow"],
      steps: [
        {
          flow: ["srv", "stored"],
          tone: "warn",
          badge: { vi: "toàn bộ ở cục bộ", en: "all local" },
          caption: {
            vi: "Với stored volumes, toàn bộ volume dữ liệu nằm ở cục bộ trong gateway để đọc nhanh.",
            en: "With stored volumes, the entire data volume is available locally in the gateway for fast reads.",
          },
        },
        {
          flow: ["stored", "s3"],
          tone: "warn",
          badge: { vi: "bản sao bất đồng bộ", en: "async copy" },
          caption: {
            vi: "Volume Gateway giữ một bản sao bất đồng bộ của volume trong bucket S3. Yêu cầu là chỉ giữ log dùng nhiều ở cục bộ, nên cách này không phù hợp.",
            en: "Volume Gateway keeps an asynchronous copy of the volume in the S3 bucket. The requirement is to keep only frequently accessed logs locally, so this does not fit.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Giữ toàn bộ dữ liệu ở cục bộ.", en: "It keeps all data locally." } },
    },
    {
      option: "a",
      hide: ["cached", "stored", "snow"],
      steps: [
        {
          flow: ["srv", "dx", "s3"],
          tone: "warn",
          caption: {
            vi: "AWS Direct Connect thiết lập một kết nối mạng chuyên dụng giữa mạng của bạn và một Direct Connect location.",
            en: "AWS Direct Connect establishes a dedicated network connection between your network and a Direct Connect location.",
          },
        },
        {
          mark: "dx",
          tone: "bad",
          caption: {
            vi: "Direct Connect là đường kết nối, không thể dùng để lưu log truy cập thường xuyên ở cục bộ.",
            en: "Direct Connect is a connection; it cannot store the most frequently accessed logs locally.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có bộ nhớ đệm cục bộ.", en: "There is no local cache." } },
    },
    {
      option: "c",
      hide: ["cached", "stored", "dx"],
      steps: [
        {
          flow: ["srv", "snow", "s3"],
          tone: "warn",
          caption: {
            vi: "Snowball Edge Storage Optimized dùng để chuyển an toàn và nhanh từ hàng chục terabyte tới petabyte dữ liệu lên AWS.",
            en: "Snowball Edge Storage Optimized moves dozens of terabytes to petabytes of data to AWS securely and quickly.",
          },
        },
        {
          mark: "snow",
          tone: "bad",
          caption: {
            vi: "Thiết bị này không dùng để lưu log truy cập thường xuyên ở cục bộ cho truy cập độ trễ thấp.",
            en: "The device cannot be used to keep the most frequently accessed logs locally for low-latency access.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Công cụ chuyển dữ liệu, không phải cache.", en: "A transfer device, not a cache." } },
    },
  ],
};

export default spec;
