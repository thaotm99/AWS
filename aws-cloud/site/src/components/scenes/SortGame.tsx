import { useI18n } from "../../app/i18n";
import { useEffect, useState } from "react";

export interface Bin {
  id: string;
  title: string;
  sub: string;
  hint: string;
}

interface Props {
  bins: Bin[];
  cards: [name: string, bin: string][];
}

/** Drag cards into the right bin; tap-to-select then tap-a-bin also works on phones. */
export default function SortGame({ bins, cards }: Props) {
  const [order, setOrder] = useState(cards.map(([name]) => name));
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [hint, setHint] = useState<{ text: string; cls: string }>({ text: "", cls: "" });
  const [over, setOver] = useState<string | null>(null);
  const { t } = useI18n();

  // Shuffle after hydration so server and client render the same first frame.
  useEffect(() => {
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
  }, []);

  const answer = Object.fromEntries(cards);
  const placedCount = Object.keys(placed).length;

  function drop(binId: string, name = picked) {
    // Ignore anything that is not one of our cards, such as page text dragged onto a bin.
    if (!name || !cards.some(([n]) => n === name) || placed[name]) return;
    setPicked(null);
    if (answer[name] === binId) {
      const next = { ...placed, [name]: binId };
      setPlaced(next);
      const left = cards.length - Object.keys(next).length;
      setHint({ cls: "ok", text: left ? t("lesson.sort.right", { name, left }) : t("lesson.sort.allRight", { n: cards.length }) });
    } else {
      setShake(null);
      requestAnimationFrame(() => setShake(name));
      const right = bins.find((b) => b.id === answer[name]);
      setHint({ cls: "bad", text: `${t("lesson.sort.wrong", { name })} ${right?.hint ?? ""}` });
    }
  }

  const card = (name: string) => {
    const isPlaced = !!placed[name];
    const toggle = () => !isPlaced && setPicked(picked === name ? null : name);
    // A div rather than a <button>: Firefox will not start a drag from a draggable button.
    return (
      <div
        key={name}
        className={"card" + (isPlaced ? " placed" : "") + (shake === name ? " shake" : "")}
        role="button"
        tabIndex={isPlaced ? -1 : 0}
        aria-pressed={picked === name}
        aria-disabled={isPlaced || undefined}
        draggable={!isPlaced}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", name);
          e.dataTransfer.effectAllowed = "move";
          setPicked(name);
        }}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }
        }}
        onAnimationEnd={() => setShake(null)}
      >
        {name}
      </div>
    );
  };

  return (
    <div className="mt-3 rounded-[18px] border border-line bg-surface p-3.5">
      <div className="flex min-h-10 flex-wrap gap-2 border-b border-dashed border-line pb-3" aria-label={t("lesson.sort.pool")}>
        {order.filter((n) => !placed[n]).map(card)}
        {placedCount === cards.length && <span className="hint ok m-0">{t("lesson.sort.finished")}</span>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
        {bins.map((b) => (
          <div
            key={b.id}
            className={
              "flex min-h-[120px] cursor-pointer flex-col items-start gap-2 rounded-[14px] border-[1.5px] border-dashed p-2.5 text-left max-sm:min-h-[70px] " +
              (picked || over === b.id ? "border-accent bg-accent-soft" : "border-line")
            }
            role="button"
            tabIndex={0}
            onClick={() => drop(b.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                drop(b.id);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(b.id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              drop(b.id, e.dataTransfer.getData("text/plain"));
            }}
          >
            <div className="text-[0.9375rem] font-bold">{b.title}<small className="block text-[0.75rem] font-normal text-muted">{b.sub}</small></div>
            <div className="flex flex-wrap gap-1.5">{order.filter((n) => placed[n] === b.id).map(card)}</div>
          </div>
        ))}
      </div>
      <p className={"hint " + hint.cls} aria-live="polite">{hint.text}</p>
    </div>
  );
}
