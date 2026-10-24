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
    { tag: { vi: "sẵn sàng", en: "ready" }, cls: "info", msg: { vi: "Cache tại edge location đang trống. Chọn \"Người dùng mở ảnh sản phẩm\".", en: "The edge location cache is empty. Choose \"User opens product image\"." } },
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
        push({ tag: same("HIT"), cls: "hit", msg: { vi: "Cache hit: edge location có sẵn ảnh trong cache và trả về ngay, không gửi request tới origin tại Singapore.", en: "Cache hit: the edge location already has the image in its cache and returns it immediately, without sending a request to the origin in Singapore." } });
        await travel(layer, [EDGE, USER], 450, "pkt-back");
        setTimes((t) => [...t, { hit: true, units: 2 }].slice(-3));
      } else {
        push({ tag: same("MISS"), cls: "miss", msg: { vi: "Cache miss: edge location chưa có ảnh và gửi request tới origin là S3 bucket tại Singapore để lấy object.", en: "Cache miss: the edge location does not have the image yet and sends a request to the origin, an S3 bucket in Singapore, to fetch the object." } });
        await travel(layer, [EDGE, ORIGIN], 1000, "pkt-edge");
        await travel(layer, [ORIGIN, EDGE], 1000, "pkt-back");
        setCached(true);
        push({ tag: same("CACHE"), cls: "info", msg: { vi: "Edge location lưu object vào cache, rồi trả về cho người dùng.", en: "The edge location stores the object in its cache, then returns it to the user." } });
        await travel(layer, [EDGE, USER], 450, "pkt-back");
        setTimes((t) => [...t, { hit: false, units: 6 }].slice(-3));
      }
    } finally {
      setBusy(false);
    }
  }

  function expire() {
    setCached(false);
    push({ tag: same("TTL"), cls: "info", msg: { vi: "Object trong cache hết TTL. Request tiếp theo lại là cache miss.", en: "The cached object reaches the end of its TTL. The next request is a cache miss again." } });
  }

  const max = Math.max(1, ...times.map((t) => t.units));

  return (
    <div className="stage">
      <div className="stage-bar">
        <button className="btn primary" onClick={request} disabled={busy}>{L({ vi: "Người dùng mở ảnh sản phẩm", en: "User opens product image" })}</button>
        <button className="btn" onClick={expire} disabled={busy}>{L({ vi: "Cache hết hạn (TTL)", en: "Cache expires (TTL)" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 230" role="img" aria-label={L({ vi: "Request đi từ người dùng tới edge location; khi cache miss, edge location gửi request tới origin S3 tại Singapore", en: "The request goes from the user to the edge location; on a cache miss, the edge location sends a request to the S3 origin in Singapore" })}>
          <path className="fill-none stroke-line stroke-2" d="M90 110 H338" />
          <path className="fill-none stroke-line stroke-2" d="M382 110 H612" strokeDasharray="6 5" />
          <text className="ts" x={214} y={98} textAnchor="middle">{L({ vi: "gần, vài trăm km", en: "near, a few hundred km" })}</text>
          <text className="ts" x={497} y={98} textAnchor="middle">{L({ vi: "xa hơn, tới Region", en: "farther, to the Region" })}</text>
          <g transform="translate(66 110)" aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="t" x={66} y={150} textAnchor="middle">{L({ vi: "Người dùng", en: "User" })}</text>
          <text className="ts" x={66} y={166} textAnchor="middle">{L({ vi: "TP.HCM", en: "Ho Chi Minh City" })}</text>
          <circle className="edge-dot" cx={360} cy={110} r={22} />
          <text className="edge-t" x={360} y={72} textAnchor="middle">Edge location (CloudFront)</text>
          <g className={"cache-box" + (cached ? " full" : "")}>
            <rect x={280} y={146} width={160} height={40} rx={6} />
            <text className="cache-t" x={360} y={171} textAnchor="middle">{cached ? "cache: product.jpg ✓" : L({ vi: "cache: trống", en: "cache: empty" })}</text>
          </g>
          <g className="origin">
            <rect x={612} y={84} width={120} height={52} rx={8} />
            <text className="tw" x={672} y={106} textAnchor="middle">S3 bucket</text>
            <text className="tw text-[11px] font-normal" x={672} y={124} textAnchor="middle">Singapore</text>
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
          <div className="mt-1.5 grid grid-cols-[70px_minmax(0,1fr)] items-center gap-2.5 text-step--1" key={i}>
            <span className={"tag w-fit rounded-[4px] px-1.5 font-mono font-medium " + (t.hit ? "hit" : "miss")}>{t.hit ? "HIT" : "MISS"}</span>
            <div className="bar">
              <i className={t.hit ? "bg-ok" : "bg-edge"} style={{ width: `${(t.units / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
