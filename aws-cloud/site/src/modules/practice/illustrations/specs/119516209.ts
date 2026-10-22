// Practice test 4, question 3: users still reach the old load balancer after a Route 53 simple record change.
// Captions follow the question's explanation (TTL, recursive resolvers' cache, simple records without health checks,
// alias and CNAME records).
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const updated: StepSpec = {
  mark: "r53",
  tone: "ok",
  badge: { vi: "→ LB mới", en: "→ new LB" },
  caption: {
    vi: "Simple record “myapp.mydomain.com” trong Route 53 đã được sửa để trỏ sang Load Balancer mới.",
    en: "The simple record “myapp.mydomain.com” in Route 53 has been updated to point to the new Load Balancer.",
  },
};

const cached: StepSpec = {
  flow: ["user", "resolver"],
  badge: "TTL",
  caption: {
    vi: "Truy vấn DNS của người dùng đi tới DNS recursive resolver. Resolver vẫn còn giữ câu trả lời cũ trong cache vì TTL của record chưa hết hạn.",
    en: "Users' DNS queries go to a DNS recursive resolver. It still holds the old answer in its cache, because the record's TTL has not expired yet.",
  },
};

const toOld: StepSpec = {
  flow: ["user", "oldLb"],
  tone: "warn",
  caption: {
    vi: "Resolver trả về địa chỉ cũ từ cache, nên người dùng vẫn được đưa tới Load Balancer cũ.",
    en: "The resolver answers from its cache with the old address, so users are still sent to the old Load Balancer.",
  },
};

const stillCached: Bilingual = {
  vi: "Nguyên nhân là TTL vẫn còn hiệu lực: người dùng sẽ tới Load Balancer mới khi câu trả lời trong cache hết hạn.",
  en: "The cause is the TTL still in effect: users reach the new Load Balancer once the cached answer expires.",
};

const spec: IllustrationSpec = {
  questionId: 119516209,
  cols: 4.3,
  rows: 2.6,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, sub: "myapp.mydomain.com", kind: "actor", at: [0, 1.4] },
    { id: "resolver", label: "DNS resolver", sub: { vi: "đệ quy · có cache", en: "recursive · cache" }, at: [1.1, 0.2] },
    { id: "r53", label: "Amazon Route 53", sub: "simple record", at: [2.3, 0.2] },
    { id: "oldLb", label: { vi: "LB cũ", en: "Old LB" }, sub: "monolith", kind: "data", at: [3.3, 0.9] },
    { id: "newLb", label: { vi: "LB mới", en: "New LB" }, sub: "microservices", kind: "data", at: [3.3, 1.9] },
  ],
  links: [["resolver", "r53"]],
  scenarios: [
    {
      option: "a",
      steps: [
        updated,
        cached,
        toOld,
        {
          flow: ["resolver", "r53"],
          caption: {
            vi: "TTL là thời gian (tính bằng giây) resolver được lưu cache một record. Khi TTL hết hạn, resolver hỏi lại Route 53 để lấy giá trị mới nhất.",
            en: "The TTL is the time, in seconds, a resolver may cache a record. When it expires, the resolver asks Route 53 again for the latest value.",
          },
        },
        {
          flow: ["r53", "resolver", "user"],
          back: true,
          caption: {
            vi: "Câu trả lời mới trỏ tới Load Balancer mới. Khi sửa record đang được sử dụng, AWS khuyến nghị đặt TTL ngắn trước (ví dụ 300 giây).",
            en: "The new answer points to the new Load Balancer. When changing a record in use, AWS recommends a shorter TTL first, such as 300 seconds.",
          },
        },
        {
          flow: ["user", "newLb"],
          caption: {
            vi: "Người dùng được chuyển tới Load Balancer mới.",
            en: "Users are now sent to the new Load Balancer.",
          },
        },
      ],
      verdict: { works: true, caption: stillCached },
    },
    {
      option: "b",
      steps: [
        updated,
        {
          mark: "r53",
          tone: "bad",
          badge: { vi: "không health check", en: "no health checks" },
          caption: {
            vi: "Simple record không có health check, nên “health check thất bại” không thể là nguyên nhân.",
            en: "Simple records do not have health checks, so failing health checks cannot be the cause.",
          },
        },
        cached,
        toOld,
      ],
      verdict: {
        works: false,
        caption: { vi: "Simple record không có health check.", en: "Simple records have no health checks." },
      },
    },
    {
      option: "c",
      steps: [
        {
          mark: "r53",
          tone: "warn",
          badge: "Alias?",
          caption: {
            vi: "Alias record là phần mở rộng riêng của Route 53, dùng để trỏ tới tài nguyên AWS như CloudFront hay S3, và có thể đặt ở zone apex. Ở đây nhóm đã sửa một simple record.",
            en: "Alias records are a Route 53-specific extension that route to AWS resources such as CloudFront or S3, and can sit at the zone apex. Here the team updated a simple record.",
          },
        },
        cached,
        toOld,
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Record đã trỏ đúng; người dùng vẫn nhận câu trả lời cũ từ cache cho tới khi TTL hết hạn.",
          en: "The record already points correctly; users get the old cached answer until the TTL expires.",
        },
      },
    },
    {
      option: "d",
      steps: [
        {
          mark: "r53",
          tone: "warn",
          badge: "CNAME?",
          caption: {
            vi: "CNAME record chuyển hướng truy vấn DNS tới một DNS record khác. Ở đây nhóm đã sửa một simple record.",
            en: "A CNAME record redirects DNS queries to another DNS record. Here the team updated a simple record.",
          },
        },
        cached,
        toOld,
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Record đã trỏ đúng; người dùng vẫn nhận câu trả lời cũ từ cache cho tới khi TTL hết hạn.",
          en: "The record already points correctly; users get the old cached answer until the TTL expires.",
        },
      },
    },
  ],
};

export default spec;
