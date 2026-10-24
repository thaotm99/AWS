// Run by every Vercel build after `npm run build` (vercel.json buildCommand): applies the migrations
// and imports the practice tests into the database of that deployment (production, or the Neon branch
// of a preview). Skipped when no database is configured, so a build without accounts still works.
// Uses the direct (unpooled) connection when Neon provides one.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("db:deploy: no DATABASE_URL, skipped");
  process.exit(0);
}
const env = { ...process.env, DATABASE_URL: url };
for (const [cmd, args] of [["node", ["scripts/db-migrate.mjs"]], ["npx", ["tsx", "scripts/import-questions.ts"]]]) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
