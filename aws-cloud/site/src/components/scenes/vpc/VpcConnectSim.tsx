import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";

// Connecting many VPCs: peering is 1:1 and not transitive; Transit Gateway is a hub
// (exam4_q45, exam5_q14, exam4_q28, exam6_q12, exam3_q16).
type Mode = "peering" | "tgw";

const CENTER: Pt = [380, 150];
const RADIUS = 115;
const NAMES = "ABCDEFGHIJ".split("");

function positions(n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [CENTER[0] + RADIUS * Math.cos(a), CENTER[1] + RADIUS * Math.sin(a)];
  });
}

export default function VpcConnectSim() {
  const [mode, setMode] = useState<Mode>("peering");
  const [n, setN] = useState(5);
  const [chain, setChain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pk = useRef<SVGGElement>(null);
  const pts = positions(n);

  const peeringCount = chain ? 2 : (n * (n - 1)) / 2;
  const links: [number, number][] = mode === "tgw" ? [] :
    chain ? [[0, 1], [1, 2]] : pts.flatMap((_, i) => pts.slice(i + 1).map((__, j) => [i, i + 1 + j] as [number, number]));

  async function sendAtoC() {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    setMsg(null);
    if (mode === "tgw") {
      await travel(layer, [pts[0], CENTER, pts[2]], 1000, "pkt", 6);
      setMsg("Transit Gateway định tuyến bắc cầu (transitive): A tới C qua hub, không cần kết nối trực tiếp A–C.");
    } else if (chain) {
      await travel(layer, [pts[0], pts[1]], 600, "pkt", 6);
      await travel(layer, [pts[1], [(pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2]], 400, "pkt-bad", 6);
      flashText(layer, pts[1][0] + 10, pts[1][1] + 30, "không bắc cầu", "err-t", 1500);
      setMsg("VPC peering không bắc cầu (non-transitive): có A–B và B–C nhưng A vẫn không tới được C. Phải tạo thêm peering A–C, hoặc dùng Transit Gateway.");
    } else {
      await travel(layer, [pts[0], pts[2]], 700, "pkt", 6);
      setMsg(`Đi thẳng qua peering A–C. Nhưng full mesh ${n} VPC cần ${peeringCount} peering connection, và route table của mỗi VPC phải có route tới từng VPC còn lại.`);
    }
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn" aria-pressed={mode === "peering"} onClick={() => { setMode("peering"); setMsg(null); }} disabled={busy}>VPC peering</button>
        <button className="btn" aria-pressed={mode === "tgw"} onClick={() => { setMode("tgw"); setChain(false); setMsg(null); }} disabled={busy}>Transit Gateway</button>
        <span className="sep" />
        <label className="label" htmlFor="vpcCount">Số VPC: {n}</label>
        <input id="vpcCount" type="range" min={3} max={10} value={n} onChange={(e) => { setN(Number(e.target.value)); setMsg(null); }} disabled={busy} />
        {mode === "peering" && (
          <button className="btn" aria-pressed={chain} onClick={() => { setChain(!chain); setMsg(null); }} disabled={busy}>Chỉ peering A–B, B–C</button>
        )}
        <span className="sep" />
        <button className="btn primary" onClick={sendAtoC} disabled={busy}>A gửi tới C</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 300" role="img" aria-label={`${n} VPC nối bằng ${mode === "tgw" ? "Transit Gateway" : "VPC peering"}`}>
          {links.map(([i, j]) => (
            <line key={`${i}-${j}`} className="peer-line" x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]} />
          ))}
          {mode === "tgw" && pts.map((p, i) => <line key={i} className="tgw-line" x1={CENTER[0]} y1={CENTER[1]} x2={p[0]} y2={p[1]} />)}
          {mode === "tgw" && (
            <g className="pop">
              <circle className="tgw-hub" cx={CENTER[0]} cy={CENTER[1]} r={30} />
              <text className="tw" x={CENTER[0]} y={CENTER[1] + 4} textAnchor="middle">TGW</text>
            </g>
          )}
          {pts.map((p, i) => (
            <g key={i}>
              <rect className="vpc-node" x={p[0] - 26} y={p[1] - 16} width={52} height={32} rx={8} />
              <text className="t" x={p[0]} y={p[1] + 5} textAnchor="middle">{NAMES[i]}</text>
            </g>
          ))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className="count">
            {mode === "tgw"
              ? `${n} attachment vào Transit Gateway`
              : `${peeringCount} peering connection${chain ? " (chuỗi A–B–C)" : ` cho full mesh ${n} VPC`}`}
          </span>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          {msg ?? (mode === "tgw"
            ? "Mỗi VPC chỉ cần một attachment vào Transit Gateway. Thêm VPC thứ 11 chỉ thêm 1 kết nối, và Transit Gateway cũng nối được VPN, Direct Connect."
            : "Kéo thanh trượt để thấy số peering tăng nhanh thế nào. Peering rẻ và đơn giản khi chỉ có vài VPC.")}
        </p>
      </div>
    </div>
  );
}
