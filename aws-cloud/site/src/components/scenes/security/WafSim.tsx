import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";

// AWS WAF rule types as the tests use them: SQL injection/XSS managed rules (exam5_q13),
// geo match (exam1_q6, exam5_q45), IP set (exam2_q30, exam5_q45), rate-based (exam6_q60).
type Rule = "sqli" | "geo" | "ip" | "rate";

const RULES: { id: Rule; label: string }[] = [
  { id: "sqli", label: "Managed rule: SQL injection / XSS" },
  { id: "geo", label: "Geo match: chỉ cho Việt Nam" },
  { id: "ip", label: "IP set: chặn 203.0.113.9" },
  { id: "rate", label: "Rate-based: > 100 request / 5 phút / IP" },
];

const REQUESTS: { label: string; detail: string; blockedBy?: Rule; y: number }[] = [
  { label: "Khách ở Hà Nội", detail: "GET /san-pham/ao-thun", y: 40 },
  { label: "Form tìm kiếm", detail: "?q=' OR 1=1 --", blockedBy: "sqli", y: 90 },
  { label: "Khách ở nước khác", detail: "GET / từ ngoài Việt Nam", blockedBy: "geo", y: 140 },
  { label: "IP đã bị báo cáo", detail: "203.0.113.9", blockedBy: "ip", y: 190 },
  { label: "Bot dồn dập", detail: "hàng nghìn request từ 1 IP", blockedBy: "rate", y: 240 },
];

const WAF_X = 420;
const APP: Pt = [660, 140];

export default function WafSim() {
  const [on, setOn] = useState<Record<Rule, boolean>>({ sqli: false, geo: false, ip: false, rate: false });
  const [where, setWhere] = useState<"alb" | "cf" | "ec2">("alb");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const pk = useRef<SVGGElement>(null);

  async function send() {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    setResult(null);
    let passed = 0;
    await Promise.all(REQUESTS.map(async (r) => {
      const start: Pt = [220, r.y];
      const gate: Pt = [WAF_X, r.y];
      if (where !== "ec2" && r.blockedBy && on[r.blockedBy]) {
        await travel(layer, [start, gate], 700, "pkt-bad", 6);
        flashText(layer, WAF_X + 14, r.y + 4, "chặn", "err-t", 1800);
      } else {
        await travel(layer, [start, gate, APP], 1300, r.blockedBy ? "pkt-edge" : "pkt", 6);
        if (r.blockedBy) passed++;
      }
    }));
    setResult(where === "ec2"
      ? "AWS WAF không gắn trực tiếp vào EC2. Nó gắn vào CloudFront, ALB, API Gateway (và một số dịch vụ khác). Muốn bảo vệ app chạy trên EC2, đặt CloudFront hoặc ALB phía trước rồi gắn WAF vào đó."
      : passed ? `Còn ${passed} loại request xấu lọt vào ứng dụng. Bật thêm rule phù hợp.` : "Mọi request xấu đều bị chặn tại WAF, khách bình thường vẫn vào được.");
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar checks" role="group" aria-label="Rule của WAF">
        {RULES.map((r) => (
          <button key={r.id} className="btn check" aria-pressed={on[r.id]} onClick={() => setOn((s) => ({ ...s, [r.id]: !s[r.id] }))} disabled={busy}>
            <span className="box" aria-hidden="true">{on[r.id] ? "✓" : ""}</span>{r.label}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Gắn WAF vào</span>
        <button className="btn" aria-pressed={where === "alb"} onClick={() => setWhere("alb")} disabled={busy}>ALB</button>
        <button className="btn" aria-pressed={where === "cf"} onClick={() => setWhere("cf")} disabled={busy}>CloudFront</button>
        <button className="btn" aria-pressed={where === "ec2"} onClick={() => setWhere("ec2")} disabled={busy}>Thẳng vào EC2</button>
        <span className="sep" />
        <button className="btn primary" onClick={send} disabled={busy}>Gửi 5 loại request</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 280" role="img" aria-label="Năm loại request đi qua AWS WAF tới ứng dụng">
          {REQUESTS.map((r) => (
            <g key={r.label}>
              <text className="t" x={20} y={r.y - 2}>{r.label}</text>
              <text className="ts" x={20} y={r.y + 13}>{r.detail}</text>
            </g>
          ))}
          <rect className={where === "ec2" ? "waf-gate off" : "waf-gate"} x={WAF_X - 14} y={20} width={28} height={240} rx={8} />
          <text className="edge-t" x={WAF_X} y={14} textAnchor="middle">{where === "ec2" ? "WAF (không gắn được)" : `AWS WAF trên ${where === "alb" ? "ALB" : "CloudFront"}`}</text>
          <g className="res res-ec2"><rect x={APP[0] - 60} y={APP[1] - 24} width={120} height={48} rx={8} /><text className="res-t" x={APP[0]} y={APP[1] - 3} textAnchor="middle">ShopViet</text><text className="res-s" x={APP[0]} y={APP[1] + 13} textAnchor="middle">EC2</text></g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {result ?? "Bật các rule cần thiết, chọn nơi gắn WAF, rồi gửi request. Thử cả trường hợp gắn thẳng vào EC2."}
      </div>
    </div>
  );
}
