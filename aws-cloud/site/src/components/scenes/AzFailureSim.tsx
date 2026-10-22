import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel } from "../../lib/animate";
import { useLang, type Bi } from "../../lib/lang";

type Az = "a" | "b" | "c";
const AZ_X: Record<Az, number> = { a: 40, b: 280, c: 520 };

const MODES = {
  one: { label: { vi: "2 server trong 1 AZ", en: "2 servers in 1 AZ" }, servers: [["a", "web-1", 0], ["a", "web-2", 1]] },
  two: { label: { vi: "Phân bố 2 AZ", en: "Spread over 2 AZs" }, servers: [["a", "web-1", 0], ["b", "web-2", 0]] },
  three: { label: { vi: "Phân bố 3 AZ", en: "Spread over 3 AZs" }, servers: [["a", "web-1", 0], ["b", "web-2", 0], ["c", "web-3", 0]] },
} as const;
type Mode = keyof typeof MODES;

const USERS_X = [330, 380, 430];
const LB_BOTTOM: [number, number] = [380, 106];
const SPAWN_EVERY_MS = 420;

function serversFor(mode: Mode) {
  return MODES[mode].servers.map(([az, name, slot]) => ({
    az: az as Az,
    name,
    cx: AZ_X[az as Az] + 100,
    y: 222 + slot * 70,
  }));
}

function explain(mode: Mode, down: Set<Az>, alive: number, total: number): Bi {
  if (!down.size)
    return mode === "one"
      ? { vi: "Hệ thống hoạt động bình thường, nhưng cả hai server cùng nằm trong AZ a. Nhấn \"Sự cố AZ a\" để quan sát ảnh hưởng.",
          en: "The system is running normally, but both servers are in AZ a. Press \"Fail AZ a\" to see the impact." }
      : { vi: "Request được phân phối đều cho các server tại nhiều AZ. Tạo sự cố tại một AZ để quan sát ảnh hưởng.",
          en: "Requests are distributed evenly across servers in multiple AZs. Trigger a failure in one AZ to see the impact." };
  if (!alive)
    return { vi: "Toàn bộ server nằm trong AZ gặp sự cố. Load Balancer không còn target healthy để xử lý request, người dùng nhận lỗi. Hai server không mang lại khả năng chịu lỗi nếu cùng nằm trong một AZ.",
      en: "All servers are in the failed AZ. The load balancer has no healthy target left to handle requests, and users receive errors. Two servers provide no fault tolerance if they are in the same AZ." };
  if (alive < total)
    return { vi: "Load Balancer xác định server tại AZ gặp sự cố là unhealthy và chuyển toàn bộ request sang server còn lại. Người dùng vẫn đặt hàng bình thường; chỉ tổng năng lực xử lý giảm.",
      en: "The load balancer marks the server in the failed AZ as unhealthy and sends all requests to the remaining server. Users still place orders normally; only total capacity is reduced." };
  return { vi: "AZ gặp sự cố không chứa server nào của ShopViet nên hệ thống không bị ảnh hưởng.",
    en: "The failed AZ contains none of ShopViet's servers, so the system is not affected." };
}

