// /api/data: the learner's documents (progress, flashcards, notes, goals, Pomodoro, labs…), one JSON
// value per name in user_docs. Every write bumps the version; a write that names the version it was
// based on is refused with 409 when another device wrote in between.
import { MAX_DOC_BYTES, isDocName } from "../../core/userdata/docs";
import { one, query } from "../db";
import { HttpError, json, noContent, readJson } from "../http";
import type { Route } from "../router";
import { requireSession } from "../auth/session";

interface DocRow {
  name: string;
  value: unknown;
  version: number;
  updated_at: Date;
}

function docName(name: string): string {
  if (!isDocName(name)) throw new HttpError(404, "unknown_doc", "Unknown document");
  return name;
}

export const dataRoutes: Route[] = [
  {
    method: "GET",
    pattern: "/api/data",
    handler: async ({ request }) => {
      const { user } = await requireSession(request);
      const rows = await query<DocRow>(`select name, value, version, updated_at from user_docs where user_id = $1 order by name`, [user.id]);
      const docs: Record<string, { value: unknown; version: number; updatedAt: Date }> = {};
      for (const r of rows) docs[r.name] = { value: r.value, version: r.version, updatedAt: r.updated_at };
      return json({ docs });
    },
  },
  {
    // Body { value, version? }. version: the version the value was based on (0 = the document did not
    // exist yet); left out, the write replaces whatever is stored.
    method: "PUT",
    pattern: "/api/data/:name",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      const name = docName(params.name);
      const body = await readJson<{ value?: unknown; version?: unknown }>(request, MAX_DOC_BYTES + 1024);
      if (!body || typeof body !== "object" || !("value" in body) || body.value === undefined) throw new HttpError(400, "bad_value", "value is required");
      const text = JSON.stringify(body.value);
      if (Buffer.byteLength(text, "utf8") > MAX_DOC_BYTES) throw new HttpError(413, "too_large", `A document holds at most ${MAX_DOC_BYTES / 1024} KB`);
      const expected = body.version;
      if (expected !== undefined && expected !== null && !(Number.isInteger(expected) && (expected as number) >= 0)) {
        throw new HttpError(400, "bad_version", "version must be a whole number");
      }
      const check = typeof expected === "number";
      // Versions start at 1, so "version 0" only matches a document that does not exist yet.
      const row = await one<{ version: number; updated_at: Date }>(
        `insert into user_docs (user_id, name, value) values ($1, $2, $3::jsonb)
         on conflict (user_id, name) do update set value = excluded.value, version = user_docs.version + 1, updated_at = now()
           where not $4::boolean or user_docs.version = $5::int
         returning version, updated_at`,
        [user.id, name, text, check, check ? expected : 0],
      );
      if (row) return json({ version: row.version, updatedAt: row.updated_at });
      const current = await one<DocRow>(`select name, value, version, updated_at from user_docs where user_id = $1 and name = $2`, [user.id, name]);
      return json(
        {
          error: { code: "version_conflict", message: "Another device saved this document first" },
          current: current ? { value: current.value, version: current.version, updatedAt: current.updated_at } : null,
        },
        409,
      );
    },
  },
  {
    method: "DELETE",
    pattern: "/api/data/:name",
    handler: async ({ request, params }) => {
      const { user } = await requireSession(request);
      await query(`delete from user_docs where user_id = $1 and name = $2`, [user.id, docName(params.name)]);
      return noContent();
    },
  },
];
