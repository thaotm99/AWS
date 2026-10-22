import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";

// AWS WAF rule types as the tests use them: SQL injection/XSS managed rules (exam5_q13),
// geo match (exam1_q6, exam5_q45), IP set (exam2_q30, exam5_q45), rate-based (exam6_q60).
type Rule = "sqli" | "geo" | "ip" | "rate";

const RULES: { id: Rule; label: string | Bi }[] = [
  { id: "sqli", label: "Managed rule: SQL injection / XSS" },
  { id: "geo", label: { vi: "Geo match: chỉ cho phép Việt Nam", en: "Geo match: allow Vietnam only" } },
  { id: "ip", label: { vi: "IP set: chặn 203.0.113.9", en: "IP set: block 203.0.113.9" } },
  { id: "rate", label: { vi: "Rate-based: > 100 request / 5 phút / IP", en: "Rate-based: > 100 requests / 5 min / IP" } },
];

const REQUESTS: { label: Bi; detail: string | Bi; blockedBy?: Rule; y: number }[] = [
  { label: { vi: "Người dùng tại Hà Nội", en: "User in Hanoi" }, detail: "GET /san-pham/ao-thun", y: 40 },
  { label: { vi: "Form tìm kiếm", en: "Search form" }, detail: "?q=' OR 1=1 --", blockedBy: "sqli", y: 90 },
  { label: { vi: "Người dùng ở quốc gia khác", en: "User in another country" }, detail: { vi: "GET / từ ngoài Việt Nam", en: "GET / from outside Vietnam" }, blockedBy: "geo", y: 140 },
  { label: { vi: "IP có trong danh sách độc hại", en: "IP on the malicious list" }, detail: "203.0.113.9", blockedBy: "ip", y: 190 },
  { label: { vi: "Bot gửi request tần suất cao", en: "High-rate bot" }, detail: { vi: "hàng nghìn request từ 1 IP", en: "thousands of requests, 1 IP" }, blockedBy: "rate", y: 240 },
];

const WAF_X = 420;
const APP: Pt = [660, 140];

export default function WafSim() {
  const [on, setOn] = useState<Record<Rule, boolean>>({ sqli: false, geo: false, ip: false, rate: false });
  const [where, setWhere] = useState<"alb" | "cf" | "ec2">("alb");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Bi | null>(null);
  const L = useLang();
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
        flashText(layer, WAF_X + 14, r.y + 4, L({ vi: "chặn", en: "blocked" }), "err-t", 1800);
      } else {
        await travel(layer, [start, gate, APP], 1300, r.blockedBy ? "pkt-edge" : "pkt", 6);
        if (r.blockedBy) passed++;
      }
    }));
    setResult(where === "ec2"
      ? { vi: "AWS WAF không gắn trực tiếp vào EC2. AWS WAF được liên kết với CloudFront, ALB, API Gateway REST API, AppSync, Cognito user pool, App Runner, Verified Access và Amplify. Để bảo vệ ứng dụng chạy trên EC2, đặt CloudFront hoặc ALB phía trước và liên kết AWS WAF với tài nguyên đó.",
          en: "AWS WAF is not attached directly to EC2. AWS WAF is associated with CloudFront, ALB, API Gateway REST APIs, AppSync, Cognito user pools, App Runner, Verified Access and Amplify. To protect an application running on EC2, put CloudFront or an ALB in front of it and associate AWS WAF with that resource." }
      : passed ? { vi: `Còn ${passed} loại request độc hại tới được ứng dụng. Cần kích hoạt thêm rule phù hợp.`, en: `${passed} kinds of malicious requests still reach the application. Turn on more matching rules.` }
        : { vi: "Mọi request độc hại đều bị chặn tại AWS WAF; request hợp lệ của người dùng vẫn được chuyển tới ứng dụng.", en: "Every malicious request is blocked at AWS WAF; legitimate user requests still reach the application." });
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar checks" role="group" aria-label={L({ vi: "Rule của WAF", en: "WAF rules" })}>
        {RULES.map((r) => (
          <button key={r.id} className="btn check" aria-pressed={on[r.id]} onClick={() => setOn((s) => ({ ...s, [r.id]: !s[r.id] }))} disabled={busy}>
            <span className="box" aria-hidden="true">{on[r.id] ? "✓" : ""}</span>{typeof r.label === "string" ? r.label : L(r.label)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Tài nguyên liên kết WAF", en: "Resource associated with WAF" })}</span>
        <button className="btn" aria-pressed={where === "alb"} onClick={() => setWhere("alb")} disabled={busy}>ALB</button>
        <button className="btn" aria-pressed={where === "cf"} onClick={() => setWhere("cf")} disabled={busy}>CloudFront</button>
        <button className="btn" aria-pressed={where === "ec2"} onClick={() => setWhere("ec2")} disabled={busy}>{L({ vi: "Trực tiếp EC2", en: "Directly on EC2" })}</button>
        <span className="sep" />
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "Gửi 5 loại request", en: "Send 5 kinds of requests" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 280" role="img" aria-label={L({ vi: "Năm loại request đi qua AWS WAF tới ứng dụng", en: "Five kinds of requests pass through AWS WAF to the application" })}>
          {REQUESTS.map((r) => (
            <g key={r.y}>
              <text className="t" x={20} y={r.y - 2}>{L(r.label)}</text>
              <text className="ts" x={20} y={r.y + 13}>{typeof r.detail === "string" ? r.detail : L(r.detail)}</text>
            </g>
          ))}
          <rect className={where === "ec2" ? "waf-gate off" : "waf-gate"} x={WAF_X - 14} y={20} width={28} height={240} rx={8} />
          <text className="edge-t" x={WAF_X} y={14} textAnchor="middle">{where === "ec2" ? L({ vi: "WAF (không gắn được)", en: "WAF (cannot attach)" }) : L({ vi: `AWS WAF trên ${where === "alb" ? "ALB" : "CloudFront"}`, en: `AWS WAF on ${where === "alb" ? "ALB" : "CloudFront"}` })}</text>
          <g className="res res-ec2"><rect x={APP[0] - 60} y={APP[1] - 24} width={120} height={48} rx={8} /><text className="res-t" x={APP[0]} y={APP[1] - 3} textAnchor="middle">ShopViet</text><text className="res-s" x={APP[0]} y={APP[1] + 13} textAnchor="middle">EC2</text></g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {L(result ?? { vi: "Kích hoạt các rule cần thiết, chọn tài nguyên liên kết với AWS WAF, sau đó gửi request. Thử cả trường hợp gắn trực tiếp vào EC2.", en: "Turn on the rules you need, choose the resource associated with AWS WAF, then send the requests. Also try attaching it directly to EC2." })}
      </div>
    </div>
  );
}
