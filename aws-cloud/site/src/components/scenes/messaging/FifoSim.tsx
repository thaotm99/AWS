import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./messaging-sims.css";

// MFTech's wallet sends five balance changes for two customers, one of them sent
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

type LogLine = { tag?: Bi; cls?: string; who?: string; ok?: boolean; msg: Bi<ReactNode> };

/** English display text for the flags shown above a message token. */
const FLAG_EN: Record<string, string> = { "gửi lại": "resent", "trùng": "duplicate" };

export default function FifoSim() {
  const L = useLang();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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
          setLog((l) => [...l, { tag: { vi: "LOẠI TRÙNG", en: "DEDUPED" }, cls: "edge", who: "FIFO queue",
            msg: { vi: rich("Ứng dụng gửi lại **A +100** do timeout mạng. Message có cùng **deduplication ID** trong khoảng 5 phút nên SQS chấp nhận request nhưng không phân phối lại."),
              en: rich("The app resends **A +100** after a network timeout. The message has the same **deduplication ID** within the 5-minute interval, so SQS accepts the request but does not deliver it again.") } }]);
          await wait(650);
          setGone((g) => ({ ...g, [m.id]: true }));
        } else {
          setLog((l) => [...l, { tag: { vi: "TRÙNG", en: "DUPLICATE" }, cls: "bad", who: "Standard queue",
            msg: { vi: rich("Ứng dụng gửi lại **A +100** do timeout mạng. Standard queue tiếp nhận như một message mới."),
              en: rich("The app resends **A +100** after a network timeout. The standard queue accepts it as a new message.") } }]);
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
          setLog((l) => [...l, { tag: { vi: "TỪ CHỐI", en: "REJECTED" }, cls: "bad", who, msg: {
            vi: rich(`**${label(m)}** được xử lý trước lệnh nạp tiền: số dư ${m.cust} = ${bal[m.cust]}, giao dịch bị từ chối.`),
            en: rich(`**${label(m)}** is processed before the top-up: balance ${m.cust} = ${bal[m.cust]}, the transaction is rejected.`) } }]);
        } else {
          bal[m.cust] += m.amt;
          const dupNote = m.dup ? " Đây là **message trùng lặp**: tài khoản của người dùng được cộng tiền hai lần." : "";
          const dupNoteEn = m.dup ? " This is a **duplicate message**: the user's account is credited twice." : "";
          const after = bal[m.cust];
          setLog((l) => [...l, { tag: m.dup ? { vi: "LẶP", en: "REPEAT" } : { vi: "XỬ LÝ", en: "PROCESSED" }, cls: m.dup ? "bad" : "hit", who, msg: {
            vi: rich(`**${label(m)}** → số dư ${m.cust} = ${after}.${dupNote}`),
            en: rich(`**${label(m)}** → balance ${m.cust} = ${after}.${dupNoteEn}`) } }]);
        }
      }
      setGone((g) => ({ ...g, ...Object.fromEntries(wave.map(([id]) => [id, true])) }));
      setBusyC({});
      if (fifo && !groups) {
        setLog((l) => [...l, { tag: { vi: "CHỜ", en: "WAITING" }, cls: "info", who: wave[0][1] === "c1" ? "Consumer 2" : "Consumer 1",
          msg: { vi: rich("Consumer sẵn sàng nhưng không nhận được message: mọi message thuộc **cùng một message group**, message tiếp theo chỉ được phân phối khi message trước đã xử lý xong."),
            en: rich("The consumer is ready but receives no message: all messages belong to **the same message group**, so the next message is delivered only after the previous one has been processed.") } }]);
      }
      await wait(400);
    }
    setBalance({ ...bal });
    const right = bal.A === EXPECT.A && bal.B === EXPECT.B;
    const result: Bi = !fifo
      ? { vi: "Standard queue phân phối **at-least-once** và **không đảm bảo thứ tự**. Số dư ví của người dùng A bị sai. Cần sử dụng FIFO queue.",
        en: "A standard queue delivers **at least once** and **does not guarantee order**. User A's wallet balance is wrong. Use a FIFO queue." }
      : groups
        ? { vi: `Số dư chính xác, hoàn tất sau ${n} lượt. **Message Group ID** = mã người dùng: thứ tự được đảm bảo trong từng group, các group khác nhau được xử lý song song.`,
          en: `Balances are correct, done after ${n} rounds. **Message Group ID** = user ID: order is guaranteed within each group, and different groups are processed in parallel.` }
        : { vi: `Số dư chính xác nhưng cần ${n} lượt: tại mỗi thời điểm luôn có một consumer ở trạng thái chờ. Cần đặt **Message Group ID** theo mã người dùng để xử lý song song.`,
          en: `Balances are correct but it takes ${n} rounds: at any moment one consumer is always waiting. Set the **Message Group ID** to the user ID to process in parallel.` };
    setLog((l) => [...l, { ok: right && (!fifo || groups), msg: { vi: rich(result.vi), en: rich(result.en) } }]);
    setBusy(false);
  }

  const pos = (m: Msg, i: number) => {
    const p = place[m.id] ?? "src";
    if (p === "q") return { x: slotX(i), y: LANE };
    if (p === "c1" || p === "c2") return { x: 604, y: C_Y[p] };
    return { x: 60, y: LANE };
  };

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Loại queue", en: "Queue type" })}</span>
        {(["standard", "fifo"] as const).map((t) => (
          <button key={t} className="btn" aria-pressed={t === type} disabled={busy} onClick={() => { setType(t); reset(); }}>
            {t === "standard" ? "Standard" : "FIFO (.fifo)"}
          </button>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-step--1 has-[input:disabled]:cursor-default has-[input:disabled]:opacity-50">
          <input type="checkbox" checked={groups} disabled={busy || type === "standard"} onChange={(e) => { setGroups(e.target.checked); reset(); }} />
          {L({ vi: "Message Group ID = mã người dùng", en: "Message Group ID = user ID" })}
        </label>
        <button className="btn primary ml-auto" onClick={run} disabled={busy}>{L({ vi: "Gửi 5 message", en: "Send 5 messages" })}</button>
      </div>
      <p className="mx-4 mt-2.5 mb-0 text-step--1 text-muted">{L({ vi: "Người dùng A nạp 100, sau đó thanh toán 80. Người dùng B nạp 50, sau đó thanh toán 30. Lệnh nạp của A bị ứng dụng gửi lại một lần do timeout mạng. Số dư chính xác: A = 20, B = 20.", en: "User A tops up 100, then pays 80. User B tops up 50, then pays 30. The app resends A\u2019s top-up once after a network timeout. Correct balances: A = 20, B = 20." })}</p>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 200" role="img" aria-label={L({ vi: "Năm message được gửi từ ứng dụng ví vào queue, sau đó tới hai consumer", en: "Five messages are sent from the wallet app to the queue, then to two consumers" })}>
          <path className="mls-link" d={`M100 ${LANE} H150 M530 ${LANE} H550 V${C_Y.c1} H560 M550 ${LANE} V${C_Y.c2} H560`} />
          <g className="mls-src">
            <rect x={20} y={LANE - 24} width={80} height={48} rx={8} />
            <text x={60} y={LANE - 3} textAnchor="middle">{L({ vi: "Ứng dụng ví", en: "Wallet app" })}</text>
            <text className="mls-l2" x={60} y={LANE + 13} textAnchor="middle">producer</text>
          </g>
          <g className="mls-lane">
            <rect x={150} y={LANE - 24} width={380} height={48} rx={10} />
            <text x={156} y={LANE - 30}>{type === "fifo" ? "mftech-vi.fifo" : "mftech-vi (standard)"}</text>
          </g>
          {(["c1", "c2"] as const).map((c) => (
            <g key={c} className={"mls-worker " + (busyC[c] !== undefined ? "busy" : "idle")}>
              <rect x={560} y={C_Y[c] - 26} width={200} height={52} rx={8} />
              <text className="mls-l1" x={700} y={C_Y[c] - 3} textAnchor="middle">Consumer {c === "c1" ? 1 : 2}</text>
              <text className="mls-l2" x={700} y={C_Y[c] + 13} textAnchor="middle">{busyC[c] !== undefined ? L({ vi: "đang xử lý", en: "processing" }) : L({ vi: "sẵn sàng", en: "ready" })}</text>
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
                {flag[m.id] && <text className={"mls-note" + (flag[m.id] === "trùng" ? " bad" : "")} y={-18} textAnchor="middle">{L({ vi: flag[m.id], en: FLAG_EN[flag[m.id]] ?? flag[m.id] })}</text>}
              </g>
            );
          })}
          {rounds > 0 && <text className="mls-clock" x={14} y={50}>{L({ vi: "lượt", en: "round" })} {rounds}</text>}
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn loại queue, sau đó chọn <b>Gửi 5 message</b>. So sánh cả ba cấu hình: Standard, FIFO, FIFO + Message Group ID.</>, en: <>Choose a queue type, then choose <b>Send 5 messages</b>. Compare all three configurations: Standard, FIFO, FIFO + Message Group ID.</> })}</p>
        ) : (
          <>
            <ul className="log" aria-live="polite">
              {log.map((e, i) =>
                e.tag === undefined ? (
                  <li key={i} className={`mt-1.5 block rounded-[12px] px-2.5 py-2 ${e.ok ? "bg-ok-soft" : "bg-bad-soft"}`}>{L(e.msg)}</li>
                ) : (
                  <li key={i}>
                    <span className={`tag mls-tag ${e.cls}`}>{L(e.tag)}</span>
                    <span><b>{e.who}:</b> {L(e.msg)}</span>
                  </li>
                ),
              )}
            </ul>
            {balance && (
              <div className="status mt-2.5">
                {(["A", "B"] as const).map((k) => (
                  <span key={k} className={"pill " + (balance[k] === EXPECT[k] ? "ok" : "bad")}><i />{L({ vi: "Số dư", en: "Balance" })} {k}: {balance[k]} ({L({ vi: "giá trị đúng", en: "correct value" })}: {EXPECT[k]})</span>
                ))}
                <span className="count">{rounds} {L({ vi: "lượt xử lý", en: "processing rounds" })}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
