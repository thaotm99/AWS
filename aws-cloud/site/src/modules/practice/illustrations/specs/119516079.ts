// Practice test 2, question 13: an Aurora Replica behind the reader endpoint takes the reads off the writer.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516079,
  cols: 4,
  rows: 2.6,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, kind: "actor", at: [0, 0.8] },
    { id: "writer", label: { vi: "Primary instance", en: "Primary instance" }, sub: "writer · read/write", at: [1.5, 0.1] },
    { id: "rEp", label: "Reader endpoint", at: [1.5, 1.5] },
    { id: "newdb", label: { vi: "Aurora DB riêng", en: "Separate Aurora DB" }, sub: { vi: "gắn làm replica?", en: "linked as replica?" }, kind: "ghost", at: [1.5, 1.5] },
    { id: "standby", label: "Multi-AZ standby", sub: { vi: "Aurora không có", en: "not in Aurora" }, kind: "ghost", at: [1.5, 1.5] },
    { id: "cache", label: "Read-through cache", sub: { vi: "không có sẵn", en: "not built in" }, kind: "ghost", at: [1.5, 1.5] },
    { id: "rep", label: "Aurora Replica", sub: "read-only", at: [3, 1.5] },
    { id: "vol", label: "Cluster volume", sub: { vi: "trải nhiều AZ", en: "spans AZs" }, kind: "data", at: [3, 0.1] },
  ],
  links: [["writer", "vol"]],
  scenarios: [
    {
      option: "b",
      hide: ["newdb", "standby", "cache"],
      steps: [
        {
          flow: ["app", "writer", "vol"],
          badge: { vi: "ghi", en: "writes" },
          caption: {
            vi: "Primary instance hỗ trợ đọc và ghi, và thực hiện mọi thay đổi dữ liệu trên cluster volume.",
            en: "The primary instance supports reads and writes and performs all data modifications to the cluster volume.",
          },
        },
        {
          flow: ["app", "rEp", "rep"],
          times: 3,
          badge: { vi: "đọc", en: "reads" },
          caption: {
            vi: "Ứng dụng được sửa để gửi truy vấn chỉ đọc tới reader endpoint; endpoint này cân bằng kết nối giữa các Aurora Replica.",
            en: "The application is modified to send read-only queries to the reader endpoint, which load-balances connections across the Aurora Replicas.",
          },
        },
        {
          flow: ["rep", "vol"],
          caption: {
            vi: "Aurora Replica dùng chung storage volume với primary và chỉ phục vụ đọc, nên tải đọc được tách khỏi primary instance.",
            en: "Aurora Replicas share the primary's storage volume and only serve reads, so the read workload is offloaded from the primary instance.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Đọc qua reader endpoint, ghi qua primary.", en: "Reads via the reader endpoint, writes via the primary." } },
    },
    {
      option: "a",
      hide: ["rEp", "standby", "cache", "rep"],
      steps: [
        { flow: ["app", "writer"], caption: { vi: "Ghi vẫn đi tới primary instance.", en: "Writes still go to the primary instance." } },
        {
          stop: ["app", "newdb"],
          caption: {
            vi: "Không thể tạo một Aurora database khác rồi liên kết nó làm read replica của database chính.",
            en: "You cannot provision another Aurora database and then link it as a read replica of the primary database.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Aurora không hoạt động theo cách đó.", en: "Aurora does not work that way." } },
    },
    {
      option: "c",
      hide: ["rEp", "newdb", "cache", "rep"],
      steps: [
        { flow: ["app", "writer"], caption: { vi: "Ghi vẫn đi tới primary instance.", en: "Writes still go to the primary instance." } },
        {
          stop: ["app", "standby"],
          caption: {
            vi: "Aurora không có thực thể nào gọi là standby instance; standby được tạo khi thiết lập Multi-AZ cho Amazon RDS, không phải Aurora.",
            en: "Aurora has no entity called a standby instance; a standby is created when setting up Multi-AZ for Amazon RDS, not for Aurora.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có standby để đọc.", en: "There is no standby to read from." } },
    },
    {
      option: "d",
      hide: ["rEp", "newdb", "standby", "rep"],
      steps: [
        { flow: ["app", "writer"], caption: { vi: "Ghi vẫn đi tới primary instance.", en: "Writes still go to the primary instance." } },
        {
          stop: ["app", "cache"],
          caption: {
            vi: "Aurora không hỗ trợ sẵn read-through caching; muốn có cache phải tích hợp dịch vụ như Amazon ElastiCache và sửa code ứng dụng.",
            en: "Aurora has no built-in read-through caching; caching would need something like Amazon ElastiCache plus application code changes.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có tính năng này.", en: "No such feature." } },
    },
  ],
};

export default spec;
