import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./messaging-sims.css";

// Flash sale at 20h, minute by minute. The web tier takes orders as fast as customers
// click; the processing tier (payment, stock) only handles a few per worker per minute.
// Without a queue the overflow times out and is lost. With an SQS queue nothing is lost
// and the backlog drains later. Scaling the workers on backlog per instance drains it fast.

type Mode = "direct" | "queue" | "scale";

const ARRIVE = [4, 6, 10, 16, 22, 24, 22, 18, 14, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2];
const PER_WORKER = 4;
const MIN_W = 2;
const MAX_W = 8;
/** Acceptable backlog per instance for the target tracking policy. */
const TARGET = 8;

const MODES: { id: Mode; name: Bi }[] = [
  { id: "direct", name: { vi: "Web tier gọi trực tiếp tầng xử lý", en: "Web tier calls the processing tier directly" } },
  { id: "queue", name: { vi: "SQS, 2 worker cố định", en: "SQS, 2 fixed workers" } },
  { id: "scale", name: { vi: "SQS + scale theo backlog", en: "SQS + scale on backlog" } },
];

interface Tick { arrive: number; done: number; lost: number; backlog: number; workers: number }

function simulate(mode: Mode): Tick[] {
  const out: Tick[] = [];
  let backlog = 0;
  let workers = MIN_W;
  for (const arrive of ARRIVE) {
    if (mode === "direct") {
      const done = Math.min(arrive, workers * PER_WORKER);
      out.push({ arrive, done, lost: arrive - done, backlog: 0, workers });
      continue;
    }
    backlog += arrive;
    const done = Math.min(backlog, workers * PER_WORKER);
    backlog -= done;
    out.push({ arrive, done, lost: 0, backlog, workers });
    // New instances join one minute after the metric moves.
    if (mode === "scale") workers = Math.max(MIN_W, Math.min(MAX_W, Math.ceil(backlog / TARGET)));
  }
  return out;
}

const RESULT: Record<Mode, (s: { lost: number; left: number; peak: number }) => { ok: boolean; text: Bi }> = {
  direct: ({ lost }) => ({ ok: false,
    text: { vi: `**${lost} đơn hàng bị mất.** Tầng xử lý chỉ tiếp nhận được ${MIN_W * PER_WORKER} đơn mỗi phút; các request vượt quá năng lực bị timeout, người dùng nhận lỗi và đơn hàng không thể được xử lý lại.`,
      en: `**${lost} orders lost.** The processing tier accepts only ${MIN_W * PER_WORKER} orders per minute; requests beyond its capacity time out, users get an error and the orders cannot be processed again.` } }),
  queue: ({ left, peak }) => ({ ok: left === 0,
    text: { vi: `**Không có đơn hàng bị mất.** SQS lưu giữ đơn hàng cho tới khi có worker sẵn sàng; tại thời điểm cao điểm có ${peak} đơn đang chờ. Tuy nhiên, 2 worker có thông lượng thấp: kết thúc khung thời gian vẫn còn ${left} đơn trong queue, thời gian chờ xử lý kéo dài.`,
      en: `**No orders lost.** SQS holds the orders until a worker is available; at the peak, ${peak} orders are waiting. However, 2 workers have low throughput: at the end of the window ${left} orders are still in the queue, and the wait for processing is long.` } }),
  scale: ({ left, peak }) => ({ ok: left === 0,
    text: { vi: `**Không mất đơn hàng, thời gian chờ ngắn.** Auto Scaling group sử dụng target tracking theo **backlog per instance** (số message chờ ÷ số worker, giá trị mục tiêu ${TARGET}). Khi backlog tăng, Auto Scaling bổ sung worker; backlog cao nhất là ${peak} đơn, cuối khung thời gian còn ${left} đơn.`,
      en: `**No orders lost, short wait.** The Auto Scaling group uses target tracking on **backlog per instance** (waiting messages ÷ workers, target value ${TARGET}). When the backlog grows, Auto Scaling adds workers; the backlog peaks at ${peak} orders, and ${left} orders remain at the end of the window.` } }),
};

