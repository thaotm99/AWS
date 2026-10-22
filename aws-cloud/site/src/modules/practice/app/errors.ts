/** Failures the UI explains in the viewer's language; `detail` is the technical cause. */
export type PracticeErrorCode = "loadCatalog" | "loadExam" | "saveAnswer" | "restart";

export interface PracticeError {
  code: PracticeErrorCode;
  detail: string;
}
