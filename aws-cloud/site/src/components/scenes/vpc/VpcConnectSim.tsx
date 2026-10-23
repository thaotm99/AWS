import { useId, useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";

// Connecting many VPCs: peering is 1:1 and not transitive; Transit VPC is a customer-managed hub of
// EC2 VPN appliances (whitepaper "Building a Scalable and Secure Multi-VPC AWS Network
// Infrastructure", transit-vpc-solution.html); Transit Gateway is a managed hub whose route table
// learns each VPC CIDR through route propagation (tgw/how-transit-gateways-work.html)
// (exam4_q45, exam5_q14, exam4_q28, exam6_q12, exam3_q16, exam2_q21).
type Mode = "peering" | "tvpc" | "tgw";

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
  const [prop, setProp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Bi | null>(null);
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
  const pk = useRef<SVGGElement>(null);
  const pts = positions(n);

  const peeringCount = chain ? 2 : (n * (n - 1)) / 2;
  const links: [number, number][] = mode !== "peering" ? [] :
    chain ? [[0, 1], [1, 2]] : pts.flatMap((_, i) => pts.slice(i + 1).map((__, j) => [i, i + 1 + j] as [number, number]));

  async function sendAtoC() {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    setMsg(null);
    try {
    if (mode === "tgw" && !prop) {
      await travel(layer, [pts[0], CENTER], 600, "pkt", 6);
      flashText(layer, CENTER[0], CENTER[1] - 40, "no route", "err-t", 1500);
      setMsg({ vi: "Traffic tới Transit Gateway nhưng route table của Transit Gateway không có route tới CIDR của C: các attachment chưa bật route propagation. Phải tạo static route cho từng VPC, hoặc bật propagation để CIDR của mỗi VPC tự động được cài vào route table.", en: "Traffic reaches the transit gateway, but the transit gateway route table has no route to C's CIDR: the attachments do not have route propagation enabled. Either create a static route for every VPC, or enable propagation so each VPC CIDR is installed in the route table automatically." });
    } else if (mode === "tgw") {
      await travel(layer, [pts[0], CENTER, pts[2]], 1000, "pkt", 6);
      setMsg({ vi: "Transit Gateway hỗ trợ transitive routing: traffic từ A tới C đi qua hub, không cần kết nối trực tiếp A–C. Route `CIDR của C → attachment C` có trong route table của Transit Gateway nhờ route propagation; route table của subnet trong VPC A vẫn cần route trỏ tới Transit Gateway.", en: "Transit Gateway supports transitive routing: traffic from A to C goes through the hub, without a direct A–C connection. The route `C's CIDR → attachment C` is in the transit gateway route table thanks to route propagation; the subnet route table in VPC A still needs a route that points to the transit gateway." });
    } else if (mode === "tvpc") {
      await travel(layer, [pts[0], CENTER, pts[2]], 1300, "pkt", 6);
      setMsg({ vi: "Transit VPC: mỗi VPC lập VPN connection (BGP over IPsec) tới các EC2 instance chạy phần mềm router trong VPC trung tâm. Transitive routing hoạt động, nhưng tổ chức tự vận hành các EC2 instance (vá lỗi, HA, license phần mềm), mỗi tunnel VPN tối đa 1,25 Gbps và mã hoá VPN làm tăng độ trễ. Transit Gateway thay thế mô hình này bằng hub do AWS quản lý.", en: "Transit VPC: each VPC builds a VPN connection (BGP over IPsec) to EC2 instances running router software in a central VPC. Transitive routing works, but the organization runs the EC2 instances itself (patching, HA, software licenses), each VPN tunnel is limited to 1.25 Gbps, and VPN encryption adds latency. Transit Gateway replaces this pattern with an AWS-managed hub." });
    } else if (chain) {
      await travel(layer, [pts[0], pts[1]], 600, "pkt", 6);
      await travel(layer, [pts[1], [(pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2]], 400, "pkt-bad", 6);
      flashText(layer, pts[1][0] + 10, pts[1][1] + 30, "non-transitive", "err-t", 1500);
      setMsg({ vi: "VPC peering không hỗ trợ transitive routing: tồn tại A–B và B–C nhưng A vẫn không tới được C. Cần tạo thêm peering A–C hoặc sử dụng Transit Gateway.", en: "VPC peering does not support transitive routing: A–B and B–C exist, but A still cannot reach C. Create an additional A–C peering or use Transit Gateway." });
    } else {
      await travel(layer, [pts[0], pts[2]], 700, "pkt", 6);
      setMsg({ vi: `Traffic đi trực tiếp qua peering A–C. Tuy nhiên, full mesh ${n} VPC cần ${peeringCount} peering connection, và route table của mỗi VPC phải có route tới từng VPC còn lại.`, en: `Traffic goes directly over the A–C peering. However, a full mesh of ${n} VPCs needs ${peeringCount} peering connections, and each VPC's route table must have a route to every other VPC.` });
    }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn" aria-pressed={mode === "peering"} onClick={() => { setMode("peering"); setMsg(null); }} disabled={busy}>VPC peering</button>
        <button className="btn" aria-pressed={mode === "tvpc"} onClick={() => { setMode("tvpc"); setChain(false); setMsg(null); }} disabled={busy}>Transit VPC</button>
        <button className="btn" aria-pressed={mode === "tgw"} onClick={() => { setMode("tgw"); setChain(false); setMsg(null); }} disabled={busy}>Transit Gateway</button>
        <span className="sep" />
        <label className="label" htmlFor={`${uid}-vpcCount`}>{L({ vi: "Số VPC: ", en: "VPC count: " })}{n}</label>
        <input id={`${uid}-vpcCount`} type="range" min={3} max={10} value={n} onChange={(e) => { setN(Number(e.target.value)); setMsg(null); }} disabled={busy} />
        {mode === "peering" && (
          <button className="btn" aria-pressed={chain} onClick={() => { setChain(!chain); setMsg(null); }} disabled={busy}>{L({ vi: "Chỉ peering A–B, B–C", en: "Only peering A–B, B–C" })}</button>
        )}
        {mode === "tgw" && (
          <button className="btn" aria-pressed={prop} onClick={() => { setProp(!prop); setMsg(null); }} disabled={busy}>Route propagation</button>
        )}
        <span className="sep" />
        <button className="btn primary" onClick={sendAtoC} disabled={busy}>{L({ vi: "Gửi traffic từ A tới C", en: "Send traffic from A to C" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 300" role="img" aria-label={L({ vi: `${n} VPC kết nối bằng ${mode === "tgw" ? "Transit Gateway" : "VPC peering"}`, en: `${n} VPCs connected with ${mode === "tgw" ? "Transit Gateway" : "VPC peering"}` })}>
          {links.map(([i, j]) => (
            <line key={`${i}-${j}`} className="peer-line" x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]} />
          ))}
          {mode !== "peering" && pts.map((p, i) => <line key={i} className="tgw-line" strokeDasharray={mode === "tvpc" ? "5 4" : undefined} x1={CENTER[0]} y1={CENTER[1]} x2={p[0]} y2={p[1]} />)}
          {mode === "tvpc" && (
            <g className="pop">
              <rect className="vpc-node" x={CENTER[0] - 52} y={CENTER[1] - 30} width={104} height={60} rx={10} />
              <text className="t" x={CENTER[0]} y={CENTER[1] - 6} textAnchor="middle">Transit VPC</text>
              <text className="ts" x={CENTER[0]} y={CENTER[1] + 12} textAnchor="middle">{L({ vi: "EC2 router + VPN", en: "EC2 router + VPN" })}</text>
            </g>
          )}
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
              ? L({ vi: `${n} attachment vào Transit Gateway${prop ? ", CIDR tự động propagate" : ", chưa có route"}`, en: `${n} Transit Gateway attachments${prop ? ", CIDRs propagated automatically" : ", no routes yet"}` })
              : mode === "tvpc"
              ? L({ vi: `${n} VPN connection tới EC2 instance trong Transit VPC`, en: `${n} VPN connections to EC2 in the transit VPC` })
              : L({ vi: `${peeringCount} peering connection${chain ? " (chuỗi A–B–C)" : ` cho full mesh ${n} VPC`}`, en: `${peeringCount} peering connections${chain ? " (chain A–B–C)" : ` for a full mesh of ${n} VPCs`}` })}
          </span>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          {rich(L(msg ?? (mode === "tvpc"
            ? { vi: "Mô hình hub-and-spoke dựa trên VPN: các VPC kết nối tới EC2 instance chạy phần mềm router của bên thứ ba trong một VPC trung tâm. Gửi traffic để quan sát chi phí vận hành của mô hình này.", en: "A VPN-based hub-and-spoke design: the VPCs connect to EC2 instances running third-party router software in a central VPC. Send traffic to see what this design costs to operate." }
            : mode === "tgw"
            ? { vi: "Mỗi VPC chỉ cần một attachment vào Transit Gateway. Bổ sung VPC thứ 11 chỉ phát sinh thêm 1 kết nối; Transit Gateway cũng kết nối được VPN và Direct Connect.", en: "Each VPC needs only one Transit Gateway attachment. Adding an 11th VPC adds only 1 connection; Transit Gateway also connects VPN and Direct Connect." }
            : { vi: "Kéo thanh trượt để quan sát tốc độ tăng của số peering connection. VPC peering có chi phí thấp và đơn giản khi số lượng VPC nhỏ.", en: "Drag the slider to see how fast the number of peering connections grows. VPC peering is low-cost and simple when the number of VPCs is small." })))}
        </p>
      </div>
    </div>
  );
}
