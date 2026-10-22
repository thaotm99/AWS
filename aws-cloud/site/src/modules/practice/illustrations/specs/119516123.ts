// Practice test 2, question 6: Route 53 latency routing to a second web tier in Europe, plus an Aurora read replica there.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec } from "../types";

const notLatency: Bilingual = {
  vi: "Chính sách này không dùng để giảm độ trễ, nên người dùng châu Âu không chắc được đưa tới Region có độ trễ thấp nhất.",
  en: "This policy is not used to reduce latency, so European users are not sent to the Region with the lowest latency.",
};
const otherR53 = ["r53geo", "r53fo"];

const spec: IllustrationSpec = {
  questionId: 119516123,
  cols: 4.4,
  rows: 2.9,
  nodes: [
    { id: "eu", label: { vi: "Người dùng", en: "Users" }, sub: { vi: "châu Âu", en: "Europe" }, kind: "actor", at: [0, 1.1] },
    { id: "r53lat", label: "Route 53", sub: "latency routing", at: [1, 1.1] },
    { id: "r53geo", label: "Route 53", sub: "geolocation routing", at: [1, 1.1] },
    { id: "r53fo", label: "Route 53", sub: "failover routing", at: [1, 1.1] },
    { id: "webUS", label: "EC2 web tier", at: [2.2, 0.2] },
    { id: "webEU", label: "EC2 web tier", at: [2.2, 2.0] },
    { id: "dbUS", label: "Aurora", sub: { vi: "primary", en: "primary" }, kind: "data", at: [3.4, 0.2] },
    { id: "dbEU", label: "Aurora", sub: "read replica", kind: "data", at: [3.4, 2.0] },
    { id: "stbEU", label: "Multi-AZ standby", sub: { vi: "không phục vụ đọc", en: "no read scaling" }, kind: "ghost", at: [3.4, 2.0] },
  ],
  zones: [
    { id: "us", label: "us-east-1", tone: "region", from: [2.2, 0.2], to: [3.4, 0.2] },
    { id: "euReg", label: "eu-west-1", tone: "region", from: [2.2, 2.0], to: [3.4, 2.0] },
  ],
  scenarios: [
    {
      option: "a",
      hide: [...otherR53, "stbEU"],
      steps: [
        {
          flow: ["eu", "r53lat"],
          badge: "latency",
          caption: {
            vi: "Với latency record ở nhiều Region, khi nhận DNS query Route 53 xác định Region nào cho người dùng độ trễ thấp nhất.",
            en: "With latency records in several Regions, Route 53 determines which Region gives the user the lowest latency when it receives a DNS query.",
          },
        },
        {
          flow: ["r53lat", "webEU"],
          caption: {
            vi: "Route 53 trả về record của eu-west-1, nên người dùng châu Âu được phục vụ bởi fleet EC2 web tier ở châu Âu.",
            en: "Route 53 answers with the eu-west-1 record, so European users are served by the EC2 web tier in Europe.",
          },
        },
        {
          flow: ["webEU", "dbEU"],
          caption: {
            vi: "Cùng với Aurora read replica ở eu-west-1, các truy vấn đọc cũng ở gần người dùng.",
            en: "Together with an Aurora read replica in eu-west-1, reads also stay close to the users.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Định tuyến tới Region có độ trễ thấp nhất.", en: "Routed to the lowest-latency Region." } },
    },
    {
      option: "c",
      hide: [...otherR53, "stbEU"],
      steps: [
        {
          flow: ["dbUS", "dbEU"],
          badge: "cross-Region",
          caption: {
            vi: "Aurora read replica có thể dùng để mở rộng khả năng đọc sang Region khác.",
            en: "Aurora read replicas can scale out reads across Regions.",
          },
        },
        {
          flow: ["eu", "r53lat", "webEU", "dbEU"],
          times: 2,
          badge: { vi: "đọc", en: "reads" },
          caption: {
            vi: "Truy vấn đọc của ứng dụng tại châu Âu được phục vụ bởi replica ở eu-west-1, cải thiện hiệu năng cho người dùng châu Âu.",
            en: "Reads from the application in Europe are served by the replica in eu-west-1, which improves performance for European users.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Mở rộng đọc sang châu Âu.", en: "Reads scaled out to Europe." } },
    },
    {
      option: "b",
      hide: ["r53lat", "r53fo", "stbEU"],
      steps: [
        {
          flow: ["eu", "r53geo", "webEU"],
          tone: "warn",
          caption: {
            vi: "Geolocation routing chọn tài nguyên theo vị trí địa lý nơi DNS query xuất phát, ví dụ đưa mọi query từ châu Âu tới một Region ở châu Âu.",
            en: "Geolocation routing chooses resources by the location the DNS query originates from, for example sending all queries from Europe to a European Region.",
          },
        },
        { mark: "r53geo", tone: "bad", badge: { vi: "không theo độ trễ", en: "not latency-based" }, caption: notLatency },
      ],
      verdict: { works: false, caption: { vi: "Không dùng để giảm độ trễ.", en: "Not a latency-reduction policy." } },
    },
    {
      option: "e",
      hide: ["r53lat", "r53geo", "stbEU"],
      steps: [
        {
          flow: ["eu", "r53fo", "webUS"],
          tone: "warn",
          caption: {
            vi: "Failover routing đưa lưu lượng tới tài nguyên chính khi nó khoẻ mạnh, và sang tài nguyên khác khi tài nguyên chính không khoẻ mạnh.",
            en: "Failover routing sends traffic to the primary resource while it is healthy and to another resource when it is unhealthy.",
          },
        },
        { mark: "r53fo", tone: "bad", badge: { vi: "chỉ failover", en: "failover only" }, caption: notLatency },
      ],
      verdict: { works: false, caption: { vi: "Không dùng để giảm độ trễ.", en: "Not a latency-reduction policy." } },
    },
    {
      option: "d",
      hide: ["r53lat", ...otherR53, "dbEU", "eu", "webEU"],
      steps: [
        {
          flow: ["dbUS", "stbEU"],
          tone: "warn",
          badge: "standby",
          caption: {
            vi: "Aurora Multi-AZ tăng tính sẵn sàng và độ bền cho cơ sở dữ liệu.",
            en: "Aurora Multi-AZ enhances the availability and durability of the database.",
          },
        },
        {
          mark: "stbEU",
          tone: "bad",
          caption: {
            vi: "Nhưng nó không giúp mở rộng khả năng đọc, nên không cải thiện thời gian tải cho người dùng châu Âu.",
            en: "But it does not help with read scaling, so it does not improve load times for European users.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Multi-AZ không mở rộng khả năng đọc.", en: "Multi-AZ does not scale reads." } },
    },
  ],
};

export default spec;
