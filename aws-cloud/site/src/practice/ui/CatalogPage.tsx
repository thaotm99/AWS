import { useEffect } from "react";
import { PracticeApp } from "../app/PracticeApp";
import { Scoring } from "../domain/Scoring";
import type { Attempt, Certification, ExamSummary } from "../domain/types";
import { routes } from "./routes";
import { useStore } from "./useStore";

function examStatus(exam: ExamSummary, attempt: Attempt | undefined, cert: Certification) {
  if (!attempt || !Object.keys(attempt.answers).length) return { cls: "", text: "Chưa làm" };
  const s = Scoring.score(attempt, cert);
  if (!Scoring.isFinished(attempt)) return { cls: "wip", text: `Đang làm ${s.answered}/${exam.questionCount}` };
  return s.passed ? { cls: "pass", text: `Đạt ${s.percent}%` } : { cls: "fail", text: `Chưa đạt ${s.percent}%` };
}

export default function CatalogPage({ certId }: { certId: string | null }) {
  const app = PracticeApp.get();
  const state = useStore(app.catalog.store);
  useEffect(() => app.dispatch({ type: "catalog/open", certId }), [certId]);

  if (state.status === "error") return <p className="pr-error">Không tải được danh sách đề: {state.error}</p>;
  const cert = state.selected;

  return (
    <>
      <div className="pr-certs" role="list" aria-label="Chứng chỉ">
        {state.certifications.map((c) => (
          <a key={c.id} role="listitem" className="pr-cert" href={routes.catalog(c.id)} aria-current={c.id === cert?.id ? "page" : undefined}>
            <span className="pr-cert-code">{c.code}</span>
            <span className="pr-cert-name">{c.name}</span>
            <span className="pr-cert-count">{c.examCount ? `${c.examCount} đề` : "Chưa có đề"}</span>
          </a>
        ))}
      </div>

      {!cert ? (
        <p className="pr-muted">{state.status === "loading" || state.status === "idle" ? "Đang tải…" : "Chưa có chứng chỉ nào."}</p>
      ) : (
        <section aria-labelledby="pr-cert-title">
          <div className="pr-cert-head">
            <h2 id="pr-cert-title">{cert.code} · {cert.name}</h2>
            <p className="pr-muted">
              Thi thật: {cert.questionCount} câu · {cert.minutes} phút · điểm đạt {cert.passingScore}/1000 (≈{Scoring.passPercent(cert)}%)
            </p>
          </div>
          {cert.exams.length ? (
            <ul className="pr-exams">
              {cert.exams.map((e) => {
                const s = examStatus(e, state.latestAttempts[e.id], cert);
                return (
                  <li key={e.id}>
                    <a className="pr-exam" href={routes.exam(cert.id, e.id)}>
                      <span className="pr-exam-no">{e.title}</span>
                      <span className="pr-exam-body">
                        <span className="pr-exam-title">Practice Test #{e.number}</span>
                        <span className="pr-muted">{e.questionCount} câu · {e.multiSelectCount} câu chọn nhiều đáp án</span>
                      </span>
                      <span className={`pr-badge ${s.cls}`}>{s.text}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pr-empty">Chưa có đề cho {cert.code}.</p>
          )}
        </section>
      )}
    </>
  );
}
