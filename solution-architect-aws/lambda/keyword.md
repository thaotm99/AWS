# LAMBDA — Khái niệm từ câu hỏi đề thi

## AWS Lambda
- Kích hoạt từ S3 Event Notifications để xử lý file mới (exam5_q23, exam1_q4)
- Poll SQS (exam2_q14, exam1_q33, exam5_q32) và Kinesis Data Streams (exam1_q60, exam3_q46, exam5_q35, exam6_q31)
- EventBridge cron gọi Lambda chạy job định kỳ (exam3_q30)
- Execution role; truy cập S3 khác account cần role + bucket policy (exam2_q16)
- IAM authentication tới RDS (exam4_q39)
- VPC-enabled Lambda cần NAT để ra internet; Layers dùng chung code; CloudWatch alarm cho concurrency (exam4_q25)
- Account concurrency quota khi SNS đẩy quá nhiều (exam1_q50)
- Provisioned concurrency cho peak load (exam3_q20)

## Amazon API Gateway
- REST API (stateless) và WebSocket API (stateful) (exam1_q49)
- API Gateway + Lambda cho serverless backend (exam1_q11, exam3_q20, exam3_q40)
- HTTP API với JWT authorizer (exam3_q52)
- Usage plans + API keys cho rate limit và quota (exam3_q53)
- Resource policy giới hạn IP (exam2_q58)
- API Gateway caching giảm tải database (exam4_q44)
- API Gateway đẩy dữ liệu vào SQS / Kinesis (exam5_q32, exam1_q57)
