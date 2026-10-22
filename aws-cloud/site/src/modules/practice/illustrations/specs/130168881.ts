// Practice test 6, question 19: an RDS PostgreSQL Read Replica in the same Region for the analytics workload.
// Captions follow the question's explanation. Additional source:
// - "You can't use a standby replica to serve read traffic" (Multi-AZ DB instance deployment):
//   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168881,
  cols: 4.65,
  rows: 3.05,
  nodes: [
    { id: "shop", label: { vi: "Ứng dụng bán hàng", en: "E-commerce app" }, kind: "actor", at: [0, 0.4] },
    { id: "analytics", label: { vi: "Phân tích", en: "Analytics" }, sub: "workload", kind: "actor", at: [0, 2] },
    { id: "lambda", label: "AWS Lambda", sub: { vi: "chạy phân tích", en: "runs analytics" }, at: [1, 2] },
    { id: "primary", label: "RDS PostgreSQL", sub: { vi: "chính", en: "primary" }, kind: "data", at: [2, 0.4] },
    { id: "replica", label: "Read Replica", kind: "data", at: [2, 2] },
    { id: "standby", label: "Standby", sub: "Multi-AZ", kind: "data", at: [2, 2] },
    { id: "xreplica", label: "Read Replica", sub: { vi: "Region khác", en: "other Region" }, kind: "data", at: [3.6, 2] },
  ],
  zones: [
    { id: "home", label: { vi: "Region chính", en: "Primary Region" }, tone: "region", from: [2, 0.4], to: [2, 2], pad: 20 },
    { id: "other", label: { vi: "Region khác", en: "Other Region" }, tone: "region", from: [3.6, 2], to: [3.6, 2], pad: 20 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["lambda", "standby", "xreplica", "other"],
      steps: [
        {
          flow: ["primary", "replica"],
          badge: "async",
          caption: {
            vi: "RDS tạo Read Replica từ snapshot của DB chính, rồi cập nhật nó bằng cơ chế replication bất đồng bộ của engine.",
            en: "RDS creates the Read Replica from a snapshot of the source DB, then keeps it updated with the engine's native asynchronous replication.",
          },
        },
        {
          flow: [["shop", "primary"], ["analytics", "replica"]],
          times: 2,
          caption: {
            vi: "Workload phân tích đọc từ Read Replica; ứng dụng bán hàng có DB chính cho riêng mình nên không còn bị chậm.",
            en: "The analytics workload reads from the Read Replica; the e-commerce app keeps the primary to itself and no longer slows down.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Replication giữa DB nguồn và Read Replica trong cùng Region không tính phí truyền dữ liệu: rẻ nhất.",
          en: "Replication between the source DB and a Read Replica in the same Region has no data transfer charge: the cheapest fix.",
        },
      },
    },
    {
      option: "b",
      hide: ["replica", "standby", "xreplica", "other"],
      steps: [
        {
          flow: [["shop", "primary"], ["analytics", "lambda", "primary"]],
          times: 2,
          tone: "warn",
          caption: {
            vi: "Chuyển ứng dụng phân tích sang Lambda chỉ đổi nơi chạy mã; truy vấn vẫn chạy trên DB chính.",
            en: "Moving the analytics application to Lambda only changes where the code runs; its queries still hit the primary database.",
          },
        },
        {
          mark: "primary",
          tone: "bad",
          badge: { vi: "chậm", en: "slow" },
          caption: {
            vi: "Ứng dụng bán hàng vẫn bị chậm khi workload phân tích chạy.",
            en: "The e-commerce app still slows down while the analytics workload runs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không tách tải phân tích khỏi DB chính.",
          en: "It does not move the analytics load off the primary.",
        },
      },
    },
    {
      option: "c",
      hide: ["lambda", "replica", "xreplica", "other"],
      steps: [
        {
          flow: ["primary", "standby"],
          badge: "sync",
          caption: {
            vi: "Multi-AZ replicate đồng bộ sang một standby ở AZ khác để tăng tính sẵn sàng và độ bền.",
            en: "Multi-AZ synchronously replicates to a standby in another AZ for availability and durability.",
          },
        },
        {
          stop: ["analytics", "standby"],
          caption: {
            vi: "Standby không phục vụ lưu lượng đọc; nó chỉ trở thành DB chính khi DB chính gặp sự cố.",
            en: "The standby does not serve read traffic; it only becomes the primary when the primary fails.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không thể chạy workload phân tích trên standby.",
          en: "The analytics workload cannot run on the standby.",
        },
      },
    },
    {
      option: "d",
      hide: ["lambda", "replica", "standby"],
      steps: [
        {
          flow: ["primary", "xreplica"],
          tone: "warn",
          badge: "cross-Region",
          caption: {
            vi: "Read Replica ở Region khác cũng tách được tải đọc, nhưng replication liên Region phải trả phí truyền dữ liệu.",
            en: "A Read Replica in another Region also offloads reads, but inter-Region replication incurs data transfer charges.",
          },
        },
        {
          flow: [["shop", "primary"], ["analytics", "xreplica"]],
          times: 2,
          caption: {
            vi: "Ứng dụng bán hàng hết bị chậm, nhưng với chi phí cao hơn phương án cùng Region.",
            en: "The e-commerce app stops slowing down, but at a higher cost than the same-Region option.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Hoạt động nhưng không tối ưu chi phí nhất.",
          en: "It works, but it is not the most cost-optimal.",
        },
      },
    },
  ],
};

export default spec;
