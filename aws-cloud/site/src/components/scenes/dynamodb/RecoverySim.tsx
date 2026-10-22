import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./recovery-sim.css";

// A day on ShopViet's Orders table, 00:00 to 18:00. Two accidents: a bad deploy that
// writes corrupt data at 14:32 (found at 15:10), and an engineer deleting the table at
// 16:05. For each, pick what was set up beforehand and watch what can be recovered.

type IncidentId = "corrupt" | "delete";
type Seg = [number, number];

interface Option {
  id: string;
  name: Bi;
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
  flash?: Bi;
  lostText: Bi;
  downText: Bi;
  note: Bi;
}

const T_BAD = 14 + 32 / 60;
const T_FOUND = 15 + 10 / 60;
const T_DEL = 16 + 5 / 60;
const BACKUP = 2;
const END = 18;

const INCIDENTS: Record<IncidentId, { name: Bi; about: Bi; stop: number; options: Option[] }> = {
  corrupt: {
    name: { vi: "Bản deploy lỗi ghi sai dữ liệu", en: "A bad deploy writes wrong data" },
    about: { vi: "Lúc 14:32, bản deploy mới ghi sai giá vào hàng loạt đơn hàng. Lúc 15:10, đội vận hành phát hiện sự cố. Bảng cần được khôi phục về đúng trạng thái ngay trước 14:32.", en: "At 14:32, a new deploy writes wrong prices into a large batch of orders. At 15:10, the operations team spots the problem. The table must be restored to its exact state just before 14:32." },
    stop: T_FOUND,
    options: [
      { id: "backup", name: { vi: "On-demand backup lúc 02:00", en: "On-demand backup at 02:00" }, ok: false, lost: [BACKUP, T_BAD], to: BACKUP,
        lostText: { vi: "12 giờ 32 phút đơn hàng hợp lệ", en: "12 h 32 min of valid orders" }, downText: { vi: "trong thời gian restore", en: "during the restore" },
        note: { vi: "On-demand backup chỉ khôi phục về **đúng thời điểm tạo backup**. Mọi đơn hàng hợp lệ từ 02:00 tới 14:32 đều bị mất. Loại backup này phù hợp để lưu giữ dài hạn (lưu tới khi được xoá thủ công, phục vụ yêu cầu tuân thủ).", en: "An on-demand backup restores only to **the moment the backup was created**. All valid orders from 02:00 to 14:32 are lost. This type of backup suits long-term retention (kept until deleted manually, for compliance requirements)." } },
      { id: "pitr", name: { vi: "Point-in-time recovery (PITR)", en: "Point-in-time recovery (PITR)" }, ok: true, lost: [T_BAD, T_FOUND], to: T_BAD,
        lostText: { vi: "chỉ phần ghi sau 14:32", en: "only the writes after 14:32" }, downText: { vi: "trong thời gian restore", en: "during the restore" },
        note: { vi: "**PITR** sao lưu liên tục, khôi phục về **bất kỳ giây nào** trong tối đa 35 ngày gần nhất. Chọn 14:31:59. Kết quả luôn là **một bảng mới**; ứng dụng cần được trỏ sang bảng đó.", en: "**PITR** backs up continuously and restores to **any second** within the last 35 days at most. Choose 14:31:59. The result is always **a new table**; the application must be pointed to it." } },
      { id: "streams", name: { vi: "DynamoDB Streams", en: "DynamoDB Streams" }, ok: false, flash: { vi: "không hỗ trợ restore", en: "no restore support" },
        lostText: { vi: "không khôi phục được", en: "cannot be recovered" }, downText: { vi: "không áp dụng", en: "not applicable" },
        note: { vi: "Streams là luồng sự kiện được lưu giữ 24 giờ để Lambda xử lý, **không phải backup**. Streams không hỗ trợ thao tác restore.", en: "Streams is an event stream retained for 24 hours for Lambda to process; it is **not a backup**. Streams does not support restore operations." } },
      { id: "global", name: { vi: "Replica global table tại Tokyo", en: "Global table replica in Tokyo" }, ok: false, replica: true, flash: { vi: "đã nhận dữ liệu lỗi", en: "got the bad data" },
        lostText: { vi: "replica cũng chứa dữ liệu lỗi", en: "the replica holds the bad data too" }, downText: { vi: "không áp dụng", en: "not applicable" },
        note: { vi: "Global table sao chép mọi thao tác ghi sang Region khác trong khoảng một giây, kể cả thao tác ghi sai. Cơ chế này bảo vệ trước **sự cố toàn Region**, không bảo vệ trước **ghi sai dữ liệu**.", en: "A global table replicates every write to the other Regions within about a second, including bad writes. It protects against **a Region-wide outage**, not against **writing wrong data**." } },
    ],
  },
  delete: {
    name: { vi: "Kỹ sư xoá nhầm bảng production", en: "An engineer deletes the production table" },
    about: { vi: "Lúc 16:05, một kỹ sư dọn dẹp bảng test, chọn nhầm bảng Orders và thực hiện DeleteTable. Kết quả phụ thuộc vào cơ chế bảo vệ đã được bật từ trước.", en: "At 16:05, an engineer cleaning up test tables picks the Orders table by mistake and runs DeleteTable. The outcome depends on the protection enabled beforehand." },
    stop: T_DEL,
    options: [
      { id: "none", name: { vi: "Không có cơ chế bảo vệ", en: "No protection" }, ok: false, gone: true, flash: { vi: "DeleteTable", en: "DeleteTable" },
        lostText: { vi: "toàn bộ bảng", en: "the whole table" }, downText: { vi: "không khôi phục được", en: "cannot be recovered" },
        note: { vi: "Bảng và dữ liệu bị xoá vĩnh viễn. Không có bản sao nào để khôi phục.", en: "The table and its data are permanently deleted. There is no copy to restore from." } },
      { id: "pitr", name: { vi: "PITR đã bật", en: "PITR enabled" }, ok: false, kept: true, down: [T_DEL, 17], flash: { vi: "DeleteTable", en: "DeleteTable" },
        lostText: { vi: "không mất (restore ra bảng mới)", en: "none (restored to a new table)" }, downText: { vi: "khoảng 1 giờ", en: "about 1 hour" },
        note: { vi: "Khi bảng có PITR bị xoá, DynamoDB lưu giữ một system backup trong 35 ngày và có thể restore. Tuy nhiên, ứng dụng **ngừng hoạt động** trong thời gian restore và phải được trỏ sang bảng mới. PITR là biện pháp khôi phục sau sự cố, không phải biện pháp ngăn chặn sự cố.", en: "When a table with PITR is deleted, DynamoDB keeps a system backup for 35 days that can be restored. However, the application is **down** during the restore and must be pointed to the new table. PITR is a way to recover after an incident, not a way to prevent it." } },
      { id: "protect", name: { vi: "Deletion protection đã bật", en: "Deletion protection enabled" }, ok: true, refused: true, flash: { vi: "từ chối", en: "denied" },
        lostText: { vi: "không mất dữ liệu", en: "no data lost" }, downText: { vi: "0 phút", en: "0 minutes" },
        note: { vi: "**Deletion protection**: không ai xoá được bảng, kể cả người có quyền DeleteTable, cho tới khi tính năng này được tắt. Chỉ cần bật một lần, không phát sinh tác vụ vận hành.", en: "**Deletion protection**: no one, not even users with the DeleteTable permission, can delete the table until the feature is turned off. You turn it on once, with no ongoing operational tasks." } },
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
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [incident, setIncident] = useState<IncidentId>("corrupt");
  const [optId, setOptId] = useState(INCIDENTS.corrupt.options[0].id);
  const [clock, setClock] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
    if (layer && opt.flash) flashText(layer, tx(stop), LANE + BAR / 2 + 36, L(opt.flash), opt.ok ? "rcv-flash ok" : "rcv-flash", 1200);
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
      <div className="rcv-row" role="group" aria-label={L({ vi: "Sự cố", en: "Incident" })}>
        {(Object.keys(INCIDENTS) as IncidentId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === incident} disabled={busy && id !== incident} onClick={() => pickIncident(id)}>
            {L(INCIDENTS[id].name)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">{incident === "corrupt" ? L({ vi: "Phương án khôi phục", en: "Recovery option" }) : L({ vi: "Cơ chế đã bật", en: "Protection enabled" })}</span>
        {inc.options.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === opt.id} disabled={busy && o.id !== opt.id} onClick={() => pickOption(o.id)}>
            {L(o.name)}
          </button>
        ))}
        <button className="btn primary rcv-play" onClick={run} disabled={busy}>{L({ vi: "Chạy", en: "Run" })}</button>
      </div>
      <p className="rcv-about">{L(inc.about)}</p>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 200" role="img" aria-label={L({ vi: "Dòng thời gian một ngày của bảng Orders, từ 0 giờ tới 18 giờ, với sự cố và điểm khôi phục", en: "Timeline of one day of the Orders table, from 0:00 to 18:00, with the incident and the restore point" })}>
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
            <text className="ts" x={tx(opt.down[1]) + 4} y={LANE + BAR / 2 + 14}>{L({ vi: "bảng mới", en: "new table" })}</text>
          </>}
          {done && opt.to !== undefined && (
            <g className="rcv-pin">
              <line x1={tx(opt.to)} x2={tx(opt.to)} y1={LANE - BAR / 2 - 6} y2={LANE + BAR / 2 + 6} />
              <text className="rcv-pin-t" x={tx(opt.to)} y={LANE + BAR / 2 + 18} textAnchor="middle">{L({ vi: "về ", en: "to " })}{opt.id === "pitr" ? "14:31:59" : hhmm(opt.to)}</text>
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
              <text className="rcv-event-t" x={tx(inc.stop) - 5} y={60} textAnchor="end">{incident === "corrupt" ? L({ vi: "15:10 phát hiện", en: "15:10 detected" }) : "16:05 DeleteTable"}</text>
            </g>
          )}

          {opt.replica && (
            <>
              <text className="rcv-lane-t" x={X0 - 8} y={LANE2 + 4} textAnchor="end">Tokyo</text>
              <rect className="rcv-track" x={X0} y={LANE2 - BAR / 2} width={X1 - X0} height={BAR} rx={3} />
              <Bar seg={[0, Math.min(clock, T_BAD)]} cls="good" laneY={LANE2} />
              {done && <Bar seg={[T_BAD, T_FOUND]} cls="bad" laneY={LANE2} />}
              <text className="ts" x={X0} y={LANE2 + BAR / 2 + 14}>{L({ vi: "replica của global table", en: "global table replica" })}</text>
            </>
          )}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!done ? (
          <p className="rcv-hint">{L({ vi: <>Chọn sự cố và phương án khôi phục, sau đó nhấn <b>Chạy</b>.</>, en: <>Choose an incident and a recovery option, then press <b>Run</b>.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className={"pill " + (opt.ok || opt.kept ? "ok" : "bad")}><i />{L({ vi: "Dữ liệu mất: ", en: "Data lost: " })}{L(opt.lostText)}</span>
              <span className="pill rcv-muted"><i />{L({ vi: "Ứng dụng ngừng: ", en: "App downtime: " })}{L(opt.downText)}</span>
            </div>
            <p className={`rcv-result ${opt.ok ? "ok" : "bad"}`}>{rich(L(opt.note))}</p>
          </>
        )}
      </div>
    </div>
  );
}
