import type { AnswerRecord, Attempt, QuestionId } from "./types";

/** A question in the wrong-answer book: its box (1–3) and the local day it is due again. */
export interface BookEntry {
  id: QuestionId;
  box: number;
  due: number;
  /** When it was last answered wrongly. */
  missedAt: string;
}

/** Local day number of an ISO time, as the flashcards count days. */
export function dayOf(iso: string): number {
  const d = new Date(iso);
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);
}

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

  /** Days until a question in box n (1-based) is due again: a miss waits a day, then 3, then 7. */
  static readonly BOX_DAYS = [1, 3, 7] as const;

  /**
   * The wrong-answer book, replayed from every answer in order: a wrong answer puts the question in
   * box 1; each right answer moves it up a box, and a right answer in the last box takes it out of the
   * book. Questions never answered wrongly are not in it. Also returns when questions left the book.
   */
  static book(attempts: readonly Attempt[]): { entries: Map<QuestionId, BookEntry>; graduated: { id: QuestionId; at: string }[] } {
    const answers: AnswerRecord[] = [];
    for (const attempt of attempts) {
      for (const [id, a] of Object.entries(attempt.answers)) if (a.chosen?.length) answers.push({ ...a, questionId: id });
    }
    answers.sort((a, b) => (a.answeredAt ?? "").localeCompare(b.answeredAt ?? ""));
    const entries = new Map<QuestionId, BookEntry>();
    const graduated: { id: QuestionId; at: string }[] = [];
    for (const a of answers) {
      const at = a.answeredAt ?? "";
      const day = at ? dayOf(at) : 0;
      const e = entries.get(a.questionId);
      if (!a.correct) entries.set(a.questionId, { id: a.questionId, box: 1, due: day + Review.BOX_DAYS[0], missedAt: at });
      else if (e && e.box >= Review.BOX_DAYS.length) {
        entries.delete(a.questionId);
        graduated.push({ id: a.questionId, at });
      } else if (e) entries.set(a.questionId, { ...e, box: e.box + 1, due: day + Review.BOX_DAYS[e.box] });
    }
    return { entries, graduated };
  }

  /** Questions due on `today` or before, most overdue first. */
  static dueIds(attempts: readonly Attempt[], today: number): QuestionId[] {
    return [...Review.book(attempts).entries.values()]
      .filter((e) => e.due <= today)
      .sort((a, b) => a.due - b.due || b.missedAt.localeCompare(a.missedAt))
      .map((e) => e.id);
  }

  /** Every question in the book, most recently missed first. */
  static bookIds(attempts: readonly Attempt[]): QuestionId[] {
    return [...Review.book(attempts).entries.values()].sort((a, b) => b.missedAt.localeCompare(a.missedAt)).map((e) => e.id);
  }

  /** Questions to review, most recently missed first. */
  static wrongIds(attempts: readonly Attempt[]): QuestionId[] {
    return [...Review.latestAnswers(attempts).values()]
      .filter((a) => !a.correct)
      .sort((a, b) => (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""))
      .map((a) => a.questionId);
  }
}
