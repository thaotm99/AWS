import { ApiError } from "../../../core/api/ApiClient";
import type { AnswerInput, Attempt, AttemptId, CertificationId, ExamId, NewAttempt, QuestionId } from "../domain/types";
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

  async latest(certId: CertificationId, examId: ExamId): Promise<Attempt | null> {
    try {
      return await this.api.get<Attempt>("/attempts/latest", { certId, examId });
    } catch (e) {
      if (e instanceof ApiError && e.isNotFound) return null;
      throw e;
    }
  }

  start(input: NewAttempt): Promise<Attempt> {
    return this.api.post<Attempt>("/attempts", input);
  }

  /** Deletes every attempt of the viewer ("reset progress"). */
  async clear(): Promise<void> {
    await this.api.delete<unknown>("/attempts");
  }

  answer(attemptId: AttemptId, questionId: QuestionId, input: AnswerInput): Promise<Attempt> {
    return this.api.put<Attempt>(ApiService.path("attempts", attemptId, "answers", questionId), input);
  }
}
