import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./messaging-sims.css";

// ShopViet's wallet sends five balance changes for two customers, one of them sent
// twice after a network timeout. A standard queue may deliver out of order and more
// than once, so a balance ends up wrong. A FIFO queue keeps the order and drops the
// duplicate, but with one message group only one message is in flight at a time.
// Message Group ID = customer id lets each customer be processed in parallel.

type QType = "standard" | "fifo";
type Cons = "c1" | "c2";
type Place = "src" | "q" | Cons;

interface Msg { id: string; cust: "A" | "B"; amt: number; dup?: boolean }

const MSGS: Msg[] = [
  { id: "m1", cust: "A", amt: 100 },
  { id: "m2", cust: "B", amt: 50 },
  { id: "m3", cust: "A", amt: 100, dup: true },
  { id: "m4", cust: "A", amt: -80 },
  { id: "m5", cust: "B", amt: -30 },
];
const EXPECT = { A: 20, B: 20 };

function plan(type: QType, groups: boolean): [string, Cons][][] {
  if (type === "standard") return [[["m4", "c1"], ["m2", "c2"]], [["m1", "c1"], ["m5", "c2"]], [["m3", "c1"]]];
  if (!groups) return [[["m1", "c1"]], [["m2", "c2"]], [["m4", "c1"]], [["m5", "c2"]]];
  return [[["m1", "c1"], ["m2", "c2"]], [["m4", "c1"], ["m5", "c2"]]];
}

