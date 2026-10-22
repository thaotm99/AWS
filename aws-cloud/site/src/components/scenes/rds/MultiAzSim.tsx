import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";

// RDS Multi-AZ (synchronous standby, automatic failover by flipping the endpoint's
// CNAME) vs Read Replicas (asynchronous, readable) and how maintenance behaves
// (exam1_q52, exam5_q25, exam6_q49, exam2_q25, exam3_q63, exam3_q41).
type Role = "primary" | "standby";

const APP: Pt = [90, 150];
const ENDPOINT: Pt = [260, 150];
const POS = { a: [470, 90] as Pt, b: [470, 230] as Pt, replica: [680, 150] as Pt };

export default function MultiAzSim() {
  const [primaryAz, setPrimaryAz] = useState<"a" | "b">("a");
  const [down, setDown] = useState<"a" | "b" | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<ReactNode>("Primary ở AZ a, standby ở AZ b, thêm một Read Replica. Thử từng thao tác bên trên.");
  const pk = useRef<SVGGElement>(null);

  const role = (az: "a" | "b"): Role => (az === primaryAz ? "primary" : "standby");
  const primaryPos = POS[primaryAz];
  const standbyAz = primaryAz === "a" ? "b" : "a";

  async function write() {
    const L = pk.current!;
    setBusy(true);
    await travel(L, [APP, ENDPOINT, primaryPos], 700, "pkt", 6);
    await travel(L, [primaryPos, POS[standbyAz]], 500, "pkt", 5);
    flashText(L, primaryPos[0] - 20, primaryPos[1] - 34, "ack sau khi standby đã ghi", "ok-t", 1400);
    await travel(L, [primaryPos, ENDPOINT, APP], 600, "pkt-back", 6);
    await travel(L, [primaryPos, POS.replica], 1200, "pkt-edge", 5);
    setNote(<>Ghi vào primary được sao chép <b>đồng bộ</b> sang standby trước khi xác nhận, nên không mất dữ liệu khi failover. Read Replica nhận <b>bất đồng bộ</b> sau đó, nên có thể trễ một chút.</>);
    setBusy(false);
  }

  async function report() {
    const L = pk.current!;
    setBusy(true);
    await travel(L, [APP, [APP[0], 280], [POS.replica[0], 280], POS.replica], 1000, "pkt", 6);
    await travel(L, [POS.replica, [POS.replica[0], 280], [APP[0], 280], APP], 900, "pkt-back", 6);
    setNote(<>Báo cáo, analytics đọc từ <b>Read Replica</b> qua endpoint riêng của replica, không làm chậm primary. Standby của Multi-AZ <b>không phục vụ đọc</b>.</>);
    setBusy(false);
  }

  async function fail() {
    const L = pk.current!;
    setBusy(true);
    setDown(primaryAz);
    flashText(L, primaryPos[0] - 30, primaryPos[1] - 34, "primary hỏng", "err-t", 1400);
    await new Promise((r) => setTimeout(r, 900));
    setPrimaryAz(standbyAz);
    await travel(L, [APP, ENDPOINT, POS[standbyAz]], 800, "pkt", 6);
    setNote(<>RDS tự <b>failover</b>: standby được promote thành primary và <b>bản ghi CNAME của endpoint</b> trỏ sang nó. Ứng dụng giữ nguyên connection string, chỉ cần kết nối lại.</>);
    setBusy(false);
  }

  function maintainOs() {
    setNote(<>Bảo trì hệ điều hành với Multi-AZ: RDS làm trên <b>standby trước</b>, rồi promote standby thành primary, cuối cùng bảo trì primary cũ (giờ là standby). Downtime chỉ là lúc failover.</>);
  }

  function upgradeEngine() {
    setNote(<>Nâng cấp <b>phiên bản engine</b> thì primary và standby được nâng cấp <b>cùng lúc</b>, nên có downtime trong maintenance window, Multi-AZ không tránh được.</>);
  }

  function reset() {
    setPrimaryAz("a");
    setDown(null);
    setNote("Primary ở AZ a, standby ở AZ b, thêm một Read Replica. Thử từng thao tác bên trên.");
  }

  const box = (az: "a" | "b") => {
    const p = POS[az];
    const r = role(az);
    const isDown = down === az;
    return (
      <g key={az} className={`res ${isDown ? "res-warn" : r === "primary" ? "res-db" : "res-site"}`}>
        <rect x={p[0] - 70} y={p[1] - 24} width={140} height={48} rx={8} />
        <text className="res-t" x={p[0]} y={p[1] - 4} textAnchor="middle">{isDown ? "Hỏng" : r === "primary" ? "Primary" : "Standby"}</text>
        <text className="res-s" x={p[0]} y={p[1] + 12} textAnchor="middle">AZ {az}{r === "standby" && !isDown ? " · không đọc được" : ""}</text>
      </g>
    );
  };

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn primary" onClick={write} disabled={busy || !!down && down === primaryAz}>Ghi một đơn hàng</button>
        <button className="btn" onClick={report} disabled={busy}>Chạy báo cáo</button>
        <button className="btn danger" onClick={fail} disabled={busy || !!down}>Primary sập</button>
        <button className="btn" onClick={maintainOs} disabled={busy}>Bảo trì OS</button>
        <button className="btn" onClick={upgradeEngine} disabled={busy}>Nâng cấp engine</button>
        <button className="btn" onClick={reset} disabled={busy}>Làm lại</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 300" role="img" aria-label="Ứng dụng kết nối RDS qua endpoint; primary và standby ở hai AZ; một read replica">
          <rect className="dbox dbox-region" x={380} y={30} width={190} height={250} rx={12} />
          <text className="ts" x={392} y={48}>Multi-AZ DB instance</text>
          <path className="conn-line" d={`M145 150 H190`} />
          <path className="conn-line" d={`M330 150 L${primaryPos[0] - 70} ${primaryPos[1]}`} />
          {!down && <path className="sync-line" d={`M470 114 V206`} />}
          {!down && <text className="ts" x={480} y={164}>đồng bộ</text>}
          <path className="async-line" d={`M${primaryPos[0] + 70} ${primaryPos[1]} L610 150`} />
          <text className="ts" x={600} y={primaryAz === "a" ? 100 : 222} textAnchor="middle">bất đồng bộ</text>
          <g className="res res-ec2"><rect x={APP[0] - 55} y={APP[1] - 22} width={110} height={44} rx={8} /><text className="res-t" x={APP[0]} y={APP[1] + 5} textAnchor="middle">Ứng dụng</text></g>
          <g className="res res-net"><rect x={ENDPOINT[0] - 70} y={ENDPOINT[1] - 24} width={140} height={48} rx={8} /><text className="res-t" x={ENDPOINT[0]} y={ENDPOINT[1] - 4} textAnchor="middle">Endpoint (CNAME)</text><text className="res-s" x={ENDPOINT[0]} y={ENDPOINT[1] + 12} textAnchor="middle">→ AZ {primaryAz}</text></g>
          {box("a")}{box("b")}
          <g className="res res-db"><rect x={POS.replica[0] - 60} y={POS.replica[1] - 24} width={120} height={48} rx={8} /><text className="res-t" x={POS.replica[0]} y={POS.replica[1] - 4} textAnchor="middle">Read Replica</text><text className="res-s" x={POS.replica[0]} y={POS.replica[1] + 12} textAnchor="middle">đọc được</text></g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">{note}</div>
    </div>
  );
}
