// Three-way merge of one learner document, used when another device saved it first (409): keep what
// this page changed since it last saw the server's copy, take everything else from the server.

type Json = unknown;

const isObject = (v: Json): v is Record<string, Json> => v !== null && typeof v === "object" && !Array.isArray(v);
const same = (a: Json, b: Json) => JSON.stringify(a) === JSON.stringify(b);
const idOf = (v: Json): string | undefined => (isObject(v) && typeof v.id === "string" ? v.id : undefined);

/** Arrays of strings (lesson ids, terms) merge as sets; arrays of { id } objects (notes) merge by id. */
function mergeArrays(base: Json[], local: Json[], remote: Json[]): Json[] | undefined {
  if ([base, local, remote].every((a) => a.every((x) => typeof x === "string"))) {
    const b = new Set(base as string[]);
    const l = new Set(local as string[]);
    const added = (local as string[]).filter((x) => !b.has(x));
    const removed = new Set((base as string[]).filter((x) => !l.has(x)));
    const out = (remote as string[]).filter((x) => !removed.has(x));
    for (const x of added) if (!out.includes(x)) out.push(x);
    return out;
  }
  if ([base, local, remote].every((a) => a.every((x) => idOf(x) !== undefined))) {
    const b = new Map(base.map((x) => [idOf(x)!, x]));
    const l = new Map(local.map((x) => [idOf(x)!, x]));
    const out: Json[] = [];
    for (const r of remote) {
      const id = idOf(r)!;
      if (b.has(id) && !l.has(id)) continue; // deleted here
      const mine = l.get(id);
      out.push(mine !== undefined && !same(mine, b.get(id)) ? mine : r);
    }
    for (const [id, x] of l) if (!b.has(id) && !remote.some((r) => idOf(r) === id)) out.push(x); // added here
    return out;
  }
  return undefined;
}

/**
 * `base`: the server's copy this page started from; `local`: this page's value; `remote`: the copy
 * another device saved. Objects merge key by key, recursively; anything that cannot be merged keeps
 * this page's value.
 */
export function merge3(base: Json, local: Json, remote: Json): Json {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(local, remote)) return local;
  if (isObject(local) && isObject(remote)) {
    const b = isObject(base) ? base : {};
    const out: Record<string, Json> = {};
    for (const k of new Set([...Object.keys(remote), ...Object.keys(local), ...Object.keys(b)])) {
      const inL = k in local;
      const inR = k in remote;
      const inB = k in b;
      if (!inL && inB) continue; // removed here
      if (!inR && inB && same(local[k], b[k])) continue; // removed there, untouched here
      if (!inR) out[k] = local[k];
      else if (!inL) out[k] = remote[k];
      else out[k] = merge3(inB ? b[k] : undefined, local[k], remote[k]);
    }
    return out;
  }
  if (Array.isArray(local) && Array.isArray(remote)) return mergeArrays(Array.isArray(base) ? base : [], local, remote) ?? local;
  return local;
}