const label = (m: Msg) => `${m.cust} ${m.amt > 0 ? "+" : "−"}${Math.abs(m.amt)}`;
const byId = Object.fromEntries(MSGS.map((m) => [m.id, m]));
const slotX = (i: number) => 492 - i * 72;
const LANE = 125;
const C_Y: Record<Cons, number> = { c1: 72, c2: 182 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type LogLine = { tag?: string; cls?: string; who?: string; ok?: boolean; msg: ReactNode };

export default function FifoSim() {
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [type, setType] = useState<QType>("standard");
  const [groups, setGroups] = useState(false);
  const [place, setPlace] = useState<Record<string, Place>>({});
  const [flag, setFlag] = useState<Record<string, string>>({});
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const [busyC, setBusyC] = useState<Partial<Record<Cons, number>>>({});
  const [log, setLog] = useState<LogLine[]>([]);
  const [balance, setBalance] = useState<{ A: number; B: number } | null>(null);
  const [rounds, setRounds] = useState(0);
  const [busy, setBusy] = useState(false);

  function reset() {
    setPlace({});
    setGone({});
    setFlag({});
    setBusyC({});
    setLog([]);
    setBalance(null);
    setRounds(0);
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    const wait = (ms: number) => sleep(fast ? 60 : ms);
    await wait(150);
    const fifo = type === "fifo";
    // 1. The app sends the five messages in order; one is a retry of the first.
    let slot = 0;
    const slotOf: Record<string, number> = {};
    for (const m of MSGS) {
      if (!alive.current) return;
      slotOf[m.id] = slot++;
      setPlace((p) => ({ ...p, [m.id]: "q" }));
      if (m.dup) {
        setFlag((f) => ({ ...f, [m.id]: "gửi lại" }));
        await wait(650);
        if (fifo) {
          setFlag((f) => ({ ...f, [m.id]: "trùng" }));
          setLog((l) => [...l, { tag: "BỎ TRÙNG", cls: "edge", who: "FIFO queue",
            msg: rich("App gửi lại **A +100** vì timeout mạng. Cùng **deduplication ID** trong 5 phút nên SQS nhận nhưng không giao lần nữa.") }]);
          await wait(650);
          setGone((g) => ({ ...g, [m.id]: true }));
        } else {
          setLog((l) => [...l, { tag: "TRÙNG", cls: "bad", who: "Standard queue",
            msg: rich("App gửi lại **A +100** vì timeout mạng. Standard queue nhận như một message mới.") }]);
        }
      }
      await wait(450);
    }
    // 2. Consumers receive wave by wave.
    const bal = { A: 0, B: 0 };
    const waves = plan(type, groups);
    let n = 0;
    for (const wave of waves) {
      if (!alive.current) return;
      n++;
      setRounds(n);
      setPlace((p) => ({ ...p, ...Object.fromEntries(wave.map(([id, c]) => [id, c])) }));
      setBusyC(Object.fromEntries(wave.map(([id, c]) => [c, slotOf[id]])));
      await wait(800);
      for (const [id, c] of wave) {
        const m = byId[id];
        const who = c === "c1" ? "Consumer 1" : "Consumer 2";
        if (m.amt < 0 && bal[m.cust] + m.amt < 0) {
          setLog((l) => [...l, { tag: "TỪ CHỐI", cls: "bad", who, msg: rich(`**${label(m)}** tới trước khoản nạp: số dư ${m.cust} = ${bal[m.cust]}, giao dịch bị từ chối.`) }]);
        } else {
          bal[m.cust] += m.amt;
          const dupNote = m.dup ? " Đây là bản **gửi lặp**: khách được cộng tiền hai lần." : "";
          setLog((l) => [...l, { tag: m.dup ? "LẶP" : "XỬ LÝ", cls: m.dup ? "bad" : "hit", who, msg: rich(`**${label(m)}** → số dư ${m.cust} = ${bal[m.cust]}.${dupNote}`) }]);
        }
      }
      setGone((g) => ({ ...g, ...Object.fromEntries(wave.map(([id]) => [id, true])) }));
      setBusyC({});
      if (fifo && !groups) {
        setLog((l) => [...l, { tag: "CHỜ", cls: "info", who: wave[0][1] === "c1" ? "Consumer 2" : "Consumer 1",
          msg: rich("Rảnh nhưng không nhận được gì: mọi message chung **một message group**, message sau chỉ được giao khi message trước đã xử lý xong.") }]);
      }
      await wait(400);
    }
    setBalance({ ...bal });
    const right = bal.A === EXPECT.A && bal.B === EXPECT.B;
    const result = !fifo
      ? "Standard queue giao **ít nhất một lần** và **không giữ đúng thứ tự**. Ví của khách A sai. Cần FIFO queue."
      : groups
        ? `Đúng số dư, xong sau ${n} lượt. **Message Group ID** = mã khách: trong một group vẫn đúng thứ tự, các group khác nhau chạy song song.`
        : `Đúng số dư nhưng mất ${n} lượt: một consumer luôn ngồi chờ. Đặt **Message Group ID** theo mã khách để xử lý song song.`;
    setLog((l) => [...l, { ok: right && (!fifo || groups), msg: rich(result) }]);
    setBusy(false);
  }

  const pos = (m: Msg, i: number) => {
    const p = place[m.id] ?? "src";
    if (p === "q") return { x: slotX(i), y: LANE };
    if (p === "c1" || p === "c2") return { x: 604, y: C_Y[p] };
    return { x: 60, y: LANE };
  };

  return (
    <div className="stage ffs">
      <div className="stage-bar">
        <span className="label">Loại queue</span>
        {(["standard", "fifo"] as const).map((t) => (
          <button key={t} className="btn" aria-pressed={t === type} disabled={busy} onClick={() => { setType(t); reset(); }}>
            {t === "standard" ? "Standard" : "FIFO (.fifo)"}
          </button>
        ))}
        <label className="ffs-toggle">
          <input type="checkbox" checked={groups} disabled={busy || type === "standard"} onChange={(e) => { setGroups(e.target.checked); reset(); }} />
          Message Group ID = mã khách
        </label>
        <button className="btn primary" onClick={run} disabled={busy}>Gửi 5 message</button>
      </div>
      <p className="ffs-about">Khách A nạp 100 rồi trả 80. Khách B nạp 50 rồi trả 30. Khoản nạp của A bị app gửi lại một lần do timeout mạng. Số dư đúng: A = 20, B = 20.</p>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 200" role="img" aria-label="Năm message đi từ app ví vào queue rồi tới hai consumer">
          <path className="mls-link" d={`M100 ${LANE} H150 M530 ${LANE} H550 V${C_Y.c1} H560 M550 ${LANE} V${C_Y.c2} H560`} />
          <g className="mls-src">
            <rect x={20} y={LANE - 24} width={80} height={48} rx={8} />
            <text x={60} y={LANE - 3} textAnchor="middle">App ví</text>
            <text className="mls-l2" x={60} y={LANE + 13} textAnchor="middle">producer</text>
          </g>
          <g className="mls-lane">
            <rect x={150} y={LANE - 24} width={380} height={48} rx={10} />
            <text x={156} y={LANE - 30}>{type === "fifo" ? "shopviet-vi.fifo" : "shopviet-vi (standard)"}</text>
          </g>
          {(["c1", "c2"] as const).map((c) => (
            <g key={c} className={"mls-worker " + (busyC[c] !== undefined ? "busy" : "idle")}>
              <rect x={560} y={C_Y[c] - 26} width={200} height={52} rx={8} />
              <text className="mls-l1" x={700} y={C_Y[c] - 3} textAnchor="middle">Consumer {c === "c1" ? 1 : 2}</text>
              <text className="mls-l2" x={700} y={C_Y[c] + 13} textAnchor="middle">{busyC[c] !== undefined ? "đang xử lý" : "rảnh"}</text>
            </g>
          ))}
          {MSGS.map((m, i) => {
            const p = place[m.id] ?? "src";
            const { x, y } = pos(m, i);
            return (
              <g key={m.id} className={`mls-tok ffs-tok ${m.cust === "A" ? "pro" : "b"}` + (p === "src" || gone[m.id] ? " hidden" : "")}
                style={{ transform: `translate(${x}px, ${y}px)` }}>
                <rect x={-30} y={-13} width={60} height={26} rx={5} />
                <text y={4} textAnchor="middle">{label(m)}</text>
                {flag[m.id] && <text className={"mls-note" + (flag[m.id] === "trùng" ? " bad" : "")} y={-18} textAnchor="middle">{flag[m.id]}</text>}
              </g>
            );
          })}
          {rounds > 0 && <text className="mls-clock" x={14} y={50}>lượt {rounds}</text>}
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="mls-hint">Chọn loại queue rồi bấm <b>Gửi 5 message</b>. Thử cả ba: Standard, FIFO, FIFO + Message Group ID.</p>
        ) : (
          <>
            <ul className="log" aria-live="polite">
              {log.map((e, i) =>
                e.tag === undefined ? (
                  <li key={i} className={`mls-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
                ) : (
                  <li key={i}>
                    <span className={`tag mls-tag ${e.cls}`}>{e.tag}</span>
                    <span><b>{e.who}:</b> {e.msg}</span>
                  </li>
                ),
              )}
            </ul>
            {balance && (
              <div className="status ffs-balance">
                {(["A", "B"] as const).map((k) => (
                  <span key={k} className={"pill " + (balance[k] === EXPECT[k] ? "ok" : "bad")}><i />Số dư {k}: {balance[k]} (đúng là {EXPECT[k]})</span>
                ))}
                <span className="count">{rounds} lượt xử lý</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
