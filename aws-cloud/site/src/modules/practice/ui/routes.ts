import type { CertificationId, ExamId } from "../domain/types";

export const routes = {
  catalog: (certId?: CertificationId) => (certId ? `/practice/${certId}/` : "/practice/"),
  exam: (certId: CertificationId, examId: ExamId) => `/practice/${certId}/${examId}/`,
  lesson: (topicId: string) => `/concepts/${topicId}/`,
  topic: (topicId: string) => `/concepts/${topicId}/quiz/`,
};
