import { useId, useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";

// Route 53 routing policies as the practice tests use them:
// latency (exam2_q6), geolocation (exam1_q38), geoproximity bias (exam4_q61),
// failover active-passive (exam5_q56, exam2_q59).
type Policy = "simple" | "latency" | "geolocation" | "geoproximity" | "failover";
type Rid = "sg" | "fra" | "use1";

const USERS = [
  { id: "vn", label: { vi: "Người dùng tại Việt Nam", en: "Users in Vietnam" }, at: [80, 70] as Pt },
  { id: "de", label: { vi: "Người dùng tại Đức", en: "Users in Germany" }, at: [80, 170] as Pt },
  { id: "us", label: { vi: "Người dùng tại Hoa Kỳ", en: "Users in the US" }, at: [80, 270] as Pt },
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

const POLICIES: Record<Policy, { label: string; text: Bi<ReactNode> }> = {
  simple: { label: "Simple", text: { vi: <>Một record, một đích. Không có health check, không phụ thuộc vị trí người dùng: mọi request đều tới ALB Singapore.</>,
    en: <>One record, one target. No health checks and no dependence on the user&apos;s location: every request goes to ALB Singapore.</> } },
  latency: { label: "Latency", text: { vi: <>Trả về Region có độ trễ thấp nhất tới người dùng. Áp dụng khi ứng dụng chạy tại nhiều Region và người dùng châu Âu cần được phục vụ từ Region châu Âu.</>,
    en: <>Returns the Region with the lowest latency to the user. Used when the application runs in multiple Regions and users in Europe need to be served from a European Region.</> } },
  geolocation: { label: "Geolocation", text: { vi: <>Phản hồi theo <b>vị trí của người dùng</b> (quốc gia, châu lục). Trong ví dụ này chỉ có record cho Việt Nam và châu Âu (khu vực có bản quyền nội dung), không có record mặc định, nên người dùng tại Hoa Kỳ không nhận được phản hồi. Dùng để giới hạn phân phối nội dung theo khu vực.</>,
    en: <>Responds by the <b>user&apos;s location</b> (country, continent). In this example there are records only for Vietnam and Europe (the regions licensed for the content) and no default record, so users in the US get no answer. Used to restrict content distribution by region.</> } },
  geoproximity: { label: "Geoproximity", text: { vi: <>Định tuyến theo khoảng cách giữa người dùng và tài nguyên; có thể <b>mở rộng hoặc thu hẹp khu vực</b> của một tài nguyên bằng bias. Khoảng cách hiệu chỉnh = khoảng cách thực tế × (1 − bias/100). Tăng bias của Singapore để quan sát khu vực phục vụ được mở rộng.</>,
    en: <>Routes by the distance between the user and the resource; you can <b>expand or shrink the region</b> of a resource with bias. Biased distance = actual distance × (1 − bias/100). Increase Singapore&apos;s bias to see its service area expand.</> } },
  failover: { label: "Failover", text: { vi: <>Active-passive: record primary trỏ tới ALB, record secondary trỏ tới trang lỗi tĩnh trên S3. Khi Route 53 health check xác định ALB unhealthy, Route 53 trả về record secondary. Nhấn "ALB unhealthy" để kiểm tra.</>,
    en: <>Active-passive: the primary record points to the ALB, and the secondary record points to a static error page on S3. When the Route 53 health check marks the ALB as unhealthy, Route 53 returns the secondary record. Press &quot;ALB unhealthy&quot; to test it.</> } },
};

export default function RoutingPolicySim() {
  const [policy, setPolicy] = useState<Policy>("latency");
  const [bias, setBias] = useState(0);
  const [unhealthy, setUnhealthy] = useState(false);
  const [busy, setBusy] = useState(false);
  const pk = useRef<SVGGElement>(null);
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");

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
        flashText(layer, 300, u.at[1] - 14, L({ vi: "không có record phù hợp", en: "no matching record" }), "err-t", 1500);
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
            <label className="label" htmlFor={`${uid}-geoBias`}>{L({ vi: "Bias của Singapore: ", en: "Singapore bias: " })}{bias}</label>
            <input id={`${uid}-geoBias`} type="range" min={0} max={99} value={bias} onChange={(e) => setBias(Number(e.target.value))} disabled={busy} />
          </>
        )}
        {policy === "failover" && (
          <button className="btn danger" aria-pressed={unhealthy} onClick={() => setUnhealthy(!unhealthy)} disabled={busy}>
            {unhealthy ? L({ vi: "Khôi phục ALB", en: "Restore ALB" }) : "ALB unhealthy"}
          </button>
        )}
        <button className="btn primary" onClick={resolve} disabled={busy}>{L({ vi: "Người dùng truy cập mftech.vn", en: "Users visit mftech.vn" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 370" role="img" aria-label={L({ vi: `Route 53 ${POLICIES[policy].label} routing trả lời truy vấn của người dùng tại ba vị trí địa lý`, en: `Route 53 ${POLICIES[policy].label} routing answers users in three geographic locations` })}>
          <rect className="r53" x={290} y={30} width={80} height={290} rx={12} />
          <text className="tw" x={330} y={170} textAnchor="middle">Route 53</text>
          {USERS.map((u) => {
            const a = answer(u.id);
            return (
              <g key={u.id}>
                <g transform={`translate(${u.at[0]} ${u.at[1]})`} aria-hidden="true">
                  <circle className="user" cy={-9} r={7} /><path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
                </g>
                <text className="ts" x={u.at[0]} y={u.at[1] + 32} textAnchor="middle">{L(u.label)}</text>
                <text className="ts fill-accent font-medium" x={200} y={u.at[1] - 8} textAnchor="middle">
                  {a === null ? L({ vi: "→ không có phản hồi", en: "→ no answer" }) : a === "error" ? L({ vi: "→ trang lỗi S3", en: "→ S3 error page" }) : `→ ${REGIONS[a].label.replace("ALB ", "")}`}
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
              <text className="res-t" x={ERROR_PAGE[0] + 5} y={ERROR_PAGE[1] + 5} textAnchor="middle">{L({ vi: "S3: trang lỗi tĩnh", en: "S3: static error page" })}</text>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite"><strong>{POLICIES[policy].label} routing</strong>{L(POLICIES[policy].text)}</div>
    </div>
  );
}
