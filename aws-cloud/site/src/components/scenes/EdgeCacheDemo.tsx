import { useRef, useState, type ReactNode } from "react";
import { travel, type Pt } from "../../lib/animate";

const USER: Pt = [90, 110];
const EDGE: Pt = [360, 110];
const ORIGIN: Pt = [612, 110];

type Entry = { tag: string; cls: "hit" | "miss" | "info"; msg: ReactNode };
// Relative cost of each request, for the comparison bars only (not measured latency).
type Timing = { hit: boolean; units: number };

export default function EdgeCacheDemo() {
  const pk = useRef<SVGGElement>(null);
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([
    { tag: "sẵn sàng", cls: "info", msg: "Cache ở edge đang trống. Bấm \"Khách mở ảnh sản phẩm\"." },
  ]);
  const [times, setTimes] = useState<Timing[]>([]);

  const push = (e: Entry) => setLog((prev) => [e, ...prev].slice(0, 4));

  async function request() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    await travel(layer, [USER, EDGE], 450, "pkt");
    if (cached) {
      push({ tag: "HIT", cls: "hit", msg: "Edge có sẵn ảnh trong cache, trả về ngay. Không cần đi tới Singapore." });
      await travel(layer, [EDGE, USER], 450, "pkt-back");
      setTimes((t) => [...t, { hit: true, units: 2 }].slice(-3));
    } else {
      push({ tag: "MISS", cls: "miss", msg: "Edge chưa có ảnh. Phải đi tiếp tới S3 ở Singapore để lấy bản gốc." });
      await travel(layer, [EDGE, ORIGIN], 1000, "pkt-edge");
      await travel(layer, [ORIGIN, EDGE], 1000, "pkt-back");
      setCached(true);
      push({ tag: "CACHE", cls: "info", msg: "Edge lưu một bản ảnh vào cache, rồi trả về cho khách." });
      await travel(layer, [EDGE, USER], 450, "pkt-back");
      setTimes((t) => [...t, { hit: false, units: 6 }].slice(-3));
    }
    setBusy(false);
  }

  function expire() {
    setCached(false);
    push({ tag: "TTL", cls: "info", msg: "Bản cache hết hạn và bị xóa. Request tiếp theo sẽ lại là MISS." });
  }

  const max = Math.max(1, ...times.map((t) => t.units));

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn primary" onClick={request} disabled={busy}>Khách mở ảnh sản phẩm</button>
        <button className="btn" onClick={expire}>Cache hết hạn (TTL)</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 230" role="img" aria-label="Request đi từ khách tới Edge location, nếu không có trong cache thì đi tiếp tới S3 ở Singapore">
          <path d="M90 110 H338" stroke="var(--line)" strokeWidth={2} fill="none" />
          <path d="M382 110 H612" stroke="var(--line)" strokeWidth={2} strokeDasharray="6 5" fill="none" />
          <text className="ts" x={214} y={98} textAnchor="middle">gần, vài trăm km</text>
          <text className="ts" x={497} y={98} textAnchor="middle">xa hơn, tới Region</text>
          <g transform="translate(66 110)" aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="t" x={66} y={150} textAnchor="middle">Khách</text>
          <text className="ts" x={66} y={166} textAnchor="middle">TP.HCM</text>
          <circle className="edge-dot" cx={360} cy={110} r={22} />
          <text className="edge-t" x={360} y={72} textAnchor="middle">Edge location (CloudFront)</text>
          <g className={"cache-box" + (cached ? " full" : "")}>
            <rect x={300} y={146} width={120} height={40} rx={6} />
            <text className="cache-t" x={360} y={171} textAnchor="middle">{cached ? "cache: product.jpg ✓" : "cache: trống"}</text>
          </g>
          <g className="origin">
            <rect x={612} y={84} width={120} height={52} rx={8} />
            <text className="tw" x={672} y={106} textAnchor="middle">S3 bucket</text>
            <text className="tw" x={672} y={124} textAnchor="middle" style={{ fontWeight: 400, fontSize: 11 }}>Singapore</text>
          </g>
          <text className="ts" x={672} y={158} textAnchor="middle">origin</text>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        <ul className="log" aria-live="polite">
          {log.map((e, i) => (
            <li key={log.length - i}>
              <span className={"tag " + e.cls}>{e.tag}</span>
              <span>{e.msg}</span>
            </li>
          ))}
        </ul>
        {times.map((t, i) => (
          <div className="timebar" key={i}>
            <span className={"tag " + (t.hit ? "hit" : "miss")}>{t.hit ? "HIT" : "MISS"}</span>
            <div className="bar">
              <i style={{ width: `${(t.units / max) * 100}%`, background: t.hit ? "var(--ok)" : "var(--edge)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
