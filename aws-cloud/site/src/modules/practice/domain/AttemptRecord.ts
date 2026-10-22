import { ATTEMPT_VERSION, type AnswerRecord, type Attempt } from "./types";

type Loose = Record<string, unknown>;

/**
 * Checks attempts read back from browser storage, where anything may be found: rows cut off by a
 * crash, edited by hand, or written by an older or newer version of the site. Invalid rows are
 * skipped, so one bad record never takes the practice pages down.
 */
export class AttemptRecord {
  private static isObject(v: unknown): v is Loose {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  private static isText(v: unknown): v is string {
    return typeof v === "string" && v.length > 0;
  }

  private static isAnswer(v: unknown): v is AnswerRecord {
    return (
      AttemptRecord.isObject(v) &&
      Array.isArray(v.chosen) &&
      v.chosen.every((k) => typeof k === "string") &&
      typeof v.correct === "boolean"
    );
  }

  /** Version of a stored record; records saved before versions existed are version 1. */
  static version(v: Loose): number {
    return typeof v.version === "number" ? v.version : 1;
  }

  static isValid(v: unknown): v is Attempt {
    if (!AttemptRecord.isObject(v)) return false;
    if (AttemptRecord.version(v) > ATTEMPT_VERSION) return false;
    if (!AttemptRecord.isText(v.id) || !AttemptRecord.isText(v.certId) || !AttemptRecord.isText(v.examId)) return false;
    if (typeof v.questionCount !== "number" || !(v.questionCount > 0)) return false;
    if (!AttemptRecord.isText(v.startedAt)) return false;
    if (!AttemptRecord.isObject(v.answers) || !Object.values(v.answers).every(AttemptRecord.isAnswer)) return false;
    return true;
  }

  /** The record as an Attempt of the current shape, or null when it can't be used. */
  static parse(v: unknown): Attempt | null {
    if (!AttemptRecord.isValid(v)) return null;
    return {
      ...v,
      version: AttemptRecord.version(v as unknown as Loose),
      updatedAt: AttemptRecord.isText(v.updatedAt) ? v.updatedAt : v.startedAt,
      finishedAt: AttemptRecord.isText(v.finishedAt) ? v.finishedAt : null,
    };
  }
}
