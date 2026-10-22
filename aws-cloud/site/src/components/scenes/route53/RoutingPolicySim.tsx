import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";

// Route 53 routing policies as the practice tests use them:
// latency (exam2_q6), geolocation (exam1_q38), geoproximity bias (exam4_q61),
// failover active-passive (exam5_q56, exam2_q59).
type Policy = "simple" | "latency" | "geolocation" | "geoproximity" | "failover";
type Rid = "sg" | "fra" | "use1";

const USERS = [
  { id: "vn", label: "Khách ở Việt Nam", at: [70, 70] as Pt },
  { id: "de", label: "Khách ở Đức", at: [70, 170] as Pt },
  { id: "us", label: "Khách ở Mỹ", at: [70, 270] as Pt },
] as const;
type Uid = (typeof USERS)[number]["id"];

const REGIONS: Record<Rid, { label: string; at: Pt }> = {
  sg: { label: "ALB Singapore", at: [640, 70] },
  fra: { label: "ALB Frankfurt", at: [640, 170] },
  use1: { label: "ALB N. Virginia", at: [640, 270] },
};
const ERROR_PAGE: Pt = [640, 340];

// Rough great-circle distances in km, for the geoproximity illustration.
const KM: Record<Uid, Record<Rid, number>> = {
  vn: { sg: 2200, fra: 8900, use1: 13300 },
  de: { sg: 9900, fra: 420, use1: 6700 },
  us: { sg: 15300, fra: 6200, use1: 400 },
};

const POLICIES: Record<Policy, { label: string; text: ReactNode }> = {
  simple: { label: "Simple", text: <>Một record, một đích. Không có health check, không quan tâm khách ở đâu: ai cũng tới ALB Singapore.</> },
  latency: { label: "Latency", text: <>Trả về Region có độ trễ thấp nhất tới khách. Đề dùng khi ứng dụng chạy ở nhiều Region và muốn khách ở châu Âu được phục vụ từ Region châu Âu.</> },
  geolocation: { label: "Geolocation", text: <>Trả lời theo <b>vị trí của khách</b> (quốc gia, châu lục). Ở đây chỉ có record cho Việt Nam và châu Âu (nơi có bản quyền nội dung), không có record mặc định, nên khách ở Mỹ không nhận được câu trả lời. Đề dùng để giới hạn phân phối nội dung theo vùng.</> },
  geoproximity: { label: "Geoproximity", text: <>Theo khoảng cách giữa khách và tài nguyên, có thể <b>nới rộng hoặc thu hẹp vùng</b> của một tài nguyên bằng bias. Khoảng cách tính lại = khoảng cách thật × (1 − bias/100). Kéo bias của Singapore lên để thấy vùng phục vụ của nó lan rộng.</> },
  failover: { label: "Failover", text: <>Active-passive: record primary trỏ ALB, record secondary trỏ trang lỗi tĩnh trên S3. Route 53 health check thấy ALB không khỏe thì trả về secondary. Bấm "ALB không khỏe" để thử.</> },
};

export default function RoutingPolicySim() {
  const [policy, setPolicy] = useState<Policy>("latency");
  const [bias, setBias] = useState(0);
  const [unhealthy, setUnhealthy] = useState(false);
  const [busy, setBusy] = useState(false);
  const pk = useRef<SVGGElement>(null);

  function answer(u: Uid): Rid | "error" | null {
    switch (policy) {
      case "simple": return "sg";
      case "latency": return (Object.keys(KM[u]) as Rid[]).reduce((a, b) => (KM[u][a] <= KM[u][b] ? a : b));
      case "geolocation": return u === "vn" ? "sg" : u === "de" ? "fra" : null;
      case "geoproximity": {
        const biased = (r: Rid) => KM[u][r] * (r === "sg" ? 1 - bias / 100 : 1);
        return (Object.keys(KM[u]) as Rid[]).reduce((a, b) => (biased(a) <= biased(b) ? a : b));
      }
      case "failover": return unhealthy ? "error" : "sg";
    }
  }

  async function resolve() {
    const layer = pk.current;
    if (!layer) return;
    setBusy(true);
    await Promise.all(USERS.map(async (u) => {
      const a = answer(u.id);
      if (a === null) {
        await travel(layer, [u.at, [330, u.at[1]]], 700, "pkt-bad", 6);
        flashText(layer, 300, u.at[1] - 14, "không có record khớp", "err-t", 1500);
        return;
      }
      const dest = a === "error" ? ERROR_PAGE : REGIONS[a].at;
      await travel(layer, [u.at, [330, u.at[1]], [dest[0] - 70, dest[1]]], 1200, a === "error" ? "pkt-edge" : "pkt", 6);
    }));
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">Routing policy</span>
        {(Object.keys(POLICIES) as Policy[]).map((p) => (
          <button key={p} className="btn" aria-pressed={p === policy} onClick={() => setPolicy(p)} disabled={busy}>{POLICIES[p].label}</button>
        ))}
      </div>
      <div className="stage-bar">
        {policy === "geoproximity" && (
          <>
            <label className="label" htmlFor="geoBias">Bias của Singapore: {bias}</label>
            <input id="geoBias" type="range" min={0} max={99} value={bias} onChange={(e) => setBias(Number(e.target.value))} disabled={busy} />
          </>
        )}
        {policy === "failover" && (
          <button className="btn danger" aria-pressed={unhealthy} onClick={() => setUnhealthy(!unhealthy)} disabled={busy}>
            {unhealthy ? "ALB khỏe lại" : "ALB không khỏe"}
          </button>
        )}
        <button className="btn primary" onClick={resolve} disabled={busy}>Khách truy cập shopviet.vn</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 370" role="img" aria-label={`Route 53 ${POLICIES[policy].label} routing trả lời khách ở ba nơi`}>
          <rect className="r53" x={290} y={30} width={80} height={290} rx={12} />
          <text className="tw" x={330} y={170} textAnchor="middle">Route 53</text>
          {USERS.map((u) => {
            const a = answer(u.id);
            return (
              <g key={u.id}>
                <g transform={`translate(${u.at[0]} ${u.at[1]})`} aria-hidden="true">
                  <circle className="user" cy={-9} r={7} /><path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
                </g>
                <text className="ts" x={u.at[0]} y={u.at[1] + 32} textAnchor="middle">{u.label}</text>
                <text className="ts ans-t" x={200} y={u.at[1] - 8} textAnchor="middle">
                  {a === null ? "→ không trả lời" : a === "error" ? "→ trang lỗi S3" : `→ ${REGIONS[a].label.replace("ALB ", "")}`}
                </text>
              </g>
            );
          })}
          {(Object.keys(REGIONS) as Rid[]).map((r) => {
            const reg = REGIONS[r];
            const down = policy === "failover" && unhealthy && r === "sg";
            return (
              <g key={r} className={down ? "az-box down" : "az-box"}>
                <rect className="az" x={reg.at[0] - 70} y={reg.at[1] - 22} width={150} height={44} rx={8} />
                <text className="t" x={reg.at[0] + 5} y={reg.at[1] + 5} textAnchor="middle">{reg.label}</text>
              </g>
            );
          })}
          {policy === "failover" && (
            <g className="res res-store pop">
              <rect x={ERROR_PAGE[0] - 70} y={ERROR_PAGE[1] - 18} width={150} height={36} rx={7} />
              <text className="res-t" x={ERROR_PAGE[0] + 5} y={ERROR_PAGE[1] + 5} textAnchor="middle">S3: trang lỗi tĩnh</text>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite"><strong>{POLICIES[policy].label} routing</strong>{POLICIES[policy].text}</div>
    </div>
  );
}
