import { useState } from "react";

// S3 Lifecycle transitions follow a one-way "waterfall", and objects must stay 30 days
// before moving to Standard-IA or One Zone-IA (exam1_q19, exam4_q43, exam5_q51, exam6_q28).
type C = "std" | "ia" | "it" | "oz" | "gir" | "gfr" | "gda";

const CLASSES: { id: C; label: string; note: string }[] = [
  { id: "std", label: "S3 Standard", note: "truy cập thường xuyên" },
  { id: "it", label: "Intelligent-Tiering", note: "tự chuyển tầng theo truy cập" },
  { id: "ia", label: "Standard-IA", note: "ít truy cập, ≥ 3 AZ" },
  { id: "oz", label: "One Zone-IA", note: "ít truy cập, 1 AZ" },
  { id: "gir", label: "Glacier Instant Retrieval", note: "lưu trữ, lấy trong mili giây" },
  { id: "gfr", label: "Glacier Flexible Retrieval", note: "lưu trữ, lấy trong phút tới giờ" },
  { id: "gda", label: "Glacier Deep Archive", note: "rẻ nhất, lấy trong nhiều giờ" },
];

// Allowed lifecycle transitions per the S3 documentation's waterfall.
const ALLOWED: Record<C, C[]> = {
  std: ["ia", "it", "oz", "gir", "gfr", "gda"],
  ia: ["it", "oz", "gir", "gfr", "gda"],
  it: ["oz", "gir", "gfr", "gda"],
  oz: ["gfr", "gda"],
  gir: ["gfr", "gda"],
  gfr: ["gda"],
  gda: [],
};

const name = (c: C) => CLASSES.find((x) => x.id === c)!.label;

export default function LifecycleValidator() {
  const [from, setFrom] = useState<C>("it");
  const [to, setTo] = useState<C>("std");
  const [days, setDays] = useState(30);

  const allowed = ALLOWED[from].includes(to);
  const needs30 = from === "std" && (to === "ia" || to === "oz");
  const ok = allowed && !(needs30 && days < 30);
  let why: string;
  if (from === to) why = "Đã ở lớp này rồi.";
  else if (!allowed && to === "std") why = "Lifecycle không bao giờ chuyển ngược về S3 Standard. Muốn đưa lên lại phải copy object.";
  else if (!allowed) why = `Lifecycle chỉ chuyển theo một chiều xuống. Từ ${name(from)} không đi được tới ${name(to)}. Các đích hợp lệ: ${ALLOWED[from].map(name).join(", ") || "không có"}.`;
  else if (needs30 && days < 30) why = `Object phải nằm ở S3 Standard ít nhất 30 ngày mới chuyển được sang ${name(to)}.`;
  else why = `Hợp lệ: ${name(from)} → ${name(to)} sau ${days} ngày.`;

  return (
    <div className="stage">
      <div className="lc-grid">
        <div>
          <div className="label">Từ lớp</div>
          <div className="lc-list">
            {CLASSES.map((c) => (
              <button key={c.id} className="picker-item" aria-pressed={c.id === from} onClick={() => setFrom(c.id)}>
                <b>{c.label}</b><span className="term-meta">{c.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">Sang lớp</div>
          <div className="lc-list">
            {CLASSES.map((c) => (
              <button key={c.id} className={"picker-item" + (ALLOWED[from].includes(c.id) ? " lc-ok" : "")} aria-pressed={c.id === to} onClick={() => setTo(c.id)}>
                <b>{c.label}</b><span className="term-meta">{ALLOWED[from].includes(c.id) ? "đi được" : c.id === from ? "lớp hiện tại" : "không đi được"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor="lcDays">Sau {days} ngày kể từ khi tạo</label>
        <input id="lcDays" type="range" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </div>
      <div className="readout" aria-live="polite">
        <span className={"pill " + (ok ? "ok" : "bad")}><i />{ok ? "Transition hợp lệ" : "Không hợp lệ"}</span>
        <p style={{ margin: "8px 0 0" }}>{why}</p>
      </div>
    </div>
  );
}
