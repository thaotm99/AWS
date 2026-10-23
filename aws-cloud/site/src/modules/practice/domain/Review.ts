import type { AnswerRecord, Attempt, QuestionId } from "./types";

/**
 * The wrong-answer review: every question whose most recent answer, in any attempt (practice test,
 * a lesson's question set or an earlier review), was wrong. Answering it correctly anywhere takes it
 * off the list. A question left blank (a mock exam handed in or timed out) is not an answer: it neither
 * adds the question nor replaces an earlier answer.
 */
export class Review {
  /** Id of the review question set; review attempts are saved under it. */
  static readonly SET_ID = "review";
  /** Questions per review round: the most recently missed ones, so a round stays short and light. */
  static readonly ROUND = 30;

  /** Latest answer to each question across attempts. */
  static latestAnswers(attempts: readonly Attempt[]): Map<QuestionId, AnswerRecord> {
    const latest = new Map<QuestionId, AnswerRecord>();
    for (const attempt of attempts) {
      for (const [id, answer] of Object.entries(attempt.answers)) {
        if (!answer.chosen?.length) continue;
        const seen = latest.get(id);
        // An answer saved without a time sorts before any answer that has one.
        if (!seen || (answer.answeredAt ?? "") > (seen.answeredAt ?? "")) latest.set(id, { ...answer, questionId: id });
      }
    }
    return latest;
  }

  /** Questions to review, most recently missed first. */
  static wrongIds(attempts: readonly Attempt[]): QuestionId[] {
    return [...Review.latestAnswers(attempts).values()]
      .filter((a) => !a.correct)
      .sort((a, b) => (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""))
      .map((a) => a.questionId);
  }
}
