import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./messaging-sims.css";

// The life of one SQS message, played as a short script. Messages are small cards that
// slide between the producer, one or two queue lanes, the workers and the "deleted"
// column. Each scenario is one ShopViet problem and the queue setting that solves it:
// visibility timeout with Spot workers, a dead-letter queue, long polling, a delay
// queue, and two queues for two priorities.

type Place = "src" | "q" | "q2" | "w1" | "w2" | "done";
type Kind = "pro" | "bad";
type WState = "idle" | "busy" | "dead" | "wait";
type Tone = "ok" | "bad" | "info" | "edge";

interface Tok { id: string; label: string; kind?: Kind; place: Place; note?: string; dim?: boolean; seq?: number }

interface Frame {
  t: number;
  who: string;
  tag: string;
  tone: Tone;
  msg: string;
  set?: { [id: string]: Partial<Tok> | undefined };
  w?: Partial<Record<"w1" | "w2", WState>>;
  calls?: [all: number, empty: number];
}

interface Setup {
  q: string;
  q2?: { label: string; kind: "dlq" | "queue"; ghost?: boolean };
  workers: { w1: string; w2?: string };
  init: Tok[];
  counter?: boolean;
  frames: Frame[];
  ok: boolean;
  result: string;
}

interface MScenario {
  name: string;
  request: string;
  toggle?: { label: string; initial: boolean };
  run(on: boolean): Setup;
}

const tok = (id: string, place: Place = "q", kind?: Kind): Tok => ({ id, label: id, place, kind });

/** Receive, fail and come back again: the frames of one failed attempt. */
function attempt(n: number, t: number): Frame[] {
  return [
    { t, who: "Worker", tag: "LỖI", tone: "bad", set: { "#7": { place: "w1", note: `lần ${n}` } }, w: { w1: "busy" },
      msg: n === 1 ? "Nhận **#7** (lần 1). Đơn có mã tỉnh sai, code ném lỗi và không xoá message." : `Nhận #7 lần ${n}, lại lỗi.` },
    { t: t + 30, who: "Queue", tag: "HIỆN LẠI", tone: "edge", set: { "#7": { place: "q", note: "hiện lại" } }, w: { w1: "idle" },
      msg: "Hết visibility timeout (30 s), #7 hiện lại trong queue." },
  ];
}

