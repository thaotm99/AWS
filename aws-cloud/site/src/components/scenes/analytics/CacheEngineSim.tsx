import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";
import "./cache-engine-sim.css";

// Redis OSS (or Valkey) and Memcached side by side on a node with four vCPUs.
// "Gửi 8 lệnh" sends the same eight commands to both: Memcached spreads them over
// all cores (multi-threaded), Redis runs them one after another on its main thread.
// Below, MFTECH ticks the needs it has and sees which engine covers them all.

type Engine = "redis" | "mem";

const NEEDS: { id: string; name: Bi; redis: boolean; mem: boolean }[] = [
  { id: "multi", name: { vi: "Tận dụng nhiều core trên một node", en: "Use many cores on one node" }, redis: false, mem: true },
  { id: "simple", name: { vi: "Cache key-value đơn giản", en: "Simple key-value cache" }, redis: true, mem: true },
  { id: "sorted", name: { vi: "Bảng xếp hạng (sorted set)", en: "Leaderboard (sorted set)" }, redis: true, mem: false },
  { id: "geo", name: { vi: "Truy vấn theo vị trí (geospatial)", en: "Location queries (geospatial)" }, redis: true, mem: false },
  { id: "repl", name: { vi: "Replica + Multi-AZ automatic failover", en: "Replica + Multi-AZ automatic failover" }, redis: true, mem: false },
  { id: "pubsub", name: { vi: "Pub/Sub", en: "Pub/Sub" }, redis: true, mem: false },
];

const ENGINES: { id: Engine; name: string; x: number; cores: Bi }[] = [
  { id: "redis", name: "Redis OSS / Valkey", x: 20, cores: { vi: "xử lý lệnh trên một thread chính", en: "runs commands on one main thread" } },
  { id: "mem", name: "Memcached", x: 420, cores: { vi: "xử lý lệnh trên nhiều thread", en: "runs commands on multiple threads" } },
];