const X0 = 40;
const W = 740;
const CH_Y = 205;
const CH_H = 50;
const bw = W / ARRIVE.length;
const LANE = 110;
const WEB: Pt = [100, LANE];
const Q_IN: Pt = [220, LANE];
const Q_OUT: Pt = [520, LANE];
const wpos = (i: number): Pt => [628 + (i % 2) * 82, 62 + Math.floor(i / 2) * 30];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function QueueBufferSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [mode, setMode] = useState<Mode>("direct");
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const ticks = simulate(mode);
  const cur = shown >= 0 ? ticks[shown] : undefined;
  const sum = (k: keyof Tick) => ticks.slice(0, shown + 1).reduce((s, t) => s + t[k], 0);
  const done = shown === ticks.length - 1;
  const peak = Math.max(...ticks.map((t) => t.backlog));
  const maxY = Math.max(10, peak, ...ticks.map((t) => t.lost));
  const res = RESULT[mode]({ lost: sum("lost"), left: ticks[ticks.length - 1].backlog, peak });

  function pick(m: Mode) {
    if (busy) return;
    setMode(m);
    setShown(-1);
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    setShown(-1);
    const fast = prefersReducedMotion();
    for (let i = 0; i < ticks.length; i++) {
      if (!alive.current) return;
      const t = ticks[i];
      const layer = fx.current;
      const moves: Promise<void>[] = [];
      if (layer && !fast) {
        const dots = Math.min(4, Math.ceil(t.arrive / 5));
        for (let k = 0; k < dots; k++) {
          const lostDot = mode === "direct" && k >= dots - Math.ceil((t.lost / Math.max(1, t.arrive)) * dots) && t.lost > 0;
          const w = wpos(k % t.workers);
          const path: Pt[] = mode === "direct" ? [WEB, [560, LANE], [560, w[1]], [w[0] - 30, w[1]]] : [WEB, Q_IN];
          moves.push(sleep(k * 70).then(() => travel(layer, lostDot ? [WEB, [400, LANE]] : path, 320, lostDot ? "pkt-bad" : "pkt", 5)));
        }
        if (t.lost) flashText(layer, 400, LANE - 16, `${t.lost} timeout`, "flash-bad", 360);
        if (mode !== "direct" && t.done) {
          for (let k = 0; k < Math.min(t.workers, 4); k++) {
            const w = wpos(k);
            moves.push(sleep(120 + k * 50).then(() => travel(layer, [Q_OUT, [560, LANE], [560, w[1]], [w[0] - 30, w[1]]], 300, "pkt-back", 5)));
          }
        }
      }
      setShown(i);
      await Promise.all(moves);
      if (!fast) await sleep(90);
    }
    setBusy(false);
  }

  const backlog = cur?.backlog ?? 0;
  const workers = cur?.workers ?? MIN_W;
  const cells = Math.min(backlog, 60);
  const y = (v: number) => CH_Y + CH_H - (v / maxY) * CH_H;
  const line = ticks.slice(0, shown + 1).map((t, i) => `${i ? "L" : "M"}${X0 + i * bw + bw / 2} ${y(t.backlog)}`).join(" ");

  return (
    <div className="stage qbs">
      <div className="qbs-row" role="group" aria-label={L({ vi: "Phương án kết nối web tier với tầng xử lý", en: "How to connect the web tier to the processing tier" })}>
        {MODES.map((m) => (
          <button key={m.id} className="chip" aria-pressed={m.id === mode} disabled={busy && m.id !== mode} onClick={() => pick(m.id)}>
            {L(m.name)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="qbs-about">{L({ vi: "Flash sale lúc 20h: số đơn hàng mỗi phút tăng gấp 6 lần trong vài phút.", en: "Flash sale at 20:00: orders per minute grow 6-fold within a few minutes." })}</span>
        <button className="btn primary" onClick={run} disabled={busy}>{L({ vi: "Chạy mô phỏng flash sale", en: "Run flash sale simulation" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 262" role="img" aria-label={L({ vi: "Đơn hàng được chuyển từ web tier qua SQS queue tới các worker xử lý; biểu đồ bên dưới thể hiện số đơn hàng chờ theo từng phút", en: "Orders move from the web tier through an SQS queue to the processing workers; the chart below shows the orders waiting each minute" })}>
          <path className="qbs-link" d={`M${WEB[0]} ${LANE} H${Q_IN[0]} M${Q_OUT[0]} ${LANE} H560`} />
          <path className="qbs-link" d={`M560 ${wpos(0)[1]} V${wpos(MAX_W - 1)[1]}`} />
          {Array.from({ length: MAX_W / 2 }, (_, r) => (
            <path key={r} className="qbs-link" d={`M560 ${wpos(r * 2)[1]} H${wpos(0)[0] - 36}`} />
          ))}
          <g className="qbs-node">
            <rect x={40} y={LANE - 25} width={120} height={50} rx={8} />
            <text className="qbs-l1" x={100} y={LANE - 3} textAnchor="middle">Web tier</text>
            <text className="qbs-l2" x={100} y={LANE + 13} textAnchor="middle">{cur ? L({ vi: `+${cur.arrive} đơn/phút`, en: `+${cur.arrive} orders/min` }) : L({ vi: "tiếp nhận đơn", en: "takes orders" })}</text>
          </g>
          <g className={"qbs-queue" + (mode === "direct" ? " off" : "")}>
            <rect x={Q_IN[0]} y={LANE - 30} width={Q_OUT[0] - Q_IN[0]} height={60} rx={10} />
            <text className="qbs-l2" x={Q_IN[0] + 8} y={LANE - 36}>
              {mode === "direct" ? L({ vi: "không sử dụng SQS queue", en: "no queue" }) : L({ vi: `Amazon SQS · ${backlog} đơn đang chờ`, en: `Amazon SQS · ${backlog} orders waiting` })}
            </text>
            {Array.from({ length: cells }, (_, i) => (
              <rect key={i} className="qbs-msg" x={Q_OUT[0] - 16 - (i % 20) * 14.5} y={LANE - 23 + Math.floor(i / 20) * 16} width={11} height={12} rx={2} />
            ))}
            {backlog > 60 && <text className="qbs-more" x={Q_IN[0] + 6} y={LANE + 46}>+{backlog - 60}</text>}
          </g>
          <text className="qbs-l2" x={wpos(0)[0] - 36} y={42}>{mode === "direct" ? L({ vi: "Tầng xử lý", en: "Processing tier" }) : L({ vi: "Worker EC2", en: "EC2 workers" })} · {workers} {L({ vi: "instance", en: workers === 1 ? "instance" : "instances" })}</text>
          {Array.from({ length: MAX_W }, (_, i) => {
            const [cx, cy] = wpos(i);
            const on = i < workers;
            const cls = !on ? "ghost" : cur && cur.done > i * PER_WORKER ? "busy" : "";
            return (
              <g key={i} className={`qbs-worker ${cls}`}>
                <rect x={cx - 36} y={cy - 11} width={72} height={22} rx={5} />
                <text x={cx} y={cy + 4} textAnchor="middle">{on ? `worker ${i + 1}` : "—"}</text>
              </g>
            );
          })}
          <line className="qbs-axis" x1={X0} x2={X0 + W} y1={CH_Y + CH_H} y2={CH_Y + CH_H} />
          {ticks.map((t, i) => i <= shown && t.lost > 0 && (
            <rect key={i} className="qbs-lost" x={X0 + i * bw + 4} y={y(t.lost)} width={bw - 8} height={CH_Y + CH_H - y(t.lost)} rx={2} />
          ))}
          {shown >= 0 && mode !== "direct" && <path className="qbs-line" d={line} />}
          {[0, 6, 12, 18].map((m) => (
            <text key={m} className="ts" x={X0 + m * bw + bw / 2} y={CH_Y + CH_H + 15} textAnchor="middle">20:{String(m).padStart(2, "0")}</text>
          ))}
          <text className="ts" x={X0} y={CH_Y - 6}>{mode === "direct" ? L({ vi: "số đơn bị mất mỗi phút", en: "orders lost per minute" }) : L({ vi: "số đơn chờ trong queue", en: "orders waiting in the queue" })}</text>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!cur ? (
          <p className="qbs-hint">{L({ vi: <>Chọn phương án kết nối, sau đó chọn <b>Chạy mô phỏng flash sale</b>. So sánh kết quả của cả ba phương án.</>, en: <>Choose a connection option, then choose <b>Run flash sale simulation</b>. Compare the results of all three options.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">20:{String(shown).padStart(2, "0")} · {L({ vi: "tiếp nhận", en: "received" })} {sum("arrive")} · {L({ vi: "hoàn tất", en: "completed" })} {sum("done")}</span>
              <span className={"pill " + (sum("lost") ? "bad" : "ok")}><i />{sum("lost")} {L({ vi: "đơn mất", en: "lost" })}</span>
              {mode !== "direct" && <span className="pill qbs-wait"><i />{backlog} {L({ vi: "đơn chờ", en: "waiting" })}</span>}
            </div>
            {done && <p className={`qbs-result ${res.ok ? "ok" : "bad"}`}>{rich(L(res.text))}</p>}
          </>
        )}
      </div>
    </div>
  );
}
