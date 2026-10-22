// Notes shown under the explanation of practice-test questions whose answer key follows an older AWS
// recommendation. The question and its explanation stay exactly as published; the note adds what the
// current AWS documentation says. Keyed by question id (the same id on the practice tests and topic sets).
import type { ContentLocale, QuestionId } from "./types";

export interface AnswerNote {
  text: Record<ContentLocale, string>;
  /** AWS documentation pages the note is based on. */
  sources: { title: string; url: string }[];
}

export const ANSWER_NOTES: Record<QuestionId, AnswerNote> = {
  // Practice test 1, Q27: the key is "Amazon EKS Anywhere on Outposts".
  "125222751": {
    text: {
      vi: "Phương án đúng vẫn là Outposts, nhưng tên giải pháp trong đáp án đã cũ. Theo FAQ của AWS, Amazon EKS Anywhere không được hỗ trợ trên AWS Outposts; để chạy Kubernetes trên Outposts, AWS khuyến nghị Amazon EKS on AWS Outposts (ví dụ local cluster, giữ cả control plane tại chỗ).",
      en: "Outposts is still the right option, but the solution named in the key is outdated. According to the AWS FAQ, Amazon EKS Anywhere is not supported on AWS Outposts; to run Kubernetes on Outposts, AWS recommends Amazon EKS on AWS Outposts (for example a local cluster, which keeps the control plane on premises too).",
    },
    sources: [
      { title: "Amazon EKS Anywhere FAQs", url: "https://aws.amazon.com/eks/eks-anywhere/faqs/" },
      { title: "Amazon EKS on AWS Outposts", url: "https://docs.aws.amazon.com/eks/latest/userguide/eks-outposts.html" },
    ],
  },
  // Practice test 2, Q64: the key is EFS Max I/O performance mode.
  "119516085": {
    text: {
      vi: "Đáp án của đề theo khuyến nghị cũ. Tài liệu AWS hiện tại xếp Max I/O là chế độ thế hệ trước, có độ trễ mỗi thao tác cao hơn, và khuyến nghị dùng General Purpose performance mode cho mọi file system.",
      en: "This answer key follows an older recommendation. The current AWS documentation lists Max I/O as a previous-generation mode with higher per-operation latency and recommends General Purpose performance mode for all file systems.",
    },
    sources: [{ title: "Amazon EFS performance specifications", url: "https://docs.aws.amazon.com/efs/latest/ug/performance.html" }],
  },
  // Practice test 4, Q15: the key converts io1 to gp2 to cut cost.
  "119516283": {
    text: {
      vi: "Đáp án của đề theo khuyến nghị cũ. Tài liệu AWS hiện tại cho biết gp3 có giá mỗi GiB thấp hơn 20% so với gp2, nên với yêu cầu giảm chi phí, gp3 là lựa chọn được khuyến nghị.",
      en: "This answer key follows an older recommendation. The current AWS documentation states that gp3 volumes cost 20 percent less per GiB than gp2, so gp3 is the recommended choice when the goal is lower cost.",
    },
    sources: [{ title: "Amazon EBS General Purpose SSD volumes", url: "https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html" }],
  },
};
