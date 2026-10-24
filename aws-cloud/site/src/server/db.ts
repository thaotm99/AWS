// Postgres access for the server routes. One small pool per function instance (Fluid compute reuses
// instances), created on first query so building the site never needs a database.
import pg from "pg";
import { config } from "./config";

let pool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (pool) return pool;
  const connectionString = config.databaseUrl();
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  pool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, ssl: local ? undefined : { rejectUnauthorized: true } });
  return pool;
}

export type Queryable = Pick<pg.PoolClient, "query">;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

export async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(text, values))[0];
}

/** Runs `fn` in one transaction; rolls back if it throws. */
export async function transaction<T>(fn: (db: Queryable) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/** For scripts and tests: close the pool so the process can exit. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
