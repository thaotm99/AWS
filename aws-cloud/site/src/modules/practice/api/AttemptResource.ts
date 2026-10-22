import { ApiError } from "../../../core/api/ApiClient";
import { Compat } from "../../../core/compat";
import { AttemptRecord } from "../domain/AttemptRecord";
import { ATTEMPT_VERSION, type AnswerInput, type Attempt, type NewAttempt } from "../domain/types";
import { LocalResource, type LocalRequest, type LocalRoute } from "../../../core/api/local/LocalResource";

const COLLECTION = "attempts";

/**
 * GET    /attempts?certId=&examId=          attempts, newest first
 * GET    /attempts/latest?certId=&examId=   newest attempt of one exam (404 if none)
 * POST   /attempts                          start a new attempt
 * DELETE /attempts                          remove every attempt ("reset progress")
 * PUT    /attempts/:id/answers/:questionId  record one answer
 */
export class AttemptResource extends LocalResource {
  routes(): LocalRoute[] {
    return [
      { method: "GET", pattern: "/attempts", handle: (r) => this.list(r) },
      { method: "GET", pattern: "/attempts/latest", handle: (r) => this.latest(r) },
      { method: "POST", pattern: "/attempts", handle: (r) => this.create(r) },
      { method: "DELETE", pattern: "/attempts", handle: () => this.clear() },
      { method: "PUT", pattern: "/attempts/:id/answers/:questionId", handle: (r) => this.answer(r) },
    ];
  }

  /** Stored attempts that pass validation; damaged rows are skipped. */
  private async all(): Promise<Attempt[]> {
    const rows = await this.storage.list<unknown>(COLLECTION);
    return rows.map(AttemptRecord.parse).filter((a): a is Attempt => a !== null);
  }

  private async list({ query }: LocalRequest): Promise<Attempt[]> {
    return (await this.all())
      .filter((a) => (!query.certId || a.certId === query.certId) && (!query.examId || a.examId === query.examId))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  private async latest(req: LocalRequest): Promise<Attempt> {
    const [newest] = await this.list(req);
    if (!newest) throw new ApiError(404, "No attempt yet");
    return newest;
  }

  private async create({ body }: LocalRequest): Promise<Attempt> {
    const input = body as NewAttempt;
    if (!input?.certId || !input.examId || !(input.questionCount > 0)) throw new ApiError(400, "certId, examId and questionCount are required");
    const now = new Date().toISOString();
    const attempt: Attempt = {
      version: ATTEMPT_VERSION,
      id: Compat.randomId(),
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

  private async clear(): Promise<null> {
    await this.storage.clear(COLLECTION);
    return null;
  }

  private async answer({ params, body }: LocalRequest): Promise<Attempt> {
    const attempt = AttemptRecord.parse(await this.storage.get<unknown>(COLLECTION, params.id));
    if (!attempt) throw new ApiError(404, "Attempt not found");
    const input = body as AnswerInput;
    if (!Array.isArray(input?.chosen) || typeof input.correct !== "boolean") throw new ApiError(400, "chosen and correct are required");
    if (attempt.answers[params.questionId]) throw new ApiError(409, "Question already answered");

    const now = new Date().toISOString();
    attempt.answers[params.questionId] = { questionId: params.questionId, chosen: input.chosen, correct: input.correct, answeredAt: now };
    attempt.updatedAt = now;
    if (Object.keys(attempt.answers).length >= attempt.questionCount) attempt.finishedAt = now;
    await this.storage.put(COLLECTION, attempt.id, attempt);
    return attempt;
  }
}
