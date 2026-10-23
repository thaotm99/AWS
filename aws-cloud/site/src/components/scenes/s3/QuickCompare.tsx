import { useState } from "react";
import { rich } from "../diagram";
import { useLang } from "../../../lib/lang";

// "Quick comparison": S3 features that look similar to the right choice in a MFTECH
// situation. Each item says what the feature is for and why it does not fit that situation.
// Text comes from the MDX file of each language.

export interface CompareItem {
  name: string;
  use: string;
  notHere: string;
  instead: string;
}

export default function QuickCompare({ items }: { items: CompareItem[] }) {
  const L = useLang();
  const [active, setActive] = useState(0);
  const it = items[active];
  return (
    <div className="stage">
      <div className="picker">
        <div className="picker-list" role="group" aria-label={L({ vi: "Tính năng", en: "Feature" })}>
          {items.map((x, i) => (
            <button key={x.name} className="picker-item" aria-pressed={i === active} onClick={() => setActive(i)}>
              <b>{x.name}</b>
            </button>
          ))}
        </div>
        <div className="picker-answer" aria-live="polite">
          <strong className="picker-service">{it.name}</strong>
          <span className="label">{L({ vi: "Dùng khi", en: "Use it when" })}</span>
          <p>{rich(it.use)}</p>
          <span className="label">{L({ vi: "Vì sao không chọn trong tình huống này", en: "Why not in this situation" })}</span>
          <p>{rich(it.notHere)}</p>
          <span className="label">{L({ vi: "Phương án phù hợp", en: "What fits instead" })}</span>
          <p>{rich(it.instead)}</p>
        </div>
      </div>
    </div>
  );
}
