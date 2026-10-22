import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";

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

const WEB_OPTIONS: { id: Rule; label: string }[] = [
  { id: "sg", label: "sg-alb, cổng 80" },
  { id: "open", label: "0.0.0.0/0, cổng 80" },
  { id: "none", label: "chưa có rule" },
];
const DB_OPTIONS: { id: Rule; label: string }[] = [
  { id: "sg", label: "sg-web, cổng 5432" },
  { id: "open", label: "0.0.0.0/0, cổng 5432" },
  { id: "none", label: "chưa có rule" },
];

function Tier({ at, title, sg, rule }: { at: Pt; title: string; sg: string; rule: string }) {
  return (
    <g>
      <rect className="tier" x={at[0] - 70} y={at[1] - 30} width={140} height={60} rx={10} />
      <text className="t" x={at[0]} y={at[1] - 6} textAnchor="middle">{title}</text>
      <text className="ts" x={at[0]} y={at[1] + 12} textAnchor="middle">{sg}</text>
      <text className="ts rule-t" x={at[0]} y={at[1] + 50} textAnchor="middle">{rule}</text>
    </g>
  );
}

export default function SgChain() {
  const [web, setWeb] = useState<Rule>("open");
  const [db, setDb] = useState<Rule>("open");
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<{ cls: "ok" | "bad" | "warn"; title: string; text: string } | null>(null);
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
      setVerdict({ cls: "bad", title: "ALB báo target unhealthy",
        text: "Security Group của EC2 không cho ALB vào, nên cả health check lẫn request đều bị chặn. Đây là lý do hay gặp nhất khi target bị đánh dấu unhealthy." });
      return setBusy(false);
    }
    await travel(layer, [TIERS.alb, TIERS.ec2], 500, "pkt", 6);
    if (db === "none") {
      await travel(layer, [TIERS.ec2, TIERS.rds], 500, "pkt-bad", 6);
      flashText(layer, TIERS.rds[0] - 6, TIERS.rds[1] - 40, "✕", "err-t", 1500);
      setVerdict({ cls: "bad", title: "could not connect to server: connection timed out",
        text: "Ứng dụng không kết nối được database vì Security Group của RDS thiếu rule inbound từ tầng web. Security Group chặn thì client chờ tới timeout, không nhận lỗi từ chối." });
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
      flashText(layer, t[0] + 10, t[1] + 50, blocked ? "chặn" : "lọt!", blocked ? "ok-t" : "err-t", 1500);
    }));
    setVerdict(exposed.length
      ? { cls: "warn", title: "Chạy được nhưng không an toàn",
          text: "Mở 0.0.0.0/0 cho EC2 hoặc RDS thì bất kỳ ai trên internet cũng gọi thẳng được vào tầng đó, bỏ qua ALB. Cách an toàn là tham chiếu Security Group của tầng phía trước." }
      : { cls: "ok", title: "Chạy được và an toàn",
          text: "Chỉ ALB mở 443 cho internet. EC2 chỉ nhận từ sg-alb, RDS chỉ nhận từ sg-web. Kẻ tấn công gọi thẳng EC2 bị chặn. Tham chiếu Security Group thay vì dải IP nên instance mới trong Auto Scaling group tự được phép." });
    setBusy(false);
  }

  const label = (opts: { id: Rule; label: string }[], r: Rule) => opts.find((o) => o.id === r)!.label;

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">SG của EC2 cho vào từ</span>
        {WEB_OPTIONS.map((o) => (
          <button key={o.id} className="btn" aria-pressed={web === o.id} onClick={() => { setWeb(o.id); setVerdict(null); }} disabled={busy}>{o.label}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">SG của RDS cho vào từ</span>
        {DB_OPTIONS.map((o) => (
          <button key={o.id} className="btn" aria-pressed={db === o.id} onClick={() => { setDb(o.id); setVerdict(null); }} disabled={busy}>{o.label}</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={run} disabled={busy}>Chạy thử</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 240" role="img" aria-label="Ba tầng ALB, EC2, RDS với Security Group của từng tầng">
          <g transform={`translate(${TIERS.user[0]} ${TIERS.user[1]})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} /><path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="ts" x={TIERS.user[0]} y={TIERS.user[1] + 34} textAnchor="middle">Khách</text>
          <g transform={`translate(${TIERS.attacker[0]} ${TIERS.attacker[1]})`} aria-hidden="true">
            <circle className="attacker" cy={-9} r={7} /><path className="attacker" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="ts" x={TIERS.attacker[0]} y={TIERS.attacker[1] + 34} textAnchor="middle">Kẻ lạ trên internet</text>
          <Tier at={TIERS.alb} title="ALB" sg="sg-alb" rule="0.0.0.0/0, cổng 443" />
          <Tier at={TIERS.ec2} title="EC2 (web)" sg="sg-web" rule={label(WEB_OPTIONS, web)} />
          <Tier at={TIERS.rds} title="RDS" sg="sg-db" rule={label(DB_OPTIONS, db)} />
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {verdict ? (
          <>
            <span className={"pill " + (verdict.cls === "ok" ? "ok" : "bad")}><i />{verdict.title}</span>
            <p style={{ margin: "8px 0 0" }}>{verdict.text}</p>
          </>
        ) : (
          <p style={{ margin: 0 }}>Chọn rule inbound cho từng tầng rồi bấm "Chạy thử". Thử cả cấu hình mở 0.0.0.0/0 lẫn tham chiếu Security Group để so sánh.</p>
        )}
      </div>
    </div>
  );
}
