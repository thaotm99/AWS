import type { CertificationId, ExamId } from "../domain/types";

export const routes = {
  catalog: (certId?: CertificationId) => (certId ? `/on-tap/${certId}/` : "/on-tap/"),
  exam: (certId: CertificationId, examId: ExamId) => `/on-tap/${certId}/${examId}/`,
};