export default function AzFailureSim() {
  const [mode, setMode] = useState<Mode>("one");
  const [down, setDown] = useState<Set<Az>>(new Set());
  const [paused, setPaused] = useState(false);
  const [ok, setOk] = useState(0);
  const [err, setErr] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const pkRef = useRef<SVGGElement>(null);
  const visible = useRef(true);
  const L = useLang();

  const servers = serversFor(mode);
  const alive = servers.filter((s) => !down.has(s.az));

  useEffect(() => {
    if (prefersReducedMotion()) setPaused(true);
    const el = svgRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => (visible.current = entries[0].isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const layer = pkRef.current;
      if (!layer || !visible.current || document.hidden) return;
      const ux = USERS_X[Math.floor(Math.random() * USERS_X.length)];
      if (alive.length) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        travel(layer, [[ux, 46], LB_BOTTOM, [target.cx, target.y]], 1100, "pkt", 5).then(() => {
          setOk((n) => n + 1);
          const g = svgRef.current?.querySelector(`[data-server="${target.name}"]`);
          g?.classList.add("hit");
          setTimeout(() => g?.classList.remove("hit"), 160);
        });
      } else {
        travel(layer, [[ux, 46], LB_BOTTOM], 600, "pkt-bad", 5).then(() => {
          setErr((n) => n + 1);
          flashText(layer, 480, 96, "503", "err-t");
        });
      }
    }, SPAWN_EVERY_MS);
    return () => clearInterval(timer);
    // alive is derived from mode and down
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mode, down]);

  function pickMode(next: Mode) {
    setMode(next);
    setOk(0);
    setErr(0);
  }

  function fail(az: Az) {
    setDown((prev) => new Set(prev).add(az));
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Bố trí", en: "Placement" })}</span>
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button key={m} className="btn" aria-pressed={m === mode} onClick={() => pickMode(m)}>
            {L(MODES[m].label)}
          </button>
        ))}
        <span className="sep" />
        <span className="label">{L({ vi: "Sự cố", en: "Failure" })}</span>
        <button className="btn danger" onClick={() => fail("a")}>{L({ vi: "Sự cố AZ a", en: "Fail AZ a" })}</button>
        <button className="btn danger" onClick={() => fail("b")}>{L({ vi: "Sự cố AZ b", en: "Fail AZ b" })}</button>
        <button className="btn" onClick={() => setDown(new Set())}>{L({ vi: "Khôi phục", en: "Recover" })}</button>
        <span className="sep" />
        <button className="btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? L({ vi: "Chạy tiếp", en: "Resume" }) : L({ vi: "Tạm dừng", en: "Pause" })}
        </button>
      </div>
      <div className="svg-wrap">
        <svg ref={svgRef} viewBox="0 0 760 400" role="img" aria-label={L({ vi: "Request từ người dùng đi qua Load Balancer tới các server trong 3 AZ", en: "User requests pass through the load balancer to servers in 3 AZs" })}>
          <g aria-hidden="true">
            {USERS_X.map((x) => (
              <g key={x} transform={`translate(${x} 30)`}>
                <circle className="user" cy={-7} r={5} />
                <path className="user" d="M-9 9 a9 9 0 0 1 18 0 z" />
              </g>
            ))}
            <text className="ts" x={470} y={36}>{L({ vi: "Người dùng", en: "Users" })}</text>
          </g>
          <rect className="region" x={20} y={130} width={720} height={258} rx={12} />
          <text className="t" x={36} y={154}>Region · ap-southeast-1</text>
          <g className="lb">
            <rect x={290} y={68} width={180} height={38} rx={8} />
            <text className="tw" x={380} y={92} textAnchor="middle">Load Balancer</text>
          </g>
          {(Object.keys(AZ_X) as Az[]).map((az) => (
            <g key={az} className={"az-box" + (down.has(az) ? " down" : "")}>
              <rect className="az" x={AZ_X[az]} y={170} width={200} height={204} rx={10} />
              <text className="t" x={AZ_X[az] + 14} y={192}>AZ {az}</text>
              {down.has(az) && <text className="down-t" x={AZ_X[az] + 186} y={192} textAnchor="end">{L({ vi: "SỰ CỐ", en: "FAILED" })}</text>}
            </g>
          ))}
          {servers.map((s) => {
            const dead = down.has(s.az);
            return (
              <g key={s.name} data-server={s.name} className={"inst" + (dead ? " dead" : "")}>
                <rect x={s.cx - 60} y={s.y} width={120} height={42} rx={7} />
                <text x={s.cx} y={s.y + 26} textAnchor="middle">EC2 {s.name}</text>
                {dead && (
                  <>
                    <line x1={s.cx - 50} y1={s.y + 6} x2={s.cx + 50} y2={s.y + 36} />
                    <line x1={s.cx + 50} y1={s.y + 6} x2={s.cx - 50} y2={s.y + 36} />
                  </>
                )}
              </g>
            );
          })}
          <g ref={pkRef} />
        </svg>
      </div>
      <div className="readout">
        <div className="status">
          <span className={"pill " + (alive.length ? "ok" : "bad")}>
            <i />{alive.length ? L({ vi: "ShopViet hoạt động", en: "ShopViet is up" }) : L({ vi: "ShopViet gián đoạn", en: "ShopViet is down" })}
          </span>
          <span className="count">
            {L({ vi: "Server healthy: ", en: "Healthy servers: " })}{alive.length}/{servers.length} · {L({ vi: "request thành công", en: "successful requests" })} {ok} · {L({ vi: "lỗi", en: "errors" })} {err}
          </span>
        </div>
        <p style={{ margin: "8px 0 0" }}>{L(explain(mode, down, alive.length, servers.length))}</p>
      </div>
    </div>
  );
}
