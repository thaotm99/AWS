import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion, travel } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./kinesis-sims.css";

// Six shopping events from three customers go either into an SQS queue or into a
// Kinesis data stream with two shards. With the queue, three apps compete: each event
// reaches one app and is deleted. With the stream, the partition key picks a shard,
// records stay there in order, and every app reads all of them with its own position;
// an app can even go back and read again.

type Mode = "sqs" | "kds";
type Key = "A" | "B" | "C";
interface Rec { id: string; k: Key }

const RECS: Rec[] = [
  { id: "A1", k: "A" }, { id: "B1", k: "B" }, { id: "C1", k: "C" },
  { id: "A2", k: "A" }, { id: "B2", k: "B" }, { id: "A3", k: "A" },
];
const SHARD_OF: Record<Key, 0 | 1> = { A: 0, B: 1, C: 0 };
const APPS: Bi[] = [
  { vi: "Bảng xếp hạng", en: "Leaderboard" },
  { vi: "Gợi ý sản phẩm", en: "Product recommendations" },
  { vi: "Phát hiện gian lận", en: "Fraud detection" },
];
const APP_Y = [62, 142, 222];
const LANE_Y = [96, 190];
const Q_Y = 142;
const SRC = { x: 62, y: 142 };
const shardIndex = (r: Rec) => RECS.filter((x) => SHARD_OF[x.k] === SHARD_OF[r.k]).indexOf(r);
const slotX = (i: number) => 188 + i * 54;
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

type LogLine = { tag?: Bi; cls?: string; ok?: boolean; msg: Bi<ReactNode> };
/** Rich text in both languages. */
const rb = (vi: string, en: string): Bi<ReactNode> => ({ vi: rich(vi), en: rich(en) });

