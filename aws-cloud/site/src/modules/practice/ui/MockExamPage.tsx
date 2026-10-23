import { useEffect, useMemo, useRef, useState } from "react";
import PageBoundary from "./PageBoundary";
import QuestionCard from "./QuestionCard";
import ResultPanel from "./ResultPanel";
import type { Dispatch, PracticeEvent } from "../app/events";
import { Scoring } from "../domain/Scoring";
import type { Attempt, CertificationDetail, Exam, OptionKey, QuestionId } from "../domain/types";
import { getApiClient } from "../../../app/api";
import { AttemptService } from "../services/AttemptService";
import { CatalogService } from "../services/CatalogService";
import { routes } from "./routes";
import { useT } from "./useT";

/** Answers in progress, kept in the browser until the test is handed in. */
interface Draft {
  startedAt: number;
  answers: Record<QuestionId, OptionKey[]>;
  flags: QuestionId[];
  index: number;
}

type Phase = "intro" | "running" | "overview" | "submitting" | "result" | "review";

const draftKey = (certId: string, examId: string) => `mock-draft:${certId}:${examId}`;

function readDraft(key: string): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? "null");
    return d && typeof d.startedAt === "number" && d.answers && Array.isArray(d.flags) ? d : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    /* storage blocked: the test still runs, it just won't survive a reload */
  }
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

interface Props {
  certId: string;
  examId: string;
}

/**
 * Mock exam: the real format of the certification (65 questions, 130 minutes for SAA-C03), with the
 * verdict only after the test is handed in. Answers can be changed and questions flagged until then;
 * time runs on the clock, so a closed tab does not stop it. Handing in saves an ordinary attempt
 * (exam id "mock-<id>"), so the result, the lessons to learn again and the review list all apply.
 */
