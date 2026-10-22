import type { CertificationId, ContentLocale, OptionKey, QuestionSetRef } from "../domain/types";

/** Everything the UI can ask the app to do. */
export type PracticeEvent =
  | { type: "catalog/open"; certId: CertificationId | null }
  | { type: "exam/open"; certId: CertificationId; set: QuestionSetRef; locale: ContentLocale }
  /** The viewer switched language: reload the question text, keep the attempt and position. */
  | { type: "exam/language"; locale: ContentLocale }
  | { type: "exam/toggleOption"; key: OptionKey }
  | { type: "exam/submit" }
  | { type: "exam/next" }
  | { type: "exam/goTo"; index: number }
  | { type: "exam/showResult" }
  | { type: "exam/restart" };

export type Dispatch = (event: PracticeEvent) => void;
