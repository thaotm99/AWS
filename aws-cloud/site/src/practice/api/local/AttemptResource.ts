import { ApiError } from "../ApiClient";
import type { AnswerInput, Attempt, NewAttempt } from "../../domain/types";
import { LocalResource, type LocalRequest, type LocalRoute } from "./LocalResource";

const COLLECTION = "attempts";

/**
 * GET  /attempts?certId=&examId=          attempts, newest first
 * GET  /attempts/latest?certId=&examId=   newest attempt of one exam (404 if none)
 * POST /attempts                          start a new attempt
 * PUT  /attempts/:id/answers/:questionId  record one answer
 */
export class AttemptResource extends LocalResource {
  routes(): LocalRoute[] {
    return [
      { method: "GET", pattern: "/attempts", handle: (r) => this.list(r) },
      { method: "GET", pattern: "/attempts/latest", handle: (r) => this.latest(r) },
      { method: "POST", pattern: "/attempts", handle: (r) => this.create(r) },
      { method: "PUT", pattern: "/attempts/:id/answers/:questionId", handle: (r) => this.answer(r) },
    ];
  }

  private async list({ query }: LocalRequest): Promise<Attempt[]> {
    const all = await this.storage.list<Attempt>(COLLECTION);
    return all
      .filter((a) => (!query.certId || a.certId === query.certId) && (!query.examId || a.examId === query.examId))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  private async latest(req: LocalRequest): Promise<Attempt> {
    const [newest] = await this.list(req);
    if (!newest) throw new ApiError(404, "Chưa có lượt làm bài nào");
    return newest;
  }

  private async create({ body }: LocalRequest): Promise<Attempt> {
    const input = body as NewAttempt;
    if (!input?.certId || !input.examId || !(input.questionCount > 0)) throw new ApiError(400, "Thiếu certId, examId hoặc questionCount");
    const now = new Date().toISOString();
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      certId: input.certId,
      examId: input.examId,
      questionCount: input.questionCount,
      answers: {},
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
    };
    await this.storage.put(COLLECTION, attempt.id, attempt);
    return attempt;
  }

  private async answer({ params, body }: LocalRequest): Promise<Attempt> {
    const attempt = await this.storage.get<Attempt>(COLLECTION, params.id);
    if (!attempt) throw new ApiError(404, "Không tìm thấy lượt làm bài");
    const input = body as AnswerInput;
    if (!Array.isArray(input?.chosen) || typeof input.correct !== "boolean") throw new ApiError(400, "Thiếu chosen hoặc correct");
    if (attempt.answers[params.questionId]) throw new ApiError(409, "Câu này đã được trả lời");

    const now = new Date().toISOString();
    attempt.answers[params.questionId] = { questionId: params.questionId, chosen: input.chosen, correct: input.correct, answeredAt: now };
    attempt.updatedAt = now;
    if (Object.keys(attempt.answers).length >= attempt.questionCount) attempt.finishedAt = now;
    await this.storage.put(COLLECTION, attempt.id, attempt);
    return attempt;
  }
}
