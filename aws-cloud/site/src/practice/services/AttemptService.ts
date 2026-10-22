import { ApiError } from "../api/ApiClient";
import type { AnswerInput, Attempt, AttemptId, CertificationId, ExamId, NewAttempt, QuestionId } from "../domain/types";
import { ApiService } from "./ApiService";

/** The learner's attempts at practice exams. */
export class AttemptService extends ApiService {
  list(certId: CertificationId, examId?: ExamId): Promise<Attempt[]> {
    return this.api.get<Attempt[]>("/attempts", { certId, examId });
  }

  /** Newest attempt of each exam in a certification, keyed by exam id. */
  async latestByExam(certId: CertificationId): Promise<Map<ExamId, Attempt>> {
    const latest = new Map<ExamId, Attempt>();
    for (const a of await this.list(certId)) if (!latest.has(a.examId)) latest.set(a.examId, a);
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

  answer(attemptId: AttemptId, questionId: QuestionId, input: AnswerInput): Promise<Attempt> {
    return this.api.put<Attempt>(ApiService.path("attempts", attemptId, "answers", questionId), input);
  }
}
