import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";

// AWS WAF rule types as the tests use them: SQL injection/XSS managed rules (exam5_q13),
// geo match (exam1_q6, exam5_q45), IP set (exam2_q30, exam5_q45), rate-based (exam6_q60).
type Rule = "sqli" | "geo" | "ip" | "rate" | "allow";

const RULES: { id: Rule; label: string | Bi }[] = [
  { id: "sqli", label: "Managed rule: SQL injection / XSS" },
  { id: "geo", label: { vi: "Geo match: chỉ cho phép Việt Nam", en: "Geo match: allow Vietnam only" } },
  { id: "ip", label: { vi: "IP set: chặn 203.0.113.9", en: "IP set: block 203.0.113.9" } },
  { id: "rate", label: { vi: "Rate-based: > 100 request / 5 phút / IP", en: "Rate-based: > 100 requests / 5 min / IP" } },
  { id: "allow", label: { vi: "IP set đối tác: Allow, priority 0 (đánh giá trước geo match)", en: "Partner IP set: Allow, priority 0 (evaluated before geo match)" } },
];

// partner: a legitimate partner calling from a country outside the geo allow list.
const REQUESTS: { label: Bi; detail: string | Bi; blockedBy?: Rule; partner?: boolean; y: number }[] = [
  { label: { vi: "Người dùng tại Hà Nội", en: "User in Hanoi" }, detail: "GET /san-pham/ao-thun", y: 40 },
  { label: { vi: "Form tìm kiếm", en: "Search form" }, detail: "?q=' OR 1=1 --", blockedBy: "sqli", y: 90 },
  { label: { vi: "Người dùng ở quốc gia khác", en: "User in another country" }, detail: { vi: "GET / từ ngoài Việt Nam", en: "GET / from outside Vietnam" }, blockedBy: "geo", y: 140 },
  { label: { vi: "IP có trong danh sách độc hại", en: "IP on the malicious list" }, detail: "203.0.113.9", blockedBy: "ip", y: 190 },
  { label: { vi: "Bot gửi request tần suất cao", en: "High-rate bot" }, detail: { vi: "hàng nghìn request từ 1 IP", en: "thousands of requests, 1 IP" }, blockedBy: "rate", y: 240 },
  { label: { vi: "Đối tác vận chuyển ở nước ngoài", en: "Overseas shipping partner" }, detail: { vi: "IP cố định 198.51.100.7, ngoài Việt Nam", en: "fixed IP 198.51.100.7, outside Vietnam" }, partner: true, y: 290 },
];

const WAF_X = 420;
const APP: Pt = [660, 165];

