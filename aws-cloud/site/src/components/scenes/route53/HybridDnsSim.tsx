import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";

// Hybrid DNS with Route 53 Resolver endpoints (exam1_q63, exam3_q35) and the VPC
// DNS attributes a private hosted zone needs (exam2_q20, exam6_q63).
type Query = "toOnPrem" | "fromOnPrem";

const EC2: Pt = [110, 150];
const RESOLVER: Pt = [270, 150];
const PHZ: Pt = [270, 260];
const OUTBOUND: Pt = [440, 110];
const INBOUND: Pt = [440, 200];
const ONPREM_DNS: Pt = [640, 150];

export default function HybridDnsSim() {
  const [support, setSupport] = useState(true);
  const [hostnames, setHostnames] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<ReactNode>(null);
  const pk = useRef<SVGGElement>(null);

  async function ask(q: Query) {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    setMsg(null);
    if (q === "toOnPrem") {
      if (!support) {
        await travel(layer, [EC2, RESOLVER], 600, "pkt-bad", 6);
        flashText(layer, RESOLVER[0] - 6, RESOLVER[1] - 30, "✕", "err-t", 1500);
        setMsg(<>enableDnsSupport đang tắt nên instance không dùng được Route 53 Resolver của VPC. Mọi truy vấn DNS đều thất bại.</>);
      } else {
        await travel(layer, [EC2, RESOLVER, OUTBOUND, ONPREM_DNS], 1600, "pkt", 6);
        await travel(layer, [ONPREM_DNS, OUTBOUND, RESOLVER, EC2], 1400, "pkt-back", 6);
        setMsg(<>EC2 hỏi <code>db.corp.local</code>. Forwarding rule của Resolver chuyển truy vấn ra <b>outbound endpoint</b> tới DNS server on-premises. Đề dùng khi workload trong VPC cần phân giải tên miền nội bộ on-premises.</>);
      }
    } else {
      await travel(layer, [ONPREM_DNS, INBOUND, RESOLVER], 1200, "pkt", 6);
      if (!support || !hostnames) {
        await travel(layer, [RESOLVER, PHZ], 500, "pkt-bad", 6);
        flashText(layer, PHZ[0] - 6, PHZ[1] - 26, "✕", "err-t", 1500);
        setMsg(<>Private hosted zone chỉ hoạt động khi VPC bật <b>cả</b> enableDnsHostnames và enableDnsSupport. Đề hỏi đúng hai cờ này khi private hosted zone không phân giải được.</>);
      } else {
        await travel(layer, [RESOLVER, PHZ, RESOLVER, INBOUND, ONPREM_DNS], 1800, "pkt-back", 6);
        setMsg(<>DNS server on-premises chuyển truy vấn <code>api.shopviet.internal</code> tới <b>inbound endpoint</b>. Resolver trả lời từ private hosted zone. Đề dùng khi on-premises cần phân giải tên miền trong VPC.</>);
      }
    }
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar checks">
        <button className="btn check" aria-pressed={support} onClick={() => setSupport(!support)} disabled={busy}>
          <span className="box" aria-hidden="true">{support ? "✓" : ""}</span>enableDnsSupport
        </button>
        <button className="btn check" aria-pressed={hostnames} onClick={() => setHostnames(!hostnames)} disabled={busy}>
          <span className="box" aria-hidden="true">{hostnames ? "✓" : ""}</span>enableDnsHostnames
        </button>
      </div>
      <div className="stage-bar">
        <button className="btn primary" onClick={() => ask("toOnPrem")} disabled={busy}>EC2 hỏi db.corp.local</button>
        <button className="btn primary" onClick={() => ask("fromOnPrem")} disabled={busy}>On-premises hỏi api.shopviet.internal</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 310" role="img" aria-label="VPC với Route 53 Resolver, inbound endpoint, outbound endpoint và DNS server on-premises">
          <rect className="region" x={30} y={30} width={480} height={270} rx={12} />
          <text className="t" x={46} y={54}>VPC</text>
          <g className="res res-ec2"><rect x={EC2[0] - 40} y={EC2[1] - 18} width={80} height={36} rx={6} /><text className="res-t" x={EC2[0]} y={EC2[1] + 5} textAnchor="middle">EC2</text></g>
          <g className="res res-db"><rect x={RESOLVER[0] - 60} y={RESOLVER[1] - 22} width={120} height={44} rx={7} /><text className="res-t" x={RESOLVER[0]} y={RESOLVER[1] - 2} textAnchor="middle">Route 53</text><text className="res-s" x={RESOLVER[0]} y={RESOLVER[1] + 13} textAnchor="middle">Resolver</text></g>
          <g className="res res-site"><rect x={PHZ[0] - 70} y={PHZ[1] - 18} width={140} height={36} rx={6} /><text className="res-t" x={PHZ[0]} y={PHZ[1] - 2} textAnchor="middle">Private hosted zone</text><text className="res-s" x={PHZ[0]} y={PHZ[1] + 12} textAnchor="middle">shopviet.internal</text></g>
          <g className="res res-net"><rect x={OUTBOUND[0] - 55} y={OUTBOUND[1] - 18} width={110} height={36} rx={6} /><text className="res-t" x={OUTBOUND[0]} y={OUTBOUND[1] + 5} textAnchor="middle">Outbound EP</text></g>
          <g className="res res-net"><rect x={INBOUND[0] - 55} y={INBOUND[1] - 18} width={110} height={36} rx={6} /><text className="res-t" x={INBOUND[0]} y={INBOUND[1] + 5} textAnchor="middle">Inbound EP</text></g>
          <path className="dx-line" d="M495 110 H590 M495 200 H590" />
          <text className="ts" x={545} y={160} textAnchor="middle">VPN / DX</text>
          <rect className="region" x={580} y={80} width={160} height={140} rx={12} />
          <text className="t" x={596} y={102}>On-premises</text>
          <g className="res res-site"><rect x={ONPREM_DNS[0] - 50} y={ONPREM_DNS[1] - 18} width={100} height={36} rx={6} /><text className="res-t" x={ONPREM_DNS[0]} y={ONPREM_DNS[1] + 5} textAnchor="middle">DNS server</text></g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {msg ?? <>Thử hai chiều truy vấn, rồi tắt một trong hai cờ DNS của VPC và thử lại.</>}
      </div>
    </div>
  );
}
