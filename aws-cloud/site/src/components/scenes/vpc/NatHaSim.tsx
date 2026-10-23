import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";
import "./vpc-sims.css";

// Private subnets reach the internet through a NAT gateway placed in a public subnet;
// for AZ independence each AZ needs its own (exam3_q44, exam3_q62, exam6_q13).
type Az = "a" | "b";
type Mode = "shared" | "perAz" | "private";

const AZ_X: Record<Az, number> = { a: 40, b: 400 };
const IGW: Pt = [380, 74];
const NET: Pt = [380, 26];

const MODES: Record<Mode, { label: Bi }> = {
  shared: { label: { vi: "Một NAT gateway tại AZ a", en: "One NAT gateway in AZ a" } },
  perAz: { label: { vi: "Mỗi AZ một NAT gateway", en: "One NAT gateway per AZ" } },
  private: { label: { vi: "NAT gateway trong private subnet", en: "NAT gateway in private subnet" } },
};

function natAz(mode: Mode, ec2Az: Az): Az {
  return mode === "shared" ? "a" : ec2Az;
}

export default function NatHaSim() {
  const [mode, setMode] = useState<Mode>("shared");
  const [down, setDown] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState({ a: { ok: 0, err: 0 }, b: { ok: 0, err: 0 } });
  const pk = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = useRef(true);
  // Packets still in flight from a previous layout must not count against the new one.
  const generation = useRef(0);
  const L = useLang();
  // The packet loop reads the current language without restarting.
  const lang = useRef(L);
  lang.current = L;

  const natPos = (az: Az): Pt => mode === "private" ? [AZ_X[az] + 250, 250] : [AZ_X[az] + 250, 150];
  const ec2Pos = (az: Az): Pt => [AZ_X[az] + 90, 250];

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
      const az: Az = turn++ % 2 ? "b" : "a";
      if (down && az === "a") return; // the instance in AZ a is down too
      const nAz = natAz(mode, az);
      const nat = natPos(nAz);
      const gen = generation.current;
      const bump = (k: "ok" | "err") => {
        if (gen === generation.current) setStats((s) => ({ ...s, [az]: { ...s[az], [k]: s[az][k] + 1 } }));
      };
      if (down && nAz === "a") {
        travel(layer, [ec2Pos(az), nat], 800, "pkt-bad", 5).then(() => { bump("err"); flashText(layer, nat[0] - 4, nat[1] - 18, "✕", "err-t"); });
      } else if (mode === "private") {
        travel(layer, [ec2Pos(az), nat], 700, "pkt-bad", 5).then(() => { bump("err"); flashText(layer, nat[0] - 30, nat[1] - 18, lang.current({ vi: "không có route tới IGW", en: "no route to IGW" }), "err-t", 700); });
      } else {
        travel(layer, [ec2Pos(az), nat, IGW, NET], 1300, "pkt", 5).then(() => bump("ok"));
      }
    }, 500);
    return () => clearInterval(timer);
    // natPos/ec2Pos derive from mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mode, down]);

  function reset() {
    generation.current++;
    setStats({ a: { ok: 0, err: 0 }, b: { ok: 0, err: 0 } });
  }

  function pick(m: Mode) {
    setMode(m);
    reset();
  }

  const brokenB = stats.b.err > 0;
  const note = L<string>(mode === "private"
    ? { vi: "Public NAT gateway ở chế độ zonal phải nằm trong public subnet, nơi có route 0.0.0.0/0 tới internet gateway. Khi đặt trong private subnet, NAT gateway cũng không kết nối được internet. Đây là lỗi bố trí thường gặp.", en: "A public NAT gateway in zonal mode must be in a public subnet, which has a 0.0.0.0/0 route to the internet gateway. When placed in a private subnet, the NAT gateway cannot reach the internet either. This is a common placement mistake." }
    : mode === "shared"
      ? down
        ? { vi: "Sự cố tại AZ a làm ngừng hoạt động NAT gateway duy nhất. Private subnet tại AZ b vẫn hoạt động nhưng mất kết nối internet vì route table của subnet này trỏ tới NAT gateway tại AZ a.", en: "The failure in AZ a takes down the only NAT gateway. The private subnet in AZ b still works but loses internet access, because its route table points to the NAT gateway in AZ a." }
        : { vi: "Hai private subnet dùng chung NAT gateway tại AZ a. Hệ thống hoạt động bình thường; nhấn \"Sự cố AZ a\" để quan sát ảnh hưởng.", en: "The two private subnets share the NAT gateway in AZ a. The system is running normally; press \"Fail AZ a\" to see the impact." }
      : down
        ? { vi: "Mỗi AZ có NAT gateway riêng và route table riêng trỏ tới NAT gateway trong cùng AZ. Sự cố tại AZ a không ảnh hưởng tới AZ b. Đây là thiết kế được khuyến nghị với zonal NAT gateway; chế độ regional NAT gateway là phương án thay thế.", en: "Each AZ has its own NAT gateway and its own route table pointing to the NAT gateway in the same AZ. The failure in AZ a does not affect AZ b. This is the recommended design with zonal NAT gateways; a regional NAT gateway is the alternative." }
        : { vi: "Mỗi AZ một NAT gateway trong public subnet và một route table riêng. Tạo sự cố tại AZ a để quan sát kết quả.", en: "One NAT gateway in a public subnet and a separate route table per AZ. Trigger a failure in AZ a to see the result." });

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Bố trí", en: "Placement" })}</span>
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button key={m} className="btn" aria-pressed={m === mode} onClick={() => pick(m)}>{L(MODES[m].label)}</button>
        ))}
        <span className="sep" />
        <button className="btn danger" onClick={() => { setDown(true); reset(); }} disabled={down}>{L({ vi: "Sự cố AZ a", en: "Fail AZ a" })}</button>
        <button className="btn" onClick={() => { setDown(false); reset(); }}>{L({ vi: "Khôi phục", en: "Recover" })}</button>
        <button className="btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? L({ vi: "Chạy tiếp", en: "Resume" }) : L({ vi: "Tạm dừng", en: "Pause" })}</button>
      </div>
      <div className="svg-wrap">
        <svg ref={svgRef} viewBox="0 0 760 320" role="img" aria-label={L({ vi: "Hai AZ, mỗi AZ có public subnet và private subnet; EC2 instance trong private subnet kết nối ra internet qua NAT gateway", en: "Two AZs, each with a public subnet and a private subnet; EC2 instances in the private subnets reach the internet through a NAT gateway" })}>
          <text className="t" x={NET[0]} y={NET[1] - 6} textAnchor="middle">Internet</text>
          <rect className="vpc-igw" x={IGW[0] - 22} y={IGW[1] - 14} width={44} height={28} rx={6} />
          <text className="tw" x={IGW[0]} y={IGW[1] + 5} textAnchor="middle">IGW</text>
          <rect className="region" x={20} y={96} width={720} height={212} rx={12} />
          {(["a", "b"] as Az[]).map((az) => {
            const x = AZ_X[az];
            const nat = natPos(az);
            const hasNat = mode !== "shared" || az === "a";
            const isDown = down && az === "a";
            return (
              <g key={az} className={isDown ? "az-box down" : "az-box"}>
                <rect className="az" x={x} y={108} width={320} height={190} rx={10} />
                <text className="t" x={x + 12} y={128}>AZ {az}</text>
                {isDown && <text className="down-t" x={x + 308} y={128} textAnchor="end">{L({ vi: "SỰ CỐ", en: "FAILED" })}</text>}
                <rect className="vpc-subnet pub" x={x + 12} y={136} width={296} height={60} rx={6} />
                <text className="ts" x={x + 22} y={154}>public subnet</text>
                <rect className="vpc-subnet" x={x + 12} y={206} width={296} height={84} rx={6} />
                <text className="ts" x={x + 22} y={224}>private subnet · route 0.0.0.0/0 → NAT {mode === "shared" ? "AZ a" : `AZ ${az}`}</text>
                <g className="res res-ec2">
                  <rect x={ec2Pos(az)[0] - 45} y={ec2Pos(az)[1] - 16} width={90} height={32} rx={6} />
                  <text className="res-t" x={ec2Pos(az)[0]} y={ec2Pos(az)[1] + 5} textAnchor="middle">EC2</text>
                </g>
                {hasNat && (
                  <g className="res res-net">
                    <rect x={nat[0] - 50} y={nat[1] - 16} width={100} height={32} rx={6} />
                    <text className="res-t" x={nat[0]} y={nat[1] + 5} textAnchor="middle">NAT gateway</text>
                  </g>
                )}
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        <div className="status">
          <span className={"pill " + (brokenB || (mode === "private" && stats.a.err + stats.b.err > 0) ? "bad" : "ok")}>
            <i />{brokenB ? L({ vi: "Private subnet AZ b mất kết nối internet", en: "Private subnet in AZ b lost internet access" }) : mode === "private" && stats.a.err + stats.b.err > 0 ? L({ vi: "Không kết nối được internet", en: "No internet access" }) : L({ vi: "Kết nối internet bình thường", en: "Internet access is normal" })}
          </span>
          <span className="count">AZ a: {stats.a.ok} ok · {stats.a.err} {L({ vi: "lỗi", en: "errors" })} — AZ b: {stats.b.ok} ok · {stats.b.err} {L({ vi: "lỗi", en: "errors" })}</span>
        </div>
        <p style={{ margin: "8px 0 0" }}>{note}</p>
      </div>
    </div>
  );
}
