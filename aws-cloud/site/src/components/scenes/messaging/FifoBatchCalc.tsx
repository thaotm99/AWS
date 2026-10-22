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
        <span className="label">Thông lượng yêu cầu</span>
        {RATES.map((r) => (
          <button key={r} className="btn" aria-pressed={r === rate} onClick={() => setRate(r)}>{r.toLocaleString("vi-VN")}/s</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="fbc-slider">
          <span className="label">Số message mỗi lệnh gọi</span>
          <input type="range" min={1} max={10} value={batch} onChange={(e) => setBatch(Number(e.target.value))} aria-label="Số message trong một batch" />
          <b className="fbc-num">{batch}</b>
        </label>
      </div>
      <div className="fbc-bars" aria-live="polite">
        <div className="fbc-row">
          <span>Yêu cầu</span>
          <div className="fbc-track"><div className="fbc-fill need" style={{ width: pct(rate) }} /></div>
          <span className="count">{rate.toLocaleString("vi-VN")} msg/s</span>
        </div>
        <div className="fbc-row">
          <span>Năng lực FIFO</span>
          <div className="fbc-track">
            <div className={"fbc-fill " + (ok ? "ok" : "bad")} style={{ width: pct(cap) }} />
            <div className="fbc-limit" style={{ left: pct(CALLS * 10) }} title="Giới hạn với batch 10" />
          </div>
          <span className="count">{CALLS} × {batch} = {cap.toLocaleString("vi-VN")} msg/s</span>
        </div>
      </div>
      <div className="readout">
        <p className={`fbc-result ${ok ? "ok" : "bad"}`}>
          {ok
            ? <>Đáp ứng yêu cầu. Tối đa {CALLS} lệnh gọi mỗi giây, mỗi lệnh gọi {batch} message. Kích thước batch tối thiểu cần dùng: <b>{need}</b>.</>
            : rate > CALLS * 10
              ? <>Không đáp ứng, kể cả với batch 10 (giới hạn {(CALLS * 10).toLocaleString("vi-VN")} msg/s). Cần bật <b>high throughput mode</b> cho FIFO queue, hoặc sử dụng Standard queue nếu không yêu cầu thứ tự.</>
              : <>Chưa đáp ứng. Cần gộp tối thiểu <b>{need}</b> message trong mỗi lệnh gọi (<code>SendMessageBatch</code>).</>}
        </p>
      </div>
    </div>
  );
}
