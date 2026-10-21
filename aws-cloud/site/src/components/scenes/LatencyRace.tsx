import { useRef, useState } from "react";
import { travel, type Pt } from "../../lib/animate";

// Great-circle distance from Hanoi; minimum round trip ≈ 2 × km / 200,000 km/s.
const REGIONS = [
  { name: "Singapore", code: "ap-southeast-1", km: 2200, y: 50 },
  { name: "Tokyo", code: "ap-northeast-1", km: 3700, y: 100 },
  { name: "Frankfurt", code: "eu-central-1", km: 8900, y: 150 },
  { name: "N. Virginia", code: "us-east-1", km: 13300, y: 200 },
].map((r) => ({ ...r, x: 140 + (r.km / 13300) * 560, rtt: Math.round(r.km / 100) }));
const MAX_RTT = Math.max(...REGIONS.map((r) => r.rtt));
const SLOWDOWN = 9;
const ORIGIN: Pt = [70, 125];

const seconds = (ms: number) => (ms / 1000).toFixed(2).replace(".", ",");

export default function LatencyRace() {
  const pk = useRef<SVGGElement>(null);
  const [ranks, setRanks] = useState<Record<number, number>>({});
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("Ánh sáng trong cáp quang đi khoảng 200.000 km/giây");

  async function race() {
    if (!pk.current) return;
    const layer = pk.current;
    setRunning(true);
    setRanks({});
    setNote("Đang đi... (đã làm chậm để dễ nhìn)");
    let place = 0;
    await Promise.all(
      REGIONS.map(async (r, i) => {
        const there: Pt[] = [ORIGIN, [140, r.y], [r.x, r.y]];
        await travel(layer, there, r.rtt * SLOWDOWN, "pkt");
        await travel(layer, [...there].reverse(), r.rtt * SLOWDOWN, "pkt-back");
        const rank = ++place;
        setRanks((prev) => ({ ...prev, [i]: rank }));
      }),
    );
    setNote("Singapore về trước. Mỗi trang web cần nhiều lượt đi-về nên chênh lệch bị nhân lên.");
    setRunning(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn primary" onClick={race} disabled={running}>Gửi gói tin tới 4 Region</button>
        <span className="count">{note}</span>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 250" role="img" aria-label="Gói tin đi từ Hà Nội tới 4 Region ở các khoảng cách khác nhau">
          <g transform="translate(46 125)" aria-hidden="true">
            <circle className="user" cy={-10} r={8} />
            <path className="user" d="M-15 16 a15 15 0 0 1 30 0 z" />
          </g>
          <text className="t" x={46} y={164} textAnchor="middle">Khách</text>
          <text className="ts" x={46} y={180} textAnchor="middle">Hà Nội</text>
          {REGIONS.map((r, i) => (
            <g key={r.code}>
              <path className="lane-hn" d={`M70 125 C 100 125, 100 ${r.y}, 140 ${r.y}`} />
              <line className="lane" x1={140} y1={r.y} x2={r.x} y2={r.y} />
              <text className="ts" x={(140 + r.x) / 2} y={r.y + 16} textAnchor="middle">
                {r.km.toLocaleString("vi-VN")} km
              </text>
              <circle className={"node" + (ranks[i] ? " won" : "")} cx={r.x} cy={r.y} r={10} />
              <text className="t" x={r.x > 650 ? r.x + 12 : r.x} y={r.y - 16} textAnchor={r.x > 650 ? "end" : "middle"}>
                {r.name}
              </text>
              <text className="rank" x={r.x} y={r.y + 4} textAnchor="middle">{ranks[i] ?? ""}</text>
            </g>
          ))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="lat" aria-live="polite">
        {REGIONS.map((r, i) => (
          <div className={"lat-row" + (i === 0 ? " best" : "")} key={r.code}>
            <div className="name">{r.name}<small>{r.code}</small></div>
            <div className="bar"><i style={{ width: `${Math.round((r.rtt / MAX_RTT) * 100)}%` }} /></div>
            <div className="val">≥ {r.rtt} ms/lượt · 10 lượt ≥ {seconds(r.rtt * 10)} s</div>
          </div>
        ))}
      </div>
    </div>
  );
}
