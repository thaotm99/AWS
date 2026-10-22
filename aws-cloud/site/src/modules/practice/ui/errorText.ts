import type { PracticeError } from "../app/errors";
import type { PracticeT } from "./useT";

const KEYS = {
  loadCatalog: "catalog.loadFailed",
  loadExam: "exam.loadFailed",
  saveAnswer: "exam.saveFailed",
  restart: "exam.restartFailed",
} as const satisfies Record<PracticeError["code"], Parameters<PracticeT>[0]>;

export function errorText(t: PracticeT, error: PracticeError): string {
  return t(KEYS[error.code], { detail: error.detail });
}
