// Practice test 1, question 7: an Aurora Global Database for the global games table, regional Aurora for the rest.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const AURORA = ["gUS", "gEU", "lUS", "lEU"];
const DYNAMO = ["dgUS", "dgEU", "dlUS", "dlEU"];

const noSql: Bilingual = {
  vi: "Aurora dùng SQL còn DynamoDB là NoSQL với API hoàn toàn khác, nên phần nào chuyển sang DynamoDB thì ứng dụng phải viết lại — trái với yêu cầu ít sửa ứng dụng nhất.",
  en: "Aurora is SQL and DynamoDB is NoSQL with a completely different API, so whatever moves to DynamoDB must be rewritten in the application — against the minimal-refactoring requirement.",
};

const mixed = (option: string, global: [string, string], local: [string, string], dynamo: string[]): ScenarioSpec => ({
  option,
  hide: [...AURORA, ...DYNAMO].filter((id) => ![...global, ...local].includes(id)),
  steps: [
    {
      flow: [["appUS", global[0]], ["appUS", local[0]], ["appEU", global[1]], ["appEU", local[1]]],
      tone: "warn",
      caption: {
        vi: "Bảng games dùng chung toàn cầu, bảng users và games_played ở lại từng Region.",
        en: "The games table is shared globally; users and games_played stay in each Region.",
      },
    },
    { flow: [global], tone: "warn", caption: { vi: "Bảng games được nhân bản sang Region khác.", en: "The games table is replicated to the other Region." } },
    { mark: dynamo, tone: "bad", badge: { vi: "API khác", en: "different API" }, caption: noSql },
  ],
  verdict: { works: false, caption: { vi: "Phải viết lại phần dùng DynamoDB.", en: "The DynamoDB parts must be rewritten." } },
});

const spec: IllustrationSpec = {
  questionId: 125222745,
  cols: 3.6,
  rows: 3.6,
  nodes: [
    { id: "appUS", label: { vi: "Ứng dụng", en: "Application" }, sub: { vi: "Mỹ", en: "US" }, kind: "actor", at: [0, 0.45] },
    { id: "appEU", label: { vi: "Ứng dụng", en: "Application" }, sub: { vi: "châu Âu", en: "Europe" }, kind: "actor", at: [0, 2.15] },
    { id: "gUS", label: "Aurora Global DB", sub: "games · primary", kind: "data", at: [2.6, 0] },
    { id: "gEU", label: "Aurora Global DB", sub: "games · secondary", kind: "data", at: [2.6, 2.6] },
    { id: "dgUS", label: "DynamoDB", sub: "global table · games", kind: "data", at: [2.6, 0] },
    { id: "dgEU", label: "DynamoDB", sub: "global table · games", kind: "data", at: [2.6, 2.6] },
    { id: "lUS", label: "Aurora", sub: "users · games_played", kind: "data", at: [1.3, 0.9] },
    { id: "lEU", label: "Aurora", sub: "users · games_played", kind: "data", at: [1.3, 1.7] },
    { id: "dlUS", label: "DynamoDB", sub: "users · games_played", kind: "data", at: [1.3, 0.9] },
    { id: "dlEU", label: "DynamoDB", sub: "users · games_played", kind: "data", at: [1.3, 1.7] },
  ],
  scenarios: [
    {
      option: "a",
      hide: DYNAMO,
      steps: [
        {
          flow: [["appUS", "gUS"], ["appUS", "lUS"]],
          caption: {
            vi: "Hai Aurora cluster: một cho bảng games dùng chung toàn cầu, một cho bảng users và games_played chỉ dùng trong Region.",
            en: "Two Aurora clusters: one for the global games table and one for the regional users and games_played tables.",
          },
        },
        {
          flow: ["gUS", "gEU"],
          badge: { vi: "nhân bản", en: "replicated" },
          caption: {
            vi: "Aurora Global Database trải một database trên nhiều Region, nhân bản không ảnh hưởng hiệu năng và cho đọc cục bộ độ trễ thấp ở mỗi Region.",
            en: "Aurora Global Database spans multiple Regions, replicating with no performance impact and giving fast local reads in each Region.",
          },
        },
        {
          flow: [["appEU", "gEU"], ["appEU", "lEU"]],
          badge: { vi: "trong Region", en: "regional" },
          caption: {
            vi: "Ở châu Âu, ứng dụng đọc bảng games cục bộ và dùng Aurora riêng của Region cho users, games_played. Vẫn là SQL, nên ứng dụng gần như giữ nguyên.",
            en: "In Europe the application reads games locally and uses its own regional Aurora for users and games_played. Still SQL, so the application barely changes.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Toàn bộ là Aurora, ít sửa ứng dụng nhất.", en: "All Aurora, minimal refactoring." } },
    },
    mixed("b", ["gUS", "gEU"], ["dlUS", "dlEU"], ["dlUS", "dlEU"]),
    mixed("c", ["dgUS", "dgEU"], ["lUS", "lEU"], ["dgUS", "dgEU"]),
    mixed("d", ["dgUS", "dgEU"], ["dlUS", "dlEU"], DYNAMO),
  ],
};

export default spec;
