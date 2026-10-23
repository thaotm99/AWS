import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import "./ec2-sims.css";

// Mixing purchase options against a daily demand curve: Reserved Instances for the
// steady baseline, On-Demand or Spot for the rest (exam2_q33, exam2_q35, exam4_q49, exam5_q60).
type Strategy = "od" | "riOd" | "riSpot" | "spot";

// Instances needed per hour: a steady 80 plus a daytime peak handled by interruptible workers.
const DEMAND = [80, 80, 80, 80, 80, 82, 88, 96, 104, 110, 116, 120, 120, 118, 114, 110, 106, 100, 96, 92, 88, 84, 82, 80];
const BASE = 80;
// Illustrative relative prices for the comparison only (not AWS list prices).
const PRICE = { od: 1, ri: 0.6, spot: 0.3 };

const STRATEGIES: Record<Strategy, { label: Bi; verdict: "good" | "bad"; text: Bi }> = {
  od: { label: { vi: "Toàn bộ On-Demand", en: "All On-Demand" }, verdict: "bad",
    text: { vi: "Không yêu cầu cam kết nên linh hoạt nhất, nhưng chịu mức giá cao nhất cho cả phần tải nền chạy 24/7.",
      en: "No commitment, so the most flexible, but you pay the highest price even for the baseline load that runs 24/7." } },
  riOd: { label: { vi: "RI cho nền + On-Demand", en: "RI baseline + On-Demand" }, verdict: "good",
    text: { vi: "Tải nền chạy liên tục nên sử dụng Reserved Instances. Tải đỉnh sử dụng On-Demand: chi phí thấp hơn đáng kể và không bị gián đoạn. Phù hợp khi tải đỉnh không chịu được gián đoạn.",
      en: "The baseline load runs continuously, so it uses Reserved Instances. The peak uses On-Demand: significantly lower cost and no interruptions. Suitable when the peak load cannot tolerate interruption." } },
  riSpot: { label: { vi: "RI cho nền + Spot", en: "RI baseline + Spot" }, verdict: "good",
    text: { vi: "Chi phí thấp nhất mà vẫn đảm bảo tính sẵn sàng: tải nền sử dụng RI; tải đỉnh là tác vụ chịu được gián đoạn (batch, worker đọc queue) nên sử dụng Spot. Trong mô phỏng này, đây là phương án có chi phí thấp nhất trong các phương án đáp ứng yêu cầu.",
      en: "The lowest cost while keeping availability: the baseline uses RIs; the peak is interruption-tolerant work (batch, queue workers), so it uses Spot. In this simulation, this is the lowest-cost option among those that meet the requirements." } },
  spot: { label: { vi: "Toàn bộ Spot", en: "All Spot" }, verdict: "bad",
    text: { vi: "Chi phí thấp nhất trên lý thuyết, nhưng Spot Instance có thể bị gián đoạn với thông báo trước 2 phút. Khi tải nền bắt buộc chạy liên tục được đặt trên Spot, toàn bộ hệ thống có thể ngừng hoạt động.",
      en: "The lowest cost in theory, but Spot Instances can be interrupted with a 2-minute notice. When a baseline load that must run continuously is placed on Spot, the whole system can go down." } },
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
  const L = useLang();
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
          <button key={k} className="btn" aria-pressed={k === s} onClick={() => setS(k)}>{L(STRATEGIES[k].label)}</button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L({ vi: `Số instance theo giờ, phân theo tuỳ chọn mua: ${L(STRATEGIES[s].label)}`, en: `Instances per hour, by purchasing option: ${L(STRATEGIES[s].label)}` })}>
          <line x1={pad} y1={y(BASE)} x2={W - pad} y2={y(BASE)} className="demand-base" />
          <text className="ts demand-base-t" x={pad + 4} y={y(BASE) - 6}>{L({ vi: `tải nền: ${BASE} instance`, en: `baseline: ${BASE} instances` })}</text>
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
                {seg(x.ri, "buy-ri")}{seg(x.od, "buy-od")}{seg(x.spot, s === "spot" ? "buy-spot risky" : "buy-spot")}
                {h % 3 === 0 && <text className="ts" x={x0 + bw / 2 - 2} y={H - 8} textAnchor="middle">{h}h</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="key px-4 pt-1 pb-2.5">
        <span><i className="buy-ri size-3 rounded-[3px]" />Reserved Instance</span>
        <span><i className="buy-od size-3 rounded-[3px]" />On-Demand</span>
        <span><i className="buy-spot size-3 rounded-[3px]" />Spot</span>
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className={"pill " + (STRATEGIES[s].verdict === "good" ? "ok" : "bad")}><i />{STRATEGIES[s].verdict === "good" ? L({ vi: "Hợp lý", en: "Reasonable" }) : L({ vi: "Không đạt yêu cầu", en: "Does not meet requirements" })}</span>
          <span className="count">{L({ vi: `Chi phí tương đối: ${Math.round((c / baseline) * 100)}% so với toàn bộ On-Demand`, en: `Relative cost: ${Math.round((c / baseline) * 100)}% of all On-Demand` })}</span>
        </div>
        <p className="mx-0 mt-2 mb-0">{L(STRATEGIES[s].text)}</p>
        <p className="note-small">{L({ vi: "Mức giá dùng để so sánh là giả định (RI thấp hơn 40%, Spot thấp hơn 70% so với On-Demand). Theo tài liệu AWS, Reserved Instances và Savings Plans giảm tới 72%, Spot giảm tới 90% so với giá On-Demand.",
          en: "The prices used for comparison are assumptions (RI 40% lower, Spot 70% lower than On-Demand). According to the AWS documentation, Reserved Instances and Savings Plans save up to 72%, and Spot up to 90%, compared with On-Demand prices." })}</p>
      </div>
    </div>
  );
}
