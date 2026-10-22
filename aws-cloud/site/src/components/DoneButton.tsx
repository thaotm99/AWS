import { useEffect, useState } from "react";
import { getDone, setDone } from "../lib/progress";
import { useI18n } from "../app/i18n";

export default function DoneButton({ id }: { id: string }) {
  const [on, setOn] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    setOn(getDone().has(id));
  }, [id]);

  function toggle() {
    setDone(id, !on);
    setOn(!on);
  }

  return (
    <button className="btn done-btn" aria-pressed={on} onClick={toggle}>
      {on ? t("lesson.done.done") : t("lesson.done.mark")}
    </button>
  );
}
