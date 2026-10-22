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
  // Practice test 1, Q8: the key relies on the former 30-day minimum before a transition to an IA class.
  "125222699": {
    text: {
      vi: "Đáp án của đề dựa trên quy tắc cũ: trước đây Lifecycle rule chỉ chuyển object sang S3 Standard-IA hoặc S3 One Zone-IA sau tối thiểu 30 ngày lưu ở S3 Standard. Từ ngày 16/07/2026, AWS đã bỏ giới hạn này; object có thể chuyển sang hai lớp lưu trữ đó ngay từ ngày được tạo. Phí lưu trữ tối thiểu 30 ngày của hai lớp IA vẫn áp dụng.",
      en: "This answer key relies on a former rule: a Lifecycle rule could transition objects to S3 Standard-IA or S3 One Zone-IA only after at least 30 days in S3 Standard. Since July 16, 2026, AWS has removed this minimum; objects can transition to those storage classes as soon as the day they are created. The 30-day minimum storage charge of the two IA classes still applies.",
    },
    sources: [
      { title: "Amazon S3 removes 30-day minimum for transitions to S3 Standard-IA and S3 One Zone-IA", url: "https://aws.amazon.com/about-aws/whats-new/2026/07/s3-removes-30-day-transitions-standard-ia-one-zone-ia/" },
      { title: "Transitioning objects using Amazon S3 Lifecycle", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html" },
    ],
  },
  // Practice test 3, Q61: the key imports Snowball Edge data "directly" into FSx for Lustre.
  "121078933": {
    text: {
      vi: "Đáp án của đề không khớp với tài liệu AWS hiện tại. Job import của Snowball Edge chỉ đưa dữ liệu vào Amazon S3; để HPC truy cập qua FSx for Lustre, dữ liệu được import vào S3 bucket rồi liên kết file system với bucket đó (data repository association).",
      en: "This answer key does not match the current AWS documentation. A Snowball Edge import job moves data into Amazon S3 only; to give the HPC cluster FSx for Lustre access, the data is imported into an S3 bucket and the file system is linked to that bucket (data repository association).",
    },
    sources: [
      { title: "AWS Snowball Edge job types", url: "https://docs.aws.amazon.com/snowball/latest/developer-guide/jobs.html" },
      { title: "Linking your file system to an Amazon S3 bucket (FSx for Lustre)", url: "https://docs.aws.amazon.com/fsx/latest/LustreGuide/create-dra-linked-data-repo.html" },
    ],
  },
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
