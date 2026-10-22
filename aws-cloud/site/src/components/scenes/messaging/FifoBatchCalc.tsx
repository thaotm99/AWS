import { useState } from "react";
import "./messaging-sims.css";

// How many messages per second a FIFO queue takes without high throughput mode:
// 300 send calls per second, each call carrying up to 10 messages with batching.

const CALLS = 300;
const RATES = [250, 1000, 2400, 4000];
const MAX = 4500;

export default function FifoBatchCalc() {
  const [rate, setRate] = useState(1000);
  const [batch, setBatch] = useState(1);
  const cap = CALLS * batch;
  const ok = cap >= rate;
  const need = Math.ceil(rate / CALLS);
  const pct = (v: number) => `${Math.min(100, (v / MAX) * 100)}%`;

  return (
    <div className="stage fbc">
      <div className="stage-bar">
        <span className="label">Đơn cần gửi</span>
        {RATES.map((r) => (
          <button key={r} className="btn" aria-pressed={r === rate} onClick={() => setRate(r)}>{r.toLocaleString("vi-VN")}/s</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="fbc-slider">
          <span className="label">Message mỗi lần gọi</span>
          <input type="range" min={1} max={10} value={batch} onChange={(e) => setBatch(Number(e.target.value))} aria-label="Số message trong một batch" />
          <b className="fbc-num">{batch}</b>
        </label>
      </div>
      <div className="fbc-bars" aria-live="polite">
        <div className="fbc-row">
          <span>Cần</span>
          <div className="fbc-track"><div className="fbc-fill need" style={{ width: pct(rate) }} /></div>
          <span className="count">{rate.toLocaleString("vi-VN")} msg/s</span>
        </div>
        <div className="fbc-row">
          <span>FIFO nhận được</span>
          <div className="fbc-track">
            <div className={"fbc-fill " + (ok ? "ok" : "bad")} style={{ width: pct(cap) }} />
            <div className="fbc-limit" style={{ left: pct(CALLS * 10) }} title="Trần khi batch 10" />
          </div>
          <span className="count">{CALLS} × {batch} = {cap.toLocaleString("vi-VN")} msg/s</span>
        </div>
      </div>
      <div className="readout">
        <p className={`fbc-result ${ok ? "ok" : "bad"}`}>
          {ok
            ? <>Đủ. Mỗi giây gửi tối đa {CALLS} lần, mỗi lần {batch} message. Batch nhỏ nhất cần dùng: <b>{need}</b>.</>
            : rate > CALLS * 10
              ? <>Không đủ, kể cả batch 10 (trần {(CALLS * 10).toLocaleString("vi-VN")} msg/s). Bật <b>high throughput mode</b> cho FIFO queue, hoặc dùng Standard queue nếu không cần thứ tự.</>
              : <>Chưa đủ. Gom ít nhất <b>{need}</b> message mỗi lần gọi (<code>SendMessageBatch</code>).</>}
        </p>
      </div>
    </div>
  );
}
