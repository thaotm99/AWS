import { useEffect, useRef, useState } from "react";

// After a DNS change, clients keep the cached answer until its TTL expires (exam4_q3).
const TTLS = [60, 300, 3600];
// Seconds left in each client's cache at the moment the record changes, as a share of the TTL.
const CLIENTS = [
  { name: "Laptop ở Hà Nội", left: 0.15 },
  { name: "Điện thoại ở Đà Nẵng", left: 0.55 },
  { name: "Máy tính ở TP.HCM", left: 0.8 },
  { name: "Resolver của nhà mạng", left: 0.97 },
];
const RUN_MS = 6000;

function fmt(s: number) {
  if (s >= 60) return `${Math.floor(s / 60)} phút ${Math.round(s % 60)} giây`;
  return `${Math.round(s)} giây`;
}

export default function TtlSim() {
  const [ttl, setTtl] = useState(300);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function change() {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / RUN_MS);
      setElapsed(p * ttl);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  const switched = (left: number) => elapsed !== null && elapsed >= left * ttl;
  const moved = CLIENTS.filter((c) => switched(c.left)).length;

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">TTL của record</span>
        {TTLS.map((t) => (
          <button key={t} className="btn" aria-pressed={t === ttl} onClick={() => { setTtl(t); setElapsed(null); }}>{t} giây</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={change}>Đổi record sang ALB mới</button>
      </div>
      <div className="ttl-list">
        {CLIENTS.map((c) => {
          const on = switched(c.left);
          return (
            <div className="ttl-row" key={c.name}>
              <span className="ttl-name">{c.name}</span>
              <div className="bar"><i style={{ width: `${elapsed === null ? 0 : Math.min(100, (elapsed / (c.left * ttl)) * 100)}%` }} /></div>
              <span className={"ttl-target " + (on ? "new" : "old")}>{on ? "ALB mới" : "ALB cũ"}</span>
            </div>
          );
        })}
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className="count">
            {elapsed === null ? "Chưa đổi record" : `Đã đổi được ${fmt(elapsed)} · ${moved}/${CLIENTS.length} client đã sang ALB mới`}
          </span>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          Record đã đổi ngay trên Route 53, nhưng mỗi client vẫn dùng câu trả lời cũ đang nằm trong cache cho tới khi hết TTL.
          Vì vậy khi đã cập nhật DNS mà khách vẫn vào load balancer cũ, nguyên nhân là TTL của câu trả lời cũ vẫn còn hiệu lực.
          TTL càng dài, thời gian chuyển càng lâu.
        </p>
      </div>
    </div>
  );
}
