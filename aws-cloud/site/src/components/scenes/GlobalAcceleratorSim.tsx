import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../lib/animate";
import { useLang, type Bi } from "../../lib/lang";

// Global Accelerator: two static anycast IPs, traffic enters the AWS network at the
// nearest edge and goes to the nearest healthy Region; failover does not wait for
// client DNS caches (exam1_q59, exam2_q22, exam4_q58, exam5_q55).
type Mode = "ga" | "dns";
type RegionId = "sg" | "fra";

const USERS: { id: string; label: Bi; y: number; home: RegionId }[] = [
  { id: "asia", label: { vi: "Người dùng châu Á", en: "Users in Asia" }, y: 90, home: "sg" },
  { id: "eu", label: { vi: "Người dùng châu Âu", en: "Users in Europe" }, y: 230, home: "fra" },
];
const REGIONS: Record<RegionId, { label: string; code: string; y: number }> = {
  sg: { label: "Singapore", code: "ap-southeast-1", y: 90 },
  fra: { label: "Frankfurt", code: "eu-central-1", y: 230 },
};
const USER_X = 60, EDGE_X = 220, ALB_X = 610;

export default function GlobalAcceleratorSim() {
  const [mode, setMode] = useState<Mode>("ga");
  const [down, setDown] = useState<RegionId | null>(null);
  const [paused, setPaused] = useState(false);
  const [ok, setOk] = useState(0);
  const [err, setErr] = useState(0);
  const pk = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = useRef(true);
  // Bumped on every mode pick so packets already in flight are not counted against the new mode.
  const generation = useRef(0);
  const L = useLang();

  useEffect(() => {
    if (prefersReducedMotion()) setPaused(true);
    const el = svgRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((e) => (visible.current = e[0].isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    let turn = 0;
    const timer = setInterval(() => {
      const layer = pk.current;
      if (!layer || !visible.current || document.hidden) return;
      const user = USERS[turn++ % USERS.length];
      const gen = generation.current;
      const live = () => gen === generation.current;
      const start: Pt = [USER_X + 22, user.y];
      if (mode === "ga") {
        // Nearest healthy endpoint; the other Region takes over when home is down.
        const target = down === user.home ? (user.home === "sg" ? "fra" : "sg") : user.home;
        const ty = REGIONS[target].y;
        travel(layer, [start, [EDGE_X, user.y], [ALB_X - 50, ty]], 1300, "pkt", 5).then(() => { if (live()) setOk((n) => n + 1); });
      } else {
        // Plain DNS: the client keeps its cached answer and goes to the old Region until the TTL expires.
        const ty = REGIONS[user.home].y;
        const failing = down === user.home;
        travel(layer, [start, [ALB_X - 50, ty]], 1300, failing ? "pkt-bad" : "pkt-edge", 5).then(() => {
          if (!live()) return;
          if (failing) {
            setErr((n) => n + 1);
            flashText(layer, ALB_X - 90, ty - 30, "timeout", "err-t");
          } else setOk((n) => n + 1);
        });
      }
    }, 450);
    return () => clearInterval(timer);
  }, [paused, mode, down]);

  function pick(m: Mode) {
    generation.current++;
    setMode(m);
    setOk(0);
    setErr(0);
  }

  const note = L<string>(
    mode === "ga"
      ? down
        ? { vi: "Global Accelerator thực hiện health check endpoint và chuyển traffic của người dùng châu Á sang Frankfurt. Client vẫn kết nối tới 2 địa chỉ IP tĩnh ban đầu, không cần thay đổi DNS, nên không bị ảnh hưởng bởi DNS cache trên thiết bị.",
            en: "Global Accelerator health checks the endpoints and shifts the traffic of users in Asia to Frankfurt. Clients still connect to the same 2 static IP addresses, with no DNS change, so they are not affected by DNS caches on their devices." }
        : { vi: "Traffic của người dùng đi vào mạng AWS tại Edge location gần nhất, sau đó truyền qua mạng riêng của AWS tới Region gần nhất. Mọi người dùng kết nối tới cùng 2 địa chỉ IP tĩnh (anycast). Nhấn \"Sự cố Region Singapore\" để quan sát cơ chế failover.",
            en: "User traffic enters the AWS network at the nearest edge location, then travels over the AWS private network to the nearest Region. All users connect to the same 2 static (anycast) IP addresses. Press \"Fail Singapore Region\" to see how failover works." }
      : down
        ? { vi: "Chỉ sử dụng DNS: dù bản ghi DNS đã được cập nhật, nhiều client vẫn giữ địa chỉ cũ trong cache cho tới khi hết TTL và tiếp tục gửi request tới Region đang gặp sự cố. Do đó, khi cần failover nhanh giữa các Region, giải pháp phù hợp là Global Accelerator.",
            en: "DNS only: even after the DNS record is updated, many clients keep the old address in their cache until the TTL expires and keep sending requests to the failed Region. So when fast failover between Regions is needed, the right solution is Global Accelerator." }
        : { vi: "Chỉ sử dụng DNS: traffic của người dùng đi qua internet công cộng trực tiếp tới Region. Tạo sự cố để so sánh với Global Accelerator.",
            en: "DNS only: user traffic goes over the public internet directly to the Region. Trigger a failure to compare with Global Accelerator." });

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Phương thức định tuyến", en: "Routing method" })}</span>
        <button className="btn" aria-pressed={mode === "ga"} onClick={() => pick("ga")}>Global Accelerator</button>
        <button className="btn" aria-pressed={mode === "dns"} onClick={() => pick("dns")}>{L({ vi: "Chỉ sử dụng DNS", en: "DNS only" })}</button>
        <span className="sep" />
        <button className="btn danger" onClick={() => setDown("sg")} disabled={down === "sg"}>{L({ vi: "Sự cố Region Singapore", en: "Fail Singapore Region" })}</button>
        <button className="btn" onClick={() => setDown(null)}>{L({ vi: "Khôi phục", en: "Recover" })}</button>
        <span className="sep" />
        <button className="btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? L({ vi: "Chạy tiếp", en: "Resume" }) : L({ vi: "Tạm dừng", en: "Pause" })}</button>
      </div>
      <div className="svg-wrap">
        <svg ref={svgRef} viewBox="0 0 760 320" role="img" aria-label={L({ vi: "Người dùng ở châu Á và châu Âu đi qua Global Accelerator tới Region gần nhất", en: "Users in Asia and Europe go through Global Accelerator to the nearest Region" })}>
          {mode === "ga" && (
            <g>
              <rect className="ga-box" x={160} y={20} width={120} height={290} rx={12} />
              <text className="edge-t" x={220} y={42} textAnchor="middle">Global Accelerator</text>
              <text className="ts" x={220} y={300} textAnchor="middle">{L({ vi: "2 IP tĩnh anycast", en: "2 static anycast IPs" })}</text>
              <path className="backbone" d={`M${EDGE_X} 90 C 400 90, 420 90, ${ALB_X - 50} 90`} />
              <path className="backbone" d={`M${EDGE_X} 230 C 400 230, 420 230, ${ALB_X - 50} 230`} />
              <path className="backbone" d={`M${EDGE_X} 90 C 400 110, 420 210, ${ALB_X - 50} 230`} />
              <text className="ts" x={420} y={160} textAnchor="middle">{L({ vi: "mạng riêng của AWS", en: "AWS private network" })}</text>
            </g>
          )}
          {mode === "dns" && (
            <g>
              <path className="internet" d={`M${USER_X + 22} 90 H${ALB_X - 50}`} />
              <path className="internet" d={`M${USER_X + 22} 230 H${ALB_X - 50}`} />
              <text className="ts" x={330} y={160} textAnchor="middle">{L({ vi: "internet công cộng", en: "public internet" })}</text>
            </g>
          )}
          {USERS.map((u) => (
            <g key={u.id}>
              <g transform={`translate(${USER_X} ${u.y})`} aria-hidden="true">
                <circle className="user" cy={-9} r={7} />
                <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
              </g>
              <text className="ts" x={USER_X} y={u.y + 34} textAnchor="middle">{L(u.label)}</text>
              {mode === "ga" && <circle className="edge-dot" cx={EDGE_X} cy={u.y} r={13} />}
            </g>
          ))}
          {(Object.keys(REGIONS) as RegionId[]).map((r) => {
            const reg = REGIONS[r];
            const isDown = down === r;
            return (
              <g key={r} className={isDown ? "az-box down" : "az-box"}>
                <rect className="az" x={ALB_X - 60} y={reg.y - 40} width={190} height={80} rx={10} />
                <text className="t" x={ALB_X - 46} y={reg.y - 16}>{reg.label}</text>
                <text className="ts" x={ALB_X - 46} y={reg.y}>{reg.code}</text>
                <text className="ts" x={ALB_X - 46} y={reg.y + 18}>ALB + EC2</text>
                {isDown && <text className="down-t" x={ALB_X + 120} y={reg.y - 16} textAnchor="end">{L({ vi: "SỰ CỐ", en: "FAILED" })}</text>}
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        <div className="status">
          <span className={"pill " + (err && mode === "dns" && down ? "bad" : "ok")}>
            <i />{err && mode === "dns" && down ? L({ vi: "Một phần người dùng gặp lỗi", en: "Some users get errors" }) : L({ vi: "Người dùng truy cập bình thường", en: "Users connect normally" })}
          </span>
          <span className="count">{L({ vi: "thành công", en: "successful" })} {ok} · {L({ vi: "lỗi", en: "errors" })} {err}</span>
        </div>
        <p style={{ margin: "8px 0 0" }}>{note}</p>
      </div>
    </div>
  );
}
