# SECURITY — Khái niệm từ câu hỏi đề thi

## AWS WAF
- Gắn WAF vào ALB hoặc CloudFront (exam1_q6, exam2_q32, exam5_q57)
- Chống SQL injection và cross-site scripting (exam5_q13)
- IP match / IP set: chặn hoặc chỉ cho phép một số IP (exam2_q30, exam3_q60, exam5_q45)
- Geo match: chặn theo quốc gia (exam1_q6, exam5_q45)
- Rate-based rule chống request dồn dập (exam6_q60)

## AWS Shield
- Shield Advanced + DDoS Response Team cho DDoS, có log/báo cáo (exam3_q58)

## AWS Firewall Manager
- Quản lý tập trung rule cho WAF, Shield Advanced, Security Group (exam6_q4)

## Phát hiện mối đe dọa và dữ liệu nhạy cảm
- Amazon GuardDuty: phát hiện hoạt động độc hại (S3, EC2 đào coin) (exam1_q36, exam3_q1, exam6_q14)
- Amazon Inspector: quét lỗ hổng EC2 (exam1_q36)
- Amazon Macie: tìm dữ liệu nhạy cảm trong S3 (exam3_q1)

## Amazon Security Lake
- Data lake bảo mật tập trung, tự thu thập log từ nhiều account và nguồn, lưu trên S3 (exam2_q44)
