import type { AnswerInput, AnswerResult, Attempt, AttemptId, CertificationId, ExamId, MockDraft, NewAttempt, QuestionId, SubmitResult } from "../domain/types";
import { ApiService } from "../../../core/api/ApiService";

/** The learner's attempts at practice exams. */
export class AttemptService extends ApiService {
  list(certId: CertificationId, examId?: ExamId): Promise<Attempt[]> {
    return this.api.get<Attempt[]>("/attempts", { certId, examId });
  }

  /** Newest attempt of each exam, keyed by exam id, from a list sorted newest first (as list() returns). */
  static latestByExam(attempts: readonly Attempt[]): Map<ExamId, Attempt> {
    const latest = new Map<ExamId, Attempt>();
    for (const a of attempts) if (!latest.has(a.examId)) latest.set(a.examId, a);
    return latest;
  }

  /** Newest attempt of one exam; null when there is none yet. */
  latest(certId: CertificationId, examId: ExamId): Promise<Attempt | null> {
    return this.api.get<Attempt | null>("/attempts/latest", { certId, examId });
  }

  start(input: NewAttempt): Promise<Attempt> {
    return this.api.post<Attempt>("/attempts", input);
  }

  /** Deletes every attempt of the viewer ("reset progress"). */
  async clear(): Promise<void> {
    await this.api.delete<unknown>("/attempts");
  }

  /** The server grades the answer and returns the question's answer side with the attempt. */
  answer(attemptId: AttemptId, questionId: QuestionId, input: AnswerInput): Promise<AnswerResult> {
    return this.api.put<AnswerResult>(ApiService.path("attempts", attemptId, "answers", questionId), input);
  }

  /** Hands in a mock exam: every question of its set graded at once (unanswered ones count as wrong). */
  submit(attemptId: AttemptId, answers: Record<QuestionId, string[]>): Promise<SubmitResult> {
    return this.api.post<SubmitResult>(ApiService.path("attempts", attemptId, "submit"), { answers });
  }

  /** The mock exam in progress on this test; null when none is. */
  draft(certId: CertificationId, examId: ExamId): Promise<MockDraft | null> {
    return this.api.get<MockDraft | null>(ApiService.path("mock-drafts", certId, examId));
  }

  async saveDraft(certId: CertificationId, examId: ExamId, draft: MockDraft | null): Promise<void> {
    const path = ApiService.path("mock-drafts", certId, examId);
    await (draft ? this.api.put<unknown>(path, draft) : this.api.delete<unknown>(path));
  }
}
