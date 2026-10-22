import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel } from "../../../lib/animate";
import { rich } from "../diagram";
import "./recovery-sim.css";

// A day on ShopViet's Orders table, 00:00 to 18:00. Two accidents: a bad deploy that
// writes corrupt data at 14:32 (found at 15:10), and an engineer deleting the table at
// 16:05. For each, pick what was set up beforehand and watch what can be recovered.

type IncidentId = "corrupt" | "delete";
type Seg = [number, number];

interface Option {
  id: string;
  name: string;
  ok: boolean;
  /** Good data that is gone after recovery. */
  lost?: Seg;
  /** Where recovery puts the table back to (dot travels there). */
  to?: number;
  /** Replica in another Region that also holds the bad data. */
  replica?: boolean;
  /** The whole table is gone. */
  gone?: boolean;
  /** Time the app is down while a new table is restored. */
  down?: Seg;
  /** The deletion is refused. */
  refused?: boolean;
  /** No data is lost even though the outcome is not the one to pick. */
  kept?: boolean;
  flash?: string;
  lostText: string;
  downText: string;
  note: string;
}

const T_BAD = 14 + 32 / 60;
const T_FOUND = 15 + 10 / 60;
const T_DEL = 16 + 5 / 60;
const BACKUP = 2;
const END = 18;

const INCIDENTS: Record<IncidentId, { name: string; about: string; stop: number; options: Option[] }> = {
  corrupt: {
    name: "Bản deploy lỗi ghi sai dữ liệu",
    about: "Lúc 14:32, bản deploy mới ghi sai giá vào hàng loạt đơn hàng. Lúc 15:10, đội vận hành phát hiện sự cố. Bảng cần được khôi phục về đúng trạng thái ngay trước 14:32.",
    stop: T_FOUND,
    options: [
      { id: "backup", name: "On-demand backup lúc 02:00", ok: false, lost: [BACKUP, T_BAD], to: BACKUP,
        lostText: "12 giờ 32 phút đơn hàng hợp lệ", downText: "trong thời gian restore",
        note: "On-demand backup chỉ khôi phục về **đúng thời điểm tạo backup**. Mọi đơn hàng hợp lệ từ 02:00 tới 14:32 đều bị mất. Loại backup này phù hợp để lưu giữ dài hạn (lưu tới khi được xoá thủ công, phục vụ yêu cầu tuân thủ)." },
      { id: "pitr", name: "Point-in-time recovery (PITR)", ok: true, lost: [T_BAD, T_FOUND], to: T_BAD,
        lostText: "chỉ phần ghi sau 14:32", downText: "trong thời gian restore",
        note: "**PITR** sao lưu liên tục, khôi phục về **bất kỳ giây nào** trong tối đa 35 ngày gần nhất. Chọn 14:31:59. Kết quả luôn là **một bảng mới**; ứng dụng cần được trỏ sang bảng đó." },
      { id: "streams", name: "DynamoDB Streams", ok: false, flash: "không hỗ trợ restore",
        lostText: "không khôi phục được", downText: "không áp dụng",
        note: "Streams là luồng sự kiện được lưu giữ 24 giờ để Lambda xử lý, **không phải backup**. Streams không hỗ trợ thao tác restore." },
      { id: "global", name: "Replica global table tại Tokyo", ok: false, replica: true, flash: "đã nhận dữ liệu lỗi",
        lostText: "replica cũng chứa dữ liệu lỗi", downText: "không áp dụng",
        note: "Global table sao chép mọi thao tác ghi sang Region khác trong khoảng một giây, kể cả thao tác ghi sai. Cơ chế này bảo vệ trước **sự cố toàn Region**, không bảo vệ trước **ghi sai dữ liệu**." },
    ],
  },
  delete: {
    name: "Kỹ sư xoá nhầm bảng production",
    about: "Lúc 16:05, một kỹ sư dọn dẹp bảng test, chọn nhầm bảng Orders và thực hiện DeleteTable. Kết quả phụ thuộc vào cơ chế bảo vệ đã được bật từ trước.",
    stop: T_DEL,
    options: [
      { id: "none", name: "Không có cơ chế bảo vệ", ok: false, gone: true, flash: "DeleteTable",
        lostText: "toàn bộ bảng", downText: "không khôi phục được",
        note: "Bảng và dữ liệu bị xoá vĩnh viễn. Không có bản sao nào để khôi phục." },
      { id: "pitr", name: "PITR đã bật", ok: false, kept: true, down: [T_DEL, 17], flash: "DeleteTable",
        lostText: "không mất (restore ra bảng mới)", downText: "khoảng 1 giờ",
        note: "Khi bảng có PITR bị xoá, DynamoDB lưu giữ một system backup trong 35 ngày và có thể restore. Tuy nhiên, ứng dụng **ngừng hoạt động** trong thời gian restore và phải được trỏ sang bảng mới. PITR là biện pháp khôi phục sau sự cố, không phải biện pháp ngăn chặn sự cố." },
      { id: "protect", name: "Deletion protection đã bật", ok: true, refused: true, flash: "từ chối",
        lostText: "không mất dữ liệu", downText: "0 phút",
        note: "**Deletion protection**: không ai xoá được bảng, kể cả người có quyền DeleteTable, cho tới khi tính năng này được tắt. Không tính phí, chỉ cần bật một lần, không phát sinh tác vụ vận hành." },
    ],
  },
};

