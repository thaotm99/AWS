import type { Dispatch } from "../app/events";
import type { AnswerRecord, Question } from "../domain/types";

interface Props {
  question: Question;
  total: number;
  answer: AnswerRecord | undefined;
  selection: string[];
  saving: boolean;
  error: string | null;
  isLast: boolean;
  dispatch: Dispatch;
}

const label = (key: string) => key.toUpperCase();

export default function QuestionCard({ question: q, total, answer, selection, saving, error, isLast, dispatch }: Props) {
  const multi = q.selectCount > 1;

  return (
    <section className="pr-card" aria-labelledby="pr-q">
      <div className="pr-q-meta">
        <span>Câu {q.number}/{total}</span>
        {q.domain && <span>{q.domain}</span>}
        {multi && <span className="pr-multi">Chọn {q.selectCount}</span>}
      </div>
      <div id="pr-q" className="pr-html pr-prompt" dangerouslySetInnerHTML={{ __html: q.promptHtml }} />

      <div className="pr-options" role={multi ? "group" : "radiogroup"} aria-labelledby="pr-q">
        {q.options.map((o) => {
          const picked = answer ? answer.chosen.includes(o.key) : selection.includes(o.key);
          const right = answer && q.correct.includes(o.key);
          const cls = ["pr-option", multi ? "multi" : "", answer ? (right ? "right" : picked ? "wrong" : "faded") : ""].join(" ");
          const tag = !answer ? "" : right ? (picked ? "Đúng" : "Đáp án") : picked ? "Sai" : "";
          return (
            <button
              key={o.key}
              type="button"
              className={cls}
              role={multi ? "checkbox" : "radio"}
              aria-checked={picked}
              disabled={Boolean(answer) || saving}
              onClick={() => dispatch({ type: "exam/toggleOption", key: o.key })}
            >
              <span className="pr-key">{label(o.key)}</span>
              <span className="pr-html" dangerouslySetInnerHTML={{ __html: o.html }} />
              <span className="pr-tag">{tag}</span>
            </button>
          );
        })}
      </div>

      {answer && (
        <div className={`pr-verdict ${answer.correct ? "ok" : "bad"}`} role="status">
          <b className="pr-verdict-head">{answer.correct ? "Chính xác" : "Chưa đúng"}</b>
          <p>Đáp án đúng: <b>{q.correct.map(label).join(", ")}</b>{!answer.correct && <> · bạn chọn {answer.chosen.map(label).join(", ")}</>}</p>
          <details className="pr-explain" open>
            <summary>Giải thích</summary>
            <div className="pr-html" dangerouslySetInnerHTML={{ __html: q.explanationHtml }} />
          </details>
        </div>
      )}

      {error && <p className="pr-error" role="alert">{error}</p>}

      <div className="pr-actions">
        {answer ? (
          <>
            <span className="pr-muted">Phím Enter để tiếp tục</span>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "exam/next" })}>
              {isLast ? "Xem kết quả" : "Câu tiếp theo →"}
            </button>
          </>
        ) : (
          <>
            <span className="pr-muted">
              {multi ? `Chọn ${q.selectCount} đáp án · đã chọn ${selection.length}` : "Chọn 1 đáp án"} · phím A–{label(q.options.at(-1)!.key)}
            </span>
            <button
              type="button"
              className="btn primary"
              disabled={saving || selection.length !== q.selectCount}
              onClick={() => dispatch({ type: "exam/submit" })}
            >
              {saving ? "Đang lưu…" : "Kiểm tra"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
