import { useState } from "react";

// S3 Lifecycle transitions follow a one-way "waterfall", and objects must stay 30 days
// before moving to Standard-IA or One Zone-IA (exam1_q19, exam4_q43, exam5_q51, exam6_q28).
type C = "std" | "ia" | "it" | "oz" | "gir" | "gfr" | "gda";

const CLASSES: { id: C; label: string; note: string }[] = [
  { id: "std", label: "S3 Standard", note: "truy cập thường xuyên" },
  { id: "it", label: "Intelligent-Tiering", note: "tự động chuyển tầng theo mức truy cập" },
  { id: "ia", label: "Standard-IA", note: "ít truy cập, ≥ 3 AZ" },
  { id: "oz", label: "One Zone-IA", note: "ít truy cập, 1 AZ" },
  { id: "gir", label: "Glacier Instant Retrieval", note: "lưu trữ, truy xuất trong mili giây" },
  { id: "gfr", label: "Glacier Flexible Retrieval", note: "lưu trữ, truy xuất trong vài phút tới vài giờ" },
  { id: "gda", label: "Glacier Deep Archive", note: "chi phí thấp nhất, truy xuất trong nhiều giờ" },
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
  if (from === to) why = "Object đã thuộc storage class này.";
  else if (!allowed && to === "std") why = "Lifecycle không chuyển ngược về S3 Standard. Để đưa object trở lại Standard, cần copy object.";
  else if (!allowed) why = `Lifecycle chỉ chuyển theo một chiều xuống. Không hỗ trợ transition từ ${name(from)} sang ${name(to)}. Các đích hợp lệ: ${ALLOWED[from].map(name).join(", ") || "không có"}.`;
  else if (needs30 && days < 30) why = `Object phải được lưu tại S3 Standard tối thiểu 30 ngày trước khi chuyển sang ${name(to)}.`;
  else why = `Hợp lệ: ${name(from)} → ${name(to)} sau ${days} ngày.`;

  return (
    <div className="stage">
      <div className="lc-grid">
        <div>
          <div className="label">Storage class nguồn</div>
          <div className="lc-list">
            {CLASSES.map((c) => (
              <button key={c.id} className="picker-item" aria-pressed={c.id === from} onClick={() => setFrom(c.id)}>
                <b>{c.label}</b><span className="term-meta">{c.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">Storage class đích</div>
          <div className="lc-list">
            {CLASSES.map((c) => (
              <button key={c.id} className={"picker-item" + (ALLOWED[from].includes(c.id) ? " lc-ok" : "")} aria-pressed={c.id === to} onClick={() => setTo(c.id)}>
                <b>{c.label}</b><span className="term-meta">{ALLOWED[from].includes(c.id) ? "hợp lệ" : c.id === from ? "lớp hiện tại" : "không hợp lệ"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor="lcDays">Sau {days} ngày kể từ khi tạo object</label>
        <input id="lcDays" type="range" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </div>
      <div className="readout" aria-live="polite">
        <span className={"pill " + (ok ? "ok" : "bad")}><i />{ok ? "Transition hợp lệ" : "Không hợp lệ"}</span>
        <p style={{ margin: "8px 0 0" }}>{why}</p>
      </div>
    </div>
  );
}