const X0 = 70;
const X1 = 790;
const tx = (h: number) => X0 + (h / END) * (X1 - X0);
const LANE = 96;
const LANE2 = 168;
const BAR = 26;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

function Bar({ seg, cls, laneY }: { seg: Seg; cls: string; laneY: number }) {
  const [a, b] = seg;
  if (b <= a) return null;
  return <rect className={`rcv-seg ${cls}`} x={tx(a)} y={laneY - BAR / 2} width={tx(b) - tx(a)} height={BAR} rx={3} />;
}

export default function RecoverySim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [incident, setIncident] = useState<IncidentId>("corrupt");
  const [optId, setOptId] = useState(INCIDENTS.corrupt.options[0].id);
  const [clock, setClock] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

  const inc = INCIDENTS[incident];
  const opt = inc.options.find((o) => o.id === optId) ?? inc.options[0];

  function reset() {
    fx.current?.replaceChildren();
    setClock(0);
    setDone(false);
  }

  function pickIncident(id: IncidentId) {
    if (busy) return;
    setIncident(id);
    setOptId(INCIDENTS[id].options[0].id);
    reset();
  }

  function pickOption(id: string) {
    if (busy) return;
    setOptId(id);
    reset();
  }

  async function run() {
    if (busy) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    const stop = inc.stop;
    for (let t = 0; t <= stop; t += 0.25) {
      if (!alive.current) return;
      setClock(Math.min(t, stop));
      if (!fast) await sleep(28);
    }
    setClock(stop);
    const layer = fx.current;
    if (layer && opt.flash) flashText(layer, tx(stop), LANE + BAR / 2 + 36, opt.flash, opt.ok ? "rcv-flash ok" : "rcv-flash", 1200);
    if (layer && opt.to !== undefined) {
      await travel(layer, [[tx(stop), LANE], [tx(opt.to), LANE]], fast ? 200 : 900, "pkt-edge", 7);
    } else if (layer && opt.replica) {
      await travel(layer, [[tx(T_BAD), LANE], [tx(T_BAD), LANE2]], fast ? 200 : 600, "pkt-bad", 6);
    } else if (!fast) {
      await sleep(500);
    }
    if (!alive.current) return;
    if (opt.refused) {
      for (let t = stop; t <= END; t += 0.25) {
        if (!alive.current) return;
        setClock(Math.min(t, END));
        if (!fast) await sleep(28);
      }
      setClock(END);
    }
    setDone(true);
    setBusy(false);
  }

  const goodEnd = incident === "corrupt" ? Math.min(clock, T_BAD) : Math.min(clock, opt.refused ? END : T_DEL);
  const badSeg: Seg = incident === "corrupt" ? [T_BAD, Math.min(clock, T_FOUND)] : [0, 0];

  return (
    <div className="stage rcv">
      <div className="rcv-row" role="group" aria-label="Sự cố">
        {(Object.keys(INCIDENTS) as IncidentId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === incident} disabled={busy && id !== incident} onClick={() => pickIncident(id)}>
            {INCIDENTS[id].name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">{incident === "corrupt" ? "Phương án khôi phục" : "Cơ chế đã bật"}</span>
        {inc.options.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === opt.id} disabled={busy && o.id !== opt.id} onClick={() => pickOption(o.id)}>
            {o.name}
          </button>
        ))}
        <button className="btn primary rcv-play" onClick={run} disabled={busy}>Chạy</button>
      </div>
      <p className="rcv-about">{inc.about}</p>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 200" role="img" aria-label="Dòng thời gian một ngày của bảng Orders, từ 0 giờ tới 18 giờ, với sự cố và điểm khôi phục">
          {Array.from({ length: END / 3 + 1 }, (_, i) => i * 3).map((h) => (
            <g key={h}>
              <line className="rcv-grid" x1={tx(h)} x2={tx(h)} y1={52} y2={200} />
              <text className="ts" x={tx(h)} y={214} textAnchor="middle">{h}h</text>
            </g>
          ))}
          <text className="rcv-lane-t" x={X0 - 8} y={LANE + 4} textAnchor="end">Orders</text>
          <rect className="rcv-track" x={X0} y={LANE - BAR / 2} width={X1 - X0} height={BAR} rx={3} />
          {opt.gone && done
            ? <Bar seg={[0, T_DEL]} cls="gone" laneY={LANE} />
            : <Bar seg={[0, goodEnd]} cls="good" laneY={LANE} />}
          <Bar seg={badSeg} cls="bad" laneY={LANE} />
          {done && opt.lost && <Bar seg={opt.lost} cls="lost" laneY={LANE} />}
          {done && opt.down && <>
            <Bar seg={opt.down} cls="down" laneY={LANE} />
            <Bar seg={[opt.down[1], END]} cls="good" laneY={LANE} />
            <text className="ts" x={tx(opt.down[1]) + 4} y={LANE + BAR / 2 + 14}>bảng mới</text>
          </>}
          {done && opt.to !== undefined && (
            <g className="rcv-pin">
              <line x1={tx(opt.to)} x2={tx(opt.to)} y1={LANE - BAR / 2 - 6} y2={LANE + BAR / 2 + 6} />
              <text className="rcv-pin-t" x={tx(opt.to)} y={LANE + BAR / 2 + 18} textAnchor="middle">về {opt.id === "pitr" ? "14:31:59" : hhmm(opt.to)}</text>
            </g>
          )}

          {incident === "corrupt" && (
            <g className="rcv-mark">
              <path d={`M${tx(BACKUP)} ${LANE - BAR / 2 - 4} l-6 -10 h12 z`} />
              <text className="ts" x={tx(BACKUP)} y={LANE - BAR / 2 - 18} textAnchor="middle">backup 02:00</text>
            </g>
          )}
          {clock >= inc.stop - 0.01 && (
            <g className="rcv-event">
              <line x1={tx(inc.stop)} x2={tx(inc.stop)} y1={52} y2={LANE + BAR / 2 + 4} />
              <text className="rcv-event-t" x={tx(inc.stop) - 5} y={60} textAnchor="end">{incident === "corrupt" ? "15:10 phát hiện" : "16:05 DeleteTable"}</text>
            </g>
          )}

          {opt.replica && (
            <>
              <text className="rcv-lane-t" x={X0 - 8} y={LANE2 + 4} textAnchor="end">Tokyo</text>
              <rect className="rcv-track" x={X0} y={LANE2 - BAR / 2} width={X1 - X0} height={BAR} rx={3} />
              <Bar seg={[0, Math.min(clock, T_BAD)]} cls="good" laneY={LANE2} />
              {done && <Bar seg={[T_BAD, T_FOUND]} cls="bad" laneY={LANE2} />}
              <text className="ts" x={X0} y={LANE2 + BAR / 2 + 14}>replica của global table</text>
            </>
          )}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!done ? (
          <p className="rcv-hint">Chọn sự cố và phương án khôi phục, sau đó nhấn <b>Chạy</b>.</p>
        ) : (
          <>
            <div className="status">
              <span className={"pill " + (opt.ok || opt.kept ? "ok" : "bad")}><i />Dữ liệu mất: {opt.lostText}</span>
              <span className="pill rcv-muted"><i />Ứng dụng ngừng: {opt.downText}</span>
            </div>
            <p className={`rcv-result ${opt.ok ? "ok" : "bad"}`}>{rich(opt.note)}</p>
          </>
        )}
      </div>
    </div>
  );
}
