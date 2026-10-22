import { useEffect, useRef, useState } from "react";
import { useLang } from "../../../lib/lang";

// After a DNS change, clients keep the cached answer until its TTL expires (exam4_q3).
const TTLS = [60, 300, 3600];
// Seconds left in each client's cache at the moment the record changes, as a share of the TTL.
const CLIENTS = [
  { name: { vi: "Laptop tại Hà Nội", en: "Laptop in Hanoi" }, left: 0.15 },
  { name: { vi: "Điện thoại tại Đà Nẵng", en: "Phone in Da Nang" }, left: 0.55 },
  { name: { vi: "Máy tính tại TP.HCM", en: "PC in Ho Chi Minh City" }, left: 0.8 },
  { name: { vi: "Resolver của ISP", en: "ISP resolver" }, left: 0.97 },
];
const RUN_MS = 6000;

function fmt(s: number, L: ReturnType<typeof useLang>) {
  if (s >= 60) return L({ vi: `${Math.floor(s / 60)} phút ${Math.round(s % 60)} giây`, en: `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` });
  return L({ vi: `${Math.round(s)} giây`, en: `${Math.round(s)} s` });
}

export default function TtlSim() {
  const [ttl, setTtl] = useState(300);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const raf = useRef<number>(0);
  const L = useLang();

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
        <span className="label">{L({ vi: "TTL của record", en: "Record TTL" })}</span>
        {TTLS.map((t) => (
          <button key={t} className="btn" aria-pressed={t === ttl} onClick={() => { cancelAnimationFrame(raf.current); setTtl(t); setElapsed(null); }}>{t} {L({ vi: "giây", en: "seconds" })}</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={change}>{L({ vi: "Cập nhật record sang ALB mới", en: "Update record to the new ALB" })}</button>
      </div>
      <div className="ttl-list">
        {CLIENTS.map((c) => {
          const on = switched(c.left);
          return (
            <div className="ttl-row" key={c.name.vi}>
              <span className="ttl-name">{L(c.name)}</span>
              <div className="bar"><i style={{ width: `${elapsed === null ? 0 : Math.min(100, (elapsed / (c.left * ttl)) * 100)}%` }} /></div>
              <span className={"ttl-target " + (on ? "new" : "old")}>{on ? L({ vi: "ALB mới", en: "New ALB" }) : L({ vi: "ALB cũ", en: "Old ALB" })}</span>
            </div>
          );
        })}
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className="count">
            {elapsed === null ? L({ vi: "Record chưa được cập nhật", en: "Record not updated yet" }) : L({ vi: `Thời gian từ khi cập nhật: ${fmt(elapsed, L)} · ${moved}/${CLIENTS.length} client đã chuyển sang ALB mới`, en: `Time since update: ${fmt(elapsed, L)} · ${moved}/${CLIENTS.length} clients switched to the new ALB` })}
          </span>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          {L({
            vi: <>
          Record được cập nhật ngay trên Route 53, nhưng mỗi client vẫn sử dụng phản hồi cũ trong cache cho tới khi hết TTL.
          Do đó, khi DNS đã được cập nhật mà người dùng vẫn truy cập load balancer cũ, nguyên nhân là TTL của phản hồi cũ vẫn còn hiệu lực.
          TTL càng dài, thời gian chuyển đổi càng lâu.
            </>,
            en: <>
          The record is updated immediately in Route 53, but each client keeps using the old cached response until the TTL expires.
          So when DNS has been updated but users still reach the old load balancer, the cause is that the old response&apos;s TTL is still in effect.
          The longer the TTL, the longer the switchover takes.
            </>,
          })}
        </p>
      </div>
    </div>
  );
}
