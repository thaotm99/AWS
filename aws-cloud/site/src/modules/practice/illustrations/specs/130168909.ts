// Practice test 6, question 5: Aurora Replicas and CloudFront in front of the ALB absorb spikes in read requests.
// Captions follow the question's explanation. Additional source:
// - Aurora Replicas take read-only connections through the cluster's reader endpoint:
//   https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const allReadsToWriter = (option: string, via: string, how: Bilingual, why: Bilingual): ScenarioSpec => ({
  option,
  hide: ["cf", "ga", "shield", "dx", "reader", "cluster"].filter((id) => id !== via),
  steps: [
    { flow: ["users", via, "alb", "ec2"], times: 3, tone: "warn", caption: how },
    { flow: ["ec2", "writer"], times: 3, tone: "bad", badge: { vi: "mọi lượt đọc", en: "every read" }, caption: why },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Không giúp ứng dụng chịu được các đợt tăng đột biến của request đọc.",
      en: "It does not make the application more resilient to spikes in read requests.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 130168909,
  cols: 5,
  rows: 2.7,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, sub: { vi: "đợt đọc tăng vọt", en: "read spikes" }, kind: "actor", at: [0, 0.4] },
    { id: "cf", label: "CloudFront", sub: "edge location", at: [1, 0.4] },
    { id: "ga", label: "Global Accelerator", sub: "static IP", at: [1, 0.4] },
    { id: "shield", label: "AWS Shield", sub: "DDoS", at: [1, 0.4] },
    { id: "dx", label: "Direct Connect", sub: { vi: "mạng của bạn ↔ AWS", en: "your network ↔ AWS" }, kind: "ghost", at: [1, 0.4] },
    { id: "alb", label: "ALB", at: [2, 0.4] },
    { id: "ec2", label: "EC2", sub: "Auto Scaling group", at: [3, 0.4] },
    { id: "writer", label: "Aurora writer", kind: "data", at: [4, 0.4] },
    { id: "reader", label: "Aurora Replicas", sub: "reader endpoint", kind: "data", at: [4, 1.7] },
  ],
  zones: [{ id: "cluster", label: "Aurora DB cluster", tone: "group", from: [4, 0.4], to: [4, 1.7] }],
  scenarios: [
    {
      option: "a",
      hide: ["cf", "ga", "shield", "dx"],
      steps: [
        {
          flow: ["users", "alb", "ec2"],
          times: 3,
          caption: {
            vi: "Lượng request đọc tăng đột biến đi qua ALB tới các EC2 instance.",
            en: "A spike of read requests reaches the EC2 instances through the ALB.",
          },
        },
        {
          flow: ["ec2", "reader"],
          times: 3,
          badge: "reader endpoint",
          caption: {
            vi: "Ứng dụng gửi truy vấn đọc tới reader endpoint; Aurora phân tán các kết nối chỉ-đọc qua các Aurora Replica (tối đa 15, trải trên các AZ).",
            en: "The application sends read queries to the reader endpoint; Aurora spreads read-only connections across the Aurora Replicas (up to 15, across AZs).",
          },
        },
        {
          flow: ["ec2", "writer"],
          caption: {
            vi: "Writer instance chỉ còn phải xử lý phần ghi. Nếu writer không khả dụng, Aurora tự động nâng một replica lên làm writer mới.",
            en: "The writer instance is left with the writes. If the writer becomes unavailable, Aurora automatically promotes a replica to be the new writer.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Aurora Replica mở rộng khả năng đọc và tăng tính sẵn sàng của tầng cơ sở dữ liệu.",
          en: "Aurora Replicas scale out reads and raise the availability of the database tier.",
        },
      },
    },
    {
      option: "e",
      hide: ["ga", "shield", "dx", "reader", "cluster"],
      steps: [
        {
          flow: ["users", "cf"],
          times: 3,
          badge: "HIT",
          caption: {
            vi: "CloudFront đặt trước ALB. Nội dung phổ biến được phục vụ nhanh từ các edge location (POP) gần người xem.",
            en: "CloudFront sits in front of the ALB. Popular content is served quickly from the edge locations (POPs) close to viewers.",
          },
        },
        {
          flow: ["cf", "alb", "ec2", "writer"],
          badge: "MISS",
          caption: {
            vi: "Chỉ khi nội dung chưa có ở edge location, CloudFront mới lấy nó từ origin, nên phần lớn đợt tăng không chạm tới ứng dụng.",
            en: "Only when content is not already cached at the edge does CloudFront fetch it from the origin, so most of the spike never reaches the application.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Cache ở edge giúp ứng dụng chịu được các đợt tăng request.",
          en: "Caching at the edge makes the application resilient to request spikes.",
        },
      },
    },
    allReadsToWriter(
      "b",
      "shield",
      {
        vi: "AWS Shield là dịch vụ chống DDoS được quản lý, phát hiện và giảm thiểu tấn công.",
        en: "AWS Shield is a managed DDoS protection service that detects and mitigates attacks.",
      },
      {
        vi: "Mọi request đọc hợp lệ vẫn đi tới writer duy nhất; Shield không giúp tăng khả năng chịu các đợt tăng lưu lượng.",
        en: "Every legitimate read still lands on the single writer; Shield does not improve resilience to traffic spikes.",
      },
    ),
    allReadsToWriter(
      "c",
      "ga",
      {
        vi: "Global Accelerator cung cấp static IP làm điểm vào cố định, phù hợp cho các trường hợp không phải HTTP hoặc cần static IP, failover nhanh giữa các Region.",
        en: "Global Accelerator gives static IPs as a fixed entry point, a fit for non-HTTP use cases or for static IPs and fast regional failover.",
      },
      {
        vi: "Mọi request đọc vẫn tới ứng dụng và writer; với đợt tăng lưu lượng, CloudFront là lựa chọn tốt hơn.",
        en: "Every read still reaches the application and the writer; for traffic spikes, CloudFront is the better fit.",
      },
    ),
    {
      option: "d",
      hide: ["cf", "ga", "shield", "reader", "cluster"],
      steps: [
        {
          stop: ["users", "dx"],
          caption: {
            vi: "Direct Connect là kết nối mạng chuyên dụng giữa mạng của bạn và AWS, không phải lối vào cho người dùng internet.",
            en: "Direct Connect is a dedicated network connection between your network and AWS, not an entry point for internet users.",
          },
        },
        {
          flow: ["users", "alb", "ec2", "writer"],
          times: 3,
          tone: "bad",
          caption: {
            vi: "Request đọc vẫn đi thẳng tới ứng dụng và writer như trước.",
            en: "Read requests still go straight to the application and the writer as before.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Direct Connect không giúp chịu các đợt tăng request.",
          en: "Direct Connect does not help with request spikes.",
        },
      },
    },
  ],
};

export default spec;
