import { useState } from "react";
import { useLang } from "../../../lib/lang";
import "./messaging-sims.css";

// How many messages per second a FIFO queue takes without high throughput mode:
// 300 send calls per second, each call carrying up to 10 messages with batching.

const CALLS = 300;
const RATES = [250, 1000, 2400, 4000];
const MAX = 4500;

export default function FifoBatchCalc() {
  const L = useLang();
  const loc = L({ vi: "vi-VN", en: "en-US" });
  const [rate, setRate] = useState(1000);
  const [batch, setBatch] = useState(1);
  const cap = CALLS * batch;
  const ok = cap >= rate;
  const need = Math.ceil(rate / CALLS);
  const pct = (v: number) => `${Math.min(100, (v / MAX) * 100)}%`;

  return (
    <div className="stage fbc">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Thông lượng yêu cầu", en: "Required throughput" })}</span>
        {RATES.map((r) => (
          <button key={r} className="btn" aria-pressed={r === rate} onClick={() => setRate(r)}>{r.toLocaleString(loc)}/s</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="fbc-slider">
          <span className="label">{L({ vi: "Số message mỗi lệnh gọi", en: "Messages per call" })}</span>
          <input type="range" min={1} max={10} value={batch} onChange={(e) => setBatch(Number(e.target.value))} aria-label={L({ vi: "Số message trong một batch", en: "Messages in one batch" })} />
          <b className="fbc-num">{batch}</b>
        </label>
      </div>
      <div className="fbc-bars" aria-live="polite">
        <div className="fbc-row">
          <span>{L({ vi: "Yêu cầu", en: "Required" })}</span>
          <div className="fbc-track"><div className="fbc-fill need" style={{ width: pct(rate) }} /></div>
          <span className="count">{rate.toLocaleString(loc)} msg/s</span>
        </div>
        <div className="fbc-row">
          <span>{L({ vi: "Năng lực FIFO", en: "FIFO capacity" })}</span>
          <div className="fbc-track">
            <div className={"fbc-fill " + (ok ? "ok" : "bad")} style={{ width: pct(cap) }} />
            <div className="fbc-limit" style={{ left: pct(CALLS * 10) }} title={L({ vi: "Giới hạn với batch 10", en: "Limit with a batch of 10" })} />
          </div>
          <span className="count">{CALLS} × {batch} = {cap.toLocaleString(loc)} msg/s</span>
        </div>
      </div>
      <div className="readout">
        <p className={`fbc-result ${ok ? "ok" : "bad"}`}>
          {ok
            ? L({ vi: <>Đáp ứng yêu cầu. Tối đa {CALLS} lệnh gọi mỗi giây, mỗi lệnh gọi {batch} message. Kích thước batch tối thiểu cần dùng: <b>{need}</b>.</>,
              en: <>Meets the requirement. Up to {CALLS} calls per second, {batch} messages per call. Minimum batch size needed: <b>{need}</b>.</> })
            : rate > CALLS * 10
              ? L({ vi: <>Không đáp ứng, kể cả với batch 10 (giới hạn {(CALLS * 10).toLocaleString("vi-VN")} msg/s). Cần bật <b>high throughput mode</b> cho FIFO queue, hoặc sử dụng Standard queue nếu không yêu cầu thứ tự.</>,
                en: <>Does not meet it, even with a batch of 10 (limit {(CALLS * 10).toLocaleString("en-US")} msg/s). Enable <b>high throughput mode</b> for the FIFO queue, or use a standard queue if ordering is not required.</> })
              : L({ vi: <>Chưa đáp ứng. Cần gộp tối thiểu <b>{need}</b> message trong mỗi lệnh gọi (<code>SendMessageBatch</code>).</>,
                en: <>Not met yet. Batch at least <b>{need}</b> messages in each call (<code>SendMessageBatch</code>).</> })}
        </p>
      </div>
    </div>
  );
}
