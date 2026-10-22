// Practice test 2, question 25: an engine upgrade on RDS Multi-AZ upgrades primary and standby together, with downtime.
// Captions follow the question's explanation.
import type { Bilingual, FlowStepSpec, IllustrationSpec, ScenarioSpec, StopStepSpec } from "../types";

const together: Bilingual = {
  vi: "Trên thực tế, kể cả với Multi-AZ, primary và standby được nâng cấp database engine cùng lúc.",
  en: "In fact, even with Multi-AZ, the primary and standby DB instances are upgraded at the same time.",
};
const fact: Bilingual = {
  vi: "Nâng cấp ở mức database engine cần downtime: ứng dụng không dùng được cơ sở dữ liệu cho tới khi nâng cấp xong.",
  en: "Engine-level upgrades require downtime: the application cannot use the database until the upgrade is complete.",
};
const replication: FlowStepSpec = {
  flow: ["prim", "stby"],
  badge: "sync",
  caption: {
    vi: "Multi-AZ nhân bản dữ liệu từ primary sang standby ở AZ khác.",
    en: "Multi-AZ replicates data from the primary to a standby in another AZ.",
  },
};
const outage: StopStepSpec = { stop: ["app", "prim"], badge: "downtime", caption: fact };

const wrong = (option: string, claim: Bilingual, mark: string[]): ScenarioSpec => ({
  option,
  steps: [
    replication,
    { mark, tone: "warn", badge: { vi: "theo phương án", en: "as claimed" }, caption: claim },
    { mark: ["prim", "stby"], tone: "warn", badge: { vi: "nâng cấp", en: "upgrading" }, caption: together },
    outage,
  ],
  verdict: { works: false, caption: { vi: "Nâng cấp engine luôn gây downtime.", en: "Engine upgrades always cause downtime." } },
});

const spec: IllustrationSpec = {
  questionId: 119516109,
  cols: 3,
  rows: 2.4,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, kind: "actor", at: [0, 0.7] },
    { id: "prim", label: "Primary", sub: "AZ a", kind: "data", at: [1.6, 0] },
    { id: "stby", label: "Standby", sub: "AZ b", kind: "data", at: [1.6, 1.4] },
  ],
  scenarios: [
    {
      option: "d",
      steps: [
        { flow: ["app", "prim"], caption: { vi: "Ứng dụng kết nối tới primary DB instance.", en: "The application connects to the primary DB instance." } },
        replication,
        {
          mark: ["prim", "stby"],
          tone: "warn",
          badge: { vi: "cùng lúc", en: "together" },
          caption: {
            vi: "Trong maintenance window, nâng cấp database engine được áp dụng cho cả primary và standby cùng lúc.",
            en: "In the maintenance window, the engine-level upgrade is applied to both the primary and the standby at the same time.",
          },
        },
        {
          ...outage,
          caption: {
            vi: "Vì không còn instance nào sẵn sàng, cơ sở dữ liệu bị downtime cho tới khi nâng cấp xong; thời gian downtime tuỳ kích thước DB instance.",
            en: "With no instance available, the database is down until the upgrade completes; the downtime varies with the size of the DB instance.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Nâng cấp đồng thời, có downtime.", en: "Upgraded together, with downtime." } },
    },
    wrong(
      "a",
      {
        vi: "Phương án đúng ở chỗ primary và standby được nâng cấp cùng lúc, nhưng cho rằng không có downtime.",
        en: "The option is right that the primary and standby are upgraded together, but claims there is no downtime.",
      },
      ["prim", "stby"],
    ),
    wrong(
      "b",
      {
        vi: "Phương án cho rằng standby được nâng cấp trước rồi mới tới primary, không gây downtime.",
        en: "The option claims the standby is upgraded first, then the primary, with no downtime.",
      },
      ["stby"],
    ),
    wrong(
      "c",
      {
        vi: "Phương án cho rằng primary được nâng cấp trước rồi mới tới standby, không gây downtime.",
        en: "The option claims the primary is upgraded first, then the standby, with no downtime.",
      },
      ["prim"],
    ),
  ],
};

export default spec;
