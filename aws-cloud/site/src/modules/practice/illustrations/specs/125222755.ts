// Practice test 1, question 47: Babelfish for T-SQL compatibility, SCT + DMS for schema and data migration.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const GHOSTS = ["ep", "gdb", "glue"];

const noCompat = (option: string, ghost: string, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: ["bf", "sql", "scdms", ...GHOSTS.filter((g) => g !== ghost)],
  steps: [{ stop: ["app", ghost], badge: "T-SQL", caption }],
  verdict: { works: false, caption: { vi: "Không giúp tương thích T-SQL.", en: "No T-SQL compatibility." } },
});

const spec: IllustrationSpec = {
  questionId: 125222755,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Applications" }, sub: "T-SQL", kind: "actor", at: [0, 0] },
    { id: "bf", label: "Babelfish", sub: { vi: "hiểu T-SQL", en: "understands T-SQL" }, at: [1.45, 0] },
    { id: "ep", label: "Custom endpoint", sub: { vi: "giả lập SQL Server?", en: "SQL Server emulation?" }, kind: "ghost", at: [1.45, 0] },
    { id: "gdb", label: "Aurora Global DB", sub: { vi: "nhân bản liên Region", en: "cross-Region replicas" }, kind: "ghost", at: [1.45, 0] },
    { id: "glue", label: "AWS Glue", sub: { vi: "chuyển T-SQL?", en: "convert T-SQL?" }, kind: "ghost", at: [1.45, 0] },
    { id: "sql", label: "SQL Server", sub: { vi: "nguồn", en: "source" }, kind: "data", at: [0, 1.4] },
    { id: "scdms", label: "AWS SCT + DMS", sub: { vi: "schema + dữ liệu", en: "schema + data" }, at: [1.45, 1.4] },
    { id: "aur", label: "Aurora PostgreSQL", kind: "data", at: [2.9, 0.7] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["sql", "scdms", ...GHOSTS],
      steps: [
        {
          flow: ["app", "bf", "aur"],
          times: 2,
          badge: "T-SQL",
          caption: {
            vi: "Babelfish giúp Aurora PostgreSQL hiểu T-SQL và giao thức kết nối của SQL Server, nên ứng dụng gửi truy vấn kiểu SQL Server mà gần như không phải sửa code.",
            en: "Babelfish lets Aurora PostgreSQL understand T-SQL and the SQL Server wire protocol, so applications send SQL Server-style queries with minimal code changes.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Giữ T-SQL trên Aurora PostgreSQL.", en: "T-SQL kept on Aurora PostgreSQL." } },
    },
    {
      option: "d",
      hide: ["app", "bf", ...GHOSTS],
      steps: [
        {
          flow: ["sql", "scdms", "aur"],
          badge: { vi: "schema + dữ liệu", en: "schema + data" },
          caption: {
            vi: "AWS SCT chuyển schema SQL Server sang cú pháp tương thích PostgreSQL, AWS DMS di chuyển dữ liệu thực với downtime tối thiểu.",
            en: "AWS SCT converts the SQL Server schema to PostgreSQL-compatible syntax, and AWS DMS moves the actual data with minimal downtime.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Công cụ chuyên cho di chuyển database.", en: "Purpose-built migration tools." } },
    },
    noCompat("a", "ep", {
      vi: "Aurora endpoint không giả lập giao thức SQL Server; không có tính năng nào làm Aurora hành xử như SQL Server nếu không bật Babelfish.",
      en: "Aurora endpoints do not emulate the SQL Server protocol; nothing makes Aurora behave like SQL Server without Babelfish.",
    }),
    noCompat("b", "gdb", {
      vi: "Aurora Global Database phục vụ khôi phục sau thảm hoạ liên Region và mở rộng đọc, không giúp tương thích SQL Server hay giảm sửa code.",
      en: "Aurora Global Database is for cross-Region disaster recovery and read scaling; it does not help SQL Server compatibility or code changes.",
    }),
    noCompat("e", "glue", {
      vi: "AWS Glue dùng cho ETL và biến đổi dữ liệu, không chuyển được truy vấn T-SQL của ứng dụng sang cú pháp PostgreSQL.",
      en: "AWS Glue is for ETL and data transformation; it cannot translate application T-SQL into PostgreSQL syntax.",
    }),
  ],
};

export default spec;
