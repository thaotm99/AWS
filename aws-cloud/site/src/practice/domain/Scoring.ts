import type { Attempt, Certification, OptionKey, Question } from "./types";

export interface Score {
  answered: number;
  correct: number;
  total: number;
  /** Share of the whole exam answered correctly, 0–100. */
  percent: number;
  passed: boolean;
}

/** Grading rules: an answer counts only when the chosen set equals the correct set. */
export class Scoring {
  static isCorrect(question: Question, chosen: readonly OptionKey[]): boolean {
    if (chosen.length !== question.correct.length) return false;
    return question.correct.every((key) => chosen.includes(key));
  }

  /** Scaled score out of 1000 approximated as a percentage, e.g. 720 → 72. */
  static passPercent(cert: Pick<Certification, "passingScore">): number {
    return cert.passingScore / 10;
  }

  static score(attempt: Attempt, cert: Pick<Certification, "passingScore">): Score {
    const answers = Object.values(attempt.answers);
    const correct = answers.filter((a) => a.correct).length;
    const percent = attempt.questionCount ? Math.round((correct / attempt.questionCount) * 100) : 0;
    return {
      answered: answers.length,
      correct,
      total: attempt.questionCount,
      percent,
      passed: percent >= Scoring.passPercent(cert),
    };
  }

  static isFinished(attempt: Attempt): boolean {
    return Object.keys(attempt.answers).length >= attempt.questionCount;
  }
}
