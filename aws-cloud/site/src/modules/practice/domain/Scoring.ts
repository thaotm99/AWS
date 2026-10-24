import type { Attempt, Certification, QuestionId } from "./types";

export interface Score {
  answered: number;
  correct: number;
  total: number;
  /** Share of the whole exam answered correctly, 0–100. */
  percent: number;
  passed: boolean;
}

/**
 * What an attempt is graded against: the ids of the question set as it is now, or only the
 * number of questions where the set itself isn't loaded (the exam list).
 */
export type QuestionScope = readonly QuestionId[] | number;

/** Scores of attempts; each answer is graded by the server (an answer counts only when the chosen set equals the correct set). */
export class Scoring {
  /** Scaled score out of 1000 approximated as a percentage, e.g. 720 → 72. */
  static passPercent(cert: Pick<Certification, "passingScore">): number {
    return cert.passingScore / 10;
  }

  /** Answers that belong to the scope; answers to questions no longer in the set are ignored. */
  private static tally(attempt: Attempt, scope: QuestionScope): { answered: number; correct: number; total: number } {
    if (typeof scope === "number") {
      const answers = Object.values(attempt.answers);
      const correct = answers.filter((a) => a?.correct === true).length;
      return { answered: Math.min(answers.length, scope), correct: Math.min(correct, scope), total: scope };
    }
    const answers = scope.map((id) => attempt.answers[id]).filter(Boolean);
    return { answered: answers.length, correct: answers.filter((a) => a.correct === true).length, total: scope.length };
  }

  static score(attempt: Attempt, cert: Pick<Certification, "passingScore">, scope: QuestionScope): Score {
    const { answered, correct, total } = Scoring.tally(attempt, scope);
    const percent = total ? Math.round((correct / total) * 100) : 0;
    return { answered, correct, total, percent, passed: percent >= Scoring.passPercent(cert) };
  }

  /** Every question of the scope has an answer. */
  static isFinished(attempt: Attempt, scope: QuestionScope): boolean {
    const { answered, total } = Scoring.tally(attempt, scope);
    return total > 0 && answered >= total;
  }

  /**
   * Whether a saved attempt still fits the question set: same size, and no answers to questions
   * the set no longer has. When the content changes, an old attempt must not be resumed.
   */
  static fits(attempt: Attempt, questionIds: readonly QuestionId[]): boolean {
    if (attempt.questionCount !== questionIds.length) return false;
    const ids = new Set(questionIds);
    return Object.keys(attempt.answers).every((id) => ids.has(id));
  }
}
