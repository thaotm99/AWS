import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";

// RDS Multi-AZ (synchronous standby, automatic failover by flipping the endpoint's
// CNAME) vs Read Replicas (asynchronous, readable) and how maintenance behaves
// Automated backups are taken from the standby (aws.amazon.com/rds/faqs).
// (exam1_q52, exam5_q25, exam6_q49, exam2_q25, exam3_q63, exam3_q41).
type Role = "primary" | "standby";

const APP: Pt = [90, 150];
const ENDPOINT: Pt = [260, 150];
const POS = { a: [470, 90] as Pt, b: [470, 230] as Pt, replica: [680, 150] as Pt };
const INTRO: Bi<ReactNode> = { vi: "Multi-AZ DB instance deployment: primary tại AZ a, standby tại AZ b, cùng một Read Replica. Thực hiện lần lượt từng thao tác phía trên.", en: "Multi-AZ DB instance deployment: primary in AZ a, standby in AZ b, plus one Read Replica. Try each action above in turn." };

export default function MultiAzSim() {
  const [primaryAz, setPrimaryAz] = useState<"a" | "b">("a");
  const [down, setDown] = useState<"a" | "b" | null>(null);
  const [busy, setBusy] = useState(false);
  const L = useLang();
  const [note, setNote] = useState<Bi<ReactNode>>(INTRO);
  const pk = useRef<SVGGElement>(null);

  const role = (az: "a" | "b"): Role => (az === primaryAz ? "primary" : "standby");
  const primaryPos = POS[primaryAz];
  const standbyAz = primaryAz === "a" ? "b" : "a";

  async function write() {
    const layer = pk.current!;
    setBusy(true);
    await travel(layer, [APP, ENDPOINT, primaryPos], 700, "pkt", 6);
    await travel(layer, [primaryPos, POS[standbyAz]], 500, "pkt", 5);
    flashText(layer, primaryPos[0] - 20, primaryPos[1] - 34, L({ vi: "ack sau khi standby ghi xong", en: "ack after the standby writes" }), "ok-t", 1400);
    await travel(layer, [primaryPos, ENDPOINT, APP], 600, "pkt-back", 6);
    await travel(layer, [primaryPos, POS.replica], 1200, "pkt-edge", 5);
    setNote({ vi: <>Thao tác ghi vào primary được sao chép <b>đồng bộ</b> sang standby trước khi xác nhận, do đó không mất dữ liệu khi failover. Read Replica nhận dữ liệu <b>bất đồng bộ</b> sau đó, nên có thể có độ trễ nhỏ.</>, en: <>A write to the primary is replicated <b>synchronously</b> to the standby before it is acknowledged, so no data is lost on failover. The Read Replica receives the data <b>asynchronously</b> afterwards, so it can lag slightly.</> });
    setBusy(false);
  }

  async function report() {
    const layer = pk.current!;
    setBusy(true);
    await travel(layer, [APP, [APP[0], 280], [POS.replica[0], 280], POS.replica], 1000, "pkt", 6);
    await travel(layer, [POS.replica, [POS.replica[0], 280], [APP[0], 280], APP], 900, "pkt-back", 6);
    setNote({ vi: <>Tác vụ báo cáo và analytics đọc từ <b>Read Replica</b> qua endpoint riêng của replica, không ảnh hưởng hiệu năng của primary. Standby của Multi-AZ DB instance deployment <b>không phục vụ đọc</b> (Multi-AZ DB cluster deployment thì có hai reader phục vụ đọc).</>, en: <>Reporting and analytics jobs read from the <b>Read Replica</b> through the replica&apos;s own endpoint, without affecting the primary&apos;s performance. The standby of a Multi-AZ DB instance deployment <b>does not serve reads</b> (a Multi-AZ DB cluster deployment has two readers that do).</> });
    setBusy(false);
  }

  async function fail() {
    const layer = pk.current!;
    setBusy(true);
    setDown(primaryAz);
    flashText(layer, primaryPos[0] - 30, primaryPos[1] - 34, L({ vi: "primary lỗi", en: "primary fails" }), "err-t", 1400);
    await new Promise((r) => setTimeout(r, 900));
    setPrimaryAz(standbyAz);
    await travel(layer, [APP, ENDPOINT, POS[standbyAz]], 800, "pkt", 6);
    setNote({ vi: <>RDS tự động <b>failover</b>: standby được promote thành primary và <b>bản ghi CNAME của endpoint</b> được cập nhật để trỏ tới instance này. Ứng dụng giữ nguyên connection string, chỉ cần kết nối lại.</>, en: <>RDS <b>fails over</b> automatically: the standby is promoted to primary and the <b>endpoint&apos;s CNAME record</b> is updated to point to it. The application keeps the same connection string and only needs to reconnect.</> });
    setBusy(false);
  }

  function maintainOs() {
    setNote({ vi: <>Bảo trì hệ điều hành với Multi-AZ: RDS thực hiện trên <b>standby trước</b>, sau đó promote standby thành primary, cuối cùng bảo trì primary cũ (hiện là standby). Downtime chỉ phát sinh trong thời gian failover.</>, en: <>OS maintenance with Multi-AZ: RDS patches the <b>standby first</b>, then promotes the standby to primary, and finally patches the old primary (now the standby). Downtime occurs only during the failover.</> });
  }

  async function backup() {
    const layer = pk.current!;
    setBusy(true);
    const sb = POS[standbyAz];
    flashText(layer, sb[0], sb[1] + 44, "snapshot", "ok-t", 1400);
    flashText(layer, primaryPos[0] - 60, primaryPos[1] - 34, L({ vi: "I/O không bị tạm dừng", en: "I/O not suspended" }), "ok-t", 1400);
    await travel(layer, [APP, ENDPOINT, primaryPos], 700, "pkt", 6);
    await travel(layer, [primaryPos, ENDPOINT, APP], 600, "pkt-back", 6);
    setNote({ vi: <>Trong backup window, automated backup và DB snapshot của Multi-AZ được <b>lấy từ standby</b>, nên I/O trên primary không bị tạm dừng. Với Single-AZ, storage I/O có thể bị tạm dừng trong thời gian ngắn (thường dưới vài giây) khi quá trình backup khởi tạo. Cả hai kiểu triển khai đều có thể có độ trễ I/O tăng trong vài phút khi backup.</>, en: <>During the backup window, Multi-AZ automated backups and DB snapshots are <b>taken from the standby</b>, so I/O on the primary is not suspended. With Single-AZ, storage I/O may be briefly suspended (typically under a few seconds) while the backup initializes. Both deployment types can see increased I/O latency for a few minutes during backups.</> });
    setBusy(false);
  }

  function upgradeEngine() {
    setNote({ vi: <>Khi nâng cấp <b>phiên bản engine</b>, primary và standby được nâng cấp <b>cùng lúc</b>, do đó phát sinh downtime trong maintenance window; Multi-AZ không loại bỏ được downtime này.</>, en: <>For a <b>DB engine version</b> upgrade, the primary and standby are upgraded <b>at the same time</b>, so there is downtime during the maintenance window; Multi-AZ does not remove this downtime.</> });
  }

  function reset() {
    setPrimaryAz("a");
    setDown(null);
    setNote(INTRO);
  }

  const box = (az: "a" | "b") => {
    const p = POS[az];
    const r = role(az);
    const isDown = down === az;
    return (
      <g key={az} className={`res ${isDown ? "res-warn" : r === "primary" ? "res-db" : "res-site"}`}>
        <rect x={p[0] - 85} y={p[1] - 24} width={170} height={48} rx={8} />
        <text className="res-t" x={p[0]} y={p[1] - 4} textAnchor="middle">{isDown ? L({ vi: "Lỗi", en: "Failed" }) : r === "primary" ? "Primary" : "Standby"}</text>
        <text className="res-s" x={p[0]} y={p[1] + 12} textAnchor="middle">AZ {az}{r === "standby" && !isDown ? L({ vi: " · không phục vụ đọc", en: " · serves no reads" }) : ""}</text>
      </g>
    );
  };

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn primary" onClick={write} disabled={busy || !!down && down === primaryAz}>{L({ vi: "Ghi một đơn hàng", en: "Write an order" })}</button>
        <button className="btn" onClick={report} disabled={busy}>{L({ vi: "Chạy báo cáo", en: "Run a report" })}</button>
        <button className="btn danger" onClick={fail} disabled={busy || !!down}>{L({ vi: "Sự cố primary", en: "Primary failure" })}</button>
        <button className="btn" onClick={maintainOs} disabled={busy}>{L({ vi: "Bảo trì OS", en: "OS maintenance" })}</button>
        <button className="btn" onClick={backup} disabled={busy || !!down}>{L({ vi: "Automated backup", en: "Automated backup" })}</button>
        <button className="btn" onClick={upgradeEngine} disabled={busy}>{L({ vi: "Nâng cấp engine", en: "Engine upgrade" })}</button>
        <button className="btn" onClick={reset} disabled={busy}>{L({ vi: "Đặt lại", en: "Reset" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 300" role="img" aria-label={L({ vi: "Ứng dụng kết nối RDS qua endpoint; primary và standby tại hai AZ; một read replica", en: "The application connects to RDS through an endpoint; primary and standby in two AZs; one read replica" })}>
          <rect className="dbox dbox-region" x={380} y={30} width={190} height={250} rx={12} />
          <text className="ts" x={392} y={48}>Multi-AZ DB instance</text>
          <path className="conn-line" d={`M145 150 H190`} />
          <path className="conn-line" d={`M330 150 L${primaryPos[0] - 85} ${primaryPos[1]}`} />
          {!down && <path className="sync-line" d={`M470 114 V206`} />}
          {!down && <text className="ts" x={480} y={164}>{L({ vi: "đồng bộ", en: "sync" })}</text>}
          <path className="async-line" d={`M${primaryPos[0] + 85} ${primaryPos[1]} L610 150`} />
          <text className="ts" x={614} y={primaryAz === "a" ? 100 : 222} textAnchor="middle">{L({ vi: "bất đồng bộ", en: "async" })}</text>
          <g className="res res-ec2"><rect x={APP[0] - 55} y={APP[1] - 22} width={110} height={44} rx={8} /><text className="res-t" x={APP[0]} y={APP[1] + 5} textAnchor="middle">{L({ vi: "Ứng dụng", en: "Application" })}</text></g>
          <g className="res res-net"><rect x={ENDPOINT[0] - 70} y={ENDPOINT[1] - 24} width={140} height={48} rx={8} /><text className="res-t" x={ENDPOINT[0]} y={ENDPOINT[1] - 4} textAnchor="middle">Endpoint (CNAME)</text><text className="res-s" x={ENDPOINT[0]} y={ENDPOINT[1] + 12} textAnchor="middle">→ AZ {primaryAz}</text></g>
          {box("a")}{box("b")}
          <g className="res res-db"><rect x={POS.replica[0] - 60} y={POS.replica[1] - 24} width={120} height={48} rx={8} /><text className="res-t" x={POS.replica[0]} y={POS.replica[1] - 4} textAnchor="middle">Read Replica</text><text className="res-s" x={POS.replica[0]} y={POS.replica[1] + 12} textAnchor="middle">{L({ vi: "phục vụ đọc", en: "serves reads" })}</text></g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">{L(note)}</div>
    </div>
  );
}
