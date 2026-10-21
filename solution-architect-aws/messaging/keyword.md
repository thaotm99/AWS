# MESSAGING — Khái niệm từ câu hỏi đề thi

## Amazon SQS
- Decouple các tầng, buffer khi tải tăng, không mất dữ liệu (exam2_q47, exam3_q39, exam1_q55, exam5_q26, exam4_q46)
- FIFO queue: đúng thứ tự, exactly-once; batching 3.000 msg/s; tên kết thúc .fifo; không đổi standard thành FIFO mà phải tạo lại (exam1_q13, exam1_q34, exam3_q2)
- Message Group ID để xử lý song song theo nhóm mà vẫn giữ thứ tự (exam2_q42)
- Long polling giảm chi phí (exam3_q34)
- Dead-letter queue cho message xử lý lỗi (exam5_q44)
- Delay queue hoãn giao message (exam6_q37)
- Temporary queue cho request-response (exam6_q16)
- Hai queue ưu tiên (pro/lite) (exam6_q32)
- Scale EC2 theo độ dài queue (exam3_q54, exam6_q52)
- S3 event → SQS → Lambda (exam2_q14); API Gateway → SQS (exam5_q32); SQS → Lambda → DynamoDB (exam1_q33)
- Interface VPC endpoint cho SQS (exam3_q7)

## Amazon SNS
- Thông báo từ AWS Config, CloudWatch alarm (exam2_q9, exam1_q61)
- SNS → Lambda có thể chạm giới hạn concurrency (exam1_q50)

## Amazon EventBridge
- Decouple ứng dụng theo sự kiện, tích hợp SaaS (exam4_q35)
- Lịch cron gọi Lambda / Fargate (exam3_q30, exam2_q27)

## AWS Step Functions
- Điều phối workflow nhiều bước, kết hợp AWS Batch (exam6_q55)

## Amazon MQ
- Message broker managed hỗ trợ MQTT, AMQP, RabbitMQ khi không muốn sửa code (exam4_q51, exam6_q61, exam2_q1)
