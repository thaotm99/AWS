import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
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

const RAW: { id: RawId; name: string }[] = [
  { id: "std", name: "Để nguyên S3 Standard" },
  { id: "deep", name: "Lifecycle → Glacier Deep Archive sau 1 ngày" },
  { id: "del", name: "Lambda xóa sau 1 ngày" },
];
const REF: { id: RefId; name: string }[] = [
  { id: "std", name: "S3 Standard" },
  { id: "deep", name: "Lifecycle → Glacier Deep Archive sau 1 ngày" },
];
const FMT: { id: FmtId; name: string }[] = [
  { id: "csv", name: "Glue ghi CSV" },
  { id: "parquet", name: "Glue ghi Parquet nén" },
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
const fmtNum = (n: number) => Math.round(n).toLocaleString("vi-VN");

export default function LakeCostSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  const [raw, setRaw] = useState<RawId>("std");
  const [ref, setRef] = useState<RefId>("std");
  const [fmt, setFmt] = useState<FmtId>("csv");
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

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
  if (!keepsRaw) note = "Xóa raw zone thì rẻ, nhưng vi phạm yêu cầu **giữ dữ liệu gốc 5 năm**.";
  else if (!athenaOk) note = "Athena **không đọc được** object trong Glacier Deep Archive; phải restore hàng giờ trước. Refined zone được query mỗi ngày nên phải ở lớp truy cập ngay.";
  else if (best) note = "Raw zone gần như không ai đọc: **Glacier Deep Archive** sau 1 ngày, vẫn giữ đủ 5 năm. Refined zone ở S3 Standard và ghi **Parquet nén**: nhỏ hơn nhiều, Athena quét ít dữ liệu hơn nên query cũng rẻ hơn.";
  else if (raw === "std") note = "Raw zone chỉ để lưu giữ mà lại nằm ở lớp đắt nhất. Chuyển sang Glacier Deep Archive bằng lifecycle rule.";
  else note = "Refined zone ghi CSV: to hơn nhiều lần so với định dạng cột có nén, và Athena phải quét hết mỗi lần query. Cho Glue ghi Parquet nén.";

  return (
    <div className="stage lkc">
      <div className="stage-bar">
        <span className="label">Raw zone</span>
        {RAW.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === raw} disabled={busy && o.id !== raw} onClick={() => change(() => setRaw(o.id))}>{o.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Refined zone</span>
        {REF.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === ref} disabled={busy && o.id !== ref} onClick={() => change(() => setRef(o.id))}>{o.name}</button>
        ))}
        <span className="sep" />
        {FMT.map((o) => (
          <button key={o.id} className="btn" aria-pressed={o.id === fmt} disabled={busy && o.id !== fmt} onClick={() => change(() => setFmt(o.id))}>{o.name}</button>
        ))}
        <button className="btn primary lkc-play" onClick={play} disabled={busy}>Chạy 12 tháng</button>
      </div>
      <p className="lkc-about">Mỗi ngày thêm 1 TB vào mỗi zone. Raw zone phải giữ 5 năm, gần như không đọc lại. Refined zone được analyst query bằng Athena mỗi ngày.</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 236" role="img" aria-label="Biểu đồ chi phí lưu trữ S3 mỗi tháng trong 12 tháng, chia theo raw zone và refined zone">
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
                <text className="ts" x={x + w / 2} y={y(0) + 16} textAnchor="middle">T{i + 1}</text>
              </g>
            );
          })}
          <g transform={`translate(${X0} 228)`}>
            <rect className="lkc-raw" x={0} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={17} y={0}>raw zone</text>
            <rect className="lkc-ref" x={100} y={-9} width={12} height={10} rx={2} />
            <text className="ts" x={117} y={0}>refined zone</text>
            <text className="ts" x={230} y={0}>đơn vị chi phí tương đối / tháng (S3 Standard ≈ 23, Deep Archive ≈ 1 mỗi TB)</text>
          </g>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {shown === 0 ? (
          <p className="lkc-hint">Chọn cách lưu cho từng zone, rồi bấm <b>Chạy 12 tháng</b>. Mô phỏng giả sử Parquet nén nhỏ bằng 1/4 CSV.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">Tháng {shown}: {fmtNum(bars[shown - 1].raw + bars[shown - 1].ref)} đơn vị</span>
              <span className={"pill " + (keepsRaw ? "ok" : "bad")}><i />{keepsRaw ? "Giữ đủ 5 năm" : "Mất dữ liệu gốc"}</span>
              <span className={"pill " + (athenaOk ? "ok" : "bad")}><i />{athenaOk ? "Athena đọc được" : "Athena không đọc được"}</span>
            </div>
            {done && (
              <p className={`lkc-result ${best ? "ok" : "bad"}`}>
                <b>Cả năm: {Math.round((total / BASE) * 100)}% so với để nguyên. </b>{rich(note)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
