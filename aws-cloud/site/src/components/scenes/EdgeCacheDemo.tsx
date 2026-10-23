import { useRef, useState, type ReactNode } from "react";
import { travel, type Pt } from "../../lib/animate";
import { useLang, type Bi } from "../../lib/lang";

const USER: Pt = [90, 110];
const EDGE: Pt = [360, 110];
const ORIGIN: Pt = [612, 110];

type Entry = { tag: Bi; cls: "hit" | "miss" | "info"; msg: Bi<ReactNode> };
const same = (text: string): Bi => ({ vi: text, en: text });
// Relative cost of each request, for the comparison bars only (not measured latency).
type Timing = { hit: boolean; units: number };

export default function EdgeCacheDemo() {
  const pk = useRef<SVGGElement>(null);
  const L = useLang();
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([
    { tag: { vi: "sẵn sàng", en: "ready" }, cls: "info", msg: { vi: "Cache tại edge location đang trống. Bấm \"Khách mở ảnh sản phẩm\".", en: "The edge cache is empty. Press \"Customer opens product image\"." } },
  ]);
  const [times, setTimes] = useState<Timing[]>([]);

  const push = (e: Entry) => setLog((prev) => [e, ...prev].slice(0, 4));

  async function request() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    try {
      await travel(layer, [USER, EDGE], 450, "pkt");
      if (cached) {
        push({ tag: same("HIT"), cls: "hit", msg: { vi: "Edge location có sẵn ảnh trong cache (cache hit) và trả về ngay. Request không phải đi tới origin ở Singapore.", en: "The edge location already has the image in its cache (cache hit) and returns it immediately. The request does not need to go to the origin in Singapore." } });
        await travel(layer, [EDGE, USER], 450, "pkt-back");
        setTimes((t) => [...t, { hit: true, units: 2 }].slice(-3));
      } else {
        push({ tag: same("MISS"), cls: "miss", msg: { vi: "Edge location chưa có ảnh trong cache (cache miss). CloudFront phải lấy object từ origin là S3 bucket ở Singapore.", en: "The edge location does not have the image in its cache yet (cache miss). CloudFront must fetch the object from the origin, the S3 bucket in Singapore." } });
        await travel(layer, [EDGE, ORIGIN], 1000, "pkt-edge");
        await travel(layer, [ORIGIN, EDGE], 1000, "pkt-back");
        setCached(true);
        push({ tag: same("CACHE"), cls: "info", msg: { vi: "Edge location lưu object vào cache, sau đó trả về cho khách.", en: "The edge location stores the object in its cache, then returns it to the customer." } });
        await travel(layer, [EDGE, USER], 450, "pkt-back");
        setTimes((t) => [...t, { hit: false, units: 6 }].slice(-3));
      }
    } finally {
      setBusy(false);
    }
  }

  function expire() {
    setCached(false);
    push({ tag: same("TTL"), cls: "info", msg: { vi: "Object trong cache hết hạn và bị xóa. Request tiếp theo sẽ lại là MISS.", en: "The cached object expires and is removed. The next request will be a MISS again." } });
  }

  const max = Math.max(1, ...times.map((t) => t.units));

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn primary" onClick={request} disabled={busy}>{L({ vi: "Khách mở ảnh sản phẩm", en: "Customer opens product image" })}</button>
        <button className="btn" onClick={expire} disabled={busy}>{L({ vi: "Cache hết hạn (TTL)", en: "Cache expires (TTL)" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 230" role="img" aria-label={L({ vi: "Request đi từ khách tới edge location, nếu không có trong cache thì đi tiếp tới S3 ở Singapore", en: "The request goes from the customer to the edge location and, if it is not in the cache, on to S3 in Singapore" })}>
          <path d="M90 110 H338" stroke="var(--line)" strokeWidth={2} fill="none" />
          <path d="M382 110 H612" stroke="var(--line)" strokeWidth={2} strokeDasharray="6 5" fill="none" />
          <text className="ts" x={214} y={98} textAnchor="middle">{L({ vi: "gần, vài trăm km", en: "near, a few hundred km" })}</text>
          <text className="ts" x={497} y={98} textAnchor="middle">{L({ vi: "xa hơn, tới Region", en: "farther, to the Region" })}</text>
          <g transform="translate(66 110)" aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="t" x={66} y={150} textAnchor="middle">{L({ vi: "Khách", en: "Customer" })}</text>
          <text className="ts" x={66} y={166} textAnchor="middle">{L({ vi: "TP.HCM", en: "Ho Chi Minh City" })}</text>
          <circle className="edge-dot" cx={360} cy={110} r={22} />
          <text className="edge-t" x={360} y={72} textAnchor="middle">Edge location (CloudFront)</text>
          <g className={"cache-box" + (cached ? " full" : "")}>
            <rect x={300} y={146} width={120} height={40} rx={6} />
            <text className="cache-t" x={360} y={171} textAnchor="middle">{cached ? "cache: product.jpg ✓" : L({ vi: "cache: trống", en: "cache: empty" })}</text>
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
              <span className={"tag " + e.cls}>{L(e.tag)}</span>
              <span>{L(e.msg)}</span>
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
