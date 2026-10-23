import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./lake-cost-sim.css";

// ShopViet's S3 data lake grows 1 TB a day in each zone. Raw data must be kept five
// years and is almost never read; refined data is queried by Athena every day. Pick a
// storage choice per zone and a file format, run twelve months, and watch the monthly
// storage bill and the two rules (keep raw data, Athena can still read refined data).

type RawId = "std" | "deep" | "del";
type RefId = "std" | "deep";
type FmtId = "csv" | "parquet";

const PRICE = { std: 23, deep: 1 };
const TB_PER_MONTH = 30;
const PARQUET = 0.25;
const MONTHS = 12;

const RAW: { id: RawId; name: Bi }[] = [
  { id: "std", name: { vi: "Giữ nguyên S3 Standard", en: "Keep in S3 Standard" } },
  { id: "deep", name: { vi: "Lifecycle → Glacier Deep Archive sau 1 ngày", en: "Lifecycle → Glacier Deep Archive after 1 day" } },
  { id: "del", name: { vi: "Lambda xoá sau 1 ngày", en: "Lambda deletes after 1 day" } },
];
const REF: { id: RefId; name: Bi }[] = [
  { id: "std", name: { vi: "S3 Standard", en: "S3 Standard" } },
  { id: "deep", name: { vi: "Lifecycle → Glacier Deep Archive sau 1 ngày", en: "Lifecycle → Glacier Deep Archive after 1 day" } },
];
const FMT: { id: FmtId; name: Bi }[] = [
  { id: "csv", name: { vi: "Glue ghi CSV", en: "Glue writes CSV" } },
  { id: "parquet", name: { vi: "Glue ghi Parquet nén", en: "Glue writes compressed Parquet" } },
];

function month(m: number, raw: RawId, ref: RefId, fmt: FmtId) {
  const rawTb = raw === "del" ? 0 : TB_PER_MONTH * m;
  const refTb = TB_PER_MONTH * m * (fmt === "parquet" ? PARQUET : 1);
  return { raw: rawTb * (raw === "deep" ? PRICE.deep : PRICE.std), ref: refTb * PRICE[ref] };
}

