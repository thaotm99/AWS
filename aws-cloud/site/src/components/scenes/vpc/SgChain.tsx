import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";
import "./vpc-sims.css";

// Three-tier security group chaining: ALB → EC2 → RDS, referencing security groups
// instead of IP ranges (exam2_q28, exam2_q55, exam4_q52, exam4_q26, exam5_q29).
type Rule = "open" | "sg" | "none";

const TIERS = {
  user: [60, 90] as Pt,
  alb: [240, 90] as Pt,
  ec2: [450, 90] as Pt,
  rds: [660, 90] as Pt,
  attacker: [60, 200] as Pt,
};

const WEB_OPTIONS: { id: Rule; label: Bi }[] = [
  { id: "sg", label: { vi: "sg-alb, port 80", en: "sg-alb, port 80" } },
  { id: "open", label: { vi: "0.0.0.0/0, port 80", en: "0.0.0.0/0, port 80" } },
  { id: "none", label: { vi: "không có rule", en: "no rule" } },
];
const DB_OPTIONS: { id: Rule; label: Bi }[] = [
  { id: "sg", label: { vi: "sg-web, port 5432", en: "sg-web, port 5432" } },
  { id: "open", label: { vi: "0.0.0.0/0, port 5432", en: "0.0.0.0/0, port 5432" } },
  { id: "none", label: { vi: "không có rule", en: "no rule" } },
];

function Tier({ at, title, sg, rule }: { at: Pt; title: string; sg: string; rule: string }) {
  return (
    <g>
      <rect className="vpc-tier" x={at[0] - 70} y={at[1] - 30} width={140} height={60} rx={10} />
      <text className="t" x={at[0]} y={at[1] - 6} textAnchor="middle">{title}</text>
      <text className="ts" x={at[0]} y={at[1] + 12} textAnchor="middle">{sg}</text>
      <text className="ts vpc-rule-t" x={at[0]} y={at[1] + 50} textAnchor="middle">{rule}</text>
    </g>
  );
}

