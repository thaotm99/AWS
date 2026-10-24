// Applies db/migrations/*.sql in name order, each once, in its own transaction.
// Usage: DATABASE_URL=postgres://… node scripts/db-migrate.mjs
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });
const dir = new URL("../db/migrations/", import.meta.url);

await client.connect();
try {
  await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await client.query(`select name from schema_migrations`)).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, dir), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(`insert into schema_migrations (name) values ($1)`, [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (e) {
      await client.query("rollback");
      throw new Error(`${file}: ${e.message}`);
    }
  }
  console.log("database is up to date");
} finally {
  await client.end();
}
