import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";

// Every check a request from the internet passes on its way in and back out
// (exam5_q63, exam4_q38, exam3_q9, exam3_q25, exam6_q8).
type Check = "route" | "publicIp" | "naclIn" | "sgIn" | "naclOut";

const CHECKS: { id: Check; label: Bi; fail: Bi }[] = [
  { id: "route", label: { vi: "Route table có 0.0.0.0/0 → Internet Gateway", en: "Route table has 0.0.0.0/0 → internet gateway" },
    fail: { vi: "Subnet không có route tới Internet Gateway nên không phải public subnet. Request không tới được instance.", en: "The subnet has no route to the internet gateway, so it is not a public subnet. The request cannot reach the instance." } },
  { id: "publicIp", label: { vi: "EC2 có public IP / Elastic IP", en: "EC2 has a public IP / Elastic IP" },
    fail: { vi: "EC2 chỉ có private IP. Internet Gateway thực hiện NAT giữa public IP và private IP; khi không có public IP, instance không thể nhận kết nối từ internet.", en: "The EC2 instance has only a private IP. The internet gateway performs NAT between the public IP and the private IP; without a public IP, the instance cannot receive connections from the internet." } },
  { id: "naclIn", label: { vi: "NACL inbound cho phép cổng 443", en: "NACL inbound allows port 443" },
    fail: { vi: "Network ACL của subnet chặn chiều inbound. NACL đánh giá traffic tại ranh giới subnet, trước Security Group.", en: "The subnet's network ACL blocks the inbound direction. The NACL evaluates traffic at the subnet boundary, before the security group." } },
  { id: "sgIn", label: { vi: "Security Group inbound cho phép cổng 443", en: "Security group inbound allows port 443" },
    fail: { vi: "Security Group của EC2 không có rule cho cổng 443. Theo mặc định, Security Group chặn mọi traffic inbound.", en: "The EC2 security group has no rule for port 443. By default, a security group blocks all inbound traffic." } },
  { id: "naclOut", label: { vi: "NACL outbound cho phép cổng 1024-65535", en: "NACL outbound allows ports 1024-65535" },
    fail: { vi: "Request đã tới EC2, nhưng response bị NACL chặn ở chiều outbound. NACL là stateless: chiều trả về (cổng ephemeral 1024-65535) phải được cho phép tường minh.", en: "The request reached EC2, but the response is blocked by the NACL in the outbound direction. NACLs are stateless: the return direction (ephemeral ports 1024-65535) must be allowed explicitly." } },
];

const P = {
  net: [60, 130] as Pt,
  igw: [176, 130] as Pt,
  nacl: [292, 130] as Pt,
  sg: [566, 130] as Pt,
  ec2: [640, 130] as Pt,
};

