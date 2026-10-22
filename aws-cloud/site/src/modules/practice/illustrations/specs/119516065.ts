// Practice test 2, question 28: security group rules for a web tier (443) in front of MSSQL (1433).
// Captions follow the question's explanation. (Its note on the first incorrect option says "port 443" where it
// means 1433; the captions use 1433, as the rest of the explanation does.)
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516065,
  cols: 4.2,
  rows: 2.4,
  nodes: [
    { id: "inet", label: "Internet", sub: { vi: "người dùng", en: "clients" }, kind: "actor", at: [0, 0.4] },
    { id: "web", label: "Web servers", sub: "SG A · :443", at: [1.6, 0.4] },
    { id: "db", label: "MSSQL DB", sub: "SG B · :1433", kind: "data", at: [3.2, 0.4] },
    { id: "other", label: { vi: "Nguồn khác", en: "Any other source" }, sub: { vi: "không thuộc SG A", en: "not in SG A" }, kind: "actor", at: [3.2, 1.6] },
  ],
  zones: [
    { id: "pub", label: "public subnets", tone: "vpc", from: [1.6, 0.4], to: [1.6, 0.4], pad: 22 },
    { id: "priv", label: "private subnets", tone: "vpc", from: [3.2, 0.4], to: [3.2, 0.4], pad: 22 },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["other"],
      steps: [
        {
          flow: ["inet", "web"],
          badge: ":443",
          caption: {
            vi: "SG A có inbound rule cho phép mọi nguồn vào cổng 443, nên web server nhận lưu lượng HTTPS từ mọi nơi.",
            en: "SG A has an inbound rule allowing all sources on port 443, so the web servers accept HTTPS traffic from anywhere.",
          },
        },
        {
          flow: ["web", "db"],
          badge: ":1433",
          caption: {
            vi: "Outbound rule của SG A chỉ cho phép đi tới SG B trên cổng 1433, cổng mà MSSQL đang lắng nghe.",
            en: "SG A's outbound rule only allows traffic to SG B on port 1433, the port MSSQL listens on.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Web nhận 443, chỉ ra ngoài tới DB trên 1433.", en: "Web takes 443 and only reaches the DB on 1433." } },
    },
    {
      option: "e",
      steps: [
        {
          flow: ["web", "db"],
          badge: { vi: "từ SG A", en: "from SG A" },
          caption: {
            vi: "SG B có inbound rule chỉ cho phép lưu lượng từ SG A trên cổng 1433.",
            en: "SG B has an inbound rule that only allows traffic from SG A on port 1433.",
          },
        },
        {
          stop: ["other", "db"],
          caption: {
            vi: "Mọi nguồn khác đều không tới được MSSQL server; security group chỉ có rule cho phép, những gì không được cho phép đều bị chặn.",
            en: "No other source reaches the MSSQL servers; security group rules only allow, and anything not allowed is blocked.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "DB chỉ nhận kết nối từ web tier.", en: "The DB only accepts the web tier." } },
    },
    {
      option: "a",
      hide: ["other"],
      steps: [
        { flow: ["inet", "web"], badge: ":443", caption: { vi: "Inbound 443 từ mọi nguồn vào SG A là đúng.", en: "Inbound 443 from all sources on SG A is right." } },
        {
          stop: ["web", "db"],
          badge: ":443",
          caption: {
            vi: "Nhưng outbound rule tới SG B lại mở cổng 443, trong khi MSSQL lắng nghe trên 1433; outbound rule phải là cổng 1433.",
            en: "But the outbound rule to SG B opens port 443, while MSSQL listens on 1433; the outbound rule should be on port 1433.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai cổng tới database.", en: "Wrong port to the database." } },
    },
    {
      option: "b",
      steps: [
        { flow: ["web", "db"], badge: ":1433", caption: { vi: "Web server kết nối được tới database trên 1433.", en: "The web servers can reach the database on 1433." } },
        {
          flow: ["other", "db"],
          tone: "bad",
          badge: { vi: "mọi nguồn", en: "any source" },
          caption: {
            vi: "Nhưng mọi nguồn khác cũng vào được cổng 1433. Inbound rule phải chỉ cho phép SG A; cho phép mọi nguồn là làm suy yếu bảo mật.",
            en: "But every other source can reach port 1433 too. The inbound rule should only allow SG A; allowing all sources compromises security.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Database mở cho mọi nguồn.", en: "The database is open to everyone." } },
    },
    {
      option: "c",
      hide: ["other"],
      steps: [
        {
          stop: ["web", "db"],
          badge: ":443",
          caption: {
            vi: "Inbound rule của SG B chỉ cho phép SG A, nhưng trên cổng 443; MSSQL lắng nghe trên 1433, nên kết nối tới database bị chặn.",
            en: "SG B's inbound rule allows only SG A, but on port 443; MSSQL listens on 1433, so connections to the database are blocked.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai cổng.", en: "Wrong port." } },
    },
  ],
};

export default spec;