const BASE = Array.from({ length: MONTHS }, (_, i) => month(i + 1, "std", "std", "csv")).reduce((s, c) => s + c.raw + c.ref, 0);
const MAXV = 2 * TB_PER_MONTH * MONTHS * PRICE.std;
const X0 = 70;
const W = 720;
const Y0 = 24;
const H = 170;
const bw = W / MONTHS;
const y = (v: number) => Y0 + H - (v / MAXV) * H;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function LakeCostSim() {
  const L = useLang();
  const fmtNum = (n: number) => Math.round(n).toLocaleString(L({ vi: "vi-VN", en: "en-US" }));
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [raw, setRaw] = useState<RawId>("std");
  const [ref, setRef] = useState<RefId>("std");
  const [fmt, setFmt] = useState<FmtId>("csv");
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const bars = Array.from({ length: MONTHS }, (_, i) => month(i + 1, raw, ref, fmt));
  const total = bars.reduce((s, c) => s + c.raw + c.ref, 0);
  const done = shown === MONTHS;
  const keepsRaw = raw !== "del";
  const athenaOk = ref !== "deep";
  const best = raw === "deep" && ref === "std" && fmt === "parquet";

  function change(fn: () => void) {
    if (busy) return;
    fn();
    setShown(0);
  }

  async function play() {
    if (busy) return;
    setBusy(true);
    setShown(0);
    const fast = prefersReducedMotion();
    for (let m = 1; m <= MONTHS; m++) {
      if (!alive.current) return;
      setShown(m);
      const layer = fx.current;
      const c = bars[m - 1];
      if (layer && !fast && m === MONTHS) flashText(layer, X0 + (m - 0.5) * bw, y(c.raw + c.ref) - 8, fmtNum(c.raw + c.ref), "lkc-flash", 1400);
      if (!fast) await sleep(160);
    }
    setBusy(false);
  }

  let note: string;
  if (!keepsRaw) note = L({ vi: "Xoá raw zone giúp giảm chi phí nhưng vi phạm yêu cầu **lưu giữ dữ liệu gốc 5 năm**.", en: "Deleting the raw zone cuts cost but violates the requirement to **keep the original data for 5 years**." });
  else if (!athenaOk) note = L({ vi: "Athena **không đọc được** object trong S3 Glacier Deep Archive; phải restore trong nhiều giờ trước. Refined zone được truy vấn hằng ngày nên phải lưu ở storage class truy xuất ngay.", en: "Athena **cannot read** objects in S3 Glacier Deep Archive; they must first be restored, which takes many hours. The refined zone is queried daily, so it must be in a storage class with immediate access." });
  else if (best) note = L({ vi: "Raw zone gần như không được đọc: chuyển sang **S3 Glacier Deep Archive** sau 1 ngày, vẫn lưu giữ đủ 5 năm. Refined zone lưu ở S3 Standard và ghi ở định dạng **Parquet nén**: dung lượng nhỏ hơn nhiều, Athena quét ít dữ liệu hơn nên chi phí truy vấn cũng thấp hơn.", en: "The raw zone is almost never read: transition it to **S3 Glacier Deep Archive** after 1 day, still kept for the full 5 years. The refined zone stays in S3 Standard and is written as **compressed Parquet**: much smaller, and Athena scans less data, so query costs are lower too." });
  else if (raw === "std") note = L({ vi: "Raw zone chỉ dùng để lưu giữ nhưng lại nằm ở storage class có chi phí cao nhất. Chuyển sang S3 Glacier Deep Archive bằng lifecycle rule.", en: "The raw zone is only for retention, yet it sits in the highest-cost storage class. Transition it to S3 Glacier Deep Archive with a lifecycle rule." });
  else note = L({ vi: "Refined zone ghi ở định dạng CSV: dung lượng lớn hơn nhiều lần so với định dạng cột có nén, và Athena phải quét toàn bộ dữ liệu mỗi lần truy vấn. Cấu hình Glue ghi Parquet nén.", en: "The refined zone is written as CSV: many times larger than a compressed columnar format, and Athena must scan all the data on every query. Configure Glue to write compressed Parquet." });

  return (
    <div className="stage lkc">
      <div className="stage-bar">
        <span className="label">Raw zone</span>
        {RAW.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === raw} disabled={busy && o.id !== raw} onClick={() => change(() => setRaw(o.id))}>{L(o.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Refined zone</span>
        {REF.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === ref} disabled={busy && o.id !== ref} onClick={() => change(() => setRef(o.id))}>{L(o.name)}</button>
        ))}
        <span className="sep" />
        {FMT.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === fmt} disabled={busy && o.id !== fmt} onClick={() => change(() => setFmt(o.id))}>{L(o.name)}</button>
        ))}
        <button className="btn primary lkc-play" onClick={play} disabled={busy}>{L({ vi: "Mô phỏng 12 tháng", en: "Simulate 12 months" })}</button>
      </div>
      <p className="lkc-about">{L({ vi: "Mỗi zone tăng thêm 1 TB mỗi ngày. Raw zone phải được lưu giữ 5 năm và gần như không được đọc lại. Refined zone được analyst truy vấn bằng Athena hằng ngày.", en: "Each zone grows by 1 TB a day. The raw zone must be kept for 5 years and is almost never read again. Analysts query the refined zone with Athena every day." })}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 236" role="img" aria-label={L({ vi: "Biểu đồ chi phí lưu trữ S3 mỗi tháng trong 12 tháng, chia theo raw zone và refined zone", en: "Chart of monthly S3 storage cost over 12 months, split into the raw zone and the refined zone" })}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line className="lkc-grid" x1={X0} x2={X0 + W} y1={y(MAXV * f)} y2={y(MAXV * f)} />
              <text className="ts" x={X0 - 8} y={y(MAXV * f) + 4} textAnchor="end">{fmtNum(MAXV * f)}</text>
            </g>
          ))}
          {bars.map((c, i) => {
            const ghost = i >= shown;
            const x = X0 + i * bw + 8;
            const w = bw - 16;
            return (
              <g key={i} className={ghost ? "lkc-ghost" : ""}>
                <rect className="lkc-raw" x={x} y={y(c.raw)} width={w} height={y(0) - y(c.raw)} rx={2} />
                <rect className={"lkc-ref" + (athenaOk ? "" : " bad")} x={x} y={y(c.raw + c.ref)} width={w} height={y(c.raw) - y(c.raw + c.ref)} rx={2} />
                <text className="ts" x={x + w / 2} y={y(0) + 16} textAnchor="middle">{L({ vi: `T${i + 1}`, en: `M${i + 1}` })}</text>
              </g>
            );
          })}
          <g transform={`translate(${X0} 228)`}>
            <rect className="lkc-raw" x={0} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={17} y={0}>raw zone</text>
            <rect className="lkc-ref" x={100} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={117} y={0}>refined zone</text>
            <text className="ts" x={230} y={0}>{L({ vi: "đơn vị chi phí minh hoạ / tháng (giả định, không phải bảng giá AWS)", en: "illustrative cost units / month (assumed, not AWS pricing)" })}</text>
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown === 0 ? (
          <p className="lkc-hint">{L({ vi: <>Chọn phương án lưu trữ cho từng zone, sau đó nhấn <b>Mô phỏng 12 tháng</b>. Mô phỏng dùng đơn giá minh hoạ (Deep Archive rẻ hơn nhiều so với S3 Standard) và giả định Parquet nén có dung lượng bằng 1/4 CSV. Giá thực tế xem tại trang S3 pricing.</>, en: <>Choose a storage option for each zone, then press <b>Simulate 12 months</b>. The simulation uses illustrative unit prices (Deep Archive is much cheaper than S3 Standard) and assumes compressed Parquet is 1/4 the size of CSV. For actual prices, see the S3 pricing page.</> })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{L({ vi: `Tháng ${shown}: ${fmtNum(bars[shown - 1].raw + bars[shown - 1].ref)} đơn vị`, en: `Month ${shown}: ${fmtNum(bars[shown - 1].raw + bars[shown - 1].ref)} units` })}</span>
              <span className={"pill " + (keepsRaw ? "ok" : "bad")}><i />{keepsRaw ? L({ vi: "Lưu giữ đủ 5 năm", en: "Kept for the full 5 years" }) : L({ vi: "Mất dữ liệu gốc", en: "Original data lost" })}</span>
              <span className={"pill " + (athenaOk ? "ok" : "bad")}><i />{athenaOk ? L({ vi: "Athena đọc được", en: "Athena can read it" }) : L({ vi: "Athena không đọc được", en: "Athena cannot read it" })}</span>
            </div>
            {done && (
              <p className={`lkc-result ${best ? "ok" : "bad"}`}>
                <b>{L({ vi: `Cả năm: ${Math.round((total / BASE) * 100)}% so với phương án giữ nguyên S3 Standard và CSV. `, en: `Full year: ${Math.round((total / BASE) * 100)}% of the cost of keeping S3 Standard and CSV. ` })}</b>{rich(note)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