const CMDS = 8;
const CORE = 40;
const coreX = (ex: number, i: number) => ex + 150 + i * 54;
const CORE_Y = 96;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CacheEngineSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [picked, setPicked] = useState<string[]>(["multi", "simple"]);
  const [busy, setBusy] = useState(false);
  const [doneAt, setDoneAt] = useState<Partial<Record<Engine, number>>>({});
  const [hot, setHot] = useState<Partial<Record<Engine, number[]>>>({});
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const chosen = NEEDS.filter((n) => picked.includes(n.id));
  const fits = (e: Engine) => chosen.every((n) => n[e]);
  const okRedis = fits("redis");
  const okMem = fits("mem");

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function runEngine(layer: SVGGElement, e: Engine, ex: number, fast: boolean) {
    const lanes = e === "mem" ? 4 : 1;
    const rounds = Math.ceil(CMDS / lanes);
    const step = fast ? 60 : 380;
    for (let r = 0; r < rounds; r++) {
      if (!alive.current) return;
      const cores = Array.from({ length: lanes }, (_, i) => i);
      setHot((h) => ({ ...h, [e]: cores }));
      await Promise.all(cores.map((i) => {
        const start: Pt = [ex + 50, 140];
        const end: Pt = [coreX(ex, i) + CORE / 2, CORE_Y + CORE / 2];
        return travel(layer, [start, [ex + 110, 140], [ex + 110, end[1]], end], step, "pkt", 5);
      }));
      if (!fast) await sleep(80);
    }
    setHot((h) => ({ ...h, [e]: [] }));
    setDoneAt((d) => ({ ...d, [e]: rounds }));
  }

  async function play() {
    const layer = fx.current;
    if (!layer || busy) return;
    setBusy(true);
    setDoneAt({});
    const fast = prefersReducedMotion();
    await Promise.all(ENGINES.map((en) => runEngine(layer, en.id, en.x, fast)));
    if (alive.current) setBusy(false);
  }

  let verdict: string;
  let good = true;
  if (chosen.length === 0) { verdict = L({ vi: "Chọn tối thiểu một yêu cầu.", en: "Choose at least one requirement." }); good = false; }
  else if (okRedis && okMem) verdict = L({ vi: "Cả hai engine đều đáp ứng. Khi chỉ cần cache đơn giản, Memcached gọn nhẹ hơn.", en: "Both engines meet the requirements. When you only need a simple cache, Memcached is lighter." });
  else if (okRedis) verdict = L({ vi: "Redis OSS (hoặc Valkey) đáp ứng đầy đủ. Memcached không hỗ trợ: ", en: "Redis OSS (or Valkey) meets every requirement. Memcached does not support: " }) + chosen.filter((n) => !n.mem).map((n) => L(n.name)).join(", ") + ".";
  else if (okMem) verdict = L({ vi: "Memcached đáp ứng đầy đủ. Redis OSS không hỗ trợ: ", en: "Memcached meets every requirement. Redis OSS does not support: " }) + chosen.filter((n) => !n.redis).map((n) => L(n.name)).join(", ") + ".";
  else { verdict = L({ vi: "Không engine nào đáp ứng đầy đủ. Tách thành hai cluster cho hai tác vụ khác nhau, hoặc rà soát lại các yêu cầu thực sự cần thiết.", en: "No engine meets every requirement. Split into two clusters for the two different jobs, or review which requirements are really needed." }); good = false; }

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Hai node cùng cấu hình 4 vCPU", en: "Two identical 4-vCPU nodes" })}</span>
        <button className="btn primary ml-auto" onClick={play} disabled={busy}>{L({ vi: `Gửi ${CMDS} lệnh`, en: `Send ${CMDS} commands` })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 196" role="img" aria-label={L({ vi: "Hai node cache 4 vCPU: Redis OSS xử lý lệnh trên một thread chính, Memcached xử lý trên nhiều thread", en: "Two 4-vCPU cache nodes: Redis OSS runs commands on one main thread, Memcached on multiple threads" })}>
          {ENGINES.map((en) => {
            const lit = hot[en.id] ?? [];
            const rounds = doneAt[en.id];
            return (
              <g key={en.id}>
                <rect className="cen-card" x={en.x} y={12} width={380} height={172} rx={12} />
                <text className="cen-title" x={en.x + 16} y={36}>{en.name}</text>
                <text className="cen-sub" x={en.x + 16} y={54}>{L(en.cores)}</text>
                <g transform={`translate(${en.x + 50} 140)`} aria-hidden="true">
                  <rect className="cen-queue" x={-30} y={-14} width={60} height={28} rx={6} />
                  <text className="cen-sub" x={0} y={4} textAnchor="middle">{L({ vi: `${CMDS} lệnh`, en: `${CMDS} cmds` })}</text>
                </g>
                <rect className="cen-node" x={en.x + 136} y={CORE_Y - 22} width={228} height={CORE + 64} rx={8} />
                <text className="cen-sub" x={en.x + 250} y={CORE_Y - 6} textAnchor="middle">node · 4 vCPU</text>
                {[0, 1, 2, 3].map((i) => {
                  const used = en.id === "mem" || i === 0;
                  const cls = "cen-core" + (used ? " used" : "") + (lit.includes(i) ? " hot" : "");
                  return (
                    <g key={i}>
                      <rect className={cls} x={coreX(en.x, i)} y={CORE_Y} width={CORE} height={CORE} rx={6} />
                      <text className="cen-core-t" x={coreX(en.x, i) + CORE / 2} y={CORE_Y + CORE / 2 + 4} textAnchor="middle">{used ? "T" + (i + 1) : L({ vi: "rỗi", en: "idle" })}</text>
                    </g>
                  );
                })}
                <text className={"cen-done" + (rounds ? "" : " idle")} x={en.x + 250} y={CORE_Y + CORE + 30} textAnchor="middle">
                  {rounds ? L({ vi: `hoàn tất sau ${rounds} lượt`, en: `done after ${rounds} rounds` }) : busy ? L({ vi: "đang xử lý…", en: "processing…" }) : " "}
                </text>
              </g>
            );
          })}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout">
        <p className="mx-0 mt-0 mb-2 text-step--1 text-muted">{L({ vi: "Chọn các yêu cầu của MFTECH:", en: "Choose MFTECH’s requirements:" })}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={L({ vi: "Yêu cầu của MFTECH", en: "MFTECH requirements" })}>
          {NEEDS.map((n) => (
            <button key={n.id} className="chip" aria-pressed={picked.includes(n.id)} onClick={() => toggle(n.id)}>{L(n.name)}</button>
          ))}
        </div>
        <table className="cen-table">
          <thead><tr><th>{L({ vi: "Yêu cầu đã chọn", en: "Selected requirement" })}</th><th>Redis OSS / Valkey</th><th>Memcached</th></tr></thead>
          <tbody>
            {chosen.map((n) => (
              <tr key={n.id}>
                <td>{L(n.name)}</td>
                <td className={n.redis ? "yes" : "no"}>{n.redis ? L({ vi: "hỗ trợ", en: "yes" }) : L({ vi: "không", en: "no" })}</td>
                <td className={n.mem ? "yes" : "no"}>{n.mem ? L({ vi: "hỗ trợ", en: "yes" }) : L({ vi: "không", en: "no" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (good ? "bg-ok-soft" : "bg-bad-soft")} aria-live="polite">{verdict}</p>
      </div>
    </div>
  );
}
