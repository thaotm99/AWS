import { useId, useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";

// S3 Lifecycle transitions follow a one-way "waterfall". Standard-IA and One Zone-IA have a
// 30-day minimum storage duration charge (storage-class-intro.html).
type C = "std" | "ia" | "it" | "oz" | "gir" | "gfr" | "gda";

const CLASSES: { id: C; label: string; note: Bi }[] = [
  { id: "std", label: "S3 Standard", note: { vi: "truy cập thường xuyên", en: "frequent access" } },
  { id: "it", label: "Intelligent-Tiering", note: { vi: "tự động chuyển tầng theo mức truy cập", en: "moves between tiers automatically by access" } },
  { id: "ia", label: "Standard-IA", note: { vi: "ít truy cập, ≥ 3 AZ", en: "infrequent access, ≥ 3 AZs" } },
  { id: "oz", label: "One Zone-IA", note: { vi: "ít truy cập, 1 AZ", en: "infrequent access, 1 AZ" } },
  { id: "gir", label: "Glacier Instant Retrieval", note: { vi: "lưu trữ, truy xuất trong mili giây", en: "archive, millisecond retrieval" } },
  { id: "gfr", label: "Glacier Flexible Retrieval", note: { vi: "lưu trữ, truy xuất trong vài phút tới vài giờ", en: "archive, retrieval in minutes to hours" } },
  { id: "gda", label: "Glacier Deep Archive", note: { vi: "chi phí thấp nhất, truy xuất trong nhiều giờ", en: "lowest cost, retrieval within hours" } },
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
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
  const [from, setFrom] = useState<C>("it");
  const [to, setTo] = useState<C>("std");
  const [days, setDays] = useState(30);

  const allowed = ALLOWED[from].includes(to);
  const ia = to === "ia" || to === "oz";
  const ok = allowed;
  let why: string;
  if (from === to) why = L({ vi: "Object đã thuộc storage class này.", en: "The object is already in this storage class." });
  else if (!allowed && to === "std") why = L({ vi: "Lifecycle không chuyển ngược về S3 Standard. Để đưa object trở lại Standard, cần copy object.", en: "Lifecycle does not transition objects back to S3 Standard. To move an object back to Standard, you must copy it." });
  else if (!allowed) why = L({
    vi: `Lifecycle chỉ chuyển theo một chiều xuống. Không hỗ trợ transition từ ${name(from)} sang ${name(to)}. Các đích hợp lệ: ${ALLOWED[from].map(name).join(", ") || "không có"}.`,
    en: `Lifecycle transitions go one way only, downward. A transition from ${name(from)} to ${name(to)} is not supported. Valid targets: ${ALLOWED[from].map(name).join(", ") || "none"}.`,
  });
  else why = L({ vi: `Hợp lệ: ${name(from)} → ${name(to)} sau ${days} ngày.`, en: `Valid: ${name(from)} → ${name(to)} after ${days} days.` }) + (ia ? L({
    vi: ` Lưu ý: ${name(to)} có thời gian lưu trữ tối thiểu 30 ngày và kích thước tính phí tối thiểu 128 KB; object bị xoá, ghi đè hoặc chuyển đi trước 30 ngày vẫn bị tính phí đủ 30 ngày.`,
    en: ` Note: ${name(to)} has a 30-day minimum storage duration and a 128 KB minimum billable object size; an object deleted, overwritten or transitioned before 30 days is still charged for the full 30 days.`,
  }) : "");

  return (
    <div className="stage">
      <div className="lc-grid">
        <div>
          <div className="label">{L({ vi: "Storage class nguồn", en: "Source storage class" })}</div>
          <div className="lc-list">
            {CLASSES.map((c) => (
              <button key={c.id} className="picker-item" aria-pressed={c.id === from} onClick={() => setFrom(c.id)}>
                <b>{c.label}</b><span className="term-meta">{L(c.note)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">{L({ vi: "Storage class đích", en: "Target storage class" })}</div>
          <div className="lc-list">
            {CLASSES.map((c) => (
              <button key={c.id} className={"picker-item" + (ALLOWED[from].includes(c.id) ? " lc-ok" : "")} aria-pressed={c.id === to} onClick={() => setTo(c.id)}>
                <b>{c.label}</b><span className="term-meta">{ALLOWED[from].includes(c.id) ? L({ vi: "hợp lệ", en: "valid" }) : c.id === from ? L({ vi: "lớp hiện tại", en: "current class" }) : L({ vi: "không hợp lệ", en: "not valid" })}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-lcDays`}>{L({ vi: `Sau ${days} ngày kể từ khi tạo object`, en: `${days} days after object creation` })}</label>
        <input id={`${uid}-lcDays`} type="range" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </div>
      <div className="readout" aria-live="polite">
        <span className={"pill " + (ok ? "ok" : "bad")}><i />{ok ? L({ vi: "Transition hợp lệ", en: "Valid transition" }) : L({ vi: "Không hợp lệ", en: "Not valid" })}</span>
        <p style={{ margin: "8px 0 0" }}>{why}</p>
      </div>
    </div>
  );
}
