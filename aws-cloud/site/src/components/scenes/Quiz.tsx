import { useState } from "react";

export interface QuizItem {
  q: string;
  opts: string[];
  a: number;
  why: string;
}

function Question({ item, n }: { item: QuizItem; n: number }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;
  const correct = chosen === item.a;

  return (
    <div className="q">
      <div className="q-text">{n}. {item.q}</div>
      <div className="opts">
        {item.opts.map((o, i) => {
          const cls = ["opt", answered && i === item.a ? "right" : "", answered && i === chosen && !correct ? "wrong" : ""]
            .filter(Boolean).join(" ");
          return (
            <button key={i} className={cls} disabled={answered} onClick={() => setChosen(i)}>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={"explain" + (correct ? "" : " miss")}>
          <b>{correct ? "Đúng." : "Chưa đúng."}</b> {item.why}
        </div>
      )}
    </div>
  );
}

export default function Quiz({ items }: { items: QuizItem[] }) {
  return (
    <div className="quiz">
      {items.map((item, i) => <Question key={i} item={item} n={i + 1} />)}
    </div>
  );
}
