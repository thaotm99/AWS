import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import "./cache-engine-sim.css";

// Redis OSS (or Valkey) and Memcached side by side on a node with four vCPUs.
// "Gửi 8 lệnh" sends the same eight commands to both: Memcached spreads them over
// all cores (multi-threaded), Redis runs them one after another on its main thread.
// Below, ShopViet ticks the needs it has and sees which engine covers them all.

type Engine = "redis" | "mem";

const NEEDS: { id: string; name: string; redis: boolean; mem: boolean }[] = [
  { id: "multi", name: "Dùng hết nhiều core trên một node", redis: false, mem: true },
  { id: "simple", name: "Cache key-value đơn giản", redis: true, mem: true },
  { id: "sorted", name: "Bảng xếp hạng (sorted set)", redis: true, mem: false },
  { id: "geo", name: "Tìm theo vị trí (geospatial)", redis: true, mem: false },
  { id: "repl", name: "Replica + Multi-AZ automatic failover", redis: true, mem: false },
  { id: "pubsub", name: "Pub/Sub", redis: true, mem: false },
];

const ENGINES: { id: Engine; name: string; x: number; cores: string }[] = [
  { id: "redis", name: "Redis OSS / Valkey", x: 20, cores: "chạy lệnh trên một thread chính" },
  { id: "mem", name: "Memcached", x: 420, cores: "chạy lệnh trên nhiều thread" },
];

const CMDS = 8;
const CORE = 40;
const coreX = (ex: number, i: number) => ex + 150 + i * 54;
const CORE_Y = 96;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CacheEngineSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [picked, setPicked] = useState<string[]>(["multi", "simple"]);
  const [busy, setBusy] = useState(false);
  const [doneAt, setDoneAt] = useState<Partial<Record<Engine, number>>>({});
  const [hot, setHot] = useState<Partial<Record<Engine, number[]>>>({});
  useEffect(() => () => { alive.current = false; }, []);

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
  if (chosen.length === 0) { verdict = "Chọn ít nhất một nhu cầu."; good = false; }
  else if (okRedis && okMem) verdict = "Cả hai đều đáp ứng. Chỉ cần cache đơn giản thì Memcached gọn nhẹ hơn.";
  else if (okRedis) verdict = "Redis OSS (hoặc Valkey) đáp ứng hết. Memcached thiếu: " + chosen.filter((n) => !n.mem).map((n) => n.name).join(", ") + ".";
  else if (okMem) verdict = "Memcached đáp ứng hết. Redis OSS thiếu: " + chosen.filter((n) => !n.redis).map((n) => n.name).join(", ") + ".";
  else { verdict = "Không engine nào đáp ứng hết. Tách thành hai cluster cho hai việc khác nhau, hoặc xem lại nhu cầu nào thật sự cần."; good = false; }

  return (
    <div className="stage cen">
      <div className="stage-bar">
        <span className="label">Cùng một node 4 vCPU</span>
        <button className="btn primary cen-play" onClick={play} disabled={busy}>Gửi {CMDS} lệnh</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 196" role="img" aria-label="Hai node cache 4 vCPU: Redis OSS xử lý lệnh trên một thread chính, Memcached xử lý trên nhiều thread">
          {ENGINES.map((en) => {
            const lit = hot[en.id] ?? [];
            const rounds = doneAt[en.id];
            return (
              <g key={en.id}>
                <rect className="cen-card" x={en.x} y={12} width={380} height={172} rx={12} />
                <text className="cen-title" x={en.x + 16} y={36}>{en.name}</text>
                <text className="cen-sub" x={en.x + 16} y={54}>{en.cores}</text>
                <g transform={`translate(${en.x + 50} 140)`} aria-hidden="true">
                  <rect className="cen-queue" x={-30} y={-14} width={60} height={28} rx={6} />
                  <text className="cen-sub" x={0} y={4} textAnchor="middle">{CMDS} lệnh</text>
                </g>
                <rect className="cen-node" x={en.x + 136} y={CORE_Y - 22} width={228} height={CORE + 64} rx={8} />
                <text className="cen-sub" x={en.x + 250} y={CORE_Y - 6} textAnchor="middle">node · 4 vCPU</text>
                {[0, 1, 2, 3].map((i) => {
                  const used = en.id === "mem" || i === 0;
                  const cls = "cen-core" + (used ? " used" : "") + (lit.includes(i) ? " hot" : "");
                  return (
                    <g key={i}>
                      <rect className={cls} x={coreX(en.x, i)} y={CORE_Y} width={CORE} height={CORE} rx={6} />
                      <text className="cen-core-t" x={coreX(en.x, i) + CORE / 2} y={CORE_Y + CORE / 2 + 4} textAnchor="middle">{used ? "T" + (i + 1) : "rảnh"}</text>
                    </g>
                  );
                })}
                <text className={"cen-done" + (rounds ? "" : " idle")} x={en.x + 250} y={CORE_Y + CORE + 30} textAnchor="middle">
                  {rounds ? `xong sau ${rounds} lượt` : busy ? "đang chạy…" : " "}
                </text>
              </g>
            );
          })}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout">
        <p className="cen-hint">ShopViet cần gì? Chọn các nhu cầu:</p>
        <div className="cen-needs" role="group" aria-label="Nhu cầu của ShopViet">
          {NEEDS.map((n) => (
            <button key={n.id} className="chip" aria-pressed={picked.includes(n.id)} onClick={() => toggle(n.id)}>{n.name}</button>
          ))}
        </div>
        <table className="cen-table">
          <thead><tr><th>Nhu cầu đã chọn</th><th>Redis OSS / Valkey</th><th>Memcached</th></tr></thead>
          <tbody>
            {chosen.map((n) => (
              <tr key={n.id}>
                <td>{n.name}</td>
                <td className={n.redis ? "yes" : "no"}>{n.redis ? "có" : "không"}</td>
                <td className={n.mem ? "yes" : "no"}>{n.mem ? "có" : "không"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={"cen-result " + (good ? "ok" : "bad")} aria-live="polite">{verdict}</p>
      </div>
    </div>
  );
}
