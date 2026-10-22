import { useEffect, useState } from "react";
import { getDone, setDone } from "../lib/progress";

export default function DoneButton({ id }: { id: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(getDone().has(id)), [id]);

  function toggle() {
    setDone(id, !on);
    setOn(!on);
  }

  return (
    <button className="btn done-btn" aria-pressed={on} onClick={toggle}>
      {on ? "Đã hoàn thành ✓" : "Đánh dấu hoàn thành"}
    </button>
  );
}
