# KINESIS — Khái niệm từ câu hỏi đề thi

## Kinesis Data Streams
- Ingest dữ liệu thời gian thực, nhiều consumer tùy biến (exam3_q10, exam3_q46, exam1_q60)
- Consumer là Lambda; on-demand capacity mode (exam5_q35, exam6_q31, exam1_q60)
- Enhanced fan-out tăng throughput cho từng consumer (exam5_q38)
- ProvisionedThroughputExceeded: gửi batch thay vì từng message (exam5_q53)
- Kết hợp Fargate xử lý (exam6_q35); OpenSearch + QuickSight (exam5_q6)

## Kinesis Data Analytics / Firehose
- Phân tích stream bằng SQL thời gian thực (exam4_q22, exam1_q57)
- DMS đẩy dữ liệu từ S3 sang Kinesis (exam4_q27)
