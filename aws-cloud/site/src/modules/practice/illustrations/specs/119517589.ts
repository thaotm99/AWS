// Practice test 5, question 25: RDS Multi-AZ failover flips the DB instance's CNAME to the standby.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const steady: StepSpec = {
  flow: ["app", "dns", "primary"],
  caption: {
    vi: "Ứng dụng kết nối tới endpoint của DB instance; tên DNS (CNAME) này trỏ tới primary.",
    en: "The application connects to the DB instance endpoint; its DNS name (CNAME) points to the primary.",
  },
};
const sync: StepSpec = {
  flow: ["primary", "standby"],
  badge: "sync",
  caption: {
    vi: "Trong Multi-AZ deployment, RDS tự động tạo và duy trì một standby replica ở Availability Zone khác, được sao chép đồng bộ từ primary.",
    en: "In a Multi-AZ deployment, RDS automatically provisions and maintains a synchronous standby replica in a different Availability Zone.",
  },
};
const down: StepSpec = {
  mark: "primary",
  tone: "bad",
  badge: { vi: "sự cố", en: "down" },
  caption: {
    vi: "Primary instance gặp sự cố.",
    en: "The primary instance goes down.",
  },
};
const flip: StepSpec = {
  flow: ["app", "dns", "standby"],
  badge: "CNAME",
  caption: {
    vi: "RDS tự xử lý failover mà không cần quản trị viên can thiệp: nó chuyển CNAME của DB instance sang standby, và standby được nâng lên làm primary mới. URL kết nối giữ nguyên.",
    en: "RDS handles failover without administrative intervention: it flips the DB instance's CNAME to the standby, which is promoted to the new primary. The URL stays the same.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119517589,
  cols: 4,
  rows: 2.8,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, kind: "actor", at: [0, 1.1] },
    { id: "dns", label: "DB endpoint", sub: { vi: "CNAME · URL cố định", en: "CNAME · same URL" }, at: [1.3, 1.1] },
    { id: "admin", label: { vi: "Quản trị viên", en: "Administrator" }, sub: { vi: "email?", en: "email?" }, kind: "ghost", at: [1.3, 0.05] },
    { id: "newUrl", label: { vi: "URL mới?", en: "New URL?" }, kind: "ghost", at: [1.3, 2.15] },
    { id: "primary", label: "RDS primary", kind: "data", at: [2.9, 0.3] },
    { id: "standby", label: "RDS standby", kind: "data", at: [2.9, 1.9] },
  ],
  zones: [
    { id: "aza", label: "AZ a", tone: "az", from: [2.9, 0.3], to: [2.9, 0.3] },
    { id: "azb", label: "AZ b", tone: "az", from: [2.9, 1.9], to: [2.9, 1.9] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["admin", "newUrl"],
      steps: [
        steady,
        sync,
        down,
        flip,
        {
          mark: "standby",
          tone: "ok",
          badge: "primary",
          caption: {
            vi: "Ứng dụng tiếp tục hoạt động với cùng endpoint, giờ trỏ tới primary mới.",
            en: "The application carries on with the same endpoint, which now points to the new primary.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "CNAME được cập nhật tự động để trỏ tới standby.",
          en: "The CNAME is updated automatically to point to the standby.",
        },
      },
    },
    {
      option: "a",
      hide: ["newUrl"],
      steps: [
        steady,
        down,
        {
          mark: "admin",
          tone: "bad",
          badge: { vi: "không cần", en: "not needed" },
          caption: {
            vi: "Không có email yêu cầu quản trị viên can thiệp thủ công; failover do RDS tự động xử lý.",
            en: "No email asks an administrator to step in; RDS handles the failover automatically.",
          },
        },
        flip,
      ],
      verdict: {
        works: false,
        caption: { vi: "Failover là tự động.", en: "Failover is automatic." },
      },
    },
    {
      option: "c",
      hide: ["admin"],
      steps: [
        steady,
        down,
        {
          mark: "newUrl",
          tone: "bad",
          badge: { vi: "không đổi", en: "unchanged" },
          caption: {
            vi: "URL truy cập cơ sở dữ liệu không thay đổi; chỉ bản ghi CNAME phía sau được cập nhật.",
            en: "The database URL does not change; only the CNAME record behind it is updated.",
          },
        },
        flip,
      ],
      verdict: {
        works: false,
        caption: { vi: "URL giữ nguyên.", en: "The URL stays the same." },
      },
    },
    {
      option: "d",
      hide: ["admin", "newUrl"],
      steps: [
        steady,
        down,
        {
          ...flip,
          caption: {
            vi: "Ứng dụng không phải chờ primary tự phục hồi: RDS chuyển CNAME sang standby và standby trở thành primary mới.",
            en: "The application does not wait for the primary to recover: RDS flips the CNAME to the standby, which becomes the new primary.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Standby tiếp quản ngay khi failover.", en: "The standby takes over on failover." },
      },
    },
  ],
};

export default spec;