export default function PacketPath() {
  const [on, setOn] = useState<Record<Check, boolean>>({ route: true, publicIp: true, naclIn: true, sgIn: true, naclOut: false });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: Bi } | null>(null);
  const L = useLang();
  const pk = useRef<SVGGElement>(null);

  function toggle(id: Check) {
    setOn((s) => ({ ...s, [id]: !s[id] }));
    setResult(null);
  }

  async function send() {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    setResult(null);
    const stopAt = async (from: Pt, at: Pt, check: Check, cls: string) => {
      await travel(layer, [from, at], 500, "pkt-bad", 6);
      flashText(layer, at[0] - 6, at[1] - 22, "✕", cls, 1500);
      setResult({ ok: false, text: CHECKS.find((c) => c.id === check)!.fail });
    };
    // Inbound leg
    if (!on.route || !on.publicIp) {
      await stopAt(P.net, P.igw, !on.route ? "route" : "publicIp", "err-t");
      return setBusy(false);
    }
    await travel(layer, [P.net, P.igw], 500, "pkt", 6);
    if (!on.naclIn) { await stopAt(P.igw, P.nacl, "naclIn", "err-t"); return setBusy(false); }
    await travel(layer, [P.igw, P.nacl], 450, "pkt", 6);
    if (!on.sgIn) { await stopAt(P.nacl, P.sg, "sgIn", "err-t"); return setBusy(false); }
    await travel(layer, [P.nacl, P.sg, P.ec2], 700, "pkt", 6);
    // Response leg: the Security Group is stateful, so the reply passes without an outbound rule.
    await travel(layer, [P.ec2, P.sg], 300, "pkt-back", 6);
    if (!on.naclOut) { await stopAt(P.sg, P.nacl, "naclOut", "err-t"); return setBusy(false); }
    await travel(layer, [P.sg, P.nacl, P.igw, P.net], 1100, "pkt-back", 6);
    setResult({
      ok: true,
      text: { vi: "Kết nối thành công. Chiều trả về đi qua Security Group mà không cần rule outbound vì Security Group là stateful. NACL là stateless nên chiều trả về phải được cho phép tường minh.", en: "Connection succeeded. The return traffic passes the security group without an outbound rule because security groups are stateful. NACLs are stateless, so the return direction must be allowed explicitly." },
    });
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar checks" role="group" aria-label={L({ vi: "Điều kiện", en: "Conditions" })}>
        {CHECKS.map((c) => (
          <button key={c.id} className="btn check" aria-pressed={on[c.id]} onClick={() => toggle(c.id)} disabled={busy}>
            <span className="box" aria-hidden="true">{on[c.id] ? "✓" : ""}</span>{L(c.label)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "Gửi request HTTPS", en: "Send HTTPS request" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 250" role="img" aria-label={L({ vi: "Request đi từ internet qua Internet Gateway, Network ACL, Security Group tới EC2", en: "A request travels from the internet through the internet gateway, network ACL and security group to EC2" })}>
          <path className="cloud" d="M30 150 a20 20 0 0 1 12 -36 a26 26 0 0 1 48 -6 a20 20 0 0 1 28 24 a16 16 0 0 1 -6 18 z" />
          <text className="t" x={72} y={176} textAnchor="middle">Internet</text>
          <rect className="region" x={150} y={30} width={600} height={200} rx={12} />
          <text className="t" x={166} y={52}>VPC 10.0.0.0/16</text>
          <rect className={"az" + (on.route ? "" : " dashed")} x={292} y={70} width={440} height={140} rx={10} />
          <text className="ts" x={306} y={90}>{on.route ? "public subnet 10.0.1.0/24" : L({ vi: "subnet (không có route tới IGW)", en: "subnet (no route to IGW)" })}</text>
          <g className="gate">
            <rect x={160} y={110} width={32} height={40} rx={6} className="gate-igw" />
            <text className="ts" x={176} y={172} textAnchor="middle">IGW</text>
          </g>
          <g className={"gate" + (on.naclIn && on.naclOut ? "" : " warn")}>
            <rect x={284} y={102} width={16} height={56} rx={4} className="gate-nacl" />
            <text className="ts" x={292} y={192} textAnchor="middle">NACL</text>
            <text className="ts" x={292} y={204} textAnchor="middle">(stateless)</text>
          </g>
          <circle cx={640} cy={130} r={74} className={"sg-ring" + (on.sgIn ? "" : " warn")} />
          <text className="ts" x={640} y={222} textAnchor="middle">Security Group (stateful)</text>
          <g className="res res-ec2">
            <rect x={600} y={110} width={80} height={40} rx={7} />
            <text className="res-t" x={640} y={128} textAnchor="middle">EC2</text>
            <text className="res-s" x={640} y={142} textAnchor="middle">{on.publicIp ? "54.x.x.x" : L({ vi: "chỉ có 10.0.1.25", en: "only 10.0.1.25" })}</text>
          </g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {result ? (
          <>
            <span className={"pill " + (result.ok ? "ok" : "bad")}><i />{result.ok ? L({ vi: "Kết nối thành công", en: "Connected" }) : L({ vi: "Bị chặn", en: "Blocked" })}</span>
            <p style={{ margin: "8px 0 0" }}>{L(result.text)}</p>
          </>
        ) : (
          <p style={{ margin: 0 }}>{L({ vi: "Bật hoặc tắt các điều kiện phía trên, sau đó gửi request. Cấu hình mặc định đang thiếu một điều kiện thường bị bỏ sót; gửi request để xác định điều kiện đó.", en: "Turn the conditions above on or off, then send a request. The default configuration is missing a condition that is often overlooked; send a request to find it." })}</p>
        )}
      </div>
    </div>
  );
}