function MockExam({ certId, examId }: Props) {
  const { t, locale } = useT();
  const services = useMemo(() => {
    const api = getApiClient();
    return { catalog: new CatalogService(api), attempts: new AttemptService(api) };
  }, []);
  const key = draftKey(certId, examId);
  const mockId = `mock-${examId}`;

  const [cert, setCert] = useState<CertificationDetail | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [original, setOriginal] = useState<Exam | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  // Certification and the last finished mock of this test; an unfinished draft resumes.
  useEffect(() => {
    (async () => {
      try {
        const [c, last] = await Promise.all([services.catalog.getCertification(certId), services.attempts.latest(certId, mockId)]);
        setCert(c);
        const saved = readDraft(key);
        if (saved) {
          setDraft(saved);
          setPhase("running");
        } else if (last && last.finishedAt) {
          setAttempt(last);
          setPhase("result");
        }
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [certId, examId]);

  // Question text in the site language, plus the English original for "show original".
  useEffect(() => {
    let live = true;
    Promise.all([
      services.catalog.getQuestionSet(certId, { kind: "exam", id: examId }, locale),
      locale === "en" ? Promise.resolve(null) : services.catalog.getQuestionSet(certId, { kind: "exam", id: examId }, "en"),
    ])
      .then(([e, o]) => {
        if (live) {
          setExam(e);
          setOriginal(o);
        }
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [certId, examId, locale]);

  const limit = (cert?.minutes ?? 130) * 60_000;
  const left = draft ? draft.startedAt + limit - now : limit;
  const running = phase === "running" || phase === "overview";

  // One tick a second while the test runs; time up hands the test in.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (running && draft && exam && left <= 0) void submit();
  }, [running, left <= 0, exam]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase, draft?.index, reviewIndex]);

  function update(next: Draft) {
    setDraft(next);
    writeDraft(key, next);
  }

  function start() {
    const d: Draft = { startedAt: Date.now(), answers: {}, flags: [], index: 0 };
    setNow(d.startedAt);
    update(d);
    setAttempt(null);
    setPhase("running");
  }

  async function submit() {
    if (!exam || !draft || submitting.current) return;
    submitting.current = true;
    setPhase("submitting");
    try {
      const a = await services.attempts.start({ certId, examId: mockId, questionCount: exam.questions.length });
      let saved = a;
      // Unanswered questions are recorded as wrong, as in the real exam.
      for (const q of exam.questions) {
        const chosen = [...(draft.answers[q.id] ?? [])].sort();
        saved = await services.attempts.answer(a.id, q.id, { chosen, correct: Scoring.isCorrect(q, chosen) });
      }
      writeDraft(key, null);
      setDraft(null);
      setAttempt(saved);
      setPhase("result");
    } catch (e) {
      setError(String(e));
      setPhase("overview");
    } finally {
      submitting.current = false;
    }
  }

  if (error) return <p className="pr-error">{error} <a href={routes.catalog(certId)}>{t("exam.backToList")}</a></p>;
  if (!cert || !exam) return <p className="pr-muted">{t("exam.loading")}</p>;

  const title = `${cert.code} · ${t("mock.title", { n: exam.number })}`;
  const crumbs = (
    <div className="crumbs">
      <a href={routes.catalog()}>{t("catalog.crumb")}</a><span aria-hidden="true">/</span>
      <a href={routes.catalog(cert.id)}>{cert.code}</a><span aria-hidden="true">/</span>
      <b>{t("mock.title", { n: exam.number })}</b>
    </div>
  );

  if (phase === "intro") {
    return (
      <>
        {crumbs}
        <h1>{title}</h1>
        <div className="mt-3 rounded-[18px] border border-line bg-surface px-5 py-4.5">
          <ul className="list-disc mx-0 mt-0 mb-4 grid gap-1.5 pl-5">
            <li>{t("mock.rule1", { n: exam.questions.length, minutes: cert.minutes })}</li>
            <li>{t("mock.rule2")}</li>
            <li>{t("mock.rule3")}</li>
            <li>{t("mock.rule4", { score: cert.passingScore })}</li>
          </ul>
          <button type="button" className="btn primary" onClick={start}>{t("mock.start")}</button>
        </div>
      </>
    );
  }

  if ((phase === "result" || phase === "review") && attempt) {
    // ResultPanel and QuestionCard speak in practice events; here they move between result and review.
    const onEvent: Dispatch = (e: PracticeEvent) => {
      if (e.type === "exam/restart") start();
      else if (e.type === "exam/goTo") {
        setReviewIndex(e.index);
        setPhase("review");
      } else if (e.type === "exam/next") {
        if (reviewIndex + 1 < exam.questions.length) setReviewIndex(reviewIndex + 1);
        else setPhase("result");
      }
    };
    if (phase === "review") {
      const q = exam.questions[reviewIndex];
      return (
        <>
          {crumbs}
          <div className="pr-run-head">
            <h1>{title}</h1>
            <button type="button" className="btn" onClick={() => setPhase("result")}>{t("exam.showResults")}</button>
          </div>
          <QuestionCard
            key={q.id}
            question={q}
            original={original?.questions[reviewIndex]}
            total={exam.questions.length}
            answer={attempt.answers[q.id]}
            selection={[]}
            saving={false}
            error={null}
            isLast={reviewIndex === exam.questions.length - 1}
            dispatch={onEvent}
          />
        </>
      );
    }
    return (
      <>
        {crumbs}
        <h1>{title}</h1>
        <ResultPanel cert={cert} exam={exam} attempt={attempt} mock saving={false} dispatch={onEvent} />
      </>
    );
  }

  if (!draft) return <p className="pr-muted">{t("exam.loading")}</p>;
  const answered = exam.questions.filter((q) => (draft.answers[q.id] ?? []).length > 0).length;
  const unanswered = exam.questions.length - answered;
  const head = (
    <div className="sticky top-[calc(env(safe-area-inset-top,0px)+60px)] z-5 mx-0 mt-2 mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[18px] border border-line bg-surface/92 px-3.5 py-2.5 backdrop-blur-sm" role="timer" aria-live="off">
      <span className={`font-mono text-[1.15rem] font-bold tabular-nums ${left < 10 * 60_000 ? "text-bad" : "text-accent"}`} aria-label={t("mock.timeLeft")}>{clock(left)}</span>
      <span className="pr-muted">{t("mock.progress", { done: answered, total: exam.questions.length, flagged: draft.flags.length })}</span>
      <button type="button" className="btn ml-auto" onClick={() => setPhase(phase === "overview" ? "running" : "overview")}>
        {phase === "overview" ? t("mock.backToQuestion") : t("mock.overview")}
      </button>
    </div>
  );

  if (phase === "submitting") return <>{crumbs}<h1>{title}</h1><p className="pr-muted">{t("mock.submitting")}</p></>;

  if (phase === "overview") {
    return (
      <>
        {crumbs}
        <h1>{title}</h1>
        {head}
        <p className="pr-muted flex items-center gap-1.5 text-[0.8125rem]">
          <i className="inline-block size-3.5 rounded-[4px] border border-accent bg-accent-soft" aria-hidden="true" /> {t("mock.answered")} <i className="ml-2.5 inline-block size-3.5 rounded-[4px] border border-line bg-surface inset-shadow-[0_-3px_0] inset-shadow-edge" aria-hidden="true" /> {t("mock.flagged")}
        </p>
        <div className="pr-grid pr-mock-grid">
          {exam.questions.map((q, i) => {
            const done = (draft.answers[q.id] ?? []).length > 0;
            const flagged = draft.flags.includes(q.id);
            return (
              <button
                key={q.id}
                type="button"
                className={`${done ? "done" : ""}${flagged ? " flag" : ""}${i === draft.index ? " cur" : ""}`}
                aria-label={t("mock.cell", { n: i + 1, state: [done ? t("mock.answered") : t("mock.unanswered"), flagged ? t("mock.flagged") : ""].filter(Boolean).join(", ") })}
                onClick={() => {
                  update({ ...draft, index: i });
                  setPhase("running");
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col items-start gap-2">
          {confirming && unanswered > 0 && <p className="pr-error" role="alert">{t("mock.confirmUnanswered", { n: unanswered })}</p>}
          <button
            type="button"
            className="btn primary"
            onClick={() => (unanswered > 0 && !confirming ? setConfirming(true) : void submit())}
          >
            {confirming && unanswered > 0 ? t("mock.submitAnyway") : t("mock.submit")}
          </button>
        </div>
      </>
    );
  }

  const index = Math.min(draft.index, exam.questions.length - 1);
  const q = exam.questions[index];
  const selection = draft.answers[q.id] ?? [];
  const onEvent: Dispatch = (e: PracticeEvent) => {
    if (e.type === "exam/toggleOption") {
      const next = q.selectCount === 1 ? [e.key] : selection.includes(e.key) ? selection.filter((k) => k !== e.key) : selection.length < q.selectCount ? [...selection, e.key] : selection;
      update({ ...draft, answers: { ...draft.answers, [q.id]: next } });
    } else if (e.type === "exam/goTo") {
      if (e.index >= 0) update({ ...draft, index: e.index });
    } else if (e.type === "exam/next") {
      if (index + 1 < exam.questions.length) update({ ...draft, index: index + 1 });
      else setPhase("overview");
    }
  };
  const flagged = draft.flags.includes(q.id);
  return (
    <>
      {crumbs}
      <h1>{title}</h1>
      {head}
      <QuestionCard
        key={q.id}
        question={q}
        original={original?.questions[index]}
        total={exam.questions.length}
        answer={undefined}
        selection={selection}
        saving={false}
        error={null}
        isLast={index === exam.questions.length - 1}
        dispatch={onEvent}
        mock={{
          flagged,
          canPrev: index > 0,
          onFlag: () => update({ ...draft, flags: flagged ? draft.flags.filter((id) => id !== q.id) : [...draft.flags, q.id] }),
        }}
      />
    </>
  );
}

/** Page entry: a rendering error shows a message with a way out instead of a blank page. */
export default function MockExamPage(props: Props) {
  return (
    <PageBoundary>
      <MockExam {...props} />
    </PageBoundary>
  );
}