export default function SgChain() {
  const [web, setWeb] = useState<Rule>("open");
  const [db, setDb] = useState<Rule>("open");
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<{ cls: "ok" | "bad" | "warn"; title: Bi; text: Bi } | null>(null);
  const L = useLang();
  const pk = useRef<SVGGElement>(null);

  async function run() {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    setVerdict(null);
    await travel(layer, [TIERS.user, TIERS.alb], 500, "pkt", 6);
    if (web === "none") {
      await travel(layer, [TIERS.alb, TIERS.ec2], 500, "pkt-bad", 6);
      flashText(layer, TIERS.ec2[0] - 6, TIERS.ec2[1] - 40, "✕", "err-t", 1500);
      setVerdict({ cls: "bad", title: { vi: "ALB đánh dấu target unhealthy", en: "ALB marks the target unhealthy" },
        text: { vi: "Security group của EC2 instance không cho phép traffic từ ALB, nên cả health check lẫn request đều bị chặn. Đây là nguyên nhân phổ biến nhất khiến target bị đánh dấu unhealthy.", en: "The EC2 security group does not allow traffic from the ALB, so both health checks and requests are blocked. This is the most common reason a target is marked unhealthy." } });
      return setBusy(false);
    }
    await travel(layer, [TIERS.alb, TIERS.ec2], 500, "pkt", 6);
    if (db === "none") {
      await travel(layer, [TIERS.ec2, TIERS.rds], 500, "pkt-bad", 6);
      flashText(layer, TIERS.rds[0] - 6, TIERS.rds[1] - 40, "✕", "err-t", 1500);
      setVerdict({ cls: "bad", title: { vi: "could not connect to server: connection timed out", en: "could not connect to server: connection timed out" },
        text: { vi: "Ứng dụng không kết nối được database vì security group của RDS thiếu rule inbound từ tầng web. Khi security group chặn traffic, client chờ tới khi hết timeout thay vì nhận lỗi từ chối kết nối.", en: "The application cannot connect to the database because the RDS security group lacks an inbound rule from the web tier. When a security group blocks traffic, the client waits until the timeout expires instead of receiving a connection-refused error." } });
      return setBusy(false);
    }
    await travel(layer, [TIERS.ec2, TIERS.rds], 500, "pkt", 6);
    await travel(layer, [TIERS.rds, TIERS.ec2, TIERS.alb, TIERS.user], 1100, "pkt-back", 6);

    // Someone on the internet tries the tiers directly.
    const exposed: Pt[] = [];
    if (web === "open") exposed.push(TIERS.ec2);
    if (db === "open") exposed.push(TIERS.rds);
    const targets = exposed.length ? exposed : [TIERS.ec2];
    await Promise.all(targets.map(async (t) => {
      const blocked = !exposed.includes(t);
      await travel(layer, [TIERS.attacker, [t[0], 200], [t[0], t[1] + 30]], 800, blocked ? "pkt-bad" : "pkt-edge", 6);
      flashText(layer, t[0] + 10, t[1] + 50, blocked ? L({ vi: "chặn", en: "blocked" }) : L({ vi: "lọt qua", en: "gets in" }), blocked ? "ok-t" : "err-t", 1500);
    }));
    setVerdict(exposed.length
      ? { cls: "warn", title: { vi: "Hoạt động nhưng không an toàn", en: "Works but not secure" },
          text: { vi: "Khi EC2 hoặc RDS cho phép 0.0.0.0/0, bất kỳ client nào trên internet cũng truy cập trực tiếp được tầng đó và bỏ qua ALB. Cấu hình an toàn là tham chiếu security group của tầng liền trước.", en: "When EC2 or RDS allows 0.0.0.0/0, any client on the internet can access that tier directly and bypass the ALB. The secure configuration is to reference the security group of the tier in front." } }
      : { cls: "ok", title: { vi: "Hoạt động và an toàn", en: "Works and secure" },
          text: { vi: "Chỉ ALB cho phép port 443 từ internet. EC2 chỉ chấp nhận traffic từ sg-alb, RDS chỉ chấp nhận traffic từ sg-web. Request truy cập trực tiếp EC2 từ internet bị chặn. Do tham chiếu security group thay vì dải IP, instance mới trong Auto Scaling group tự động được cho phép.", en: "Only the ALB allows port 443 from the internet. EC2 accepts traffic only from sg-alb, and RDS accepts traffic only from sg-web. Direct requests to EC2 from the internet are blocked. Because the rules reference security groups instead of IP ranges, new instances in the Auto Scaling group are allowed automatically." } });
    setBusy(false);
  }

  const label = (opts: { id: Rule; label: Bi }[], r: Rule) => L(opts.find((o) => o.id === r)!.label);

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Inbound SG của EC2 từ", en: "EC2 SG inbound from" })}</span>
        {WEB_OPTIONS.map((o) => (
          <button key={o.id} className="btn" aria-pressed={web === o.id} onClick={() => { setWeb(o.id); setVerdict(null); }} disabled={busy}>{L(o.label)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Inbound SG của RDS từ", en: "RDS SG inbound from" })}</span>
        {DB_OPTIONS.map((o) => (
          <button key={o.id} className="btn" aria-pressed={db === o.id} onClick={() => { setDb(o.id); setVerdict(null); }} disabled={busy}>{L(o.label)}</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={run} disabled={busy}>{L({ vi: "Chạy mô phỏng", en: "Run simulation" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 240" role="img" aria-label={L({ vi: "Ba tầng ALB, EC2, RDS với security group của từng tầng", en: "Three tiers, ALB, EC2 and RDS, with each tier's security group" })}>
          <g transform={`translate(${TIERS.user[0]} ${TIERS.user[1]})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} /><path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="ts" x={TIERS.user[0]} y={TIERS.user[1] + 34} textAnchor="middle">{L({ vi: "Người dùng", en: "Users" })}</text>
          <g transform={`translate(${TIERS.attacker[0]} ${TIERS.attacker[1]})`} aria-hidden="true">
            <circle className="vpc-attacker" cy={-9} r={7} /><path className="vpc-attacker" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="ts" x={TIERS.attacker[0]} y={TIERS.attacker[1] + 34} textAnchor="middle">{L({ vi: "Client bên ngoài", en: "External client" })}</text>
          <Tier at={TIERS.alb} title="ALB" sg="sg-alb" rule={L({ vi: "0.0.0.0/0, port 443", en: "0.0.0.0/0, port 443" })} />
          <Tier at={TIERS.ec2} title="EC2 (web)" sg="sg-web" rule={label(WEB_OPTIONS, web)} />
          <Tier at={TIERS.rds} title="RDS" sg="sg-db" rule={label(DB_OPTIONS, db)} />
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {verdict ? (
          <>
            <span className={"pill " + (verdict.cls === "ok" ? "ok" : "bad")}><i />{L(verdict.title)}</span>
            <p className="mx-0 mt-2 mb-0">{L(verdict.text)}</p>
          </>
        ) : (
          <p className="m-0">{L({ vi: "Chọn rule inbound cho từng tầng, sau đó nhấn \"Chạy mô phỏng\". Thử cả cấu hình cho phép 0.0.0.0/0 lẫn cấu hình tham chiếu security group để so sánh.", en: "Choose the inbound rule for each tier, then press \"Run simulation\". Try both a configuration that allows 0.0.0.0/0 and one that references a security group to compare." })}</p>
        )}
      </div>
    </div>
  );
}