export default function WafSim() {
  const [on, setOn] = useState<Record<Rule, boolean>>({ sqli: false, geo: false, ip: false, rate: false, allow: false });
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
    let partnerBlocked = false;
    try {
    await Promise.all(REQUESTS.map(async (r) => {
      const start: Pt = [220, r.y];
      const gate: Pt = [WAF_X, r.y];
      // Rules run from the lowest priority number: the partner Allow (priority 0) terminates before geo match.
      const blocked = where !== "ec2" && (r.partner ? on.geo && !on.allow : !!r.blockedBy && on[r.blockedBy]);
      if (r.partner && blocked) partnerBlocked = true;
      if (blocked) {
        await travel(layer, [start, gate], 700, "pkt-bad", 6);
        flashText(layer, WAF_X + 14, r.y + 4, L({ vi: "chặn", en: "blocked" }), "err-t", 1800);
      } else {
        await travel(layer, [start, gate, APP], 1300, r.blockedBy ? "pkt-edge" : "pkt", 6);
        if (r.blockedBy) passed++;
      }
    }));
    } finally {
      setBusy(false);
    }
    if (where !== "ec2" && partnerBlocked) {
      setResult({ vi: "Geo match chặn cả đối tác vận chuyển hợp lệ vì IP của đối tác nằm ngoài Việt Nam. Thêm rule IP set chứa IP của đối tác với action Allow và priority nhỏ hơn rule geo match: AWS WAF đánh giá rule từ priority nhỏ nhất, Allow là terminating action nên request của đối tác được cho qua trước khi tới rule geo match.",
        en: "The geo match rule also blocks the legitimate shipping partner because the partner's IP address is outside Vietnam. Add an IP set rule with the partner's IP address, the Allow action and a lower priority number than the geo match rule: AWS WAF evaluates rules from the lowest numeric priority, and Allow is a terminating action, so the partner's request is allowed before the geo match rule is reached." });
      return;
    }
    setResult(where === "ec2"
      ? { vi: "AWS WAF không gắn trực tiếp vào EC2 instance. AWS WAF được liên kết với CloudFront, ALB, API Gateway REST API, AppSync, Cognito user pool, App Runner, Verified Access và Amplify. Để bảo vệ ứng dụng chạy trên EC2 instance, đặt CloudFront hoặc ALB phía trước và liên kết AWS WAF với tài nguyên đó.",
          en: "AWS WAF is not attached directly to EC2 instances. AWS WAF is associated with CloudFront, ALB, API Gateway REST APIs, AppSync, Cognito user pools, App Runner, Verified Access and Amplify. To protect an application running on EC2 instances, put CloudFront or an ALB in front of it and associate AWS WAF with that resource." }
      : passed ? { vi: `Còn ${passed} loại request độc hại tới được ứng dụng. Cần kích hoạt thêm rule phù hợp.`, en: `${passed} kinds of malicious requests still reach the application. Turn on more matching rules.` }
        : { vi: "Mọi request độc hại đều bị chặn tại AWS WAF; request hợp lệ của người dùng vẫn được chuyển tới ứng dụng.", en: "Every malicious request is blocked at AWS WAF; legitimate user requests still reach the application." });
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
        <button className="btn" aria-pressed={where === "ec2"} onClick={() => setWhere("ec2")} disabled={busy}>{L({ vi: "Trực tiếp EC2 instance", en: "Directly on the EC2 instance" })}</button>
        <span className="sep" />
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "Gửi 6 loại request", en: "Send 6 kinds of requests" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 330" role="img" aria-label={L({ vi: "Sáu loại request đi qua AWS WAF tới ứng dụng", en: "Six kinds of requests pass through AWS WAF to the application" })}>
          {REQUESTS.map((r) => (
            <g key={r.y}>
              <text className="t" x={20} y={r.y - 2}>{L(r.label)}</text>
              <text className="ts" x={20} y={r.y + 13}>{typeof r.detail === "string" ? r.detail : L(r.detail)}</text>
            </g>
          ))}
          <rect className={where === "ec2" ? "waf-gate off" : "waf-gate"} x={WAF_X - 14} y={20} width={28} height={290} rx={8} />
          <text className="edge-t" x={WAF_X} y={14} textAnchor="middle">{where === "ec2" ? L({ vi: "WAF (không gắn được)", en: "WAF (cannot attach)" }) : L({ vi: `AWS WAF trên ${where === "alb" ? "ALB" : "CloudFront"}`, en: `AWS WAF on ${where === "alb" ? "ALB" : "CloudFront"}` })}</text>
          <g className="res res-ec2"><rect x={APP[0] - 60} y={APP[1] - 24} width={120} height={48} rx={8} /><text className="res-t" x={APP[0]} y={APP[1] - 3} textAnchor="middle">ShopViet</text><text className="res-s" x={APP[0]} y={APP[1] + 13} textAnchor="middle">EC2</text></g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {L(result ?? { vi: "Kích hoạt các rule cần thiết, chọn tài nguyên liên kết với AWS WAF, sau đó gửi request. Quan sát request của đối tác vận chuyển khi bật geo match, và thử cả trường hợp gắn trực tiếp vào EC2 instance.", en: "Turn on the rules you need, choose the resource associated with AWS WAF, then send the requests. Watch the shipping partner's request when geo match is on, and also try attaching it directly to the EC2 instance." })}
      </div>
    </div>
  );
}
