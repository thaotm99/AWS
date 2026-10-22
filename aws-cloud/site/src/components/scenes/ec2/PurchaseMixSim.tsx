import { useState } from "react";

// Mixing purchase options against a daily demand curve: Reserved Instances for the
// steady baseline, On-Demand or Spot for the rest (exam2_q33, exam2_q35, exam4_q49, exam5_q60).
type Strategy = "od" | "riOd" | "riSpot" | "spot";

// Instances needed per hour: a steady 80 plus a daytime peak handled by interruptible workers.
const DEMAND = [80, 80, 80, 80, 80, 82, 88, 96, 104, 110, 116, 120, 120, 118, 114, 110, 106, 100, 96, 92, 88, 84, 82, 80];
const BASE = 80;
// Illustrative relative prices for the comparison only (not AWS list prices).
const PRICE = { od: 1, ri: 0.6, spot: 0.3 };

const STRATEGIES: Record<Strategy, { label: string; verdict: "good" | "bad"; text: string }> = {
  od: { label: "Toàn bộ On-Demand", verdict: "bad",
    text: "Không yêu cầu cam kết nên linh hoạt nhất, nhưng chịu mức giá cao nhất cho cả phần tải nền chạy 24/7." },
  riOd: { label: "RI cho nền + On-Demand", verdict: "good",
    text: "Tải nền chạy liên tục nên sử dụng Reserved Instances. Tải đỉnh sử dụng On-Demand: chi phí thấp hơn đáng kể và không bị gián đoạn. Phù hợp khi tải đỉnh không chịu được gián đoạn." },
  riSpot: { label: "RI cho nền + Spot", verdict: "good",
    text: "Chi phí thấp nhất mà vẫn đảm bảo tính sẵn sàng: tải nền sử dụng RI; tải đỉnh là tác vụ chịu được gián đoạn (batch, worker đọc queue) nên sử dụng Spot. Đây là cách phối hợp phổ biến nhất trong thực tế." },
  spot: { label: "Toàn bộ Spot", verdict: "bad",
    text: "Chi phí thấp nhất trên lý thuyết, nhưng Spot Instance có thể bị thu hồi với thông báo trước 2 phút. Khi tải nền bắt buộc chạy liên tục được đặt trên Spot, toàn bộ hệ thống có thể ngừng hoạt động." },
};

function split(s: Strategy, need: number) {
  switch (s) {
    case "od": return { ri: 0, od: need, spot: 0 };
    case "riOd": return { ri: BASE, od: need - BASE, spot: 0 };
    case "riSpot": return { ri: BASE, od: 0, spot: need - BASE };
    case "spot": return { ri: 0, od: 0, spot: need };
  }
}

function cost(s: Strategy) {
  return DEMAND.reduce((sum, need) => {
    const x = split(s, need);
    // RI is paid for every hour of the term whether used or not.
    return sum + x.ri * PRICE.ri + x.od * PRICE.od + x.spot * PRICE.spot;
  }, 0);
}

export default function PurchaseMixSim() {
  const [s, setS] = useState<Strategy>("od");
  const baseline = cost("od");
  const c = cost(s);
  const max = Math.max(...DEMAND);
  const W = 760, H = 220, pad = 34, bw = (W - pad * 2) / DEMAND.length;
  const y = (v: number) => H - 24 - (v / max) * (H - 50);

  return (
    <div className="stage">
      <div className="stage-bar">
        {(Object.keys(STRATEGIES) as Strategy[]).map((k) => (
          <button key={k} className="btn" aria-pressed={k === s} onClick={() => setS(k)}>{STRATEGIES[k].label}</button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Số instance theo giờ, phân theo tuỳ chọn mua: ${STRATEGIES[s].label}`}>
          <line x1={pad} y1={y(BASE)} x2={W - pad} y2={y(BASE)} className="base-line" />
          <text className="ts base-t" x={pad + 4} y={y(BASE) - 6}>tải nền: {BASE} instance</text>
          {DEMAND.map((need, h) => {
            const x = split(s, need);
            const x0 = pad + h * bw + 2;
            let top = H - 24;
            const seg = (n: number, cls: string) => {
              if (!n) return null;
              const hgt = (n / max) * (H - 50);
              top -= hgt;
              return <rect key={cls} className={cls} x={x0} y={top} width={bw - 4} height={hgt} />;
            };
            return (
              <g key={h}>
                {seg(x.ri, "mix-ri")}{seg(x.od, "mix-od")}{seg(x.spot, s === "spot" ? "mix-spot risky" : "mix-spot")}
                {h % 3 === 0 && <text className="ts" x={x0 + bw / 2 - 2} y={H - 8} textAnchor="middle">{h}h</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mix-legend key">
        <span><i className="mix-ri" />Reserved Instance</span>
        <span><i className="mix-od" />On-Demand</span>
        <span><i className="mix-spot" />Spot</span>
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className={"pill " + (STRATEGIES[s].verdict === "good" ? "ok" : "bad")}><i />{STRATEGIES[s].verdict === "good" ? "Hợp lý" : "Không đạt yêu cầu"}</span>
          <span className="count">Chi phí tương đối: {Math.round((c / baseline) * 100)}% so với toàn bộ On-Demand</span>
        </div>
        <p style={{ margin: "8px 0 0" }}>{STRATEGIES[s].text}</p>
        <p className="note-small">Mức giá dùng để so sánh là giả định (RI thấp hơn 40%, Spot thấp hơn 70% so với On-Demand). AWS công bố mức chiết khấu tối đa khoảng 72% cho RI và 90% cho Spot.</p>
      </div>
    </div>
  );
}
