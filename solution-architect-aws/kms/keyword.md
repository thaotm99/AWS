# KMS — Khái niệm từ câu hỏi đề thi

## AWS KMS
- SSE-KMS: AWS quản lý key nhưng có audit trail qua CloudTrail (exam1_q22)
- Customer managed key với automatic rotation hằng năm (exam2_q50, exam4_q6)
- Multi-Region key: dùng cùng key ở hai Region khi replicate dữ liệu (exam5_q11, exam2_q46)
- S3 Bucket Keys giảm số lần gọi KMS và chi phí (exam5_q46)
- Chia sẻ encrypted snapshot RDS: share snapshot + cấp quyền dùng KMS key (exam2_q57)
- RDS encryption at rest bằng KMS; SSL cho data in transit (exam2_q40, exam4_q31)

## AWS Certificate Manager (ACM)
- Certificate cho CloudFront phải ở us-east-1 (exam5_q15)
- AWS Config managed rule cảnh báo certificate import sắp hết hạn (exam2_q9)