export default function ShardStreamSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [mode, setMode] = useState<Mode>("kds");
  const [sent, setSent] = useState(0);
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [ptr, setPtr] = useState<number[][]>([[0, 0], [0, 0], [0, 0]]);
  const [seen, setSeen] = useState<string[][]>([[], [], []]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);

  function reset() {
    setSent(0);
    setTaken({});
    setPtr([[0, 0], [0, 0], [0, 0]]);
    setSeen([[], [], []]);
    setLog([]);
    setRan(false);
  }

  const recPos = (r: Rec, i: number) => {
    if (i >= sent) return { x: SRC.x, y: SRC.y };
    if (mode === "sqs") {
      const app = taken[r.id];
      if (app !== undefined) return { x: 590, y: APP_Y[app] };
      return { x: 452 - i * 48, y: Q_Y };
    }
    return { x: slotX(shardIndex(r)), y: LANE_Y[SHARD_OF[r.k]] };
  };

  async function readAll(apps: number[], fast: boolean) {
    const layer = fx.current;
    for (let k = 0; k < 4; k++) {
      if (!alive.current) return;
      const moves: Promise<void>[] = [];
      for (const a of apps) {
        for (const s of [0, 1] as const) {
          const r = RECS.filter((x) => SHARD_OF[x.k] === s)[k];
          if (!r) continue;
          if (layer && !fast) moves.push(travel(layer, [[slotX(k), LANE_Y[s]], [520, LANE_Y[s]], [520, APP_Y[a]], [560, APP_Y[a]]], 520, a === 2 ? "pkt-back" : a === 1 ? "pkt-edge" : "pkt", 5));
        }
      }
      await Promise.all(moves);
      setPtr((p) => p.map((row, a) => (apps.includes(a) ? row.map((v, s) => Math.min(v + 1, RECS.filter((x) => SHARD_OF[x.k] === s).length)) : row)));
      setSeen((sn) => sn.map((row, a) => {
        if (!apps.includes(a)) return row;
        const add = ([0, 1] as const).map((s) => RECS.filter((x) => SHARD_OF[x.k] === s)[k]).filter((x): x is Rec => !!x).map((x) => x.id);
        return [...row, ...add];
      }));
      await sleep(fast ? 40 : 160);
    }
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    await sleep(fast ? 0 : 150);
    for (let i = 0; i < RECS.length; i++) {
      if (!alive.current) return;
      const r = RECS[i];
      setSent(i + 1);
      if (i < 3) {
        setLog((l) => [...l, mode === "kds"
          ? { tag: { vi: "GHI", en: "WRITE" }, cls: "info", msg: rb(`**${r.id}** (partition key \`${r.k}\`) → **shard ${SHARD_OF[r.k] + 1}**. Các record cùng key luôn được ghi vào cùng một shard.`,
              `**${r.id}** (partition key \`${r.k}\`) → **shard ${SHARD_OF[r.k] + 1}**. Records with the same key are always written to the same shard.`) }
          : { tag: { vi: "GỬI", en: "SEND" }, cls: "info", msg: rb(`**${r.id}** được gửi vào queue.`, `**${r.id}** is sent to the queue.`) }]);
      }
      await sleep(fast ? 40 : 480);
    }
    if (mode === "kds") {
      setLog((l) => [...l, { tag: { vi: "ĐỌC", en: "READ" }, cls: "hit", msg: rb("Ba ứng dụng đọc **song song**, mỗi ứng dụng quản lý **vị trí đọc riêng** trong từng shard. Sau khi được đọc, record vẫn được lưu trong stream.",
        "The three apps read **in parallel**, and each app tracks **its own read position** in each shard. After being read, records stay in the stream.") }]);
      await readAll([0, 1, 2], fast);
      setLog((l) => [...l, { ok: true, msg: rb("Cả ba ứng dụng đều nhận đủ 6 sự kiện, và trong mỗi shard thứ tự gửi được giữ nguyên: A1 → A2 → A3. Đây là lý do bảng xếp hạng, gợi ý sản phẩm và phát hiện gian lận sử dụng chung **một stream**.",
        "All three apps receive all 6 events, and within each shard the send order is preserved: A1 → A2 → A3. This is why the leaderboard, product recommendations and fraud detection share **one stream**.") }]);
    } else {
      for (let i = 0; i < RECS.length; i++) {
        if (!alive.current) return;
        const r = RECS[i];
        const app = i % 3;
        setTaken((t) => ({ ...t, [r.id]: app }));
        setSeen((sn) => sn.map((row, a) => (a === app ? [...row, r.id] : row)));
        if (i < 3) setLog((l) => [...l, { tag: { vi: "NHẬN + XOÁ", en: "RECEIVE + DELETE" }, cls: "bad", msg: rb(`**${APPS[app].vi}** nhận ${r.id} và xoá message. Hai ứng dụng còn lại không nhận được ${r.id}.`,
          `**${APPS[app].en}** receives ${r.id} and deletes the message. The other two apps do not receive ${r.id}.`) }]);
        await sleep(fast ? 40 : 520);
      }
      setLog((l) => [...l, { ok: false, msg: rb("Mỗi ứng dụng chỉ nhận 2/6 sự kiện. Queue **phân phối tác vụ** cho nhiều worker; khi nhiều ứng dụng cần **cùng đọc** một luồng dữ liệu theo đúng thứ tự, cần sử dụng **Kinesis Data Streams**.",
        "Each app receives only 2/6 events. A queue **distributes tasks** to multiple workers; when several apps need to **read the same** data stream in order, use **Kinesis Data Streams**.") }]);
    }
    setRan(true);
    setBusy(false);
  }

  async function replay() {
    if (busy) return;
    setBusy(true);
    setPtr((p) => p.map((row, a) => (a === 2 ? [0, 0] : row)));
    setSeen((sn) => sn.map((row, a) => (a === 2 ? [] : row)));
    setLog((l) => [...l, { tag: { vi: "ĐỌC LẠI", en: "REREAD" }, cls: "edge", msg: rb("Ứng dụng phát hiện gian lận vừa được sửa lỗi và đặt lại vị trí đọc về đầu stream. Record vẫn được lưu giữ: mặc định **24 giờ**, có thể tăng tới **365 ngày**.",
      "The fraud detection app has just been fixed and resets its read position to the start of the stream. The records are still retained: **24 hours** by default, extendable up to **365 days**.") }]);
    await sleep(prefersReducedMotion() ? 0 : 500);
    await readAll([2], prefersReducedMotion());
    setLog((l) => [...l, { ok: true, msg: rb("Đã đọc lại 6/6 record theo đúng thứ tự ban đầu. Hai ứng dụng còn lại không bị ảnh hưởng.", "Reread 6/6 records in the original order. The other two apps are not affected.") }]);
    setBusy(false);
  }

  return (
    <div className="stage kss">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Đích nhận sự kiện", en: "Event destination" })}</span>
        {(["sqs", "kds"] as const).map((m) => (
          <button key={m} className="btn" aria-pressed={m === mode} disabled={busy} onClick={() => { setMode(m); reset(); }}>
            {m === "sqs" ? "SQS queue" : "Kinesis Data Streams"}
          </button>
        ))}
        <button className="btn primary kss-run" onClick={run} disabled={busy}>{L({ vi: "Gửi 6 sự kiện", en: "Send 6 events" })}</button>
        {mode === "kds" && <button className="btn" onClick={replay} disabled={busy || !ran}>{L({ vi: "Đọc lại từ đầu stream", en: "Reread from the start of the stream" })}</button>}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 240" role="img" aria-label={mode === "kds" ? L({ vi: "Sự kiện được ghi vào hai shard theo partition key, ba ứng dụng cùng đọc", en: "Events are written to two shards by partition key, and three apps all read them" }) : L({ vi: "Sự kiện được gửi vào một queue, ba ứng dụng cạnh tranh nhận message", en: "Events are sent to one queue, and three apps compete to receive the messages" })}>
          <g className="kss-src">
            <rect x={SRC.x - 48} y={SRC.y - 24} width={96} height={48} rx={8} />
            <text className="kss-l1" x={SRC.x} y={SRC.y - 3} textAnchor="middle">{L({ vi: "Ứng dụng", en: "App" })}</text>
            <text className="kss-l2" x={SRC.x} y={SRC.y + 13} textAnchor="middle">producer</text>
          </g>
          {mode === "kds" ? (
            <>
              <path className="kss-link" d={`M110 ${SRC.y} H135 V${LANE_Y[0]} H160 M135 ${SRC.y} V${LANE_Y[1]} H160`} />
              {LANE_Y.map((y, s) => (
                <g key={s} className="kss-shard">
                  <rect x={160} y={y - 22} width={340} height={44} rx={8} />
                  <text x={166} y={y - 28}>Shard {s + 1} · {s === 0 ? "key A, C" : "key B"}</text>
                </g>
              ))}
              {APP_Y.map((y) => <path key={y} className="kss-link" d={`M500 ${LANE_Y[0]} H520 V${LANE_Y[1]} M520 ${y} H560`} />)}
              {ptr.map((row, a) => row.map((v, s) => (
                <path key={`${a}${s}`} className={`kss-ptr c${a}`} d="M0 0 l-5 9 h10 z"
                  style={{ transform: `translate(${slotX(v) + (a - 1) * 11}px, ${LANE_Y[s] + 24}px)` }} />
              )))}
            </>
          ) : (
            <>
              <path className="kss-link" d={`M110 ${Q_Y} H160 M480 ${Q_Y} H520 M520 ${APP_Y[0]} V${APP_Y[2]}`} />
              {APP_Y.map((y) => <path key={y} className="kss-link" d={`M520 ${y} H560`} />)}
              <g className="kss-shard queue">
                <rect x={160} y={Q_Y - 22} width={320} height={44} rx={8} />
                <text x={166} y={Q_Y - 28}>SQS queue</text>
              </g>
            </>
          )}
          {APPS.map((name, a) => (
            <g key={a} className={`kss-app c${a}`}>
              <rect x={560} y={APP_Y[a] - 25} width={250} height={50} rx={8} />
              <text className="kss-l1" x={630} y={APP_Y[a] - 4}>{L(name)}</text>
              <text className="kss-l2" x={630} y={APP_Y[a] + 13}>{seen[a].length ? `${seen[a].length}/6 · ${seen[a].join(" ")}` : L({ vi: "chưa nhận dữ liệu", en: "no data yet" })}</text>
            </g>
          ))}
          {RECS.map((r, i) => {
            const { x, y } = recPos(r, i);
            const hidden = i >= sent || (mode === "sqs" && taken[r.id] !== undefined);
            return (
              <g key={r.id} className={`kss-rec k${r.k}` + (hidden ? " hidden" : "")} style={{ transform: `translate(${x}px, ${y}px)` }}>
                <rect x={-19} y={-13} width={38} height={26} rx={5} />
                <text y={4} textAnchor="middle">{r.id}</text>
              </g>
            );
          })}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="kss-hint">{L({ vi: <>Chọn đích nhận sự kiện, sau đó chọn <b>Gửi 6 sự kiện</b>. So sánh kết quả của cả hai phương án.</>, en: <>Choose an event destination, then choose <b>Send 6 events</b>. Compare the results of both options.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === undefined ? (
                <li key={i} className={`kss-result ${e.ok ? "ok" : "bad"}`}>{L(e.msg)}</li>
              ) : (
                <li key={i}><span className={`tag kss-tag ${e.cls}`}>{L(e.tag)}</span><span>{L(e.msg)}</span></li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
