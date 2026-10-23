import type { CertificationId, ExamId } from "../domain/types";

export const routes = {
  catalog: (certId?: CertificationId) => (certId ? `/practice/${certId}/` : "/practice/"),
  exam: (certId: CertificationId, examId: ExamId) => `/practice/${certId}/${examId}/`,
  mock: (certId: CertificationId, examId: ExamId) => `/practice/${certId}/${examId}/mock/`,
  lesson: (topicId: string) => `/concepts/${topicId}/`,
  topic: (topicId: string) => `/concepts/${topicId}/quiz/`,
  review: (certId: CertificationId) => `/practice/${certId}/review/`,
};
