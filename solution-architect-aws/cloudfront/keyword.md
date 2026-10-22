# CLOUDFRONT — Khái niệm từ câu hỏi đề thi

## Amazon CloudFront
- Cache nội dung tĩnh/động gần người dùng, giảm tải origin (exam3_q42, exam6_q5, exam1_q62)
- Giảm chi phí data transfer out từ S3 (exam3_q48)
- Origin: S3, ALB, server on-premises (custom origin) (exam1_q62, exam3_q40)
- Static website: S3 + CloudFront + Route 53 alias (exam2_q2)
- Chỉ cho truy cập S3 qua CloudFront: OAI / OAC + bucket policy (exam3_q60, exam6_q54, exam5_q15)
- Certificate cho CloudFront phải tạo trong ACM ở us-east-1 (exam5_q15)
- Signed URL / signed cookie cho nội dung giới hạn (exam6_q62)
- Geo restriction (exam1_q38)
- Origin group (primary/secondary) để failover; nhiều origin theo loại nội dung; field-level encryption (exam4_q63)
- AWS WAF gắn vào CloudFront chống SQL injection, XSS, chặn IP (exam5_q13, exam5_q57, exam3_q60)
- CloudFront + S3 Transfer Acceleration cho cả download và upload (exam5_q21, exam6_q58)
- CloudFront + DAX cho đọc nhiều (exam1_q1)

## AWS Global Accelerator
- UDP / TCP, hiệu năng cho người dùng toàn cầu (exam1_q59, exam3_q8, exam5_q4)
- 2 IP tĩnh anycast, giảm số IP phải whitelist (exam3_q45, exam4_q58)
- Failover tự động giữa Region (exam5_q55, exam1_q59)
- Chia tỉ lệ traffic cho blue/green, không bị DNS cache (exam2_q22)
- Endpoint là NLB/ALB/EC2 hiện có, giữ nguyên hạ tầng (exam2_q7, exam5_q30)