const SCENARIOS: MScenario[] = [
  {
    name: "Máy Spot bị thu hồi giữa chừng",
    request: "3 đơn trong queue · visibility timeout 60 s",
    run: () => ({
      q: "Queue đơn hàng · visibility timeout 60 s",
      workers: { w1: "Worker 1 · Spot", w2: "Worker 2 · Spot" },
      init: [tok("#1"), tok("#2"), tok("#3")],
      frames: [
        { t: 0, who: "Worker 1", tag: "NHẬN", tone: "info", set: { "#1": { place: "w1", note: "ẩn 60 s" } }, w: { w1: "busy" },
          msg: "Nhận **#1**. SQS chưa xoá message, chỉ ẩn nó trong **visibility timeout** để worker khác không lấy trùng." },
        { t: 1, who: "Worker 2", tag: "NHẬN", tone: "info", set: { "#2": { place: "w2", note: "ẩn 60 s" } }, w: { w2: "busy" },
          msg: "Nhận #2, cũng bị ẩn 60 s." },
        { t: 20, who: "Worker 1", tag: "MẤT MÁY", tone: "bad", w: { w1: "dead" },
          msg: "AWS thu hồi máy Spot khi #1 đang làm dở. Worker chưa kịp gọi `DeleteMessage`." },
        { t: 35, who: "Worker 2", tag: "XOÁ", tone: "ok", set: { "#2": { place: "done", note: "" } }, w: { w2: "idle" },
          msg: "Xử lý xong #2 rồi mới gọi `DeleteMessage`. Lúc này #2 mới rời queue." },
        { t: 36, who: "Worker 2", tag: "NHẬN", tone: "info", set: { "#3": { place: "w2", note: "ẩn 60 s" } }, w: { w2: "busy" },
          msg: "Nhận #3." },
        { t: 60, who: "Queue", tag: "HIỆN LẠI", tone: "edge", set: { "#1": { place: "q", note: "hiện lại" } },
          msg: "Hết 60 s mà không ai xoá #1, SQS cho nó hiện lại trong queue." },
        { t: 70, who: "Worker 2", tag: "XOÁ", tone: "ok", set: { "#3": { place: "done", note: "" }, "#1": { place: "w2", note: "lần 2" } },
          msg: "Xong #3, nhận tiếp #1 (lần nhận thứ 2)." },
        { t: 105, who: "Worker 2", tag: "XOÁ", tone: "ok", set: { "#1": { place: "done", note: "" } }, w: { w1: "idle", w2: "idle" },
          msg: "Xong #1. Trong lúc đó Auto Scaling group đã thay máy Spot bị thu hồi." },
      ],
      ok: true,
      result: "Ba đơn đều xong dù một máy chết giữa chừng. Message chỉ biến mất khi worker xoá nó, nên worker đọc SQS chạy trên **Spot Instances** vẫn an toàn mà rẻ: việc dở dang tự được làm lại.",
    }),
  },
  {
    name: "Một đơn lỗi mãi",
    request: "#7 có dữ liệu hỏng · visibility timeout 30 s",
    toggle: { label: "Gắn dead-letter queue (maxReceiveCount = 3)", initial: false },
    run: (dlq) => ({
      q: "Queue đơn hàng",
      q2: { label: dlq ? "Dead-letter queue" : "chưa có dead-letter queue", kind: "dlq", ghost: !dlq },
      workers: { w1: "Worker" },
      init: [tok("#7", "q", "bad"), tok("#8"), tok("#9")],
      frames: dlq
        ? [
            ...attempt(1, 0), ...attempt(2, 31),
            { t: 62, who: "Worker", tag: "LỖI", tone: "bad", set: { "#7": { place: "w1", note: "lần 3" } }, w: { w1: "busy" }, msg: "Nhận #7 lần 3, lại lỗi." },
            { t: 92, who: "Queue", tag: "DLQ", tone: "edge", set: { "#7": { place: "q2", note: "" } }, w: { w1: "idle" },
              msg: "#7 đã bị nhận quá **maxReceiveCount** (3) mà chưa ai xoá: SQS chuyển nó sang **dead-letter queue**." },
            { t: 93, who: "Worker", tag: "NHẬN", tone: "info", set: { "#8": { place: "w1" } }, w: { w1: "busy" }, msg: "Worker rảnh tay cho đơn khác: nhận #8." },
            { t: 95, who: "Worker", tag: "XOÁ", tone: "ok", set: { "#8": { place: "done" }, "#9": { place: "w1" } }, msg: "Xong #8, nhận #9." },
            { t: 97, who: "Worker", tag: "XOÁ", tone: "ok", set: { "#9": { place: "done" } }, w: { w1: "idle" }, msg: "Xong #9." },
          ]
        : [
            ...attempt(1, 0), ...attempt(2, 31), ...attempt(3, 62),
            { t: 93, who: "Worker", tag: "LỖI", tone: "bad", set: { "#7": { place: "w1", note: "lần 4" } }, w: { w1: "busy" },
              msg: "Lần 4, 5, 6… Worker mất thời gian cho một đơn không bao giờ xử lý được, #8 và #9 phải chờ." },
          ],
      ok: dlq,
      result: dlq
        ? "#7 nằm riêng trong DLQ để đội dev xem vì sao lỗi, các đơn khác chạy bình thường. Đặt CloudWatch alarm trên số message trong DLQ để biết ngay."
        : "#7 cứ quay vòng cho tới khi hết **retention period** (mặc định 4 ngày) rồi bị xoá, không ai biết vì sao. Gắn một **dead-letter queue** để tách nó ra.",
    }),
  },
  {
    name: "Ban đêm queue gần như rỗng",
    request: "2h sáng · 1 đơn trong 15 giây",
    toggle: { label: "Long polling (WaitTimeSeconds = 20)", initial: false },
    run: (long) => ({
      q: "Queue đơn hàng",
      workers: { w1: "Worker" },
      init: [tok("#1", "src")],
      counter: true,
      frames: long
        ? [
            { t: 0, who: "Worker", tag: "CHỜ", tone: "info", w: { w1: "wait" }, calls: [1, 0],
              msg: "`ReceiveMessage` với **WaitTimeSeconds = 20**: SQS giữ kết nối, chờ tối đa 20 s cho tới khi có message." },
            { t: 14, who: "Web", tag: "GỬI", tone: "info", set: { "#1": { place: "q" } }, msg: "Khách đặt một đơn." },
            { t: 14, who: "Worker", tag: "NHẬN", tone: "ok", set: { "#1": { place: "w1" } }, w: { w1: "busy" }, calls: [1, 0],
              msg: "SQS trả #1 ngay khi có, không đợi hết 20 s." },
            { t: 15, who: "Worker", tag: "XOÁ", tone: "ok", set: { "#1": { place: "done" } }, w: { w1: "idle" }, msg: "Xong #1." },
          ]
        : [
            { t: 0, who: "Worker", tag: "RỖNG", tone: "bad", calls: [1, 1], msg: "`ReceiveMessage` trả về rỗng ngay lập tức (**short polling**, mặc định)." },
            { t: 1, who: "Worker", tag: "RỖNG", tone: "bad", calls: [2, 2], msg: "Gọi lại, vẫn rỗng." },
            { t: 2, who: "Worker", tag: "RỖNG", tone: "bad", calls: [3, 3],
              msg: "Short polling chỉ hỏi một phần server của SQS, nên đôi khi trả rỗng dù queue có message." },
            { t: 14, who: "Web", tag: "GỬI", tone: "info", set: { "#1": { place: "q" } }, calls: [15, 15], msg: "Khách đặt một đơn. Worker đã gọi rỗng 15 lần." },
            { t: 15, who: "Worker", tag: "NHẬN", tone: "ok", set: { "#1": { place: "w1" } }, w: { w1: "busy" }, calls: [16, 15], msg: "Lần gọi thứ 16 mới lấy được #1." },
            { t: 16, who: "Worker", tag: "XOÁ", tone: "ok", set: { "#1": { place: "done" } }, w: { w1: "idle" }, msg: "Xong #1." },
          ],
      ok: long,
      result: long
        ? "1 lần gọi thay vì 16. **Long polling** bớt các lần gọi rỗng nên bớt tiền, vì SQS tính tiền theo số request."
        : "16 lần gọi, 15 lần rỗng, cho một đơn. Lần gọi rỗng vẫn tính tiền. Cả đêm là hàng chục nghìn request vô ích. Bật **long polling**.",
    }),
  },
  {
    name: "Kho cần vài giây để cập nhật",
    request: "Đơn mới · hệ thống kho cần ~8 s",
    toggle: { label: "Delay queue (DelaySeconds = 10)", initial: false },
    run: (delay) => ({
      q: delay ? "Queue giao hàng · delay 10 s" : "Queue giao hàng",
      workers: { w1: "Worker giao hàng" },
      init: [tok("#12", "src")],
      frames: delay
        ? [
            { t: 0, who: "Web", tag: "HOÃN", tone: "edge", set: { "#12": { place: "q", dim: true, note: "hoãn 10 s" } },
              msg: "Đơn #12 vào **delay queue**: bị ẩn 10 s ngay từ lúc gửi, chưa worker nào thấy." },
            { t: 10, who: "Queue", tag: "HIỆN", tone: "info", set: { "#12": { dim: false, note: "" } }, msg: "Hết 10 s, #12 hiện ra. Kho đã cập nhật xong." },
            { t: 10, who: "Worker", tag: "NHẬN", tone: "info", set: { "#12": { place: "w1" } }, w: { w1: "busy" }, msg: "Nhận #12." },
            { t: 11, who: "Worker", tag: "XOÁ", tone: "ok", set: { "#12": { place: "done" } }, w: { w1: "idle" }, msg: "Tạo vận đơn thành công ngay lần đầu." },
          ]
        : [
            { t: 0, who: "Web", tag: "GỬI", tone: "info", set: { "#12": { place: "q" } }, msg: "Đơn #12 vào queue." },
            { t: 0, who: "Worker", tag: "NHẬN", tone: "info", set: { "#12": { place: "w1" } }, w: { w1: "busy" }, msg: "Worker nhận ngay." },
            { t: 1, who: "Worker", tag: "LỖI", tone: "bad", set: { "#12": { note: "lỗi" } }, msg: "Kho chưa trừ tồn xong, worker không tìm thấy hàng để giao." },
            { t: 31, who: "Queue", tag: "HIỆN LẠI", tone: "edge", set: { "#12": { place: "q", note: "hiện lại" } }, w: { w1: "idle" },
              msg: "30 s sau (visibility timeout) #12 hiện lại." },
            { t: 32, who: "Worker", tag: "XOÁ", tone: "ok", set: { "#12": { place: "done", note: "" } }, msg: "Lần 2 mới xong." },
          ],
      ok: delay,
      result: delay
        ? "**Delay queue** hoãn message **lúc vừa gửi vào**. Khác với visibility timeout: cái đó ẩn message **sau khi** một worker đã nhận nó."
        : "Đơn nào cũng lỗi một lần rồi mới xong, chậm thêm 30 s và log đầy lỗi giả. Cần hoãn message ngay từ lúc gửi: **delay queue**.",
    }),
  },
  {
    name: "Ảnh của khách Pro phải xong trước",
    request: "3 ảnh Lite gửi trước, 1 ảnh Pro gửi sau",
    toggle: { label: "Tách hai queue: Pro và Lite", initial: false },
    run: (two) => {
      const lite = ["L1", "L2", "L3"];
      const order = two ? ["P1", ...lite] : [...lite, "P1"];
      const frames: Frame[] = order.map((id, i) => ({
        t: i * 20, who: "Worker", tag: "XỬ LÝ", tone: id === "P1" ? "ok" : "info",
        set: { [id]: { place: "w1" }, ...(i ? { [order[i - 1]]: { place: "done" } } : {}) },
        w: { w1: "busy" },
        msg: id === "P1"
          ? two ? "Worker luôn hỏi **queue Pro** trước, có ảnh Pro là làm ngay." : "Tới lượt ảnh Pro, sau khi đã làm hết 3 ảnh Lite."
          : two && i === 1 ? "Queue Pro rỗng mới hỏi sang queue Lite." : `Làm ảnh ${id}.`,
      }));
      frames.push({ t: order.length * 20, who: "Worker", tag: "XOÁ", tone: "ok", set: { [order[order.length - 1]]: { place: "done" } }, w: { w1: "idle" }, msg: "Xong cả 4 ảnh." });
      return {
        q: two ? "Queue Pro" : "Queue ảnh (chung)",
        q2: two ? { label: "Queue Lite", kind: "queue" as const } : undefined,
        workers: { w1: "Worker EC2" },
        init: two ? [tok("P1", "q", "pro"), ...lite.map((id) => tok(id, "q2"))] : [...lite.map((id) => tok(id)), tok("P1", "q", "pro")],
        frames,
        ok: two,
        result: two
          ? "Hai **queue standard** riêng, worker ưu tiên đọc queue Pro. Ảnh Pro không phải xếp sau ảnh Lite nữa."
          : "Khách Pro chờ 3 lượt. Một queue không có độ ưu tiên; đổi visibility timeout hay kiểu polling cũng không đổi được thứ tự này.",
      };
    },
  },
];

