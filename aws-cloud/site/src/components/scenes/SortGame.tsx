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

  // Shuffle after hydration so server and client render the same first frame.
  useEffect(() => setOrder((o) => [...o].sort(() => Math.random() - 0.5)), []);

  const answer = Object.fromEntries(cards);
  const placedCount = Object.keys(placed).length;

  function drop(binId: string, name = picked) {
    if (!name || placed[name]) return;
    setPicked(null);
    if (answer[name] === binId) {
      const next = { ...placed, [name]: binId };
      setPlaced(next);
      const left = cards.length - Object.keys(next).length;
      setHint({ cls: "ok", text: left ? `Đúng: ${name}. Còn ${left} thẻ.` : `Xuất sắc! Bạn đã xếp đúng cả ${cards.length} thẻ.` });
    } else {
      setShake(null);
      requestAnimationFrame(() => setShake(name));
      const right = bins.find((b) => b.id === answer[name]);
      setHint({ cls: "bad", text: `${name} không thuộc ô này. ${right?.hint ?? ""}` });
    }
  }

  const card = (name: string) => {
    const isPlaced = !!placed[name];
    return (
      <button
        key={name}
        className={"card" + (isPlaced ? " placed" : "") + (shake === name ? " shake" : "")}
        aria-pressed={picked === name}
        draggable={!isPlaced}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", name);
          setPicked(name);
        }}
        onClick={() => !isPlaced && setPicked(picked === name ? null : name)}
        onAnimationEnd={() => setShake(null)}
      >
        {name}
      </button>
    );
  };

  return (
    <div className="game">
      <div className="pool" aria-label="Các thẻ chưa xếp">
        {order.filter((n) => !placed[n]).map(card)}
        {placedCount === cards.length && <span className="hint ok" style={{ margin: 0 }}>Đã xếp hết thẻ.</span>}
      </div>
      <div className="bins">
        {bins.map((b) => (
          <div
            key={b.id}
            className={"bin" + (picked ? " ready" : "") + (over === b.id ? " over" : "")}
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
            <div className="bin-title">{b.title}<small>{b.sub}</small></div>
            <div className="bin-items">{order.filter((n) => placed[n] === b.id).map(card)}</div>
          </div>
        ))}
      </div>
      <p className={"hint " + hint.cls} aria-live="polite">{hint.text}</p>
    </div>
  );
}
