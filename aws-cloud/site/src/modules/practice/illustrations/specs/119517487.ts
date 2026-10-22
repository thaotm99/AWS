// Practice test 5, question 37: session data in ElastiCache survives an unhealthy server; sticky sessions do not.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const users = { vi: "Người dùng CRM", en: "CRM users" };
const fails: StepSpec = {
  mark: "ec2a",
  tone: "bad",
  badge: "unhealthy",
  caption: {
    vi: "Server đang phục vụ người dùng trở nên không khoẻ mạnh.",
    en: "The server handling the user becomes unhealthy.",
  },
};
const notCache = (store: string, caption: Bilingual): StepSpec[] => [
  {
    flow: [["user", "alb", "ec2a", store]],
    tone: "warn",
    caption: {
      vi: "Session được lưu vào cơ sở dữ liệu ngoài các server.",
      en: "Sessions are stored in a database outside the servers.",
    },
  },
  { mark: store, tone: "bad", badge: { vi: "không phải cache", en: "not a cache" }, caption },
];

const spec: IllustrationSpec = {
  questionId: 119517487,
  cols: 4.4,
  rows: 2.6,
  nodes: [
    { id: "user", label: users, kind: "actor", at: [0, 1] },
    { id: "alb", label: "Application LB", at: [1.2, 1] },
    { id: "ec2a", label: "EC2", sub: "server A", at: [2.4, 0.2] },
    { id: "ec2b", label: "EC2", sub: "server B", at: [2.4, 1.8] },
    { id: "cache", label: "ElastiCache", sub: "session store", kind: "data", at: [3.6, 1] },
    { id: "rds", label: "Amazon RDS", kind: "data", at: [3.6, 1] },
    { id: "ddb", label: "DynamoDB", kind: "data", at: [3.6, 1] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["rds", "ddb"],
      steps: [
        {
          flow: ["user", "alb", "ec2a", "cache"],
          badge: "session",
          caption: {
            vi: "Server ghi session vào Amazon ElastiCache, một kho dữ liệu in-memory phân tán dùng chung cho mọi server.",
            en: "The server writes the session to Amazon ElastiCache, a distributed in-memory store shared by every server.",
          },
        },
        fails,
        {
          flow: ["user", "alb", "ec2b", "cache"],
          caption: {
            vi: "Request tiếp theo tới server khác; server này đọc session từ ElastiCache, nên người dùng không phải đăng nhập lại.",
            en: "The next request lands on another server, which reads the session from ElastiCache, so the user does not sign in again.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Session không phụ thuộc vào một server cụ thể.",
          en: "Sessions no longer depend on one server.",
        },
      },
    },
    {
      option: "c",
      hide: ["cache", "rds", "ddb"],
      steps: [
        {
          flow: ["user", "alb", "ec2a"],
          times: 2,
          badge: "sticky",
          caption: {
            vi: "Sticky session khiến mỗi người dùng chỉ tương tác với một server duy nhất, nơi giữ dữ liệu session.",
            en: "Sticky sessions keep each user on one server only, which holds the session data.",
          },
        },
        fails,
        {
          flow: ["user", "alb", "ec2b"],
          tone: "bad",
          badge: { vi: "đăng nhập lại", en: "sign in again" },
          caption: {
            vi: "Khi server đó không khoẻ mạnh, toàn bộ dữ liệu session trên nó cũng mất; người dùng bị yêu cầu đăng nhập lại.",
            en: "When that server is unhealthy, all its session data is gone too; the user is asked to sign in again.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Session mất cùng server.", en: "Sessions die with the server." },
      },
    },
    {
      option: "a",
      hide: ["cache", "ddb"],
      steps: notCache("rds", {
        vi: "Amazon RDS là cơ sở dữ liệu quan hệ; nó không thể dùng làm cache in-memory phân tán cho quản lý session.",
        en: "Amazon RDS is a relational database; it cannot serve as a distributed in-memory cache for session management.",
      }),
      verdict: {
        works: false,
        caption: { vi: "RDS không phải cache in-memory.", en: "RDS is not an in-memory cache." },
      },
    },
    {
      option: "d",
      hide: ["cache", "rds"],
      steps: notCache("ddb", {
        vi: "DynamoDB là cơ sở dữ liệu NoSQL key-value và document; nó không phù hợp với yêu cầu quản lý session bằng cache in-memory phân tán.",
        en: "DynamoDB is a NoSQL key-value and document database; it is not the fit for distributed in-memory cache-based session management.",
      }),
      verdict: {
        works: false,
        caption: { vi: "DynamoDB không phải cache in-memory.", en: "DynamoDB is not an in-memory cache." },
      },
    },
  ],
};

export default spec;