const LANE_Y = { q: 100, q2: 205 } as const;
const W_Y = { w1: 100, w2: 205 } as const;
const SRC: [number, number] = [70, 100];
const TW = 38;
const TH = 26;

function positions(toks: Tok[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const lane = (p: "q" | "q2") => toks.filter((t) => t.place === p).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  for (const p of ["q", "q2"] as const) lane(p).forEach((t, i) => (out[t.id] = { x: 455 - i * 46, y: LANE_Y[p] }));
  toks.filter((t) => t.place === "done").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    .forEach((t, i) => (out[t.id] = { x: 768, y: 62 + i * 34 }));
  for (const t of toks) {
    if (t.place === "src") out[t.id] = { x: SRC[0], y: SRC[1] };
    if (t.place === "w1" || t.place === "w2") out[t.id] = { x: 552, y: W_Y[t.place] };
  }
  return out;
}

const W_TEXT: Record<WState, string> = { idle: "rảnh", busy: "đang xử lý", dead: "bị thu hồi", wait: "đang chờ message" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type LogLine = { tag?: string; tone?: Tone; who?: string; t?: number; ok?: boolean; msg: ReactNode };

export default function MessageLifeSim() {
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(sc.toggle?.initial ?? false);
  const setup = sc.run(on);
  const [toks, setToks] = useState<Tok[]>(() => setup.init.map((t, i) => ({ ...t, seq: i })));
  const [ws, setWs] = useState<Record<string, WState>>({});
  const [clock, setClock] = useState(0);
  const [calls, setCalls] = useState<[number, number]>([0, 0]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  function reset(s: Setup = setup) {
    setToks(s.init.map((t, i) => ({ ...t, seq: i })));
    setWs({});
    setClock(0);
    setCalls([0, 0]);
    setLog([]);
  }

  function pick(i: number) {
    if (busy) return;
    const next = SCENARIOS[i];
    const v = next.toggle?.initial ?? false;
    setIndex(i);
    setOn(v);
    reset(next.run(v));
  }

  async function play() {
    if (busy) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    await sleep(fast ? 0 : 200);
    let seq = 100;
    for (const f of setup.frames) {
      if (!alive.current) return;
      setToks((cur) => cur.map((t) => {
        const ch = f.set?.[t.id];
        if (!ch) return t;
        const moved = ch.place && ch.place !== t.place;
        return { ...t, ...ch, seq: moved ? seq++ : t.seq };
      }));
      if (f.w) setWs((s) => ({ ...s, ...f.w }));
      setClock(f.t);
      if (f.calls) setCalls(f.calls);
      setLog((l) => [...l, { tag: f.tag, tone: f.tone, who: f.who, t: f.t, msg: rich(f.msg) }]);
      await sleep(fast ? 120 : 1050);
    }
    setLog((l) => [...l, { ok: setup.ok, msg: rich(setup.result) }]);
    setBusy(false);
  }

  const pos = positions(toks);
  const workers = (["w1", "w2"] as const).filter((w) => setup.workers[w]);
  const q2 = setup.q2;

  return (
    <div className="stage mls">
      <div className="mls-scenarios" role="group" aria-label="Tình huống">
        {SCENARIOS.map((s, i) => (
          <button key={s.name} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="mls-req">{sc.request}</code>
        {sc.toggle && (
          <label className="mls-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(sc.run(e.target.checked)); }} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary" onClick={play} disabled={busy}>Chạy</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 220" role="img" aria-label="Message đi từ web vào queue SQS, tới worker, rồi bị xoá hoặc chuyển sang queue khác">
          <text className="mls-clock" x={14} y={50}>t = {clock} s</text>
          {setup.counter && (
            <text className="mls-counter" x={14} y={240}>ReceiveMessage: {calls[0]} lần · {calls[1]} lần rỗng</text>
          )}
          <path className="mls-link" d={`M${SRC[0] + 40} ${LANE_Y.q} H180 M480 ${LANE_Y.q} H${552 - 30}`} />
          {workers.includes("w2") && <path className="mls-link" d={`M500 ${LANE_Y.q} V${W_Y.w2} H522`} />}
          {q2?.kind === "queue" && <path className="mls-link" d={`M${SRC[0]} ${LANE_Y.q + 22} V${LANE_Y.q2} H180 M480 ${LANE_Y.q2} H500 V${LANE_Y.q} H522`} />}
          {q2?.kind === "dlq" && <path className={"mls-link dash" + (q2.ghost ? " ghost" : "")} d={`M330 ${LANE_Y.q + 24} V${LANE_Y.q2 - 24}`} />}
          <g className="mls-src">
            <rect x={SRC[0] - 45} y={SRC[1] - 22} width={90} height={44} rx={8} />
            <text x={SRC[0]} y={SRC[1] + 4} textAnchor="middle">Web</text>
          </g>
          <g className="mls-lane">
            <rect x={180} y={LANE_Y.q - 24} width={300} height={48} rx={10} />
            <text x={186} y={LANE_Y.q - 30}>{setup.q}</text>
          </g>
          {q2 && (
            <g className={`mls-lane ${q2.kind}` + (q2.ghost ? " ghost" : "")}>
              <rect x={180} y={LANE_Y.q2 - 24} width={300} height={48} rx={10} />
              <text x={186} y={LANE_Y.q2 - 30}>{q2.label}</text>
            </g>
          )}
          {workers.map((w) => (
            <g key={w} className={`mls-worker ${ws[w] ?? "idle"}`}>
              <rect x={522} y={W_Y[w] - 26} width={160} height={52} rx={8} />
              <text className="mls-l1" x={632} y={W_Y[w] - 3} textAnchor="middle">{setup.workers[w]}</text>
              <text className="mls-l2" x={632} y={W_Y[w] + 13} textAnchor="middle">{W_TEXT[ws[w] ?? "idle"]}</text>
            </g>
          ))}
          <text className="mls-l2" x={768} y={44} textAnchor="middle">đã xoá</text>
          <line className="mls-sep" x1={720} x2={720} y1={36} y2={240} />
          {toks.map((t) => {
            const p = pos[t.id];
            return (
              <g key={t.id} className={`mls-tok ${t.kind ?? ""}` + (t.place === "src" ? " hidden" : "") + (t.dim ? " dim" : "") + (t.place === "done" ? " done" : "")}
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                <rect x={-TW / 2} y={-TH / 2} width={TW} height={TH} rx={5} />
                <text y={4} textAnchor="middle">{t.label}</text>
                {t.note && <text className="mls-note" y={-TH / 2 - 5} textAnchor="middle">{t.note}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="mls-hint">Bấm <b>Chạy</b> để xem từng bước.{sc.toggle ? " Đổi công tắc rồi chạy lại để so sánh." : ""}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === undefined ? (
                <li key={i} className={`mls-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag mls-tag ${e.tone}`}>{e.tag}</span>
                  <span><b>{e.t} s · {e.who}:</b> {e.msg}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
