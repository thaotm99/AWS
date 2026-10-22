import { useState } from "react";

export interface Requirement {
  /** The requirement as the question phrases it. */
  need: string;
  /** What the exam picks for it. */
  answer: string;
  why: string;
  refs: string[];
}

/** Requirement → answer lookup, the way the practice tests frame a choice. */
export default function RequirementPicker({ items, label = "Đề chọn" }: { items: Requirement[]; label?: string }) {
  const [active, setActive] = useState(0);
  const item = items[active];
  return (
    <div className="stage">
      <div className="picker">
        <div className="picker-list" role="group" aria-label="Chọn yêu cầu trong đề">
          {items.map((n, i) => (
            <button key={i} className="picker-item" aria-pressed={i === active} onClick={() => setActive(i)}>
              {n.need}
            </button>
          ))}
        </div>
        <div className="picker-answer" aria-live="polite">
          <span className="label">{label}</span>
          <strong className="picker-service">{item.answer}</strong>
          <p>{item.why}</p>
          <p className="exam-refs"><span>Đề hỏi ở</span>{item.refs.map((r) => <code key={r}>{r}</code>)}</p>
        </div>
      </div>
    </div>
  );
}
